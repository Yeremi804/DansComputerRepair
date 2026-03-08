'use server'

const RESPONSE_RULES = [
  {
    patterns: ["service request", "service form", "book repair", "repair request"],
    response:
      "You can submit a repair request on the Service Request page with your device details and issue summary.",
  },
  {
    patterns: ["faq", "common questions", "questions"],
    response: "You can find answers to common questions on the FAQ page.",
  },
  {
    patterns: ["computer build", "custom pc", "build pc", "pc build"],
    response:
      "You can start a custom computer build request from the Computer Building Form page.",
  },
  {
    patterns: ["review", "feedback", "rating"],
    response: "You can leave feedback on the Review Form page.",
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

  return "I can help with service requests, common repair questions, pricing estimates, and turnaround times. Try adding a few details about your device issue.";
}
