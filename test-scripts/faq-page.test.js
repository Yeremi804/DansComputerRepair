import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FAQPage from "../src/app/faq/page";

const faqItems = [
  {
    question: "What types of devices do you repair?",
    answer:
      "We repair a wide range of devices including laptops, desktops, and custom-built PCs. We also offer IT services for network setup and troubleshooting.",
  },
  {
    question: "How do I schedule a repair or service?",
    answer:
      "You can schedule a repair or service by contacting us through our website, giving us a call, or reaching out via Yelp. We will work with you to find a convenient time for your appointment.",
  },
  {
    question: "What is your turnaround time for repairs?",
    answer:
      "Turnaround time varies depending on the issue and parts availability, but we typically aim to complete repairs within 24 hours.",
  },
  {
    question: "Do you offer on-site support?",
    answer:
      "Yes, we offer on-site support for certain services such as network setup and troubleshooting. Please contact us to discuss your specific needs.",
  },
  {
    question: "Do you have a storefront I can visit?",
    answer:
      "We do not have a physical storefront at this time. All services are provided on-site or remotely.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept cash, credit/debit cards, and mobile payment options. Payment is due upon completion of the service.",
  },
  {
    question: "Do you provide warranties on your repairs?",
    answer:
      "Yes, we offer a warranty on our repairs. The length of the warranty depends on the type of repair performed. Please ask for details when you bring in your device.",
  },
];

function renderPage() {
  render(<FAQPage />);
}

describe("FAQPage", () => {
  test("renders the page heading 'Frequently Asked Questions'", () => {
    renderPage();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /frequently asked questions/i,
      })
    ).toBeInTheDocument();
  });

  test("renders all 7 FAQ entries currently defined on the page", () => {
    renderPage();

    const questionButtons = screen.getAllByRole("button");

    expect(questionButtons).toHaveLength(7);

    faqItems.forEach(({ question }) => {
      expect(
        screen.getByRole("button", {
          name: question,
        })
      ).toBeInTheDocument();
    });
  });

  test("shows each FAQ question while collapsed and hides all answers on initial load", () => {
    renderPage();

    faqItems.forEach(({ question, answer }) => {
      const button = screen.getByRole("button", { name: question });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByText(answer)).not.toBeInTheDocument();
    });

    expect(screen.queryAllByRole("region")).toHaveLength(0);
  });

  test("clicking a question opens its answer", async () => {
    const user = userEvent.setup();
    renderPage();

    const item = faqItems[0];
    const button = screen.getByRole("button", { name: item.question });

    await user.click(button);

    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(item.answer)).toBeInTheDocument();
    expect(screen.getByRole("region")).toHaveAttribute(
      "aria-labelledby",
      button.id
    );
  });

  test("clicking the same open question again closes it", async () => {
    const user = userEvent.setup();
    renderPage();

    const item = faqItems[0];
    const button = screen.getByRole("button", { name: item.question });

    await user.click(button);
    expect(screen.getByText(item.answer)).toBeInTheDocument();

    await user.click(button);

    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(item.answer)).not.toBeInTheDocument();
    expect(screen.queryAllByRole("region")).toHaveLength(0);
  });

  test("opening one question closes the previously open question", async () => {
    const user = userEvent.setup();
    renderPage();

    const firstItem = faqItems[0];
    const secondItem = faqItems[1];
    const firstButton = screen.getByRole("button", { name: firstItem.question });
    const secondButton = screen.getByRole("button", { name: secondItem.question });

    await user.click(firstButton);
    expect(screen.getByText(firstItem.answer)).toBeInTheDocument();
    expect(firstButton).toHaveAttribute("aria-expanded", "true");

    await user.click(secondButton);

    expect(firstButton).toHaveAttribute("aria-expanded", "false");
    expect(secondButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByText(firstItem.answer)).not.toBeInTheDocument();
    expect(screen.getByText(secondItem.answer)).toBeInTheDocument();
    expect(screen.getAllByRole("region")).toHaveLength(1);
  });

  test("the expand icon visually changes when an item is open", async () => {
    const user = userEvent.setup();
    renderPage();

    const item = faqItems[0];
    const button = screen.getByRole("button", { name: item.question });
    const icon = within(button).getByText("+");

    expect(icon).not.toHaveClass("rotate-45");

    await user.click(button);
    expect(icon).toHaveClass("rotate-45");

    await user.click(button);
    expect(icon).not.toHaveClass("rotate-45");
  });
});
