/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Chatbot, {
  UNKNOWN_RESPONSE,
  getShortcutResponse,
} from "../src/app/components/chatbot";
import { askGemini } from "../src/app/actions";

jest.mock("../src/app/actions", () => ({
  askGemini: jest.fn(),
}));

async function openChatbot() {
  const user = userEvent.setup();

  render(<Chatbot />);
  await user.click(screen.getByRole("button", { name: /open chatbot/i }));

  return user;
}

describe("Chatbot", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("opens and collapses the launcher", async () => {
    const user = userEvent.setup();

    render(<Chatbot />);

    expect(
      screen.getByRole("button", { name: /open chatbot/i })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /open chatbot/i }));
    expect(
      screen.queryByRole("button", { name: /open chatbot/i })
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /collapse chatbot/i }));
    expect(
      screen.getByRole("button", { name: /open chatbot/i })
    ).toBeInTheDocument();
  });

  test("matches service shortcuts locally without calling askGemini", async () => {
    const user = await openChatbot();

    await user.type(
      screen.getByPlaceholderText(/type a question/i),
      "I need to submit a service request"
    );
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(askGemini).not.toHaveBeenCalled();
    expect(
      screen.getByText("Yes. You can submit a request here:")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /service request form/i })
    ).toHaveAttribute("href", "/service-request");
  });

  test("exports shortcut matching for direct coverage", () => {
    expect(getShortcutResponse("Where is the FAQ page?")).toMatchObject({
      text: "You can view frequently asked questions here:",
      links: [{ label: "FAQ", href: "/faq" }],
    });
    expect(getShortcutResponse("Tell me about warranties")).toBeNull();
  });

  test("calls askGemini for non-shortcut questions and shows the unknown fallback link", async () => {
    askGemini.mockResolvedValue(UNKNOWN_RESPONSE);
    const user = await openChatbot();

    await user.type(
      screen.getByPlaceholderText(/type a question/i),
      "   Tell me about warranties   "
    );
    await user.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => {
      expect(askGemini).toHaveBeenCalledWith("Tell me about warranties");
    });

    expect(screen.getByText(UNKNOWN_RESPONSE)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /service request form/i })
    ).toHaveAttribute("href", "/service-request");
  });

  test("shows an error message when askGemini fails", async () => {
    askGemini.mockRejectedValue(new Error("network down"));
    const user = await openChatbot();

    await user.type(
      screen.getByPlaceholderText(/type a question/i),
      "What are your business hours?{enter}"
    );

    await waitFor(() => {
      expect(askGemini).toHaveBeenCalledWith("What are your business hours?");
    });

    expect(
      screen.getByText("I hit an error. Please try again in a moment.")
    ).toBeInTheDocument();
  });
});
