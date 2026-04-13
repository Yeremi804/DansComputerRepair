"use client";

import { useEffect, useRef, useState } from "react";
import { askGemini } from "../actions";
import { supabase } from "@/lib/supabase/client";

export const UNKNOWN_RESPONSE =
  "I'm not sure based on that. Please submit a service request with your device details and issue summary so the team can follow up with the right next steps.";

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

export function getShortcutResponse(userText) {
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
  const [isDark, setIsDark] = useState(false);
  const [chatbotVisible, setChatbotVisible] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(false);

  const messageEndRef = useRef(null);

  useEffect(() => {
    async function loadChatbotVisibility() {
      setSettingsLoading(true);

      const { data, error } = await supabase
        .from("site_content")
        .select("published")
        .eq("key", "chatbot_settings")
        .maybeSingle();

        if (error) {
          console.error("failed to load chatbot settings:", error);
          setChatbotVisible(true);
          setSettingsLoading(false);
          return;
        }

        setChatbotVisible(data?.published?.enabled ?? true);
        setSettingsLoading(false);
      }

      loadChatbotVisibility();
  }, []);

  useEffect(() => {
    const syncTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    syncTheme();

    if (typeof MutationObserver === "undefined") {
      return undefined;
    }

    const observer = new MutationObserver(() => {
      syncTheme();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof messageEndRef.current?.scrollIntoView === "function") {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
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

  if (!chatbotVisible) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[1000] flex flex-col items-end">
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="pointer-events-auto h-14 w-14 flex items-center justify-center rounded-full bg-gradient-to-br from-sky-600 to-blue-700 text-white shadow-xl shadow-blue-500/30 transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Open chatbot"
        >
          <span className="text-2xl leading-none">✦</span>
        </button>
      )}

      {isOpen && (
        <div
          className={`pointer-events-auto w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border shadow-2xl transition-all duration-200 ${
            isDark ? "border-gray-700 bg-gray-900 shadow-black/40" : "border-slate-200 bg-white shadow-slate-900/20"
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

          <div className={`h-80 space-y-3 overflow-y-auto px-3 py-4 ${isDark ? "bg-gray-950" : "bg-slate-50"}`}>
            {messages.length === 0 && (
              <p className={`rounded-xl p-3 text-sm shadow-sm ${isDark ? "bg-gray-900 text-gray-300" : "bg-white text-slate-600"}`}>
                Hi, I can help with repair questions, service options, and request steps.
              </p>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                  message.role === "user"
                    ? "ml-auto bg-blue-600 text-white"
                    : isDark
                      ? "mr-auto bg-gray-900 text-gray-100"
                      : "mr-auto bg-white text-slate-800"
                }`}
              >
                <p>{message.text}</p>
                {message.links?.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`mt-1 block font-medium underline ${isDark ? "text-blue-300 hover:text-blue-200" : "text-blue-700 hover:text-blue-800"}`}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            ))}
            {loading && (
              <div className={`mr-auto rounded-2xl px-3 py-2 text-sm shadow-sm ${isDark ? "bg-gray-900 text-gray-400" : "bg-white text-slate-500"}`}>
                Thinking...
              </div>
            )}
            <div ref={messageEndRef} />
          </div>

          <div className={`border-t p-3 ${isDark ? "border-gray-700 bg-gray-900" : "border-slate-200 bg-white"}`}>
            <div className="flex gap-2">
              <input
                className={`flex-1 rounded-xl border px-3 py-2 text-sm outline-none transition ${isDark ? "border-gray-600 bg-gray-800 text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-900" : "border-slate-300 bg-white text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"}`}
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
      )}
    </div>
  );
}
