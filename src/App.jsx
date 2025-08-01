import React, { useState, useRef, useEffect } from "react";

// Helper Components for Icons 
const Icon = ({ path, className = "w-6 h-6" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);
const GlobeIcon = () => (
  <Icon
    path="M12 21a9 9 0 010-18h.01a9 9 0 010 18zM3.93 9h16.14M3.93 15h16.14"
    className="w-5 h-5 text-gray-400"
  />
);
const SendIcon = () => (
  <Icon
    path="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
    className="w-6 h-6"
  />
);
const BotIcon = () => (
  <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
    {" "}
    <Icon
      path="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.25 12L17 14.188l-1.25-2.188a2.25 2.25 0 00-1.7-1.7L12 9.25l2.188-1.25a2.25 2.25 0 001.7-1.7L17 4.063l1.25 2.187a2.25 2.25 0 001.7 1.7L22.75 9l-2.187 1.25a2.25 2.25 0 00-1.7 1.7z"
      className="w-5 h-5"
    />{" "}
  </div>
);
const UserIcon = () => (
  <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
    {" "}
    <Icon
      path="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      className="w-5 h-5"
    />{" "}
  </div>
);

//Main App Component
export default function App() {
  // --- STATE MANAGEMENT ---
  // This section holds the "memory" of our application.

  // Remembers the URL the user types in the input box.
  const [url, setUrl] = useState("");
  // Tracks the slow, one-time "learning" or "indexing" process. Used for the main loading spinner.
  const [isIndexing, setIsIndexing] = useState(false);
  // Becomes true after the backend successfully creates the knowledge base. Controls the switch to the chat view.
  const [isIndexed, setIsIndexed] = useState(false);
  // Tracks the fast loading state when asking a question (the "thinking..." dots).
  const [isLoading, setIsLoading] = useState(false);
  // An array that stores all the messages in the current conversation.
  const [messages, setMessages] = useState([]);
  // Remembers the text the user is currently typing in the question box.
  const [currentQuery, setCurrentQuery] = useState("");
  // Stores any error messages to display to the user.
  const [error, setError] = useState("");

  // --- REFS AND EFFECTS ---

  // Creates a "bookmark" that we can attach to an element to scroll to it.
  const chatEndRef = useRef(null);

  // This "effect" runs every time the `messages` array changes.
  // Its job is to automatically scroll the chat window to the bottom to show the latest message.
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- CORE FUNCTIONS ---

  /**
   * Handles the one-time indexing of a URL.
   * This function calls the backend to scrape the website, create embeddings,
   * and save the knowledge base to a file.
   */
  const handleIndexUrl = async () => {
    // Basic validation to ensure the URL is not empty.
    if (url.trim() === "") {
      setError("Please enter a valid URL.");
      return;
    }
    // Start the main loading spinner and clear any previous errors/messages.
    setIsIndexing(true);
    setError("");
    setMessages([]);

    try {
      // Send the URL to our backend's /index-website endpoint.
      const response = await fetch("http://localhost:8000/index-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      // If the server responds with an error, parse the error message and throw it.
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to index the website.");
      }

      // If successful, switch the UI to the chat view.
      setIsIndexed(true);
      // Add the first message from the bot to start the conversation.
      setMessages([
        {
          sender: "bot",
          text: `Great! I've learned everything from "${url}". What would you like to know?`,
        },
      ]);
    } catch (err) {
      // If any part of the process fails, show the error message to the user.
      setError(err.message);
    } finally {
      // No matter what happens (success or failure), stop the main loading spinner.
      setIsIndexing(false);
    }
  };

  /**
   * Handles sending a user's question to the backend to get an AI-powered answer.
   * It uses the knowledge base that was created by handleIndexUrl.
   */
  const handleAskQuestion = async () => {
    // Prevent sending empty messages or sending while the bot is already thinking.
    if (currentQuery.trim() === "" || isLoading) return;

    const userQuery = currentQuery;
    // Add the user's message to the chat history immediately for a responsive feel.
    const newMessages = [...messages, { sender: "user", text: userQuery }];
    setMessages(newMessages);
    // Clear the input box.
    setCurrentQuery("");
    // Show the "thinking..." dots.
    setIsLoading(true);
    setError("");

    try {
      // Send the user's question AND the original URL to the /ask-indexed endpoint.
      // The URL is crucial for the server to know which knowledge file to load.
      const response = await fetch("http://localhost:8000/ask-indexed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userQuery, url: url }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "The AI failed to respond.");
      }

      // If successful, get the AI's answer from the response.
      const data = await response.json();
      const botResponse = data.answer;
      // Add the bot's answer to the chat history.
      setMessages([...newMessages, { sender: "bot", text: botResponse }]);
    } catch (err) {
      // If something goes wrong, add an error message to the chat.
      setMessages([
        ...newMessages,
        { sender: "bot", text: `Sorry, I ran into an error: ${err.message}` },
      ]);
    } finally {
      // No matter what, stop the "thinking..." dots.
      setIsLoading(false);
    }
  };

  /**
   * Resets the entire application state to its initial values,
   * allowing the user to start over with a new URL.
   */
  const handleReset = () => {
    setUrl("");
    setIsIndexed(false);
    setIsIndexing(false);
    setMessages([]);
    setCurrentQuery("");
    setError("");
  };

  // --- JSX RENDER ---
  // This section describes what the user sees on the screen.
  return (
    <div className="font-sans bg-gray-100 flex items-center justify-center min-h-screen">
      <div className="w-full max-w-2xl h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header section */}
        <header className="bg-gray-800 text-white p-4 flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-3">
            <BotIcon /> <h1 className="text-xl font-bold">Website Chatbot</h1>
          </div>
          {/* The "Reset" button only appears after a website has been successfully indexed. */}
          {isIndexed && (
            <button
              onClick={handleReset}
              className="text-sm bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg transition-colors duration-300"
            >
              Reset
            </button>
          )}
        </header>

        {/* Main content area */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-gray-50">
          {/* --- Conditional Rendering: Decides which screen to show --- */}
          {/* If a website has NOT been indexed yet, show the URL input screen. */}
          {!isIndexed ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-full max-w-md">
                <h2 className="text-2xl font-semibold text-gray-700 mb-2">
                  Learn from a Website
                </h2>
                <p className="text-gray-500 mb-6">
                  Enter a website URL to create a knowledge base from its
                  content.
                </p>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    {" "}
                    <GlobeIcon />{" "}
                  </span>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && !isIndexing && handleIndexUrl()
                    }
                    placeholder="https://www.example.com/article"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow duration-200"
                    disabled={isIndexing}
                  />
                </div>
                {/* Display any error messages that occur during indexing. */}
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                <button
                  onClick={handleIndexUrl}
                  disabled={isIndexing}
                  className="mt-4 w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center"
                >
                  {/* The button's text and spinner change based on the `isIndexing` state. */}
                  {isIndexing ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Indexing Website...
                    </>
                  ) : (
                    "Index Website"
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* If a website HAS been indexed, show the chat screen. */
            <div className="flex-1 space-y-6">
              {/* Loop through the `messages` array and render a chat bubble for each one. */}
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 ${
                    msg.sender === "user" ? "justify-end" : ""
                  }`}
                >
                  {msg.sender === "bot" && <BotIcon />}
                  <div
                    className={`px-4 py-3 rounded-2xl max-w-lg ${
                      msg.sender === "bot"
                        ? "bg-gray-200 text-gray-800 rounded-bl-none"
                        : "bg-indigo-600 text-white rounded-br-none"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  </div>
                  {msg.sender === "user" && <UserIcon />}
                </div>
              ))}
              {/* Show the "thinking..." dots loading indicator while waiting for an answer. */}
              {isLoading && (
                <div className="flex items-start gap-3">
                  <BotIcon />
                  <div className="px-4 py-3 rounded-2xl bg-gray-200 text-gray-500 rounded-bl-none">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                    </div>
                  </div>
                </div>
              )}
              {/* This is our invisible "bookmark" element for auto-scrolling. */}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* The chat input box only appears after a website has been indexed. */}
        {isIndexed && (
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="relative">
              <input
                type="text"
                value={currentQuery}
                onChange={(e) => setCurrentQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAskQuestion()}
                placeholder="Ask a question..."
                className="w-full pr-12 pl-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow duration-200"
                disabled={isLoading}
              />
              <button
                onClick={handleAskQuestion}
                disabled={isLoading}
                className="absolute inset-y-0 right-0 flex items-center justify-center w-12 h-full text-indigo-600 hover:text-indigo-800 disabled:text-gray-400 transition-colors"
              >
                <SendIcon />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
