"use client";

import { useEffect, useState } from "react";

export default function FAQAccordion({ items }) {
  const [openIndex, setOpenIndex] = useState(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const syncTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    syncTheme();

    const observer = new MutationObserver(() => {
      syncTheme();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"]
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const panelId = `faq-panel-${index}`;
        const buttonId = `faq-button-${index}`;

        return (
          <div
            key={index}
            className={`overflow-hidden rounded-lg shadow-sm transition hover:shadow-md ${
              isDark
                ? "border border-gray-700 bg-gray-900"
                : "border border-pink-200 bg-white"
            }`}
          >
            <button
              id={buttonId}
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="flex w-full items-center justify-between px-6 py-5 text-left"
            >
              <h2 className={`text-xl font-semibold ${isDark ? "text-pink-400" : "text-pink-800"}`}>{item.question}</h2>
              <span
                className={`ml-4 inline-flex h-8 w-8 items-center justify-center rounded-full transition-transform ${
                  isDark
                    ? "border border-pink-500 text-pink-400"
                    : "border border-pink-300 text-pink-700"
                } ${
                  isOpen ? "rotate-45" : ""
                }`}
                aria-hidden="true"
              >
                +
              </span>
            </button>

            {isOpen ? (
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className={`px-6 pb-6 pt-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}
              >
                <p>{item.answer}</p>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}