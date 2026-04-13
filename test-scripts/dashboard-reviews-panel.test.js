import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReviewsPanel from "@/app/dashboard/admin-reviews/ReviewsPanel";
import { supabase } from "@/lib/supabase/client";


jest.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockOrder = jest.fn();
const mockUpdate = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();

  supabase.from.mockReturnValue({
    select: () => ({
      order: mockOrder,
    }),
    update: () => ({
      eq: mockUpdate,
    }),
  });
});

const mockLocalReviews = [
  {
    id: "local-1",
    name: "Local User",
    rating: 4,
    reviewText: "Great service",
    creationTime: new Date().toISOString(),
    show_on_site: true,
  },
];

const mockYelpReviews = [
  {
    id: 1,
    name: "Yelp User",
    rating: 5,
    review_text: "<span>Yelp Review</span>",
    created_at: new Date().toISOString(),
    show_on_site: true,
  },
];

test("loads and displays reviews", async () => {
  mockOrder.mockResolvedValueOnce({
    data: mockYelpReviews,
    error: null,
  });

  render(<ReviewsPanel initialReviews={mockLocalReviews} />);

  expect(await screen.findByText("Local User")).toBeInTheDocument();
  expect(await screen.findByText("Yelp User")).toBeInTheDocument();
});

test("shows loading state", async () => {
  mockOrder.mockResolvedValueOnce({
    data: [],
    error: null,
  });

  render(<ReviewsPanel initialReviews={[]} />);

  expect(screen.getByText("Loading reviews...")).toBeInTheDocument();

  // ✅ wait for async effect to finish
  await waitFor(() => {
    expect(screen.getByText("No reviews found.")).toBeInTheDocument();
  });
});

test("filters reviews by source", async () => {
  mockOrder.mockResolvedValueOnce({
    data: mockYelpReviews,
    error: null,
  });

  render(<ReviewsPanel initialReviews={mockLocalReviews} />);

  await screen.findByText("Local User");

  const selects = screen.getAllByRole("combobox");
  const filterSelect = selects[0];

  await userEvent.selectOptions(filterSelect, "yelp");

  expect(screen.queryByText("Local User")).not.toBeInTheDocument();
  expect(screen.getByText("Yelp User")).toBeInTheDocument();
});

test("sorts reviews by rating", async () => {
  mockOrder.mockResolvedValueOnce({
    data: [],
    error: null,
  });

  render(
    <ReviewsPanel
      initialReviews={[
        {
          id: "1",
          name: "Low Rating",
          rating: 1,
          reviewText: "Bad",
          creationTime: new Date().toISOString(),
        },
        {
          id: "2",
          name: "High Rating",
          rating: 5,
          reviewText: "Great",
          creationTime: new Date().toISOString(),
        },
      ]}
    />
  );

  await screen.findByText("Low Rating");

  const selects = screen.getAllByRole("combobox");
  const sortSelect = selects[1];

  await userEvent.selectOptions(sortSelect, "rating-desc");

  const names = screen.getAllByRole("heading", { level: 3 });

  expect(names[0]).toHaveTextContent("High Rating");
});

test("toggles visibility and calls supabase update", async () => {
  mockOrder.mockResolvedValueOnce({
    data: mockYelpReviews,
    error: null,
  });

  mockUpdate.mockResolvedValueOnce({ error: null });

  render(<ReviewsPanel initialReviews={[]} />);

  await screen.findByText("Yelp User");

  const button = screen.getByRole("button");

  await userEvent.click(button);

  await waitFor(() => {
    expect(mockUpdate).toHaveBeenCalled();
  });
});

test("shows empty state when no reviews", async () => {
  mockOrder.mockResolvedValueOnce({
    data: [],
    error: null,
  });

  render(<ReviewsPanel initialReviews={[]} />);

  expect(await screen.findByText("No reviews found.")).toBeInTheDocument();
});

test("renders Yelp HTML container", async () => {
  mockOrder.mockResolvedValueOnce({
    data: mockYelpReviews,
    error: null,
  });

  render(<ReviewsPanel initialReviews={[]} />);

  await screen.findByText("Yelp User");

  // Only works if you added data-testid="yelp-review"
  expect(document.querySelector(".yelp-wrapper")).toBeInTheDocument();
});

test("handles supabase fetch error", async () => {
  mockOrder.mockResolvedValueOnce({
    data: null,
    error: { message: "Fetch failed" },
  });

  render(<ReviewsPanel initialReviews={[]} />);

  await waitFor(() => {
    expect(screen.getByText("No reviews found.")).toBeInTheDocument();
  });
});

test("toggle visibility updates UI state", async () => {
  mockOrder.mockResolvedValueOnce({
    data: mockYelpReviews,
    error: null,
  });

  mockUpdate.mockResolvedValueOnce({ error: null });

  render(<ReviewsPanel initialReviews={[]} />);

  await screen.findByText("Yelp User");

  const button = screen.getByRole("button");

  await userEvent.click(button);

  await waitFor(() => {
    // Button should change style (green → gray)
    expect(button.className).toMatch(/text-gray/);
  });
});

test("switching filter back to all shows all reviews", async () => {
  mockOrder.mockResolvedValueOnce({
    data: mockYelpReviews,
    error: null,
  });

  render(<ReviewsPanel initialReviews={mockLocalReviews} />);

  await screen.findByText("Local User");

  const selects = screen.getAllByRole("combobox");
  const filterSelect = selects[0];

  await userEvent.selectOptions(filterSelect, "yelp");
  expect(screen.queryByText("Local User")).not.toBeInTheDocument();

  await userEvent.selectOptions(filterSelect, "all");

  expect(screen.getByText("Local User")).toBeInTheDocument();
  expect(screen.getByText("Yelp User")).toBeInTheDocument();
});

test("sorts reviews by newest first", async () => {
  mockOrder.mockResolvedValueOnce({
    data: [],
    error: null,
  });

  render(
    <ReviewsPanel
      initialReviews={[
        {
          id: "1",
          name: "Old Review",
          rating: 3,
          reviewText: "Old",
          creationTime: "2020-01-01",
        },
        {
          id: "2",
          name: "New Review",
          rating: 3,
          reviewText: "New",
          creationTime: "2025-01-01",
        },
      ]}
    />
  );

  await screen.findByText("Old Review");

  const selects = screen.getAllByRole("combobox");
  const sortSelect = selects[1];

  await userEvent.selectOptions(sortSelect, "date-desc");

  const names = screen.getAllByRole("heading", { level: 3 });

  expect(names[0]).toHaveTextContent("New Review");
});