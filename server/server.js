const express = require("express"); // The backbone of our server, handles API requests.
const cors = require("cors"); // Middleware to allow our React frontend to talk to this server
const puppeteer = require("puppeteer"); // The headless browser we use to crawl websites.
const urlParse = require("url-parse"); // A small helper for easily handling and parsing URLs.
const crypto = require("crypto"); // A built-in Node.js module to generate unique IDs for our crawl jobs.
const PQueue = require("p-queue").default; // The task manager for making our crawler fast and concurrent.

const { CohereClient } = require("cohere-ai"); // The official Cohere SDK for embeddings and chat.

// Pinecone
const { Pinecone } = require("@pinecone-database/pinecone"); // The official Pinecone SDK for our vector database.

// LangChain tools (only for text splitting)
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter"); // A LangChain helper to chunk text.

// --- 🔑 API Keys ---
const COHERE_API_KEY = "";
const PINECONE_API_KEY =
  "";

// --- Constants & Client Initializations ---
const PINECONE_INDEX_NAME = "";
const app = express();
const PORT = 8000;

// We create and configure the clients for our external services once, when the server starts.
const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
const pineconeIndex = pinecone.index(PINECONE_INDEX_NAME);
const cohere = new CohereClient({ token: COHERE_API_KEY });

// Standard server middleware
app.use(cors());
app.use(express.json());

// A simple in-memory object to store the status of ongoing crawl jobs.
const crawlJobs = {};

// Helper function for getting Cohere embeddings
async function getCohereEmbeddings(texts) {
  const response = await cohere.embed({
    texts,
    model: "embed-english-v3.0",
    inputType: "search_document", // Use 'search_document' for indexing
  });
  return response.embeddings;
}

