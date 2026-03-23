import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsPage from "../src/app/settings/page";

// Shared jest fns used to control Supabase responses per test.
const mockGetUser = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockUpdateUser = jest.fn();
const mockMfaGetAal = jest.fn();
const mockMfaListFactors = jest.fn();
const mockMfaChallengeAndVerify = jest.fn();
const mockMfaUnenroll = jest.fn();
const mockAuditInsert = jest.fn();

// Mock the app's Supabase client import so tests stay deterministic.
jest.mock("../src/lib/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: (...args) => mockGetUser(...args),
      signInWithPassword: (...args) => mockSignInWithPassword(...args),
      updateUser: (...args) => mockUpdateUser(...args),
      mfa: {
        getAuthenticatorAssuranceLevel: (...args) => mockMfaGetAal(...args),
        listFactors: (...args) => mockMfaListFactors(...args),
        challengeAndVerify: (...args) => mockMfaChallengeAndVerify(...args),
        unenroll: (...args) => mockMfaUnenroll(...args),
      },
    },
    from: () => ({
      insert: (...args) => mockAuditInsert(...args),
    }),
  },
}));

// Replace motion.button with a plain button so animation props do not affect tests.
jest.mock("framer-motion", () => {
  const React = require("react");
  return {
    motion: {
      button: ({ children, whileHover: _whileHover, ...props }) =>
        React.createElement("button", props, children),
    },
  };
});

// Sidebar is unrelated to Settings logic, so we stub it out.
jest.mock("../src/app/components/Sidebar", () => {
  const React = require("react");
  return function SidebarMock() {
    return React.createElement("div", { "data-testid": "sidebar" });
  };
});

