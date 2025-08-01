# 🤖 Website-ChatBot: AI Knowledge Base Builder

Turn any webpage into a queryable, AI-powered knowledge base. Scrape once, ask forever — powered by Google's Gemini AI, LangChain, and FAISS vector search.

---

## 📚 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Folder Structure](#folder-structure)
- [Future Enhancements](#future-enhancements)
- [License](#license)

---

## ✨ Features

- **One-Time Scraping, Persistent Memory**  
  Website is scraped and indexed once, with future questions answered instantly using the stored vector knowledge.

- **Semantic Understanding via Embeddings**  
  Uses Google’s embedding models for deep conceptual understanding, not just keyword matching.

- **FAISS-Powered Semantic Search**  
  Fast and accurate similarity search on content vectors using FAISS.

- **Intelligent Puppeteer Scraper**  
  Handles JavaScript-heavy sites, accepts cookie banners, and extracts relevant content from semantic HTML tags.

- **LLM-Powered Answering**  
  Gemini AI provides natural and context-aware responses based on the retrieved knowledge.

- **Robust API Backend**  
  Clean Express server with modular routes, error handling, and job management.

---

## ⚙️ Architecture

### 🧠 Index-Then-Ask Pipeline

#### 1. Indexing (`/index-website`)

- **Scrape:** Puppeteer visits the site and extracts readable content.
- **Chunk:** LangChain splits content into overlapping text chunks.
- **Embed:** GoogleGenerativeAIEmbeddings converts chunks to vectors.
- **Store:** Chunks + vectors saved into FAISS vector store.

#### 2. Querying (`/ask-indexed`)

- **Load Store:** FAISS vector store loaded for the requested URL.
- **Embed Question:** User query converted to vector.
- **Search:** FAISS finds similar chunks.
- **Answer:** Gemini LLM generates answer based on matched chunks.

---

## 🛠️ Tech Stack

### Backend & AI

- **Node.js** + **Express**
- **Puppeteer** – Headless web scraping
- **LangChain** – Text splitting and orchestration
- **FAISS** – Local vector similarity search
- **Google Gemini AI** – Embeddings and natural language responses

### Frontend

- **React** – UI Framework
- **Tailwind CSS** – Styling
- **Vite** – Dev server & bundler

---

## 🚀 Getting Started

### Prerequisites

- Node.js and npm installed
- A Google AI API Key ([get it here](https://makersuite.google.com/app/apikey))
