import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ContactFormPage from "../src/app/contact-form/page";
import { createClient } from "@supabase/supabase-js";
import userEvent from "@testing-library/user-event";
import { act } from "react";

jest.mock("@supabase/supabase-js");

jest.spyOn(console, "error").mockImplementation(() => {});
jest.spyOn(console, "log").mockImplementation(() => {});

describe("ContactFormPage", () => {
  let insertMock;

  beforeEach(() => {
    insertMock = jest.fn();

    createClient.mockReturnValue({
      from: () => ({
        insert: insertMock,
      }),
    });
  });

  test("renders all form fields", () => {
    render(<ContactFormPage />);

    expect(screen.getByPlaceholderText("Full Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email Address")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Phone Number")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
  });

  test("updates form inputs when typing", () => {
    render(<ContactFormPage />);

    const nameInput = screen.getByPlaceholderText("Full Name");

    fireEvent.change(nameInput, { target: { value: "John Doe" } });

    expect(nameInput.value).toBe("John Doe");
  });

  test("submits form successfully and shows success message", async () => {
    insertMock.mockResolvedValue({ data: [{ id: 1 }], error: null });

    render(<ContactFormPage />);

    fireEvent.change(screen.getByPlaceholderText("Full Name"), {
      target: { value: "John Doe" },
    });

    fireEvent.change(screen.getByPlaceholderText("Email Address"), {
      target: { value: "john@test.com" },
    });

    fireEvent.change(screen.getByPlaceholderText("Phone Number"), {
      target: { value: "1234567890" },
    });

    fireEvent.change(screen.getByRole("textbox", { name: /message/i }), {
      target: { value: "Hello message" },
   });

    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/thank you for reaching out/i)
      ).toBeInTheDocument();
    });
  });

  test("shows error message when submission fails", async () => {
    insertMock.mockResolvedValue({
      data: null,
      error: { message: "Insert failed" },
    });

    render(<ContactFormPage />);

    fireEvent.change(screen.getByPlaceholderText("Full Name"), {
      target: { value: "John Doe" },
    });

    fireEvent.change(screen.getByPlaceholderText("Email Address"), {
      target: { value: "john@test.com" },
    });

    fireEvent.change(screen.getByRole("textbox", { name: /message/i }), {
      target: { value: "Hello message" },
    });

    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/there was an error submitting your message/i)
      ).toBeInTheDocument();
    });
  });

  test("calls Supabase insert with correct form data", async () => {
  insertMock.mockResolvedValue({ data: [{ id: 1 }], error: null });

  render(<ContactFormPage />);

  const user = userEvent.setup();

  await user.type(screen.getByPlaceholderText("Full Name"), "Jane Doe");
  await user.type(screen.getByPlaceholderText("Email Address"), "jane@test.com");
  await user.type(screen.getByPlaceholderText("Phone Number"), "5551112222");
  await user.type(screen.getByLabelText(/message/i), "Hello there!");

  await user.click(screen.getByRole("button", { name: /submit/i }));

  await waitFor(() => {
    expect(insertMock).toHaveBeenCalledWith([
      expect.objectContaining({
        name: "Jane Doe",
        email: "jane@test.com",
        phone: "5551112222",
        message: "Hello there!",
      }),
    ]);
  });
});

test("clears form fields after successful submission", async () => {
  insertMock.mockResolvedValue({ data: [{ id: 1 }], error: null });

  render(<ContactFormPage />);

  const nameInput = screen.getByPlaceholderText("Full Name");

  fireEvent.change(nameInput, {
    target: { value: "John Doe" },
  });

  fireEvent.change(screen.getByPlaceholderText("Email Address"), {
    target: { value: "john@test.com" },
  });

  fireEvent.change(screen.getByLabelText("Message"), {
    target: { value: "Test message" },
  });

  fireEvent.click(screen.getByRole("button", { name: /submit/i }));

  await waitFor(() => {
    expect(nameInput.value).toBe("");
  });
});

test("success message disappears after timeout", async () => {
  jest.useFakeTimers();

  insertMock.mockResolvedValue({ data: [{ id: 1 }], error: null });

  render(<ContactFormPage />);

  fireEvent.change(screen.getByPlaceholderText("Full Name"), {
    target: { value: "John Doe" },
  });

  fireEvent.change(screen.getByPlaceholderText("Email Address"), {
    target: { value: "john@test.com" },
  });

  fireEvent.change(screen.getAllByRole("textbox")[3], {
    target: { value: "Hello message" },
  });

  fireEvent.click(screen.getByRole("button", { name: /submit/i }));

  await screen.findByText(/thank you for reaching out/i);

  await act(async () => {
    jest.advanceTimersByTime(10000);
  });

  await waitFor(() => {
    expect(
      screen.queryByText(/thank you for reaching out/i)
    ).not.toBeInTheDocument();
  });

  jest.useRealTimers();
});

test("displays error message when Supabase returns error", async () => {
  insertMock.mockResolvedValue({
    data: null,
    error: { message: "Database error" },
  });

  render(<ContactFormPage />);

  fireEvent.change(screen.getByPlaceholderText("Full Name"), {
    target: { value: "John Doe" },
  });

  fireEvent.change(screen.getByPlaceholderText("Email Address"), {
    target: { value: "john@test.com" },
  });

  fireEvent.change(screen.getAllByRole("textbox")[3], {
    target: { value: "Hello message" },
  });

  fireEvent.click(screen.getByRole("button", { name: /submit/i }));

  await waitFor(() => {
    expect(
      screen.getByText(/there was an error submitting your message/i)
    ).toBeInTheDocument();
  });
});
});