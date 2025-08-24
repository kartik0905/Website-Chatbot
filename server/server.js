// --- IMPORTS ---
const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");
const urlParse = require("url-parse");
const crypto = require("crypto");
const PQueue = require("p-queue").default;
const { Pinecone } = require("@pinecone-database/pinecone");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");

// +++ NEW: OpenAI Client +++
const { OpenAI } = require("openai");

// --- API KEYS ---
// Make sure to replace these with your actual keys
const PINECONE_API_KEY =
  "";
const OPENAI_API_KEY =
  "";

// --- Constants & Client Initializations ---
const PINECONE_INDEX_NAME = "website-knowledge-base";
const OPENAI_EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dimensions
const OPENAI_CHAT_MODEL = "gpt-3.5-turbo";

const app = express();
const PORT = 8000;

const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
const pineconeIndex = pinecone.index(PINECONE_INDEX_NAME);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Standard server middleware
app.use(cors());
app.use(express.json());

// In-memory object to store the status of ongoing crawl jobs.
const crawlJobs = {};

// +++ NEW: Helper function for getting OpenAI embeddings +++
async function getOpenAIEmbeddings(texts) {
  const response = await openai.embeddings.create({
    model: OPENAI_EMBEDDING_MODEL,
    input: texts,
  });
  // The API returns an object with the embeddings inside the `data` array
  return response.data.map((item) => item.embedding);
}

// --- CRAWLER ENDPOINT (/crawl-and-index) ---
app.post("/crawl-and-index", async (req, res) => {
  const { startUrl } = req.body;
  if (!startUrl) return res.status(400).json({ error: "startUrl is required" });

  const domain = new urlParse(startUrl).hostname;
  const namespace = domain.replace(/[.-]/g, "_");

  try {
    const stats = await pineconeIndex.describeIndexStats();
    if (stats.namespaces?.[namespace]?.recordCount > 0) {
      console.log(
        `[Server] ✅ Knowledge base for ${domain} already exists. Skipping crawl.`
      );
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
        const visited = new Set();
        let allDocs = [];
        const queue = new PQueue({ concurrency: 5 });

        browser = await puppeteer.launch({
          headless: "new",
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        const crawlPage = async (url) => {
          if (visited.has(url)) return;
          visited.add(url);
          crawlJobs[jobId].logs.push(`(${visited.size}) Crawling: ${url}`);

          let page;
          try {
            page = await browser.newPage();
            await page.setUserAgent(
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
            );
            await page.setRequestInterception(true);
            page.on("request", (req) => {
              if (
                ["image", "stylesheet", "font", "media"].includes(
                  req.resourceType()
                )
              ) {
                req.abort();
              } else {
                req.continue();
              }
            });

            await page.goto(url, {
              waitUntil: "domcontentloaded",
              timeout: 60000,
            });
            await page.waitForSelector("body", { timeout: 15000 });

            const textContent = await page.evaluate(() =>
              document.body.innerText.replace(/(\s\s)+/g, "\n")
            );

            if (textContent && textContent.trim().length > 50) {
              const splitter = new RecursiveCharacterTextSplitter({
                chunkSize: 1000,
                chunkOverlap: 100,
              });
              const docs = await splitter.createDocuments([textContent]);
              allDocs.push(...docs);
            }

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
          } finally {
            if (page) await page.close();
          }
        };

        queue.add(() => crawlPage(startUrl));
        await queue.onIdle();

        if (allDocs.length > 0) {
          crawlJobs[jobId].logs.push(
            `Found ${allDocs.length} text chunks. Creating embeddings...`
          );
          const textsToEmbed = allDocs.map((doc) => doc.pageContent);
          const BATCH_SIZE = 100; // OpenAI can handle larger batches

          for (let i = 0; i < textsToEmbed.length; i += BATCH_SIZE) {
            const batchTexts = textsToEmbed.slice(i, i + BATCH_SIZE);
            console.log(
              `[Embedding] Batch ${i / BATCH_SIZE + 1} of ${Math.ceil(
                textsToEmbed.length / BATCH_SIZE
              )}`
            );

            // +++ Use OpenAI model to create embeddings +++
            const embeddings = await getOpenAIEmbeddings(batchTexts);

            const vectors = embeddings.map((values, idx) => ({
              id: crypto.randomUUID(),
              values,
              metadata: { text: batchTexts[idx] },
            }));

            await pineconeIndex.namespace(namespace).upsert(vectors);
            crawlJobs[jobId].logs.push(
              `✅ Embedded & upserted ${vectors.length} chunks.`
            );
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

// --- CRAWL STATUS ENDPOINT ---
app.get("/crawl-status/:jobId", (req, res) => {
  const job = crawlJobs[req.params.jobId];
  if (!job) return res.status(404).json({ error: "Job not found." });
  res.json(job);
});

// --- QUERY ENDPOINT (/ask-crawler) ---
app.post("/ask-crawler", async (req, res) => {
  const { question, baseUrl } = req.body;
  if (!question || !baseUrl)
    return res
      .status(400)
      .json({ error: "Question and baseUrl are required." });

  const namespace = new urlParse(baseUrl).hostname.replace(/[.-]/g, "_");

  try {
    // 1. Create embedding for the question using OpenAI
    const [queryEmbedding] = await getOpenAIEmbeddings([question]);

    // 2. Query Pinecone to find relevant context
    const queryResponse = await pineconeIndex.namespace(namespace).query({
      topK: 5,
      vector: queryEmbedding,
      includeMetadata: true,
    });

    if (!queryResponse.matches || queryResponse.matches.length === 0) {
      return res.json({
        answer: "I couldn't find any relevant information on that website.",
      });
    }

    const context = queryResponse.matches
      .map((match) => match.metadata?.text || "")
      .join("\n\n---\n\n");

    // 3. +++ NEW: Send the prompt to the OpenAI Chat model +++
    const chatResponse = await openai.chat.completions.create({
      model: OPENAI_CHAT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant. Answer the user's question based only on the context provided.",
        },
        {
          role: "user",
          content: `CONTEXT:\n${context}\n\nQUESTION: ${question}`,
        },
      ],
    });

    res.json({ answer: chatResponse.choices[0].message.content });
  } catch (error) {
    console.error("[Server] Query failed:", error);
    if (error instanceof OpenAI.APIError) {
      console.error(error.status, error.message);
    }
    res.status(500).json({ error: "Failed to get an answer." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
