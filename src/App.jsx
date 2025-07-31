import React, { useState, useRef, useEffect } from "react";


// This is a reusable template. It doesn't draw a specific shape on its own
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

// sits inside the input field giving the user hints that they should have to enter something here
const GlobeIcon = () => (
  <Icon
    path="M12 21a9 9 0 010-18h.01a9 9 0 010 18zM3.93 9h16.14M3.93 15h16.14"
    className="w-5 h-5 text-gray-400"
  />
);

// It's the clickable "send" button inside the chat input box at the bottom of the screen
const SendIcon = () => (
  <Icon
    path="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
    className="w-6 h-6"
  />
);

// This is the avatar for the chatbot. It appears next to every message that the bot sends.
const BotIcon = () => (
  <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
    <Icon
      path="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.25 12L17 14.188l-1.25-2.188a2.25 2.25 0 00-1.7-1.7L12 9.25l2.188-1.25a2.25 2.25 0 001.7-1.7L17 4.063l1.25 2.187a2.25 2.25 0 001.7 1.7L22.75 9l-2.187 1.25a2.25 2.25 0 00-1.7 1.7z"
      className="w-5 h-5"
    />
  </div>
);

//  This is the avatar for you, the user. It appears next to every message that you send.
const UserIcon = () => (
  <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
    <Icon
      path="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      className="w-5 h-5"
    />
  </div>
);

// --- Main App Component ---

export default function App() {
  const [url, setUrl] = useState(""); // Remembers the text user enters
  const [isUrlSet, setIsUrlSet] = useState(false); // boolean switch for selecting to switch between "enter URl screen" and "Chat Screen"
  const [isLoading, setIsLoading] = useState(false); //  It remembers if the app is busy waiting for a response
  const [messages, setMessages] = useState([]); //  A list (an array) that remembers every message in the conversation
  const [currentQuery, setCurrentQuery] = useState(""); // Remembers the text the user types into the question box at the bottom

  const chatEndRef = useRef(null);

  // Effect to scroll to the bottom of the chat on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // This runs when you click "Start Chat"
  const handleSetUrl = () => {
    if (url.trim() === "") {
      alert("Please enter a valid URL.");
      return;
    }
    setIsLoading(true);
    // In a real app, you would send the URL to the backend scraper here.
    // We'll simulate a delay for demonstration.
    setTimeout(() => {
      setIsUrlSet(true);
      setIsLoading(false);
      setMessages([
        {
          sender: "bot",
          text: `Great! I've processed the content from "${url}". What would you like to know?`,
        },
      ]);
    }, 2000);
  };

  //  This runs when you click the Send icon

  const handleSendMessage = () => {
    if (currentQuery.trim() === "" || isLoading) return;

    const newMessages = [...messages, { sender: "user", text: currentQuery }];
    setMessages(newMessages);
    setCurrentQuery("");
    setIsLoading(true);

    // Simulate backend call for Q&A
    setTimeout(() => {
      // This is where you would get the real answer from the Gemini API
      const botResponse = `This is a simulated answer to your question: "${currentQuery}". In a real app, this would be an intelligent response based on the website's content.`;
      setMessages([...newMessages, { sender: "bot", text: botResponse }]);
      setIsLoading(false);
    }, 2500);
  };

  const handleReset = () => {
    setUrl("");
    setIsUrlSet(false);
    setMessages([]);
    setCurrentQuery("");
  };

  // The main UI render
  return (
    <div className="font-sans bg-gray-100 flex items-center justify-center min-h-screen">
      <div className="w-full max-w-2xl h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-gray-800 text-white p-4 flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-3">
            <BotIcon />
            <h1 className="text-xl font-bold">Website Chatbot</h1>
          </div>
          {isUrlSet && (
            <button
              onClick={handleReset}
              className="text-sm bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg transition-colors duration-300"
            >
              Reset
            </button>
          )}
        </header>

        {/* This if else statement is responsible for switching from input to chat UI in the project  */}

        <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-gray-50">
          {!isUrlSet ? (
            // URL Input Screen
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-full max-w-md">
                <h2 className="text-2xl font-semibold text-gray-700 mb-2">
                  Welcome!
                </h2>
                <p className="text-gray-500 mb-6">
                  Enter a website URL to begin chatting with its content.
                </p>

                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <GlobeIcon />
                  </span>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && !isLoading && handleSetUrl()
                    }
                    placeholder="https://www.example.com"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow duration-200"
                    disabled={isLoading}
                  />
                </div>

                <button
                  onClick={handleSetUrl}
                  disabled={isLoading}
                  className="mt-4 w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center"
                >
                  {isLoading ? (
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
                      Processing...
                    </>
                  ) : (
                    "Start Chat"
                  )}
                </button>
              </div>
            </div>
          ) : (
            // Chat Interface Screen
            <div className="flex-1 space-y-6">
              {/* display the messages */}
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
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Chat Input Area */}
        {isUrlSet && (
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="relative">
              <input
                type="text"
                value={currentQuery}
                onChange={(e) => setCurrentQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Ask a question..."
                className="w-full pr-12 pl-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow duration-200"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
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
