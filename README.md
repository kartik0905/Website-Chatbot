🤖 Website-ChatBot: Chat with Any Website
An intelligent chatbot that can read the content of any live website and answer your questions about it. Simply provide a URL, and start a conversation with the website's knowledge base, powered by Google's Gemini AI.

📍 Table of Contents

Core Features

How It Works

Tech Stack

Setup and Installation

Future Enhancements

✨ Core Features

Dynamic Web Scraping: Utilizes Puppeteer to control a headless browser, ensuring it can scrape content from modern, JavaScript-heavy websites, not just static HTML.

Intelligent Content Extraction: The scraper is smart! It first tries to identify and extract text from the main content area (<main>, <article>) of a page, ignoring irrelevant menus, ads, and footers.

AI-Powered Q&A: Leverages the Google Gemini AI model to understand user questions and provide accurate answers based only on the scraped website content.

Robust Error Handling: Includes mechanisms to handle API rate limits, server overloads, and scraping timeouts gracefully.

Sleek, Responsive UI: A clean and modern chat interface built with React and styled with Tailwind CSS.

⚙️ How It Works

The application is a full-stack project with a clear separation between the frontend and backend.

Frontend (React): The user enters a URL into the React UI.

API Call: The frontend sends the URL to the backend's /scrape endpoint.

Backend (Node.js/Express):

The server receives the URL.

Puppeteer launches a headless browser, navigates to the URL, and intelligently scrapes the main text content.

The scraped text is sent back to the frontend.

User Asks a Question: The user types a question into the chat.

AI Query: The frontend sends the question and the stored website text to the backend's /ask endpoint.

Gemini AI: The backend formats a prompt and queries the Google Gemini API, which generates a context-aware answer.

Response: The final answer is sent back to the frontend and displayed in the chat.

🛠️ Tech Stack

Frontend:

React: For building the user interface.

Tailwind CSS: For utility-first styling.

Backend:

Node.js: As the JavaScript runtime environment.

Express.js: As the web server framework.

Puppeteer: For powerful, headless web scraping.

@google/generative-ai: The official Google AI SDK for JavaScript to interact with the Gemini API.

🚀 Setup and Installation

To run this project locally, follow these steps:

Prerequisites:

Node.js and npm installed.

A Google AI API Key.

1. Clone the Repository:

git clone [https://github.com/your-username/website-chatbot.git](https://github.com/your-username/website-chatbot.git)
cd website-chatbot

2. Set Up the Backend:

# Navigate to the server directory
cd server

# Install backend dependencies
npm install

# Create a .env file and add your API key
# (Or you can paste it directly into server.js)
# YOUR_API_KEY="AIzaSy..." 

3. Set Up the Frontend:

# Navigate back to the root directory and then to the frontend
cd .. 

# Install frontend dependencies
npm install

4. Run the Application:
You'll need two separate terminals to run both the frontend and backend servers.

In Terminal 1 (for the backend):

cd server
node server.js
# Server will be running on http://localhost:8000

In Terminal 2 (for the frontend):

# (from the root directory)
npm run dev
# Frontend will be running on http://localhost:5173 (or similar)

Open your browser and navigate to the frontend URL to start using the chatbot!

🔮 Future Enhancements

This project has a strong foundation that can be extended with even more powerful features:

Vector Embeddings: The next logical step is to implement a vector database (like ChromaDB or Pinecone). This would involve:

Scraping and chunking the entire website content once.

Generating embeddings for each chunk.

Performing a semantic search on user questions to find the most relevant context.
This would make the chatbot faster, more accurate, and capable of handling entire websites instead of just single pages.

