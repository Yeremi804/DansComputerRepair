// admin-log-in.test.js
// Comprehensive test suite for the Admin Log In page.
//
// Coverage:
//  1. Initial render — form fields, captcha checkbox, disabled Sign In button
//  2. Captcha flow — drawer opens, successful verification, failed verification
//  3. Sign-in validation — blocked without captcha, Supabase auth error displayed
//  4. Password visibility toggle
//  5. MFA flow — AAL2 already met (redirect), no MFA factor (redirect to init-mfa),
//     MFA challenge opened, successful MFA verify (redirect), wrong MFA code error
//  6. MFA modal — Cancel button signs out
//  7. Network error handling

import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import AdminLogInPage from "../src/app/admin-log-in/page";
import { supabase } from "@/lib/supabase/client";

// ─── Mocks ───────────────────────────────────────────────────────────────────

global.fetch = jest.fn();

// Shared router mock so tests can assert on router.replace calls
const mockReplace = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn(),
      mfa: {
        getAuthenticatorAssuranceLevel: jest.fn(),
        listFactors: jest.fn(),
        challenge: jest.fn(),
        challengeAndVerify: jest.fn(),
      },
    },
    from: jest.fn(() => ({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
}));

jest.mock("lucide-react", () => ({
  Eye: () => <span data-testid="eye-icon" />,
  EyeOff: () => <span data-testid="eyeoff-icon" />,
}));

// ─── Fetch helpers ────────────────────────────────────────────────────────────

const fetchCaptchaOk = () =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ svg: "<svg><text>ABCD</text></svg>" }),
  });

const fetchVerifyOk = () =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });

const fetchVerifyFail = () =>
  Promise.resolve({
    ok: false,
    json: () =>
      Promise.resolve({ success: false, message: "Captcha verification failed." }),
  });

const fetchSessionSync = () =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({}) });

// ─── Render helper ───────────────────────────────────────────────────────────

async function renderPage() {
  let result;
  await act(async () => {
    result = render(<AdminLogInPage />);
  });
  return result;
}

// ─── Captcha helper ──────────────────────────────────────────────────────────
// Simulates a user clicking the "I am not a robot" box, typing the answer,
// and clicking Check — with a successful verify response.

async function completeCaptcha() {
  const robotBox = screen.getByText(/i am not a robot/i).closest("div");
  await act(async () => {
    fireEvent.click(robotBox);
  });

  const captchaInput = await screen.findByPlaceholderText(/type the characters above/i);
  fireEvent.change(captchaInput, { target: { value: "ABCD" } });

  // Override the next fetch call to return a successful verify response
  global.fetch.mockImplementationOnce(fetchVerifyOk);

  const checkButton = screen.getByRole("button", { name: /check/i });
  await act(async () => {
    fireEvent.click(checkButton);
  });

  // Wait for the captcha drawer to disappear (captchaVerified = true)
  await waitFor(() => {
    expect(
      screen.queryByPlaceholderText(/type the characters above/i)
    ).not.toBeInTheDocument();
  });
}

// ─── beforeEach ──────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockReplace.mockClear();

  // Default fetch routing
  global.fetch.mockImplementation((url) => {
    if (url === "/api/captcha") return fetchCaptchaOk();
    if (url === "/api/session/sync") return fetchSessionSync();
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });

  // Default Supabase stubs (overridden per test where needed)
  supabase.auth.signInWithPassword.mockResolvedValue({
    data: { user: { id: "user-1", email: "admin@test.com" }, session: {} },
    error: null,
  });
  supabase.auth.getSession.mockResolvedValue({
    data: { session: { access_token: "tok", refresh_token: "ref" } },
    error: null,
  });
  supabase.auth.getUser.mockResolvedValue({
    data: { user: { id: "user-1", email: "admin@test.com" } },
    error: null,
  });
  supabase.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
    data: { currentLevel: "aal2", nextLevel: "aal2" },
    error: null,
  });
  supabase.auth.mfa.listFactors.mockResolvedValue({
    data: { totp: [{ id: "factor-1", status: "verified" }] },
    error: null,
  });
  supabase.auth.mfa.challenge.mockResolvedValue({ data: {}, error: null });
  supabase.auth.mfa.challengeAndVerify.mockResolvedValue({ data: {}, error: null });
  supabase.auth.signOut.mockResolvedValue({ error: null });
});

