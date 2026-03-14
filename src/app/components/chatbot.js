"use client";

import { useEffect, useRef, useState } from "react";
import { askGemini } from "../actions";

const UNKNOWN_RESPONSE =
  "I’m not sure based on that. Please submit a service request with your device details and issue summary so the team can follow up with the right next steps.";

const CHAT_SHORTCUTS = [
  {
    patterns: [
      "service request",
      "service form",
      "repair form",
      "request form",
      "book repair",
      "repair request",
      "schedule repair",
      "submit request",
      "need repair",
      "fix my computer",
      "fix my laptop",
      "repair my computer",
      "repair my laptop",
      "diagnostic",
      "diagnostics",
      "drop off",
      "drop-off",
      "appointment",
      "get estimate",
    ],
    text: "Yes. You can submit a request here:",
    links: [{ label: "Service Request Form", href: "/service-request" }],
  },
  {
    patterns: ["faq", "questions", "common questions", "help page", "support questions"],
    text: "You can view frequently asked questions here:",
    links: [{ label: "FAQ", href: "/faq" }],
  },
  {
    patterns: [
      "computer build",
      "build pc",
      "custom pc",
      "pc build",
      "gaming pc",
      "new computer build",
      "custom computer",
    ],
    text: "You can start a custom computer build request here:",
    links: [
      {
        label: "Computer Building Form",
        href: "/create-computer-configuration-form",
      },
    ],
  },
  {
    patterns: ["review", "leave feedback", "rating", "testimonial", "feedback"],
    text: "You can leave a review here:",
    links: [{ label: "Review Form", href: "/review-form" }],
  },
  {
    patterns: ["contact", "contact form", "send message", "message dan", "reach out"],
    text: "You can send a message here:",
    links: [{ label: "Contact Form", href: "/contact-form" }],
  },
  {
    patterns: ["home", "homepage", "main page"],
    text: "Here is the homepage:",
    links: [{ label: "Home", href: "/" }],
  },
];

function getShortcutResponse(userText) {
  const normalized = userText.toLowerCase();

  return (
    CHAT_SHORTCUTS.find((shortcut) =>
      shortcut.patterns.some((pattern) => normalized.includes(pattern))
    ) || null
  );
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messageEndRef = useRef(null);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, isOpen]);

  async function handleSend() {
    const trimmedInput = input.trim();
    if (!trimmedInput || loading) return;

    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", text: trimmedInput }]);
    setInput("");

    try {
      const shortcut = getShortcutResponse(trimmedInput);

      if (shortcut) {
        setMessages((prev) => [
          ...prev,
          { role: "model", text: shortcut.text, links: shortcut.links },
        ]);
        return;
      }

      const aiResponse = await askGemini(trimmedInput);
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: aiResponse,
          links:
            aiResponse === UNKNOWN_RESPONSE
              ? [{ label: "Service Request Form", href: "/service-request" }]
              : undefined,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "model", text: "I hit an error. Please try again in a moment." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleInputKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-[1000]">
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[1000] h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sky-600 to-blue-700 text-white shadow-xl shadow-blue-500/30 transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Open chatbot"
        >
          <span className="text-2xl leading-none">✦</span>
        </button>
      )}

      <div
        className={`w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 transition-all duration-200 ${
          isOpen ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between bg-gradient-to-r from-sky-600 to-blue-700 px-4 py-3 text-white">
          <div>
            <p className="text-sm font-semibold">Dan&apos;s Assistant</p>
            <p className="text-xs text-blue-100">Ask about services and support</p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-md px-2 py-1 text-lg leading-none transition hover:bg-white/20"
            aria-label="Collapse chatbot"
          >
            −
          </button>
        </div>

        <div className="h-80 space-y-3 overflow-y-auto bg-slate-50 px-3 py-4">
          {messages.length === 0 && (
            <p className="rounded-xl bg-white p-3 text-sm text-slate-600 shadow-sm">
              Hi, I can help with repair questions, service options, and request steps.
            </p>
          )}
          {messages.map((message, index) => (
            <div
              key={index}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                message.role === "user"
                  ? "ml-auto bg-blue-600 text-white"
                  : "mr-auto bg-white text-slate-800"
              }`}
            >
              <p>{message.text}</p>
              {message.links?.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="mt-1 block font-medium text-blue-700 underline hover:text-blue-800"
                >
                  {link.label}
                </a>
              ))}
            </div>
          ))}
          {loading && (
            <div className="mr-auto rounded-2xl bg-white px-3 py-2 text-sm text-slate-500 shadow-sm">
              Thinking...
            </div>
          )}
          <div ref={messageEndRef} />
        </div>

        <div className="border-t border-slate-200 bg-white p-3">
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Type a question..."
            />
            <button
              type="button"
              onClick={handleSend}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              disabled={loading || !input.trim()}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
