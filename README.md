<div align="center">

# 🤖 AI Web Crawler & Chatbot  
### Transform any website into an intelligent, conversational knowledge base

</div>

<p align="center">
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React"/>
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/LangChain-1E90FF?style=for-the-badge&logo=langchain&logoColor=white" alt="LangChain"/>
  <img src="https://img.shields.io/badge/Puppeteer-40B5A4?style=for-the-badge&logo=puppeteer&logoColor=white" alt="Puppeteer"/>
  <img src="https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white" alt="Google Gemini"/>
</p>

---

## 📌 Overview

This full-stack AI application transforms any website into an intelligent, searchable, and chat-capable knowledge base using a powerful combination of:

- Autonomous web crawling
- Persistent vector-based knowledge storage
- Retrieval-Augmented Generation (RAG)
- Semantic search
- Natural language answering via Google's Gemini

---

## 🚀 The Vision

Create more than just a chatbot. This project gives you a private AI that **fully understands any website** you point it at — no repeated scraping, no shallow Q&A. Just one deep crawl = permanent expert-level knowledge.

---

## ✨ Features

- 🧠 **Autonomous Crawler** — Input a single URL, and the bot navigates the entire site.
- 💾 **One-Time Crawl, Permanent Memory** — Stores embeddings in FAISS for lightning-fast future chats.
- 📊 **Live Crawler Logs** — Watch the bot explore and learn in real-time.
- 🔍 **Semantic Search** — Vector-based search that understands meaning, not just keywords.
- 🧹 **Smart Scraping** — Puppeteer handles modern sites, ignores downloads, clicks cookie banners.
- 🤖 **AI Answers by Gemini** — Answers grounded in context-rich embeddings from your target site.

---

## 🛠️ Tech Stack

| Layer | Technologies | Purpose |
|------|--------------|---------|
| **Frontend** | React, Tailwind CSS | Beautiful, responsive UI |
| **Backend** | Node.js, Express.js | API routes & job management |
| **Crawler** | Puppeteer | Headless browser scraping |
| **AI Orchestration** | LangChain | Text chunking & embedding pipeline |
| **Vector DB** | FAISS | Embedding-based knowledge retrieval |
| **LLM** | Google Gemini | Answer generation & embedding creation |

---

## ⚙️ How It Works (RAG Pipeline)

### Phase 1: Crawl & Index

1. **Start Job**: You input a `startUrl`, server generates a `jobId`.
2. **Live Updates**: Frontend polls crawler logs every 2s.
3. **Crawling & Scraping**: Puppeteer discovers and scrapes all pages.
4. **Vectorizing**: LangChain splits and embeds the content.
5. **Saving**: All vectors are saved into a persistent FAISS store.

### Phase 2: Query Time

1. **Load Knowledge**: The vector DB is loaded into memory.
2. **Semantic Search**: Retrieves top-matching chunks.
3. **AI Response**: Gemini LLM crafts a natural answer using the context.

---

## 🧪 Local Development

### 🔧 Requirements

- Node.js (v18 or higher recommended)
- Google AI API Key (for Gemini)

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

### 2. Add Google API Key

#### 👉 Option 1: Direct In-Code (for testing)

Open `server/server.js` and **replace** the placeholder with your actual key:

```js
// server/server.js

const GOOGLE_API_KEY = "YOUR_API_KEY"; // ← Paste your key here
```

> ⚠️ **Warning**: Never push your real API key to GitHub.

#### ✅ Option 2: Environment Variable (Recommended for production)

1. Create a `.env` file inside the `server/` folder:

```
# server/.env
GOOGLE_API_KEY=your_actual_google_ai_api_key_here
```

2. Install `dotenv` in your backend:

```bash
cd server
npm install dotenv
```

3. Use it in `server.js`:

```js
// server/server.js
require("dotenv").config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
```

---

## 🚦 Run the App

You'll need **two terminals**:

**Terminal 1 — Backend**
```bash
cd server
node server.js
# Runs on http://localhost:8000
```

**Terminal 2 — Frontend**
```bash
# From the root directory
npm run dev
# Typically runs on http://localhost:5173
```

---

## 📁 Project Folder Structure

```
Website-Chatbot/
├── .gitignore          # Tells Git which files to ignore (e.g., node_modules)
├── index.html          # The main HTML entry point for your React app.
├── package.json        # Defines your frontend app and its dependencies (React, etc.).
├── README.md           # Your project's beautiful documentation.
├── public/             # A folder for static assets like images and icons.
│   └── vite.svg
└── src/                # This is where all your frontend source code lives.
│   ├── App.jsx         # The main React component for your UI.
│   ├── index.css       # Global CSS styles (including Tailwind CSS).
│   └── main.jsx        # The file that renders your React app into the HTML.
└── server/             # This folder contains your entire backend application.
    ├── .gitignore      # Tells Git to ignore server-specific files (like vector_stores).
    ├── node_modules/   # All the backend libraries (Express, Puppeteer, LangChain) are installed here.
    ├── package.json    # Defines your backend app and its dependencies.
    ├── server.js       # The main file for your backend server, crawler, and AI logic.
    └── vector_stores/  # This folder is created automatically by your server.
        └── (This is where the saved "knowledge files" for each crawled website will appear).
```

---

## 🙌 Acknowledgments

- [LangChain](https://www.langchain.com/)
- [FAISS by Facebook](https://github.com/facebookresearch/faiss)
- [Google Gemini](https://deepmind.google/technologies/gemini)
- [Puppeteer](https://pptr.dev/)
- Inspired by the dream of making AI more accessible and domain-specific.

---

## 📃 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">
  Built with ❤️ by [Kartik Garg](https://github.com/kartik0905)
</div>