// ─── 1. Initial Render ───────────────────────────────────────────────────────

describe("Admin Log In — Initial Render", () => {
  test("renders the page heading 'Admin Log in'", async () => {
    await renderPage();
    expect(screen.getByText("Admin Log in")).toBeInTheDocument();
  });

  test("renders the email input field", async () => {
    await renderPage();
    expect(screen.getByPlaceholderText(/enter email address/i)).toBeInTheDocument();
  });

  test("renders the password input field (found by name attribute)", async () => {
    const { container } = await renderPage();
    expect(container.querySelector('input[name="password"]')).toBeInTheDocument();
  });

  test("Sign In button is disabled before captcha is verified", async () => {
    await renderPage();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeDisabled();
  });

  test("renders the 'I am not a robot' captcha checkbox area", async () => {
    await renderPage();
    expect(screen.getByText(/i am not a robot/i)).toBeInTheDocument();
  });

  test("renders the 'Forgot password?' link", async () => {
    await renderPage();
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
  });

  test("renders the Sign up button", async () => {
    await renderPage();
    expect(screen.getByRole("button", { name: /sign up/i })).toBeInTheDocument();
  });

  test("password field starts as type='password' (hidden)", async () => {
    const { container } = await renderPage();
    const passwordInput = container.querySelector('input[name="password"]');
    expect(passwordInput).toHaveAttribute("type", "password");
  });
});

// ─── 2. Captcha Flow ─────────────────────────────────────────────────────────

describe("Admin Log In — Captcha Flow", () => {
  test("clicking the robot box opens the captcha drawer", async () => {
    await renderPage();
    const robotBox = screen.getByText(/i am not a robot/i).closest("div");

    await act(async () => {
      fireEvent.click(robotBox);
    });

    expect(
      await screen.findByPlaceholderText(/type the characters above/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /check/i })).toBeInTheDocument();
  });

  test("successful captcha verification hides the drawer and enables Sign In", async () => {
    await renderPage();
    await completeCaptcha();

    expect(
      screen.queryByPlaceholderText(/type the characters above/i)
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).not.toBeDisabled();
  });

  test("failed captcha shows error placeholder and reloads captcha SVG", async () => {
    await renderPage();

    const robotBox = screen.getByText(/i am not a robot/i).closest("div");
    await act(async () => {
      fireEvent.click(robotBox);
    });

    const captchaInput = await screen.findByPlaceholderText(/type the characters above/i);
    fireEvent.change(captchaInput, { target: { value: "WRONG" } });

    global.fetch.mockImplementationOnce(fetchVerifyFail);

    const checkButton = screen.getByRole("button", { name: /check/i });
    await act(async () => {
      fireEvent.click(checkButton);
    });

    // Error appears as the input placeholder
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/captcha verification failed/i)
      ).toBeInTheDocument();
    });

    // Sign In button remains disabled
    expect(screen.getByRole("button", { name: /sign in/i })).toBeDisabled();

    // A fresh captcha was fetched (at least 2 calls to /api/captcha)
    const captchaCalls = global.fetch.mock.calls.filter(([url]) => url === "/api/captcha");
    expect(captchaCalls.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── 3. Sign-in Validation ───────────────────────────────────────────────────

describe("Admin Log In — Sign-in Validation", () => {
  test("shows error when form is submitted without completing captcha", async () => {
    const { container } = await renderPage();

    await act(async () => {
      fireEvent.submit(container.querySelector("form"));
    });

    await waitFor(() => {
      expect(
        screen.getByText(/please complete the captcha verification/i)
      ).toBeInTheDocument();
    });

    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  test("displays Supabase error message on invalid credentials", async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" },
    });

    const { container } = await renderPage();
    await completeCaptcha();

    fireEvent.change(screen.getByPlaceholderText(/enter email address/i), {
      target: { value: "wrong@test.com" },
    });
    fireEvent.change(container.querySelector('input[name="password"]'), {
      target: { value: "wrongpassword" },
    });

    await act(async () => {
      fireEvent.submit(container.querySelector("form"));
    });

    await waitFor(() => {
      expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument();
    });
  });

  test("shows 'Loading...' text on the Sign In button while sign-in is in progress", async () => {
    // Make signInWithPassword hang indefinitely to observe loading state
    supabase.auth.signInWithPassword.mockImplementation(() => new Promise(() => {}));

    const { container } = await renderPage();
    await completeCaptcha();

    fireEvent.change(screen.getByPlaceholderText(/enter email address/i), {
      target: { value: "admin@test.com" },
    });
    fireEvent.change(container.querySelector('input[name="password"]'), {
      target: { value: "Password123!" },
    });

    act(() => {
      fireEvent.submit(container.querySelector("form"));
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /loading/i })).toBeInTheDocument();
    });
  });

  test("trims whitespace from email before calling signInWithPassword", async () => {
    const { container } = await renderPage();
    await completeCaptcha();

    fireEvent.change(screen.getByPlaceholderText(/enter email address/i), {
      target: { value: "  admin@test.com  " },
    });
    fireEvent.change(container.querySelector('input[name="password"]'), {
      target: { value: "Password123!" },
    });

    await act(async () => {
      fireEvent.submit(container.querySelector("form"));
    });

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith(
        expect.objectContaining({ email: "admin@test.com" })
      );
    });
  });
});