// --- CRAWLER ENDPOINT ---
app.post("/crawl-and-index", async (req, res) => {
  const { startUrl } = req.body;
  if (!startUrl) return res.status(400).json({ error: "startUrl is required" });

  const domain = new urlParse(startUrl).hostname;
  const namespace = domain.replace(/[.-]/g, "_");

  try {
    const stats = await pineconeIndex.describeIndexStats();

    // Create a unique, safe "folder name" for this website's data inside our Pinecone index.
    if (stats.namespaces?.[namespace]?.recordCount > 0) {
      console.log(
        `[Server] ✅ Knowledge base for ${domain} already exists. Skipping crawl.`
      );
      return res.json({
        message: `Knowledge base for ${domain} already exists.`,
      });
    }

    // If not crawled, create a new job ID and send it back to the frontend.
    const jobId = crypto.randomUUID();
    crawlJobs[jobId] = {
      id: jobId,
      status: "running",
      logs: [`Crawl started for ${domain}...`],
    };

    res.status(202).json({ jobId });

    // This immediately-invoked async function runs the long crawl process in the background.
    (async () => {
      let browser;
      try {
        const visited = new Set();
        let allDocs = []; // We will collect all text chunks here.
        const queue = new PQueue({ concurrency: 2 }); // Our "Traffic Controller" for concurrency.
        const CRAWL_PAGE_LIMIT = 200;

        browser = await puppeteer.launch({
          headless: "new",
          args: ["--no-sandbox", "--disable-setuid-sandbox"], // Good for server environments
        });

        // This is the core "worker" function for crawling a single page.
        const crawlPage = async (url) => {
          if (visited.has(url) || visited.size >= CRAWL_PAGE_LIMIT) {
            if (visited.size >= CRAWL_PAGE_LIMIT) queue.clear();
            return;
          }
          visited.add(url);
          crawlJobs[jobId].logs.push(
            `(${visited.size}/${CRAWL_PAGE_LIMIT}) Crawling: ${url}`
          );

          let page;
          try {
            page = await browser.newPage();

            await page.setUserAgent(
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
            );

            // Make our scraper look more like a real user.
            await page.setRequestInterception(true);
            page.on("request", (req) => {
              if (
                ["image", "stylesheet", "font", "media"].includes(
                  req.resourceType()
                )
              )
                req.abort();
              else req.continue();
            });

            await page.goto(url, {
              waitUntil: "domcontentloaded",
              timeout: 60000,
            });

            // Intelligently wait for the page's main content to be visible.
            await page.waitForSelector("body", { timeout: 15000 });

            // Extract all visible text from the page.
            const textContent = await page.evaluate(() =>
              document.body.innerText.replace(/(\s\s)+/g, "\n")
            );
            const textLength = textContent ? textContent.trim().length : 0;
            console.log(`\n---------------------------------`);
            console.log(`[Page Report] URL: ${url}`);
            console.log(`---> Extracted Text Length: ${textLength}`);

            if (textLength > 50) {
              // Use LangChain to split the text into smaller, more useful chunks.
              console.log(`---> ✅ SUCCESS: Content is valid.`);
              const splitter = new RecursiveCharacterTextSplitter({
                chunkSize: 1000,
                chunkOverlap: 100,
              });
              const docs = await splitter.createDocuments([textContent]);
              allDocs.push(...docs);
            }

            // Find all valid, on-site links to add to the crawl queue.
            const links = await page.evaluate((baseDomain) => {
              const anchors = Array.from(document.querySelectorAll("a"));
              const validLinks = new Set();
              anchors.forEach((a) => {
                try {
                  const href = a.href.split("#")[0];
                  if (new URL(href).hostname === baseDomain)
                    validLinks.add(href);
                } catch {}
              });
              return Array.from(validLinks);
            }, domain);

            links.forEach((link) => {
              if (!visited.has(link)) queue.add(() => crawlPage(link));
            });
          } catch (error) {
            crawlJobs[jobId].logs.push(
              `---> Failed to process ${url}: ${error.message}`
            );
            console.error(`---> [Error] Failed on page ${url}:`, error.message);
          } finally {
            if (page) await page.close(); // Important: close the page to free up memory.
          }
        };

        queue.add(() => crawlPage(startUrl)); // Seed the queue with the first page.
        await queue.onIdle(); // Wait for the entire crawl to finish.

        if (allDocs.length > 0) {
          crawlJobs[jobId].logs.push(
            `Found ${allDocs.length} text chunks. Creating embeddings...`
          );
          const textsToEmbed = allDocs.map((doc) => doc.pageContent);

          // This is your custom, advanced logic to handle API rate limits by batching and throttling.
          const estimateTokens = (text) => Math.ceil(text.length / 4); // Rough estimate
          const BATCH_SIZE = 90;
          const TOKEN_LIMIT_PER_MINUTE = 100000;

          let tokenCountThisMinute = 0;
          let batchStartTime = Date.now();

          for (let i = 0; i < textsToEmbed.length; i += BATCH_SIZE) {
            const batchTexts = textsToEmbed.slice(i, i + BATCH_SIZE);
            const estimatedTokens = batchTexts.reduce(
              (acc, text) => acc + estimateTokens(text),
              0
            );

            // ⏱️ Throttle if needed
            if (
              tokenCountThisMinute + estimatedTokens >
              TOKEN_LIMIT_PER_MINUTE
            ) {
              const elapsed = Date.now() - batchStartTime;
              const waitTime = Math.max(0, 60000 - elapsed);
              console.log(
                `[Throttle] ⏳ Waiting ${waitTime / 1000}s due to rate limit...`
              );
              await new Promise((resolve) => setTimeout(resolve, waitTime));
              tokenCountThisMinute = 0;
              batchStartTime = Date.now();
            }

            try {
              console.log(
                `[Embedding] Batch ${i / BATCH_SIZE + 1} of ${Math.ceil(
                  textsToEmbed.length / BATCH_SIZE
                )}`
              );

              const embeddings = await getCohereEmbeddings(batchTexts);
              tokenCountThisMinute += estimatedTokens;

              // Prepare vectors with metadata, including the original text.
              const vectors = embeddings.map((values, idx) => ({
                id: crypto.randomUUID(),
                values,
                metadata: { text: batchTexts[idx] },
              }));

              // Upload the batch of vectors to our Pinecone Memory Palace.
              await pineconeIndex.namespace(namespace).upsert(vectors);
              crawlJobs[jobId].logs.push(
                `✅ Embedded & upserted ${vectors.length} chunks.`
              );

              console.log(
                `[Tokens] Batch: ~${estimatedTokens}, Total this minute: ${tokenCountThisMinute}`
              );
            } catch (err) {
              console.error(
                `[Embedding Error] Batch ${i / BATCH_SIZE + 1}:`,
                err.message
              );
              crawlJobs[jobId].logs.push(
                `❌ Failed batch ${i / BATCH_SIZE + 1}: ${err.message}`
              );
            }
          }
          crawlJobs[jobId].logs.push(
            `Uploading ${vectors.length} vectors to Pinecone...`
          );
          for (let i = 0; i < vectors.length; i += 100) {
            const batch = vectors.slice(i, i + 100);
            await pineconeIndex.namespace(namespace).upsert(batch);
          }

          crawlJobs[jobId].status = "complete";
          crawlJobs[jobId].logs.push(
            `✅ Crawl complete. Indexed ${visited.size} pages.`
          );
        } else {
          throw new Error("No valid content to index.");
        }
      } catch (err) {
        console.error("[Crawler] Error:", err);
        if (crawlJobs[jobId]) {
          crawlJobs[jobId].status = "error";
          crawlJobs[jobId].logs.push(`❌ Crawl failed: ${err.message}`);
        }
      } finally {
        if (browser) await browser.close();
      }
    })();
  } catch (e) {
    console.error("[Server] Pinecone error:", e);
    res.status(500).json({ error: "Failed to access Pinecone index." });
  }
});


