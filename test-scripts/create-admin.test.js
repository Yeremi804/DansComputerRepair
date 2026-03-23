import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateAdminAccountPage from "@/app/create-admin-account/page";
import { signUp } from "@/app/(auth)/actions";

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

jest.mock("@/app/(auth)/actions", () => ({
  signUp: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  global.requestAnimationFrame = (cb) => cb();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("CreateAdminAccountPage", () => {
  test("renders the create admin account page", () => {
    render(<CreateAdminAccountPage />);

    expect(screen.getByText(/create admin account/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign up/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/first name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/last name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/email address/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/phone number/i)).toBeInTheDocument();
  });

  test("shows password validation error and does not submit if password is too short", async () => {
    const user = userEvent.setup();
    render(<CreateAdminAccountPage />);

    await user.type(screen.getByPlaceholderText(/email address/i), "admin@test.com");

    const passwordInputs = screen.getAllByPlaceholderText(/minimum 10 characters/i);
    await user.type(passwordInputs[0], "short");

    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(
      screen.getByText(/password must be at least 10 characters/i)
    ).toBeInTheDocument();

    expect(signUp).not.toHaveBeenCalled();
  });

  test("submits valid signup data and shows success message", async () => {
    const user = userEvent.setup();

    signUp.mockResolvedValue({
      ok: true,
      message: "Account created.",
      needsConfirmation: true,
    });

    render(<CreateAdminAccountPage />);

    await user.type(screen.getByPlaceholderText(/first name/i), "Jane");
    await user.type(screen.getByPlaceholderText(/last name/i), "Admin");
    await user.type(screen.getByPlaceholderText(/email address/i), "jane@test.com");
    await user.type(screen.getByPlaceholderText(/phone number/i), "5551234567");

    const passwordInputs = screen.getAllByPlaceholderText(/minimum 10 characters/i);
    await user.type(passwordInputs[0], "strongpass123");
    await user.type(passwordInputs[1], "strongpass123");

    await user.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(signUp).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByRole("status")).toHaveTextContent(/account created/i);
  });

  test("shows an error for duplicate email signup", async () => {
    const user = userEvent.setup();

    signUp.mockResolvedValue({
      ok: false,
      error: "An account with this email already exists.",
    });

    render(<CreateAdminAccountPage />);

    await user.type(screen.getByPlaceholderText(/email address/i), "existing@test.com");

    const passwordInputs = screen.getAllByPlaceholderText(/minimum 10 characters/i);
    await user.type(passwordInputs[0], "strongpass123");
    await user.type(passwordInputs[1], "strongpass123");

    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/already exists/i);
  });

  test("shows a server error message for invalid signup input", async () => {
    const user = userEvent.setup();

    signUp.mockResolvedValue({
      ok: false,
      error: "Invalid email format.",
    });

    render(<CreateAdminAccountPage />);

    await user.type(screen.getByPlaceholderText(/email address/i), "bademail");

    const passwordInputs = screen.getAllByPlaceholderText(/minimum 10 characters/i);
    await user.type(passwordInputs[0], "strongpass123");
    await user.type(passwordInputs[1], "strongpass123");

    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/invalid email format/i);
  });

  test("resets the form after successful signup when confirmation is required", async () => {
    const user = userEvent.setup();

    signUp.mockResolvedValue({
      ok: true,
      message: "Check your email to confirm your account.",
      needsConfirmation: true,
    });

    render(<CreateAdminAccountPage />);

    const emailInput = screen.getByPlaceholderText(/email address/i);

    await user.type(emailInput, "confirm@test.com");

    const passwordInputs = screen.getAllByPlaceholderText(/minimum 10 characters/i);
    await user.type(passwordInputs[0], "strongpass123");
    await user.type(passwordInputs[1], "strongpass123");

    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(/check your email/i);

    await waitFor(() => {
      expect(emailInput).toHaveValue("");
    });

    expect(pushMock).not.toHaveBeenCalled();
  });

  test.each(Array.from({ length: 20 }))(
    "redirects to /init-mfa after successful signup when confirmation is not required (run #%#)",
    async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      signUp.mockResolvedValue({
        ok: true,
        message: "Account created.",
        needsConfirmation: false,
      });

      render(<CreateAdminAccountPage />);

      await user.type(screen.getByPlaceholderText(/email address/i), "new@test.com");

      const passwordInputs = screen.getAllByPlaceholderText(/minimum 10 characters/i);
      await user.type(passwordInputs[0], "strongpass123");
      await user.type(passwordInputs[1], "strongpass123");

      await user.click(screen.getByRole("button", { name: /sign up/i }));

      expect(await screen.findByRole("status")).toHaveTextContent(/account created/i);

      jest.advanceTimersByTime(700);

      await waitFor(() => {
        expect(pushMock).toHaveBeenCalledWith("/init-mfa");
      });
    }
  );

  test("shows fallback error message when signup fails without an error message", async () => {
    const user = userEvent.setup();

    signUp.mockResolvedValue({
      ok: false,
    });

    render(<CreateAdminAccountPage />);

    await user.type(screen.getByPlaceholderText(/email address/i), "test@test.com");

    const passwordInputs = screen.getAllByPlaceholderText(/minimum 10 characters/i);
    await user.type(passwordInputs[0], "strongpass123");
    await user.type(passwordInputs[1], "strongpass123");

    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/something went wrong/i);
  });
});