// ─── 4. Password Visibility Toggle ───────────────────────────────────────────

describe("Admin Log In — Password Visibility Toggle", () => {
  test("clicking the eye button reveals the password (type becomes 'text')", async () => {
    const { container } = await renderPage();
    const passwordInput = container.querySelector('input[name="password"]');
    const toggleBtn = passwordInput.closest("div").querySelector("button");

    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    expect(passwordInput).toHaveAttribute("type", "text");
  });

  test("clicking the eye button again hides the password (type back to 'password')", async () => {
    const { container } = await renderPage();
    const passwordInput = container.querySelector('input[name="password"]');
    const toggleBtn = passwordInput.closest("div").querySelector("button");

    await act(async () => { fireEvent.click(toggleBtn); });
    await act(async () => { fireEvent.click(toggleBtn); });

    expect(passwordInput).toHaveAttribute("type", "password");
  });
});

// ─── 5. MFA Flow ─────────────────────────────────────────────────────────────

describe("Admin Log In — MFA Flow", () => {
  test("redirects to /dashboard immediately when AAL2 is already satisfied", async () => {
    supabase.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal2", nextLevel: "aal2" },
      error: null,
    });

    const { container } = await renderPage();
    await completeCaptcha();

    fireEvent.change(screen.getByPlaceholderText(/enter email address/i), {
      target: { value: "admin@test.com" },
    });
    fireEvent.change(container.querySelector('input[name="password"]'), {
      target: { value: "Password123!" },
    });

    await act(async () => {
      fireEvent.submit(container.querySelector("form"));
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/dashboard");
    });

    // MFA popup should NOT appear
    expect(screen.queryByText(/two-factor verification/i)).not.toBeInTheDocument();
  });

  test("shows error and does NOT redirect when user has no verified TOTP factor", async () => {
    supabase.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal1", nextLevel: "aal2" },
      error: null,
    });
    supabase.auth.mfa.listFactors.mockResolvedValue({
      data: { totp: [] }, // no factors enrolled
      error: null,
    });

    const { container } = await renderPage();
    await completeCaptcha();

    fireEvent.change(screen.getByPlaceholderText(/enter email address/i), {
      target: { value: "admin@test.com" },
    });
    fireEvent.change(container.querySelector('input[name="password"]'), {
      target: { value: "Password123!" },
    });

    await act(async () => {
      fireEvent.submit(container.querySelector("form"));
    });

    await waitFor(() => {
      expect(
        screen.getByText(/does not have a mfa setup/i)
      ).toBeInTheDocument();
    });

    expect(supabase.auth.mfa.challenge).not.toHaveBeenCalled();
  });

  test("opens the MFA popup and calls mfa.challenge when AAL1 with a verified factor", async () => {
    supabase.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal1", nextLevel: "aal2" },
      error: null,
    });
    supabase.auth.mfa.listFactors.mockResolvedValue({
      data: { totp: [{ id: "factor-1", status: "verified" }] },
      error: null,
    });

    const { container } = await renderPage();
    await completeCaptcha();

    fireEvent.change(screen.getByPlaceholderText(/enter email address/i), {
      target: { value: "admin@test.com" },
    });
    fireEvent.change(container.querySelector('input[name="password"]'), {
      target: { value: "Password123!" },
    });

    await act(async () => {
      fireEvent.submit(container.querySelector("form"));
    });

    await waitFor(() => {
      expect(screen.getByText(/two-factor verification/i)).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText("123456")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /verify/i })).toBeInTheDocument();
    expect(supabase.auth.mfa.challenge).toHaveBeenCalledWith({ factorId: "factor-1" });
  });

  test("successful MFA code submission redirects to /dashboard", async () => {
    supabase.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal1", nextLevel: "aal2" },
      error: null,
    });
    supabase.auth.mfa.listFactors.mockResolvedValue({
      data: { totp: [{ id: "factor-1", status: "verified" }] },
      error: null,
    });

    const { container } = await renderPage();
    await completeCaptcha();

    fireEvent.change(screen.getByPlaceholderText(/enter email address/i), {
      target: { value: "admin@test.com" },
    });
    fireEvent.change(container.querySelector('input[name="password"]'), {
      target: { value: "Password123!" },
    });

    await act(async () => {
      fireEvent.submit(container.querySelector("form"));
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText("123456")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("123456"), {
      target: { value: "654321" },
    });

    const mfaForm = screen.getByPlaceholderText("123456").closest("form");
    await act(async () => {
      fireEvent.submit(mfaForm);
    });

    await waitFor(() => {
      expect(supabase.auth.mfa.challengeAndVerify).toHaveBeenCalledWith({
        factorId: "factor-1",
        code: "654321",
      });
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/dashboard");
    });
  });

  test("shows error message inside MFA popup when code is wrong", async () => {
    supabase.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal1", nextLevel: "aal2" },
      error: null,
    });
    supabase.auth.mfa.listFactors.mockResolvedValue({
      data: { totp: [{ id: "factor-1", status: "verified" }] },
      error: null,
    });
    supabase.auth.mfa.challengeAndVerify.mockResolvedValue({
      data: null,
      error: { message: "Invalid TOTP code" },
    });

    const { container } = await renderPage();
    await completeCaptcha();

    fireEvent.change(screen.getByPlaceholderText(/enter email address/i), {
      target: { value: "admin@test.com" },
    });
    fireEvent.change(container.querySelector('input[name="password"]'), {
      target: { value: "Password123!" },
    });

    await act(async () => {
      fireEvent.submit(container.querySelector("form"));
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText("123456")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("123456"), {
      target: { value: "000000" },
    });

    const mfaForm = screen.getByPlaceholderText("123456").closest("form");
    await act(async () => {
      fireEvent.submit(mfaForm);
    });

    await waitFor(() => {
      expect(screen.getByText(/invalid totp code/i)).toBeInTheDocument();
    });

    // Should NOT redirect
    expect(mockReplace).not.toHaveBeenCalledWith("/dashboard");
  });

  test("Cancel button in MFA popup calls signOut and closes the popup", async () => {
    supabase.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal1", nextLevel: "aal2" },
      error: null,
    });
    supabase.auth.mfa.listFactors.mockResolvedValue({
      data: { totp: [{ id: "factor-1", status: "verified" }] },
      error: null,
    });

    const { container } = await renderPage();
    await completeCaptcha();

    fireEvent.change(screen.getByPlaceholderText(/enter email address/i), {
      target: { value: "admin@test.com" },
    });
    fireEvent.change(container.querySelector('input[name="password"]'), {
      target: { value: "Password123!" },
    });

    await act(async () => {
      fireEvent.submit(container.querySelector("form"));
    });

    await waitFor(() => {
      expect(screen.getByText(/two-factor verification/i)).toBeInTheDocument();
    });

    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    await act(async () => {
      fireEvent.click(cancelBtn);
    });

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    expect(screen.queryByText(/two-factor verification/i)).not.toBeInTheDocument();
  });
});

// ─── 6. Network Error Handling ────────────────────────────────────────────────

describe("Admin Log In — Network Error Handling", () => {
  test("shows 'Network error' message when signInWithPassword throws", async () => {
    supabase.auth.signInWithPassword.mockRejectedValue(new Error("Network failure"));

    const { container } = await renderPage();
    await completeCaptcha();

    fireEvent.change(screen.getByPlaceholderText(/enter email address/i), {
      target: { value: "admin@test.com" },
    });
    fireEvent.change(container.querySelector('input[name="password"]'), {
      target: { value: "Password123!" },
    });

    await act(async () => {
      fireEvent.submit(container.querySelector("form"));
    });

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });
});