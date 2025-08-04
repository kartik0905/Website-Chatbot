const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const urlParse = require("url-parse"); // Helper for easily handling and parsing URLs
const crypto = require("crypto"); // Built-in Node.js module to generate unique IDs for our crawl jobs

const { GoogleGenerativeAI } = require("@google/generative-ai"); // The official Google AI SDK for the final answering step
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter"); // LangChain's tool for splitting text into chunks
const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai"); // LangChain's tool for creating vector embeddings
const { FaissStore } = require("@langchain/community/vectorstores/faiss"); // LangChain's tool for our local vector database

const GOOGLE_API_KEY = "AIzaSyB-";

const app = express();
const PORT = 8000;
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

// Set up middleware
app.use(cors()); // Allows our React app to communicate with this server
app.use(express.json()); // Allows the server to understand JSON data from the React app.

// --- In-Memory Job Store ---
// This object acts as a simple, temporary database to keep track of the status and logs of active crawl jobs.
const crawlJobs = {};

// --- Vector Store Configuration ---
// Defines the folder where all our saved "knowledge files" (vector stores) will be kept
const vectorStorePath = path.join(__dirname, "vector_stores");

// This function creates a unique and safe filename for each website's knowledge file based on its domain name
const getStorePathForUrl = (url) => {
  if (!fs.existsSync(vectorStorePath)) fs.mkdirSync(vectorStorePath);
  const domain = new urlParse(url).hostname;
  return path.join(
    vectorStorePath,
    `faiss_store_${domain.replace(/\./g, "_")}`
  );
};

// --- THE FINAL CRAWLER ENDPOINT ---
app.post("/crawl-and-index", (req, res) => {
  const { startUrl } = req.body;
  if (!startUrl) return res.status(400).json({ error: "startUrl is required" });

  const domain = new urlParse(startUrl).hostname;
  const storePath = getStorePathForUrl(startUrl);

  if (fs.existsSync(storePath)) {
    return res.json({
      message: `Knowledge base for ${domain} already exists.`,
    });
  }

  const jobId = crypto.randomUUID();
  crawlJobs[jobId] = {
    id: jobId,
    status: "running",
    logs: [`Crawl started for ${domain}...`],
  };
  res.status(202).json({ jobId });

  (async () => {
    let browser;
    try {
      const queue = [startUrl];
      const visited = new Set();
      let vectorStore;
      const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: GOOGLE_API_KEY,
      });

      browser = await puppeteer.launch({
        headless: "new",
        protocolTimeout: 90000,
      });
      const page = await browser.newPage();

      await page.setRequestInterception(true);
      page.on("request", (req) => {
        if (["image", "stylesheet", "font"].includes(req.resourceType())) {
          req.abort();
        } else {
          req.continue();
        }
      });

      while (queue.length > 0) {
        const currentUrl = queue.shift();
        if (visited.has(currentUrl)) continue;

        visited.add(currentUrl);
        crawlJobs[jobId].logs.push(`(${visited.size}) Visiting: ${currentUrl}`);

        try {
          await page.goto(currentUrl, {
            waitUntil: "networkidle2",
            timeout: 60000,
          });

          // This script runs inside the browser to act like a "data extractor".
          const textContent = await page.evaluate(() => {
            // It first checks if the page contains book listings ('article.product_pod').
            const bookPods = Array.from(
              document.querySelectorAll("article.product_pod")
            );
            if (bookPods.length > 0) {
              // If it's a list page, extract structured data for each book
              return bookPods
                .map((pod) => {
                  const title = pod.querySelector("h3 a")?.title || "No title";
                  const price =
                    pod.querySelector(".price_color")?.innerText || "No price";
                  const stock =
                    pod
                      .querySelector(".instock.availability")
                      ?.innerText.trim() || "No stock info";
                  // It intelligently reads the star rating from the CSS class name
                  const ratingClass =
                    pod.querySelector(".star-rating")?.className || "";
                  const ratingMatch = ratingClass.match(/star-rating (\w+)/);
                  const rating = ratingMatch
                    ? `${ratingMatch[1]} stars`
                    : "No rating";

                  // It combines all the extracted data into a clean, readable sentence for the AI.
                  return `Book Title: ${title}. Price: ${price}. Availability: ${stock}. Rating: ${rating}.`;
                })
                .join("\n\n");
            } else {
              // If it's a detail page or another type of page, it falls back to grabbing the general text.
              const mainContent =
                document.querySelector("main, article, .content") ||
                document.body;
              // It also cleans up excessive whitespace to make the text cleaner for the AI.
              return mainContent.innerText.replace(/(\s\s)+/g, "\n");
            }
          });

          // If we got meaningful content, we process it.
          if (textContent && textContent.trim().length > 20) {
            const splitter = new RecursiveCharacterTextSplitter({
              chunkSize: 1000,
              chunkOverlap: 100,
            });
            const docs = await splitter.createDocuments([textContent]);
            if (docs.length > 0) {
              // If this is the first page, create a new vector store.
              if (!vectorStore) {
                vectorStore = await FaissStore.fromDocuments(docs, embeddings);
              } else {
                // For all subsequent pages, add their knowledge to the existing store.
                await vectorStore.addDocuments(docs);
              }
            }
          }

          // Find all valid links on the current page, now with a rule to ignore category pages to prevent loops.
          const links = await page.evaluate((baseDomain) => {
            const allLinks = Array.from(document.querySelectorAll("a"));
            const uniqueLinks = new Set();
            const fileExtensions = [".pdf", ".zip", ".tar.gz", ".png", ".jpg"];
            allLinks.forEach((link) => {
              try {
                const cleanHref = link.href.split("#")[0];
                if (
                  new URL(cleanHref).hostname === baseDomain &&
                  !fileExtensions.some((ext) =>
                    cleanHref.toLowerCase().endsWith(ext)
                  ) &&
                  !cleanHref.includes("/category/") // This is the new rule to avoid loops.
                ) {
                  uniqueLinks.add(cleanHref);
                }
              } catch (e) {}
            });
            return Array.from(uniqueLinks);
          }, domain);

          crawlJobs[jobId].logs.push(
            `---> Found ${links.length} new links. Queue size: ${queue.length}`
          );

          links.forEach((link) => {
            if (!visited.has(link)) queue.push(link);
          });
        } catch (error) {
          // If one page fails, we log the error and continue to the next page.
          crawlJobs[jobId].logs.push(
            `---> Failed to process ${currentUrl}: ${error.message}`
          );
        }
      }

      // After the crawl is finished, save the master knowledge file.
      if (vectorStore) {
        await vectorStore.save(storePath);
        crawlJobs[jobId].status = "complete";
        crawlJobs[jobId].logs.push(
          `Crawl complete! Indexed ${visited.size} pages. Knowledge base is ready.`
        );
      } else {
        throw new Error(
          "Could not create a vector store. The website might be blocking scrapers."
        );
      }
    } catch (error) {
      console.error("[Crawler] A critical error occurred:", error);
      crawlJobs[jobId].status = "error";
      crawlJobs[jobId].logs.push(`Crawl failed: ${error.message}`);
    } finally {
      // Always close the browser to free up resources.
      if (browser) await browser.close();
    }
  })();
});

