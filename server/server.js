const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");
const { GoogleGenerativeAI } = require("@google/generative-ai");


const app = express();
const PORT = 8000;

const genAI = new GoogleGenerativeAI("AIzaSyB-XEzWfq6eEwgGMI_z3ueFkxNeCulitxk");


app.use(cors());
app.use(express.json());

// Helper function for retries
const withRetry = async (fn, retries = 3, delay = 1000) => {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (
        error.status === 503 ||
        (error.message && error.message.includes("503"))
      ) {
        console.log(
          `[Server] AI model is overloaded. Retrying in ${delay / 1000}s...`
        );
        await new Promise((res) => setTimeout(res, delay));
        delay *= 2; // if the error is 503 or something like that it will immidiately respond to that and also double the delay (This is called exponential backoff)
      } else {
        throw error;
      }
    }
  }
  throw lastError;
};

// 4. Define the scraping route
app.post("/scrape", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }
  console.log(`Scraping URL: ${url}`);
  let browser;
  try {
    // This starts the invisible robot browser.
    browser = await puppeteer.launch({ headless: "new" });
    // Opens a new blank tab.
    const page = await browser.newPage();
    //  Navigates to the user's URL (networkidle2 tells the puppeteer to be patient and its timeout is set as 60000(6s) for avoiding waiting forever)
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });


    // This function runs the following command of to run the code in the tab that puppeteer has opened
    const textContent = await page.evaluate(() => {
      // Try to find the main content element of the page.
      // This is a common pattern for well-structured websites.
      const mainContent = document.querySelector(
        'main, article, [role="main"], #main, #content, .main, .content'
      );

      // The decision 
      let rawText;
      if (mainContent) {
        console.log("Found main content element. Scraping from there.");
        rawText = mainContent.innerText;
      } else {
        console.log("Could not find main content. Falling back to body.");
        rawText = document.body.innerText;
      }

      // Truncate the extracted text to stay within limits
      return rawText.slice(0, 12000);
    });

    console.log(`[Server] Truncated text to ${textContent.length} characters.`);
    res.json({ text: textContent });
  } catch (error) {
    console.error("Scraping failed:", error);
    res.status(500).json({ error: "Failed to scrape the website." });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// 5. Define the AI chat route
app.post("/ask", async (req, res) => {
  const { question, context } = req.body;
  if (!question || !context) {
    return res
      .status(400)
      .json({ error: "Question and context are required." });
  }
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
    });
    const prompt = `Based *only* on the following text from a website, answer the question. Do not use any other information. If the answer is not in the text, say "I could not find an answer in the provided text."\n\nCONTEXT: """${context}"""\n\nQUESTION: ${question}`;

    const result = await withRetry(() => model.generateContent(prompt));
    const response = await result.response;
    const text = response.text();

    res.json({ answer: text });
  } catch (error) {
    console.error("AI generation failed:", error);
    res
      .status(500)
      .json({ error: "Failed to generate an answer from the AI." });
  }
});

// 6. Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
