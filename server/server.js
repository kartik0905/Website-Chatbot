// 1. Import necessary libraries
const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

// Import the direct Google AI SDK, which we use for the final, stable AI call.
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Import specific, powerful tools from the LangChain framework.
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter"); // This tool intelligently splits large texts into smaller chunks.
const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai"); // This connects to Google's model that turns text into vector embeddings (meaningful numbers).
const { FaissStore } = require("@langchain/community/vectorstores/faiss"); // This is our local vector database that creates and searches the "smart index".


const GOOGLE_API_KEY = "AIzaSyB-XEzWfq6eEwgGMI_z3ueFkxNeCulitxk";

// 2. Initialize Server and AI Client
const app = express();
const PORT = 8000;
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

// 3. Set up middleware
// 'cors' allows our React app (on a different port) to communicate with this server.
app.use(cors());
// 'express.json' allows the server to understand JSON data sent from the React app.
app.use(express.json());

// --- Vector Store Configuration ---
// Defines a folder named 'vector_stores' to save our knowledge files.
const vectorStorePath = path.join(__dirname, "vector_stores");
if (!fs.existsSync(vectorStorePath)) {
  fs.mkdirSync(vectorStorePath);
}

// This function creates a unique and safe filename for each URL's knowledge file.
const getStorePathForUrl = (url) => {
  const urlHash = Buffer.from(url).toString("base64url");
  return path.join(vectorStorePath, `faiss_store_${urlHash}`);
};

// --- The "Learning" Endpoint ---
// This endpoint performs the deep, one-time study of a webpage.
app.post("/index-website", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  // Check if a knowledge file for this URL already exists to avoid re-scraping.
  const storePath = getStorePathForUrl(url);
  if (fs.existsSync(storePath)) {
    console.log(`[Server] Vector store for ${url} already exists.`);
    return res.json({ message: `URL already indexed.` });
  }

  console.log(`[Server] Starting indexing for URL: ${url}`);
  let browser;
  try {
    // Launch the Puppeteer "robot browser".
    browser = await puppeteer.launch({ headless: "new" });
    // Open a new tab.
    const page = await browser.newPage();
    // Navigate to the user's URL, waiting for the page and its dynamic content to fully load.
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    // --- ROBUST COOKIE HANDLING ---
    // This block tries to find and click common cookie consent pop-ups,
    // which often block the main content of a page.
    try {
      console.log("[Server] Looking for cookie consent buttons...");
      const cookieSelectors = [
        "#onetrust-accept-btn-handler", // A common selector (used by Reuters)
        'button[data-testid="accept-button"]',
        'button:has-text("Accept All")',
        'button:has-text("Accept")',
      ];
      for (const selector of cookieSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 2000 });
          await page.click(selector);
          console.log(
            `[Server] Clicked cookie button with selector: ${selector}`
          );
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for the banner to disappear.
          break;
        } catch (e) {
          // If a selector isn't found, it just tries the next one.
        }
      }
    } catch (e) {
      console.log("[Server] Error during cookie handling, but proceeding.");
    }

    // SURGICAL SCRAPING LOGIC
    // Instead of grabbing all text, this surgically extracts text from only meaningful HTML tags.
    // This results in cleaner, more relevant data for the AI.
    const textContent = await page.evaluate(() => {
      // First, try to find the main content area of the page. If not found, fall back to the whole body.
      const mainContent =
        document.querySelector(
          'main, article, [role="main"], #main, #content, .main, .content'
        ) || document.body;

      // Define the list of tags that usually contain important text.
      const selectors = "p, h1, h2, h3, h4, li, a, span";
      const elements = Array.from(mainContent.querySelectorAll(selectors));

      // Extract the text from each element, filtering out short, noisy text.
      let texts = elements
        .map((el) => {
          const text = el.innerText.trim();
          if (text.length > 10 && text.includes(" ")) {
            return text;
          }
          return null;
        })
        .filter(Boolean);

      // Remove any duplicate text snippets, which are common in complex web layouts.
      const uniqueTexts = [...new Set(texts)];
      return uniqueTexts.join("\n\n");
    });

    console.log(
      `[Server] Surgically scraped ${textContent.length} characters.`
    );

    // This check ensures that if a site blocks our scraper, we stop with a clear error.
    if (!textContent || textContent.trim().length < 100) {
      throw new Error(
        `Scraping yielded too little content (${textContent.length} chars). This site is likely protected against scraping.`
      );
    }

    // Use LangChain's splitter to break the clean text into chunks.
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 100,
    });
    const docs = await splitter.createDocuments([textContent]);
    console.log(`[Server] Split text into ${docs.length} chunks.`);

    if (docs.length === 0) {
      throw new Error(
        "Could not create any text chunks from the scraped content."
      );
    }

    // Use LangChain to create vector embeddings for each chunk and build the vector store.
    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: GOOGLE_API_KEY,
    });
    const vectorStore = await FaissStore.fromDocuments(docs, embeddings);

    // Save the final "knowledge file" to the disk.
    await vectorStore.save(storePath);
    console.log(`[Server] Vector store saved successfully at ${storePath}`);

    res.json({ message: "Website indexed successfully." });
  } catch (error) {
    console.error("[Server] Indexing failed:", error.message);
    // --- CLEANUP LOGIC ---
    // If the indexing process fails at any point, this cleans up any partially created files.
    if (fs.existsSync(storePath)) {
      fs.rmSync(storePath, { recursive: true, force: true });
      console.log(`[Server] Cleaned up failed index at ${storePath}`);
    }
    res
      .status(500)
      .json({ error: error.message || "Failed to index the website." });
  } finally {
    // This ensures the Puppeteer browser is always closed, even if an error occurs.
    if (browser) await browser.close();
  }
});

// --- The "Answering" Endpoint ---
// This endpoint uses the saved knowledge file to answer questions quickly and accurately.
app.post("/ask-indexed", async (req, res) => {
  const { question, url } = req.body;
  if (!question || !url)
    return res.status(400).json({ error: "Question and URL are required." });

  const storePath = getStorePathForUrl(url);
  if (!fs.existsSync(storePath)) {
    return res
      .status(404)
      .json({ error: "This website has not been indexed yet." });
  }

  try {
    // Load the saved knowledge file from the disk.
    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: GOOGLE_API_KEY,
    });
    const loadedVectorStore = await FaissStore.load(storePath, embeddings);

    // Create a "retriever" which is a tool for searching the knowledge file.
    const retriever = loadedVectorStore.asRetriever();
    // Perform the semantic search to find the most relevant text chunks related to the question.
    const relevantDocs = await retriever.getRelevantDocuments(question);
    const context = relevantDocs.map((doc) => doc.pageContent).join("\n\n");

    // Create a clear, specific prompt for the AI, giving it the relevant context.
    const prompt = `Based only on the following context, answer the question. If you don't know the answer, just say that you don't know.\n\nCONTEXT: """${context}"""\n\nQUESTION: ${question}`;

    // Use the direct Google AI SDK to get the final answer.
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
    });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const answer = response.text();

    res.json({ answer });
  } catch (error) {
    console.error("[Server] Query failed:", error);
    res.status(500).json({ error: "Failed to get an answer." });
  }
});

// 7. Start the server
// This command turns on the server and makes it listen for requests from the React app.
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