// Utility to manually resolve a pending async call for loading-state tests.
function createDeferred() {
  let resolve;
  let reject;

  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

// Common render helper that waits for initial profile fetch side effects.
async function renderSettingsPage() {
  render(<SettingsPage />);
  await waitFor(() => {
    expect(mockGetUser).toHaveBeenCalled();
  });
}

describe("SettingsPage", () => {
  let alertSpy;

  beforeEach(() => {
    // Baseline happy-path mocks; individual tests override when needed.
    jest.clearAllMocks();

    alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "kevin@example.com",
          user_metadata: {
            firstName: "Kevin",
            lastName: "Nguyen",
          },
        },
      },
      error: null,
    });

    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    mockUpdateUser.mockResolvedValue({ data: {}, error: null });

    mockMfaGetAal.mockResolvedValue({
      data: { currentLevel: "aal2" },
      error: null,
    });

    mockMfaListFactors.mockResolvedValue({
      data: {
        totp: [{ id: "factor-1", status: "verified" }],
      },
      error: null,
    });

    mockMfaChallengeAndVerify.mockResolvedValue({ error: null });
    mockMfaUnenroll.mockResolvedValue({ error: null });
    mockAuditInsert.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  // Basic render checks for the main cards/buttons.
  test("renders settings panels and action buttons", async () => {
    await renderSettingsPage();

    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /update name/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /change password/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /update email/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /unenroll mfa/i })).toBeInTheDocument();
  });

  test("renders password modal inputs and submit button", async () => {
    const user = userEvent.setup();
    await renderSettingsPage();

    await user.click(screen.getByRole("button", { name: /change password/i }));

    expect(screen.getByLabelText(/^current password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^confirm password$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /update password/i })).toBeInTheDocument();
  });

  test("shows required validation when current password is missing", async () => {
    const user = userEvent.setup();
    await renderSettingsPage();

    await user.click(screen.getByRole("button", { name: /change password/i }));
    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(screen.getByText(/enter your current password\./i)).toBeInTheDocument();
  });

  test("shows validation when new password and confirm password do not match", async () => {
    const user = userEvent.setup();
    await renderSettingsPage();

    await user.click(screen.getByRole("button", { name: /change password/i }));

    await user.type(screen.getByLabelText(/^current password$/i), "Current!123");
    await user.type(screen.getByLabelText(/^new password$/i), "NewPass!123");
    await user.type(screen.getByLabelText(/^confirm password$/i), "Different!123");

    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(
      screen.getByText(/new password and confirm password do not match\./i)
    ).toBeInTheDocument();
  });

  test("shows validation when new password is too short", async () => {
    const user = userEvent.setup();
    await renderSettingsPage();

    await user.click(screen.getByRole("button", { name: /change password/i }));

    await user.type(screen.getByLabelText(/^current password$/i), "Current!123");
    await user.type(screen.getByLabelText(/^new password$/i), "Short1!");
    await user.type(screen.getByLabelText(/^confirm password$/i), "Short1!");

    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(screen.getByText(/password must be at least 8 characters\./i)).toBeInTheDocument();
  });

  // Loading-state test verifies submit button behavior while async work is pending.
  test("disables update password button while request is processing", async () => {
    const user = userEvent.setup();
    const deferredSignIn = createDeferred();

    mockSignInWithPassword.mockReturnValueOnce(deferredSignIn.promise);

    await renderSettingsPage();

    await user.click(screen.getByRole("button", { name: /change password/i }));

    await user.type(screen.getByLabelText(/^current password$/i), "Current!123");
    await user.type(screen.getByLabelText(/^new password$/i), "StrongPass!123");
    await user.type(screen.getByLabelText(/^confirm password$/i), "StrongPass!123");

    const updatePasswordButton = screen.getByRole("button", { name: /update password/i });
    await user.click(updatePasswordButton);

    expect(updatePasswordButton).toBeDisabled();
    expect(updatePasswordButton).toHaveTextContent(/saving\.\.\./i);

    deferredSignIn.resolve({
      data: { user: { id: "user-1" } },
      error: null,
    });

    await waitFor(() => {
      expect(updatePasswordButton).not.toBeDisabled();
    });
  });

  // MFA path test: non-AAL2 session should ask for a 6-digit code.
  test("starts MFA flow and shows MFA code input when AAL2 is required", async () => {
    const user = userEvent.setup();

    mockMfaGetAal.mockResolvedValueOnce({
      data: { currentLevel: "aal1" },
      error: null,
    });

    await renderSettingsPage();

    await user.click(screen.getByRole("button", { name: /change password/i }));

    await user.type(screen.getByLabelText(/^current password$/i), "Current!123");
    await user.type(screen.getByLabelText(/^new password$/i), "StrongPass!123");
    await user.type(screen.getByLabelText(/^confirm password$/i), "StrongPass!123");

    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(
      screen.getByText(/complete mfa below to finish updating your password\./i)
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/mfa code/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /verify mfa and update password/i })
    ).toBeInTheDocument();
  });

  // Email modal validation + loading behavior.
  test("shows required validation when new email is empty", async () => {
    const user = userEvent.setup();
    await renderSettingsPage();

    await user.click(screen.getByRole("button", { name: /update email/i }));
    await user.click(screen.getAllByRole("button", { name: /^update email$/i })[1]);

    expect(screen.getByText(/enter a new email address\./i)).toBeInTheDocument();
  });

  test("shows validation when email and confirm email do not match", async () => {
    const user = userEvent.setup();
    await renderSettingsPage();

    await user.click(screen.getByRole("button", { name: /update email/i }));

    await user.type(screen.getByLabelText(/new email address/i), "new@email.com");
    await user.type(screen.getByLabelText(/confirm email address/i), "different@email.com");

    await user.click(screen.getAllByRole("button", { name: /^update email$/i })[1]);

    expect(screen.getByText(/new email and confirm email do not match\./i)).toBeInTheDocument();
  });

  test("shows invalid email message and help alert for invalid email format", async () => {
    const user = userEvent.setup();
    await renderSettingsPage();

    await user.click(screen.getByRole("button", { name: /update email/i }));

    await user.type(screen.getByLabelText(/new email address/i), "name@domain");
    await user.type(screen.getByLabelText(/confirm email address/i), "name@domain");

    await user.click(screen.getAllByRole("button", { name: /^update email$/i })[1]);

    expect(screen.getByText(/invalid email format\./i)).toBeInTheDocument();
    expect(alertSpy).toHaveBeenCalledTimes(1);
  });

  test("disables update email button while processing", async () => {
    const user = userEvent.setup();
    const deferredEmailUpdate = createDeferred();

    mockUpdateUser.mockReturnValueOnce(deferredEmailUpdate.promise);

    await renderSettingsPage();

    await user.click(screen.getByRole("button", { name: /update email/i }));

    await user.type(screen.getByLabelText(/new email address/i), "next@email.com");
    await user.type(screen.getByLabelText(/confirm email address/i), "next@email.com");

    const updateEmailButton = screen.getAllByRole("button", { name: /^update email$/i })[1];
    await user.click(updateEmailButton);

    expect(updateEmailButton).toBeDisabled();
    expect(updateEmailButton).toHaveTextContent(/saving\.\.\./i);

    deferredEmailUpdate.resolve({ data: {}, error: null });

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /^update email$/i })).toHaveLength(1);
    });
  });

  // Name modal render sanity check.
  test("renders name modal fields and save button", async () => {
    const user = userEvent.setup();
    await renderSettingsPage();

    await user.click(screen.getByRole("button", { name: /update name/i }));

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save name/i })).toBeInTheDocument();
  });

  // Regression tests below are intentionally strict to highlight known bugs.
  test("BUG: blocks weak passwords that do not meet complexity requirements", async () => {
    const user = userEvent.setup();
    await renderSettingsPage();

    await user.click(screen.getByRole("button", { name: /change password/i }));

    await user.type(screen.getByLabelText(/^current password$/i), "Current!123");
    await user.type(screen.getByLabelText(/^new password$/i), "aaaaaaaa");
    await user.type(screen.getByLabelText(/^confirm password$/i), "aaaaaaaa");

    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(
      screen.getByText(/must include upper, lower, number, and symbol/i)
    ).toBeInTheDocument();
  });

  test("BUG: unenroll modal closes with Escape", async () => {
    const user = userEvent.setup();
    await renderSettingsPage();

    await user.click(screen.getByRole("button", { name: /unenroll mfa/i }));

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: /unenroll mfa/i })).not.toBeInTheDocument();
    });
  });

  test("BUG: confirm unenroll button is disabled while request is in flight", async () => {
    const user = userEvent.setup();
    const deferredSignIn = createDeferred();

    mockSignInWithPassword.mockReturnValueOnce(deferredSignIn.promise);

    await renderSettingsPage();

    await user.click(screen.getByRole("button", { name: /unenroll mfa/i }));
    await user.type(screen.getByLabelText(/^current password$/i), "Current!123");

    const confirmUnenrollButton = screen.getByRole("button", { name: /confirm unenroll/i });
    await user.click(confirmUnenrollButton);

    expect(confirmUnenrollButton).toBeDisabled();

    deferredSignIn.resolve({
      data: { user: { id: "user-1" } },
      error: null,
    });
  });
});
