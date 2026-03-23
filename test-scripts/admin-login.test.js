import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminLoginPage from "@/app/admin-log-in/page";
import { supabase } from "@/lib/supabase/client";

const pushMock = jest.fn();
const replaceMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
}));

jest.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      getSession: jest.fn(),
      getUser: jest.fn(),
      signOut: jest.fn(),
      mfa: {
        getAuthenticatorAssuranceLevel: jest.fn(),
        listFactors: jest.fn(),
        challenge: jest.fn(),
        challengeAndVerify: jest.fn(),
      },
    },
    from: jest.fn(),
  },
}));

beforeEach(() => {
    jest.resetAllMocks();

  global.fetch = jest.fn((url) => {
    if (url === "/api/captcha") {
      return Promise.resolve({
        ok: true,
        json: async () => ({ svg: "<svg>captcha</svg>" }),
      });
    }

    if (url === "/api/captcha/verifyCaptcha") {
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    }

    if (url === "/api/session/sync") {
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    }

    return Promise.resolve({
      ok: true,
      json: async () => ({}),
    });
  });

  supabase.from.mockReturnValue({
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    select: jest.fn().mockResolvedValue({}),
  });
});

afterEach(() => {
  jest.useRealTimers();
});

async function renderLoginPage() {
  render(<AdminLoginPage />);
  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith("/api/captcha");
  });
}