// The frontend calls this every few seconds to get live updates on the crawl.
app.get("/crawl-status/:jobId", (req, res) => {
  const job = crawlJobs[req.params.jobId];
  if (!job) return res.status(404).json({ error: "Job not found." });
  res.json(job);
});


// This is the "Query Phase". It uses the knowledge base to answer questions.
app.post("/ask-crawler", async (req, res) => {
  const { question, baseUrl } = req.body;
  if (!question || !baseUrl)
    return res
      .status(400)
      .json({ error: "Question and baseUrl are required." });

  const namespace = new urlParse(baseUrl).hostname.replace(/\./g, "_");

  try {
    const vectorStore = await pineconeIndex.namespace(namespace);

    // 1. Turn the user's question into a vector using the Cohere Alchemist.
    const queryEmbeddingResponse = await cohere.embed({
      texts: [question],
      model: "embed-english-v3.0",
      inputType: "search_query", // Optimized for finding relevant documents.
    });
    const queryEmbedding = queryEmbeddingResponse.embeddings[0];

    // 2. Use the question vector to query the Pinecone Memory Palace.
    // This finds the most relevant text chunks from the website.
    const queryResponse = await vectorStore.query({
      topK: 5,
      vector: queryEmbedding,
      includeMetadata: true,
    });

    if (!queryResponse.matches || queryResponse.matches.length === 0) {
      return res.json({
        answer: "I couldn't find any relevant information on that website.",
      });
    }

    // 3. Build the context from the text we stored in the metadata
    const context = queryResponse.matches
      .map((match) => match.metadata?.text || "")
      .join("\n\n---\n\n");

    // 4. Build the final message for the chat model
    const message = `CONTEXT:\n${context}\n\nBased ONLY on the context above, answer the following question:\n\nQUESTION: ${question}`;

    // 5. Send the final prompt to the Cohere Sage to generate a human-like answer.
    const response = await cohere.chat({
      model: "command-r",
      message: message,
    });

    // The answer from the chat method is in a different property
    res.json({ answer: response.text });
  } catch (error) {
    console.error("[Server] Query failed:", error);
    res.status(500).json({ error: "Failed to get an answer." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
