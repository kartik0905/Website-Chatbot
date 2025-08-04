import React, { useState, useRef, useEffect } from "react";

// --- Helper Components ---
const Icon = ({ path, className = "w-6 h-6" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    {" "}
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />{" "}
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

// --- Main App Component ---
export default function App() {
  const [url, setUrl] = useState(""); // Remembers the URL the user wants to crawl.
  const [jobId, setJobId] = useState(null); // Stores the unique ID for the current crawl job.
  const [crawlStatus, setCrawlStatus] = useState("idle"); /// The "traffic light" for the UI: idle, crawling, complete, or error.
  const [logs, setLogs] = useState([]); // An array that stores the live progress messages from the server.
  const [isReadyToChat, setIsReadyToChat] = useState(false); // Becomes true when the crawl is complete, allowing the chat UI to show.
  const [messages, setMessages] = useState([]); // Stores the messages in the chat conversation.
  const [currentQuery, setCurrentQuery] = useState(""); // Remembers the text in the question input box.
  const [isLoading, setIsLoading] = useState(false); // For the "thinking..." dots when asking a question.
  const [error, setError] = useState(""); // Stores any error messages to display to the user.

  const logEndRef = useRef(null); // A "bookmark" for the bottom of the log viewer for auto-scrolling.
  const chatEndRef = useRef(null); // A "bookmark" for the bottom of the chat window for auto-scrolling.

  // --- The "Live Update" Engine (Polling Effect) ---
  useEffect(() => {
    // This effect only runs if we have a job ID and the status is "crawling".
    if (!jobId || crawlStatus !== "crawling") return;

    // Start a timer that will "poll" (ask for updates from) the server every 2 seconds.
    const intervalId = setInterval(async () => {
      try {
        // Ask the server for the latest status of our specific job.
        const response = await fetch(
          `http://localhost:8000/crawl-status/${jobId}`
        );
        if (!response.ok) return; // If the server has a temporary error, just wait for the next poll.

        const data = await response.json();
        // Update our local logs with the latest logs from the server.
        setLogs(data.logs);

        // If the server says the job is done (complete or error), we stop polling.
        if (data.status === "complete" || data.status === "error") {
          setCrawlStatus(data.status); // Update the overall status.
          setIsReadyToChat(data.status === "complete"); // Allow chatting only if it was a success.
          clearInterval(intervalId); // CRITICAL: This stops the timer from running forever.
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 2000);

    // This cleanup function is CRITICAL. It runs when the component unmounts
    // to prevent memory leaks from the timer.
    return () => clearInterval(intervalId);
  }, [jobId, crawlStatus]); // This effect re-runs only when jobId or crawlStatus changes.

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStartCrawl = async () => {
    if (url.trim() === "") {
      setError("Please enter a valid starting URL.");
      return;
    }
    setCrawlStatus("crawling");
    setError("");
    setLogs(["Starting crawl..."]);
    setMessages([]);
    setIsReadyToChat(false);

    try {
      const response = await fetch("http://localhost:8000/crawl-and-index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startUrl: url }),
      });

      const data = await response.json();
      if (response.status === 200) {
        // Knowledge base already existed
        setCrawlStatus("complete");
        setIsReadyToChat(true);
        setLogs([data.message]);
      } else if (response.status === 202) {
        // Crawl started successfully
        setJobId(data.jobId); // Save the Job ID to start polling
      } else {
        throw new Error(data.error || "Failed to start crawl.");
      }
    } catch (err) {
      setError(err.message);
      setCrawlStatus("error");
    }
  };

  const handleAskQuestion = async () => {
    if (currentQuery.trim() === "" || isLoading) return;
    const userQuery = currentQuery;
    const newMessages = [...messages, { sender: "user", text: userQuery }];
    setMessages(newMessages);
    setCurrentQuery("");
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:8000/ask-crawler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userQuery, baseUrl: url }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error);
      }
      const data = await response.json();
      setMessages([...newMessages, { sender: "bot", text: data.answer }]);
    } catch (err) {
      setMessages([
        ...newMessages,
        { sender: "bot", text: `Sorry, an error occurred: ${err.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setUrl("");
    setJobId(null);
    setCrawlStatus("idle");
    setLogs([]);
    setIsReadyToChat(false);
    setMessages([]);
    setCurrentQuery("");
    setError("");
  };

  const renderContent = () => {
    if (crawlStatus === "idle" || crawlStatus === "error") {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-full max-w-md">
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              Create a Website Expert
            </h2>
            <p className="text-gray-500 mb-6">
              Enter a starting URL. The crawler will learn from the entire
              website to answer your questions.
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
                onKeyPress={(e) => e.key === "Enter" && handleStartCrawl()}
                placeholder="https://www.example.com"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg"
              />
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <button
              onClick={handleStartCrawl}
              className="mt-4 w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700"
            >
              Crawl & Index Website
            </button>
          </div>
        </div>
      );
    }

    if (
      crawlStatus === "crawling" ||
      (crawlStatus === "complete" && !isReadyToChat)
    ) {
      return (
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Crawler Progress...
          </h2>
          <div className="bg-gray-900 text-white font-mono text-xs p-4 rounded-lg shadow-md h-[60vh] overflow-y-auto">
            {logs.map((log, index) => (
              <p key={index} className="text-green-400">
                {log}
              </p>
            ))}
            {crawlStatus === "crawling" && (
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mt-2"></div>
            )}
            <div ref={logEndRef} />
          </div>
          {crawlStatus === "complete" && (
            <button
              onClick={() => setIsReadyToChat(true)}
              className="mt-4 w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700"
            >
              Start Chatting
            </button>
          )}
        </div>
      );
    }

    if (isReadyToChat) {
      return (
        <>
          <div className="flex-1 space-y-6">
            {messages.length === 0 && (
              <div className="flex items-start gap-3">
                <BotIcon />
                <div className="px-4 py-3 rounded-2xl max-w-lg bg-gray-200 text-gray-800 rounded-bl-none">
                  <p className="text-sm">
                    Knowledge base for <strong>{new URL(url).hostname}</strong>{" "}
                    is ready. What would you like to know?
                  </p>
                </div>
              </div>
            )}
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 ${
                  msg.sender === "user" ? "justify-end" : ""
                }`}
              >
                {" "}
                {msg.sender === "bot" && <BotIcon />}{" "}
                <div
                  className={`px-4 py-3 rounded-2xl max-w-lg ${
                    msg.sender === "bot"
                      ? "bg-gray-200 text-gray-800 rounded-bl-none"
                      : "bg-indigo-600 text-white rounded-br-none"
                  }`}
                >
                  {" "}
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>{" "}
                </div>{" "}
                {msg.sender === "user" && <UserIcon />}{" "}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-3">
                {" "}
                <BotIcon />{" "}
                <div className="px-4 py-3 rounded-2xl bg-gray-200 text-gray-500 rounded-bl-none">
                  {" "}
                  <div className="flex items-center space-x-2">
                    {" "}
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>{" "}
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>{" "}
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>{" "}
                  </div>{" "}
                </div>{" "}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="relative">
              <input
                type="text"
                value={currentQuery}
                onChange={(e) => setCurrentQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAskQuestion()}
                placeholder="Ask a question..."
                className="w-full pr-12 pl-4 py-3 border border-gray-300 rounded-full"
                disabled={isLoading}
              />
              <button
                onClick={handleAskQuestion}
                disabled={isLoading}
                className="absolute inset-y-0 right-0 flex items-center justify-center w-12 h-full text-indigo-600"
              >
                {" "}
                <SendIcon />{" "}
              </button>
            </div>
          </div>
        </>
      );
    }
  };

  return (
    <div className="font-sans bg-gray-100 flex items-center justify-center min-h-screen">
      <div className="w-full max-w-2xl h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <header className="bg-gray-800 text-white p-4 flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-3">
            {" "}
            <BotIcon />{" "}
            <h1 className="text-xl font-bold">
              Website Crawler & Chatbot
            </h1>{" "}
          </div>
          <button
            onClick={handleReset}
            className="text-sm bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg"
          >
            {" "}
            Reset{" "}
          </button>
        </header>

        <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-gray-50">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
