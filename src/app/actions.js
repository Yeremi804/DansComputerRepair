'use server'

const RESPONSE_RULES = [
  {
    patterns: [
      "service request",
      "service form",
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
      "drop off repair",
      "drop-off",
      "appointment",
      "get estimate",
      "broken screen",
      "screen repair",
      "won t turn on",
      "wont turn on",
      "data recovery",
    ],
    response:
      "You can submit a repair request on the Service Request page with your device details and issue summary.",
  },
  {
    patterns: ["faq", "common questions", "questions", "help page", "support questions"],
    response: "You can find answers to common questions on the FAQ page.",
  },
  {
    patterns: [
      "computer build",
      "custom pc",
      "build pc",
      "pc build",
      "gaming pc",
      "new computer build",
      "custom computer",
    ],
    response:
      "You can start a custom computer build request from the Computer Building Form page.",
  },
  {
    patterns: ["review", "feedback", "rating", "testimonial", "leave feedback"],
    response: "You can leave feedback on the Review Form page.",
  },
  {
    patterns: ["contact", "contact form", "send message", "message dan", "reach out"],
    response: "You can use the Contact Form page to send a message.",
  },
  {
    patterns: ["price", "cost", "estimate", "quote", "how much"],
    response:
      "Pricing depends on diagnostics and parts. Submit a service request to get an estimate for your specific issue.",
  },
  {
    patterns: ["time", "turnaround", "how long", "ready"],
    response:
      "Turnaround time depends on issue complexity and part availability. Diagnostics usually determine the final timeline.",
  },
  {
    patterns: ["virus", "malware", "slow", "cleanup"],
    response:
      "For malware or performance issues, include symptoms in your service request so diagnostics can start quickly.",
  },
];

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function askGemini(userMessage) {
  const normalized = normalizeText(userMessage || "");

  if (!normalized) {
    return "Ask a question about repairs, pricing, service requests, or turnaround time.";
  }

  const matchedRule = RESPONSE_RULES.find((rule) =>
    rule.patterns.some((pattern) => normalized.includes(pattern))
  );

  if (matchedRule) {
    return matchedRule.response;
  }

  return "I’m not sure based on that. Please submit a service request with your device details and issue summary so the team can follow up with the right next steps.";
}
