import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ServiceRequestPage from "../src/app/service-request/page";

// Mock the exact module the page imports
const insertMock = jest.fn();

jest.mock("../src/lib/supabase/client.js", () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: insertMock,
    })),
  },
}));

// Mock toast helpers used by the page
jest.mock("../src/lib/toastNotifs", () => ({
  showFormRequestSentSuccess: jest.fn(),
  showFormRequestSentError: jest.fn(),
}));

jest.spyOn(console, "error").mockImplementation(() => {});
jest.spyOn(console, "log").mockImplementation(() => {});
jest.spyOn(window, "alert").mockImplementation(() => {});

describe("ServiceRequestPage", () => {
  beforeEach(() => {
    insertMock.mockReset();
  });

  test("renders all expected form fields", () => {
    render(<ServiceRequestPage />);

    expect(screen.getByPlaceholderText("Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email Address")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Phone Number")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Type your device here")
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Type your service here")
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        "e.g. After a software update, dropped the device..."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        "Additional info, special requests, or questions"
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /submit request/i })
    ).toBeInTheDocument();
  });

  test("updates form inputs when typing", () => {
    render(<ServiceRequestPage />);

    const nameInput = screen.getByPlaceholderText("Name");

    fireEvent.change(nameInput, { target: { value: "John Doe" } });

    expect(nameInput.value).toBe("John Doe");
  });

  test("submits form successfully and shows success message", async () => {
    insertMock.mockResolvedValue({ error: null });

    render(<ServiceRequestPage />);

    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "John Doe" },
    });

    fireEvent.change(screen.getByPlaceholderText("Email Address"), {
      target: { value: "john@test.com" },
    });

    fireEvent.change(screen.getByPlaceholderText("Phone Number"), {
      target: { value: "1234567890" },
    });

    fireEvent.change(screen.getByPlaceholderText("Type your device here"), {
      target: { value: "Gaming PC" },
    });

    fireEvent.change(screen.getByPlaceholderText("Type your service here"), {
      target: { value: "Diagnostics" },
    });

    fireEvent.change(
      screen.getByPlaceholderText(
        "Additional info, special requests, or questions"
      ),
      {
        target: { value: "Computer is running slow." },
      }
    );

    fireEvent.click(screen.getByRole("button", { name: /submit request/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/submitted — admin will be notified\./i)
      ).toBeInTheDocument();
    });
  });

  test("shows error message when submission fails", async () => {
    insertMock.mockResolvedValue({
      error: { message: "Insert failed" },
    });

    render(<ServiceRequestPage />);

    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "John Doe" },
    });

    fireEvent.change(screen.getByPlaceholderText("Email Address"), {
      target: { value: "john@test.com" },
    });

    fireEvent.change(screen.getByPlaceholderText("Phone Number"), {
      target: { value: "1234567890" },
    });

    fireEvent.change(screen.getByPlaceholderText("Type your device here"), {
      target: { value: "Laptop" },
    });

    fireEvent.change(screen.getByPlaceholderText("Type your service here"), {
      target: { value: "Repair" },
    });

    fireEvent.click(screen.getByRole("button", { name: /submit request/i }));

    await waitFor(() => {
      expect(screen.getByText(/error sending form\./i)).toBeInTheDocument();
    });
  });

  test("shows alert when no device is provided", async () => {
    render(<ServiceRequestPage />);

    fireEvent.change(screen.getByPlaceholderText("Name"), {
      target: { value: "John Doe" },
    });

    fireEvent.change(screen.getByPlaceholderText("Email Address"), {
      target: { value: "john@test.com" },
    });

    fireEvent.change(screen.getByPlaceholderText("Phone Number"), {
      target: { value: "1234567890" },
    });

    fireEvent.change(screen.getByPlaceholderText("Type your service here"), {
      target: { value: "Repair" },
    });

    fireEvent.click(screen.getByRole("button", { name: /submit request/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        "Please select a device or type your device in the 'Or specify' field."
      );
    });
  });

  test("calls Supabase insert with correct form data", async () => {
    insertMock.mockResolvedValue({ error: null });

    render(<ServiceRequestPage />);

    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("Name"), "Jane Doe");
    await user.type(screen.getByPlaceholderText("Email Address"), "jane@test.com");
    await user.type(screen.getByPlaceholderText("Phone Number"), "5551112222");
    await user.type(screen.getByPlaceholderText("Type your device here"), "Laptop");
    await user.type(screen.getByPlaceholderText("Type your service here"), "Repair");
    await user.type(
      screen.getByPlaceholderText(
        "Additional info, special requests, or questions"
      ),
      "Laptop battery issue"
    );

    await user.click(screen.getByRole("button", { name: /submit request/i }));

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledWith([
        expect.objectContaining({
          customer_name: "Jane Doe",
          phone_number: "5551112222",
          email: "jane@test.com",
          device_type: "Laptop",
          service_type: "Repair",
          additional_questions: "Laptop battery issue",
          sms_consent: false,
        }),
      ]);
    });
  });

  test("clears form fields after successful submission", async () => {
    insertMock.mockResolvedValue({ error: null });

    render(<ServiceRequestPage />);

    const nameInput = screen.getByPlaceholderText("Name");
    const emailInput = screen.getByPlaceholderText("Email Address");
    const phoneInput = screen.getByPlaceholderText("Phone Number");
    const deviceInput = screen.getByPlaceholderText("Type your device here");
    const serviceInput = screen.getByPlaceholderText("Type your service here");

    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.change(emailInput, { target: { value: "john@test.com" } });
    fireEvent.change(phoneInput, { target: { value: "1234567890" } });
    fireEvent.change(deviceInput, { target: { value: "Desktop" } });
    fireEvent.change(serviceInput, { target: { value: "Repair" } });

    fireEvent.click(screen.getByRole("button", { name: /submit request/i }));

    await waitFor(() => {
      expect(nameInput.value).toBe("");
      expect(emailInput.value).toBe("");
      expect(phoneInput.value).toBe("");
      expect(deviceInput.value).toBe("");
      expect(serviceInput.value).toBe("");
    });
  });
});