test("renders the admin login page", async () => {
    await renderLoginPage();
  
    expect(screen.getByText(/admin log in/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter email address/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign up/i })).toBeInTheDocument();
    expect(screen.getByText(/i am not a robot/i)).toBeInTheDocument();
  });

  test("toggles password visibility", async () => {
    const user = userEvent.setup();
    await renderLoginPage();
  
    const passwordInput = document.querySelector('input[name="password"]');
    expect(passwordInput).toHaveAttribute("type", "password");
  
    await user.click(screen.getByRole("button", { name: /show password/i }));
    expect(passwordInput).toHaveAttribute("type", "text");
  
    await user.click(screen.getByRole("button", { name: /hide password/i }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("opens captcha area when robot box is clicked", async () => {
    const user = userEvent.setup();
    await renderLoginPage();
  
    await user.click(screen.getByText(/i am not a robot/i));
  
    expect(screen.getByPlaceholderText(/type the characters above/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /check/i })).toBeInTheDocument();
  });

  test("shows captcha error when captcha verification fails", async () => {
    const user = userEvent.setup();
  
    global.fetch = jest.fn((url) => {
      if (url === "/api/captcha") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ svg: "<svg>captcha</svg>" }),
        });
      }
  
      if (url === "/api/captcha/verifyCaptcha") {
        return Promise.resolve({
          ok: false,
          json: async () => ({}),
        });
      }
  
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    });
  
    await renderLoginPage();
  
    await user.click(screen.getByText(/i am not a robot/i));
    await user.type(screen.getByPlaceholderText(/type the characters above/i), "wrong");
    await user.click(screen.getByRole("button", { name: /check/i }));
  
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/captcha verification failed/i)
      ).toBeInTheDocument();
    });
  });

  test("shows error if submit is attempted before captcha verification", async () => {
    await renderLoginPage();
  
    fireEvent.submit(screen.getByRole("button", { name: /sign in/i }).closest("form"));
  
    expect(
      screen.getByText(/please complete the captcha verification/i)
    ).toBeInTheDocument();
  
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  test("logs in and redirects to dashboard when current level is aal2", async () => {
    const user = userEvent.setup();
  
    supabase.auth.signInWithPassword.mockResolvedValue({ error: null });
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: "a", refresh_token: "r" } },
    });
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    supabase.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal2" },
      error: null,
    });
  
    await renderLoginPage();
  
    await user.type(screen.getByPlaceholderText(/enter email address/i), " admin@test.com ");
    await user.type(document.querySelector('input[name="password"]'), "password123");
  
    await user.click(screen.getByText(/i am not a robot/i));
    await user.type(screen.getByPlaceholderText(/type the characters above/i), "abcd");
    await user.click(screen.getByRole("button", { name: /check/i }));
  
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /sign in/i })).not.toBeDisabled();
    });
  
    await user.click(screen.getByRole("button", { name: /sign in/i }));
  
    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "admin@test.com",
        password: "password123",
      });
    });
  
    expect(replaceMock).toHaveBeenCalledWith("/dashboard");
  });

  test("shows auth error for invalid credentials", async () => {
    const user = userEvent.setup();
  
    supabase.auth.signInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });
  
    await renderLoginPage();
  
    await user.type(screen.getByPlaceholderText(/enter email address/i), "admin@test.com");
    await user.type(document.querySelector('input[name="password"]'), "wrongpass");
  
    await user.click(screen.getByText(/i am not a robot/i));
    await user.type(screen.getByPlaceholderText(/type the characters above/i), "abcd");
    await user.click(screen.getByRole("button", { name: /check/i }));
  
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /sign in/i })).not.toBeDisabled();
    });
  
    await user.click(screen.getByRole("button", { name: /sign in/i }));
  
    expect(
      await screen.findByText(/invalid login credentials/i)
    ).toBeInTheDocument();
  });

  test("shows error if getUser fails after login", async () => {
    const user = userEvent.setup();
  
    supabase.auth.signInWithPassword.mockResolvedValue({ error: null });
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: "a", refresh_token: "r" } },
    });
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Unable to retrieve user after login." },
    });
  
    await renderLoginPage();
  
    await user.type(screen.getByPlaceholderText(/enter email address/i), "admin@test.com");
    await user.type(document.querySelector('input[name="password"]'), "password123");
  
    await user.click(screen.getByText(/i am not a robot/i));
    await user.type(screen.getByPlaceholderText(/type the characters above/i), "abcd");
    await user.click(screen.getByRole("button", { name: /check/i }));
  
    await user.click(screen.getByRole("button", { name: /sign in/i }));
  
    expect(
      await screen.findByText(/unable to retrieve user after login/i)
    ).toBeInTheDocument();
  });

  test("redirects to init-mfa when user has no verified MFA factor", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  
    supabase.auth.signInWithPassword.mockResolvedValue({ error: null });
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: "a", refresh_token: "r" } },
    });
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    supabase.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal1" },
      error: null,
    });
    supabase.auth.mfa.listFactors.mockResolvedValue({
      data: { totp: [] },
      error: null,
    });
  
    await renderLoginPage();
  
    await user.type(
      screen.getByPlaceholderText(/enter email address/i),
      "admin@test.com"
    );
    await user.type(
      document.querySelector('input[name="password"]'),
      "password123"
    );
  
    await user.click(screen.getByText(/i am not a robot/i));
    await user.type(
      screen.getByPlaceholderText(/type the characters above/i),
      "abcd"
    );
    await user.click(screen.getByRole("button", { name: /check/i }));
  
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /sign in/i })).not.toBeDisabled();
    });
  
    await user.click(screen.getByRole("button", { name: /sign in/i }));
  
    await waitFor(() => {
      expect(supabase.auth.mfa.listFactors).toHaveBeenCalled();
    });
  
    await waitFor(() => {
      expect(
        screen.getByText(/redirecting user to setup mfa/i)
      ).toBeInTheDocument();
    });
  
    jest.advanceTimersByTime(3000);
  
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/init-mfa");
    });
  });

  test("opens MFA modal when verified TOTP factor exists", async () => {
    const user = userEvent.setup();
  
    supabase.auth.signInWithPassword.mockResolvedValue({ error: null });
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: "a", refresh_token: "r" } },
    });
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    supabase.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal1" },
      error: null,
    });
    supabase.auth.mfa.listFactors.mockResolvedValue({
      data: {
        totp: [{ id: "factor-1", status: "verified" }],
      },
      error: null,
    });
    supabase.auth.mfa.challenge.mockResolvedValue({ error: null });
  
    await renderLoginPage();
  
    await user.type(screen.getByPlaceholderText(/enter email address/i), "admin@test.com");
    await user.type(document.querySelector('input[name="password"]'), "password123");
  
    await user.click(screen.getByText(/i am not a robot/i));
    await user.type(screen.getByPlaceholderText(/type the characters above/i), "abcd");
    await user.click(screen.getByRole("button", { name: /check/i }));
  
    await user.click(screen.getByRole("button", { name: /sign in/i }));
  
    expect(
      await screen.findByText(/two-factor verification/i)
    ).toBeInTheDocument();
  });

  test("shows MFA error for invalid verification code", async () => {
    const user = userEvent.setup();
  
    supabase.auth.signInWithPassword.mockResolvedValue({ error: null });
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: "a", refresh_token: "r" } },
    });
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    supabase.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal1" },
      error: null,
    });
    supabase.auth.mfa.listFactors.mockResolvedValue({
      data: {
        totp: [{ id: "factor-1", status: "verified" }],
      },
      error: null,
    });
    supabase.auth.mfa.challenge.mockResolvedValue({ error: null });
    supabase.auth.mfa.challengeAndVerify.mockResolvedValue({
      error: { message: "Invalid code" },
    });
  
    await renderLoginPage();
  
    await user.type(screen.getByPlaceholderText(/enter email address/i), "admin@test.com");
    await user.type(document.querySelector('input[name="password"]'), "password123");
  
    await user.click(screen.getByText(/i am not a robot/i));
    await user.type(screen.getByPlaceholderText(/type the characters above/i), "abcd");
    await user.click(screen.getByRole("button", { name: /check/i }));
    await user.click(screen.getByRole("button", { name: /sign in/i }));
  
    await screen.findByText(/two-factor verification/i);
  
    await user.type(screen.getByPlaceholderText("123456"), "000000");
    await user.click(screen.getByRole("button", { name: /verify/i }));
  
    expect(await screen.findByText(/invalid code/i)).toBeInTheDocument();
  });

  test("redirects to dashboard after successful MFA verification", async () => {
    const user = userEvent.setup();
  
    supabase.auth.signInWithPassword.mockResolvedValue({ error: null });
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: "a", refresh_token: "r" } },
    });
    supabase.auth.getUser
      .mockResolvedValueOnce({
        data: { user: { id: "user-1" } },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { user: { id: "user-1" } },
        error: null,
      });
  
    supabase.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal1" },
      error: null,
    });
    supabase.auth.mfa.listFactors.mockResolvedValue({
      data: {
        totp: [{ id: "factor-1", status: "verified" }],
      },
      error: null,
    });
    supabase.auth.mfa.challenge.mockResolvedValue({ error: null });
    supabase.auth.mfa.challengeAndVerify.mockResolvedValue({ error: null });
  
    await renderLoginPage();
  
    await user.type(screen.getByPlaceholderText(/enter email address/i), "admin@test.com");
    await user.type(document.querySelector('input[name="password"]'), "password123");
  
    await user.click(screen.getByText(/i am not a robot/i));
    await user.type(screen.getByPlaceholderText(/type the characters above/i), "abcd");
    await user.click(screen.getByRole("button", { name: /check/i }));
    await user.click(screen.getByRole("button", { name: /sign in/i }));
  
    await screen.findByText(/two-factor verification/i);
  
    await user.type(screen.getByPlaceholderText("123456"), "123456");
    await user.click(screen.getByRole("button", { name: /verify/i }));
  
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/dashboard");
    });
  });

  test("canceling MFA closes modal and signs user out", async () => {
    const user = userEvent.setup();
  
    supabase.auth.signInWithPassword.mockResolvedValue({ error: null });
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: "a", refresh_token: "r" } },
    });
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    supabase.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal1" },
      error: null,
    });
    supabase.auth.mfa.listFactors.mockResolvedValue({
      data: {
        totp: [{ id: "factor-1", status: "verified" }],
      },
      error: null,
    });
    supabase.auth.mfa.challenge.mockResolvedValue({ error: null });
    supabase.auth.signOut.mockResolvedValue({ error: null });
  
    await renderLoginPage();
  
    await user.type(screen.getByPlaceholderText(/enter email address/i), "admin@test.com");
    await user.type(document.querySelector('input[name="password"]'), "password123");
  
    await user.click(screen.getByText(/i am not a robot/i));
    await user.type(screen.getByPlaceholderText(/type the characters above/i), "abcd");
    await user.click(screen.getByRole("button", { name: /check/i }));
    await user.click(screen.getByRole("button", { name: /sign in/i }));
  
    await screen.findByText(/two-factor verification/i);
  
    await user.click(screen.getByRole("button", { name: /cancel/i }));
  
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  test("clicking sign up navigates to create admin account page", async () => {
    const user = userEvent.setup();
    await renderLoginPage();
  
    await user.click(screen.getByRole("button", { name: /sign up/i }));
  
    expect(pushMock).toHaveBeenCalledWith("/create-admin-account");
  });

  test("shows network error when login throws unexpectedly", async () => {
    const user = userEvent.setup();
  
    supabase.auth.signInWithPassword.mockRejectedValue(new Error("boom"));
  
    await renderLoginPage();
  
    await user.type(screen.getByPlaceholderText(/enter email address/i), "admin@test.com");
    await user.type(document.querySelector('input[name="password"]'), "password123");
  
    await user.click(screen.getByText(/i am not a robot/i));
    await user.type(screen.getByPlaceholderText(/type the characters above/i), "abcd");
    await user.click(screen.getByRole("button", { name: /check/i }));
  
    await user.click(screen.getByRole("button", { name: /sign in/i }));
  
    expect(
      await screen.findByText(/network error\. reload and try again\./i)
    ).toBeInTheDocument();
  });