// --- The Status Endpoint for Polling ---
// The React app calls this endpoint every 2 seconds to get live updates.
app.get("/crawl-status/:jobId", (req, res) => {
  const { jobId } = req.params;
  const job = crawlJobs[jobId];
  if (!job) {
    return res.status(404).json({ error: "Job not found." });
  }
  res.json(job);
});

// --- The Final Answering Endpoint ---
app.post("/ask-crawler", async (req, res) => {
  const { question, baseUrl } = req.body;
  if (!question || !baseUrl)
    return res
      .status(400)
      .json({ error: "Question and baseUrl are required." });

  const storePath = getStorePathForUrl(baseUrl);
  if (!fs.existsSync(storePath)) {
    return res
      .status(404)
      .json({ error: "No knowledge base found for this website." });
  }

  try {
    // Load the correct knowledge file from the disk.
    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: GOOGLE_API_KEY,
    });
    const loadedVectorStore = await FaissStore.load(storePath, embeddings);

    // Create the retriever tool for semantic search.
    const retriever = loadedVectorStore.asRetriever();

    // Find the most relevant text chunks from the entire website.
    const relevantDocs = await retriever.getRelevantDocuments(question);
    const context = relevantDocs.map((doc) => doc.pageContent).join("\n\n");

    // Build the prompt with the precise context for the AI.
    const prompt = `Based only on the following context from the website, answer the question. If you don't know the answer, just say that you don't know.\n\nCONTEXT: """${context}"""\n\nQUESTION: ${question}`;

    // Get the final answer from the Gemini model.
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

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
