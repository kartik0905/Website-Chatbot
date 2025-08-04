
<div align="center">

# 🤖 AI Web Crawler & Chatbot  
### Transform any website into an intelligent, conversational knowledge base

</div>

<p align="center">
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React"/>
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/LangChain-1E90FF?style=for-the-badge&logo=langchain&logoColor=white" alt="LangChain"/>
  <img src="https://img.shields.io/badge/Puppeteer-40B5A4?style=for-the-badge&logo=puppeteer&logoColor=white" alt="Puppeteer"/>
  <img src="https://img.shields.io/badge/Cohere-111111?style=for-the-badge&logo=cohere&logoColor=white" alt="Cohere"/>
</p>

---

## 📌 Overview

This full-stack AI application transforms any website into an intelligent, searchable, and chat-capable knowledge base using a powerful combination of:

- Autonomous web crawling
- Persistent vector-based knowledge storage
- Retrieval-Augmented Generation (RAG)
- Semantic search
- Natural language answering via Cohere's LLM

---

## 🚀 The Vision

Create more than just a chatbot. This project gives you a private AI that **fully understands any website** you point it at — no repeated scraping, no shallow Q&A. Just one deep crawl = permanent expert-level knowledge.

---

## ✨ Features

- 🧠 **Autonomous Crawler** — Input a single URL, and the bot navigates the entire site.
- 💾 **One-Time Crawl, Permanent Memory** — Stores embeddings in Pinecone for future queries.
- 📊 **Live Crawler Logs** — Watch the bot explore and learn in real-time.
- 🔍 **Semantic Search** — Vector-based search that understands meaning, not just keywords.
- 🧹 **Smart Scraping** — Puppeteer handles modern sites and ignores unnecessary assets.
- 🤖 **AI Answers by Cohere** — Answers grounded in context-rich embeddings from your target site.

---

## 🛠️ Tech Stack

| Layer | Technologies | Purpose |
|------|--------------|---------|
| **Frontend** | React, Tailwind CSS | Beautiful, responsive UI |
| **Backend** | Node.js, Express.js | API routes & job management |
| **Crawler** | Puppeteer | Headless browser scraping |
| **AI Orchestration** | LangChain | Text chunking & embedding pipeline |
| **Vector DB** | Pinecone | Embedding-based knowledge retrieval |
| **LLM** | Cohere | Embedding + Answer generation |

---

## ⚙️ How It Works (RAG Pipeline)

### Phase 1: Crawl & Index

1. **Start Job**: You input a `startUrl`, server generates a `jobId`.
2. **Live Updates**: Frontend polls crawler logs every 2s.
3. **Crawling & Scraping**: Puppeteer discovers and scrapes all pages.
4. **Vectorizing**: LangChain splits and Cohere embeds the content.
5. **Saving**: All vectors are saved into Pinecone vector DB.

### Phase 2: Query Time

1. **Load Knowledge**: Pinecone vector DB is queried.
2. **Semantic Search**: Retrieves top-matching chunks.
3. **AI Response**: Cohere crafts a natural answer using the context.

---

## 🧪 Local Development

### 🔧 Requirements

- Node.js (v18+)
- Cohere API Key
- Pinecone API Key

---

## 🏁 Getting Started

### 1. Clone & Setup

```bash
git clone https://github.com/kartik0905/Website-Chatbot.git
cd Website-Chatbot

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
```

### 2. Add API Keys

Create a `.env` file in the `server/` folder:

```
# server/.env
COHERE_API_KEY=your_cohere_key
PINECONE_API_KEY=your_pinecone_key
```

In `server.js`:

```js
require("dotenv").config();

const COHERE_API_KEY = process.env.COHERE_API_KEY;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
```

---

## 🚦 Run the App

**Terminal 1 — Backend**
```bash
cd server
node server.js
# Runs on http://localhost:8000
```

**Terminal 2 — Frontend**
```bash
npm run dev
# Runs on http://localhost:5173
```

---

## 📁 Folder Structure

```
Website-Chatbot/
├── public/
├── src/
│   ├── App.jsx
│   └── main.jsx
├── server/
│   ├── server.js
│   └── vector_stores/
├── .env
├── README.md
├── package.json
└── ...
```

---

## 🙌 Acknowledgments

- [LangChain](https://www.langchain.com/)
- [Cohere](https://cohere.com/)
- [Puppeteer](https://pptr.dev/)
- [Pinecone](https://www.pinecone.io/)

---

<div align="center">
  Built with ❤️ by [Kartik Garg](https://github.com/kartik0905)
</div>
