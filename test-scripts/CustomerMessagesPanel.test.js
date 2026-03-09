import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CustomerMessagesPanel from "../src/app/dashboard/customer-messages/CustomerMessagesPanel";
import { createClient } from "@supabase/supabase-js";

const updateMock = jest.fn();

jest.mock("@supabase/supabase-js", () => {
  const mockMessages = [
    {
      id: 1,
      name: "James Test",
      email: "james@email.com",
      message: "First message",
      phone: "",
      status: "Pending",
      created_at: "2024-01-01T00:00:00Z",
    },
    {
      id: 2,
      name: "Alice Smith",
      email: "alice@email.com",
      message: "Second message",
      phone: "",
      status: "Checked",
      created_at: "2024-02-01T00:00:00Z",
    },
  ];

  return {
    createClient: jest.fn(() => ({
      from: () => ({
        select: () => ({
          order: () =>
            Promise.resolve({
              data: mockMessages,
              error: null,
            }),
        }),
        update: updateMock.mockReturnValue({
          eq: () => ({
            select: () =>
              Promise.resolve({
                data: [{ id: 1, status: "Checked" }],
                error: null,
              }),
          }),
        }),
      }),
    })),
  };
});



test("renders search input", async () => {
  render(<CustomerMessagesPanel />);

  const searchInput = screen.getByPlaceholderText("Search messages");

  expect(searchInput).toBeInTheDocument();
});

test("loads messages from supabase", async () => {
  render(<CustomerMessagesPanel />);

  expect(await screen.findByText("James Test")).toBeInTheDocument();
  expect(await screen.findByText("Alice Smith")).toBeInTheDocument();
});

test("search filters messages", async () => {
  render(<CustomerMessagesPanel />);

  await waitFor(() => {
    expect(screen.getByText("James Test")).toBeInTheDocument();
  });

  const searchInput = screen.getByPlaceholderText("Search messages");

  await userEvent.type(searchInput, "Alice");

  expect(screen.queryByText("James Test")).not.toBeInTheDocument();
  expect(screen.getByText("Alice Smith")).toBeInTheDocument();
});

test("status filter works", async () => {
  render(<CustomerMessagesPanel />);

  await screen.findByText("James Test");

  const statusDropdown = screen.getByDisplayValue("All");

  await userEvent.selectOptions(statusDropdown, "Pending");

  expect(screen.getByText("James Test")).toBeInTheDocument();
  expect(screen.queryByText("Alice Smith")).not.toBeInTheDocument();
});

test("sort A-Z works", async () => {
  render(<CustomerMessagesPanel />);

  await waitFor(() => {
    expect(screen.getByText("James Test")).toBeInTheDocument();
  });

  const sortDropdown = screen.getByDisplayValue("Newest");

  await userEvent.selectOptions(sortDropdown, "az");

  const rows = screen.getAllByRole("row");

  expect(rows[1]).toHaveTextContent("Alice Smith");
});

test("newest sorting puts newest message first", async () => {
  render(<CustomerMessagesPanel />);

  await screen.findByText("James Test");

  const rows = screen.getAllByRole("row");

  expect(rows[1]).toHaveTextContent("Alice Smith");
});

test("expand row shows message details", async () => {
  render(<CustomerMessagesPanel />);

  await waitFor(() => {
    expect(screen.getByText("James Test")).toBeInTheDocument();
  });

  const expandButtons = screen.getAllByRole("button");

    await userEvent.click(expandButtons[1]);

    expect(screen.getByText("First message")).toBeInTheDocument();
});

test("clicking expand again collapses message details", async () => {
  render(<CustomerMessagesPanel />);

  await screen.findByText("James Test");

  const expandButtons = screen.getAllByRole("button");

  await userEvent.click(expandButtons[1]);

  expect(screen.getByText("First message")).toBeInTheDocument();

  await userEvent.click(expandButtons[1]);

  expect(screen.queryByText("First message")).not.toBeInTheDocument();
});

test("handles supabase fetch error", async () => {
  createClient.mockReturnValueOnce({
    from: () => ({
      select: () => ({
        order: () =>
          Promise.resolve({
            data: null,
            error: { message: "Fetch failed" },
          }),
      }),
    }),
  });

  render(<CustomerMessagesPanel />);

  await waitFor(() => {
    expect(screen.queryByText("James Test")).not.toBeInTheDocument();
  });
});

test("clearing search shows all messages again", async () => {
  render(<CustomerMessagesPanel />);

  await screen.findByText("James Test");

  const searchInput = screen.getByPlaceholderText("Search messages");

  await userEvent.type(searchInput, "Alice");

  expect(screen.queryByText("James Test")).not.toBeInTheDocument();

  await userEvent.clear(searchInput);

  expect(screen.getByText("James Test")).toBeInTheDocument();
  expect(screen.getByText("Alice Smith")).toBeInTheDocument();
});

test("changing status calls supabase update", async () => {
  render(<CustomerMessagesPanel />);

  await screen.findByText("James Test");

  const row = screen.getByText("James Test").closest("tr");
  const statusSelect = row.querySelector("select");

  await userEvent.selectOptions(statusSelect, "Checked");

  await waitFor(() => {
    expect(updateMock).toHaveBeenCalled();
  });
});

test("shows N/A when phone is missing", async () => {
  render(<CustomerMessagesPanel />);

  await screen.findByText("James Test");

  const expandButtons = screen.getAllByRole("button");

  await userEvent.click(expandButtons[1]);

  expect(screen.getByText("N/A")).toBeInTheDocument();
});



