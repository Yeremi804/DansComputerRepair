// change-password.test.js
// Comprehensive test suite for the Change Password functionality on the Settings page.
//
// Coverage:
//  1. Modal open / close behaviour
//  2. Input validation — all empty-field and mismatch branches
//  3. Password visibility toggles inside the modal
//  4. Wrong current password (signInWithPassword returns error)
//  5. Successful password change (AAL2 already met)
//  6. MFA-required flow — AAL1 triggers MFA input, then verify + update
//  7. MFA code validation — empty / wrong format / wrong code
//  8. Audit log insertion after successful change
//  9. Supabase updateUser error handling
// 10. Toast auto-dismiss (timer fires)
// 11. Pressing Escape closes the modal

import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import SettingsPage from "../src/app/settings/page";
import { supabase } from "@/lib/supabase/client";

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Keep a reference to the insert mock so tests can assert on it
const insertMock = jest.fn().mockResolvedValue({ error: null });

jest.mock("@/lib/supabase/client", () => {
  const _insertMock = jest.fn().mockResolvedValue({ error: null });
  const fromMock = jest.fn(() => ({
    insert: _insertMock,
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    update: jest.fn().mockResolvedValue({ error: null }),
  }));

  return {
    supabase: {
      auth: {
        getUser: jest.fn(),
        signInWithPassword: jest.fn(),
        updateUser: jest.fn(),
        mfa: {
          getAuthenticatorAssuranceLevel: jest.fn(),
          listFactors: jest.fn(),
          challenge: jest.fn(),
          challengeAndVerify: jest.fn(),
        },
      },
      from: fromMock,
    },
    // Expose internal mocks so tests can assert on them
    __insertMock: _insertMock,
  };
}); // Note: __insertMock is accessed via supabase.from().insert in assertions

jest.mock("../src/app/components/Sidebar", () =>
  function MockSidebar() {
    return <div data-testid="sidebar">Sidebar</div>;
  }
);

// Proxy-based framer-motion mock: strips animation props before forwarding to DOM
jest.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get: (_, tag) => {
        const Component = ({
          children,
          whileHover,
          whileTap,
          animate,
          initial,
          exit,
          transition,
          variants,
          layout,
          ...props
        }) => {
          const Tag = tag;
          return <Tag {...props}>{children}</Tag>;
        };
        Component.displayName = `motion.${tag}`;
        return Component;
      },
    }
  ),
  AnimatePresence: ({ children }) => <>{children}</>,
}));

jest.mock("lucide-react", () => ({
  Lock: () => <span data-testid="lock-icon" />,
  Eye: () => <span data-testid="eye-icon" />,
  EyeOff: () => <span data-testid="eyeoff-icon" />,
  ShieldCheck: () => <span data-testid="shieldcheck-icon" />,
  User: () => <span data-testid="user-icon" />,
  ChevronRight: () => <span data-testid="chevron-icon" />,
  X: () => <span data-testid="x-icon" />,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Render SettingsPage and open the Change Password modal. */
async function renderAndOpenPasswordModal() {
  let result;
  await act(async () => {
    result = render(<SettingsPage />);
  });

  const changePasswordBtn = await screen.findByRole(
    "button",
    { name: /change password/i },
    { timeout: 10000 }
  );

  await act(async () => {
    fireEvent.click(changePasswordBtn);
  });

  await waitFor(
    () => expect(screen.getByPlaceholderText("Current password")).toBeInTheDocument(),
    { timeout: 10000 }
  );

  return result;
}

/** Fill a password form field by placeholder text. */
function fill(placeholder, value) {
  fireEvent.change(screen.getByPlaceholderText(placeholder), {
    target: { value },
  });
}

/** Submit the password change form (the first .password-form in the DOM). */
function submitPasswordForm() {
  fireEvent.submit(document.querySelector("form.password-form"));
}

// ─── beforeEach ──────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();

  supabase.auth.getUser.mockResolvedValue({
    data: {
      user: { id: "user-123", email: "test@example.com", user_metadata: {} },
    },
    error: null,
  });

  // Default: AAL2 already met — no MFA prompt needed
  supabase.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
    data: { currentLevel: "aal2", nextLevel: "aal2" },
    error: null,
  });

  supabase.auth.mfa.listFactors.mockResolvedValue({
    data: { totp: [{ id: "factor-1", status: "verified" }] },
    error: null,
  });

  supabase.auth.mfa.challengeAndVerify.mockResolvedValue({ data: {}, error: null });

  // Default: signInWithPassword succeeds (current password correct)
  supabase.auth.signInWithPassword.mockResolvedValue({
    data: { user: { id: "user-123" }, session: {} },
    error: null,
  });

  // Default: updateUser succeeds
  supabase.auth.updateUser.mockResolvedValue({
    data: { user: { id: "user-123" } },
    error: null,
  });
});

// ─── 1. Modal Open / Close ───────────────────────────────────────────────────

describe("Change Password — Modal Open / Close", () => {
  test("Change Password button opens the modal", async () => {
    await renderAndOpenPasswordModal();
    expect(screen.getByText("Change Credentials")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Current password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("New password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Confirm password")).toBeInTheDocument();
  });

  test("clicking the modal backdrop closes the modal", async () => {
    await renderAndOpenPasswordModal();

    const backdrop = document.querySelector(".modal-backdrop");
    await act(async () => {
      fireEvent.click(backdrop);
    });

    await waitFor(() => {
      expect(screen.queryByPlaceholderText("Current password")).not.toBeInTheDocument();
    });
  });

  test("pressing Escape closes the modal", async () => {
    await renderAndOpenPasswordModal();

    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });

    await waitFor(() => {
      expect(screen.queryByPlaceholderText("Current password")).not.toBeInTheDocument();
    });
  });

  test("modal does NOT close when clicking inside the modal card", async () => {
    await renderAndOpenPasswordModal();

    const modalCard = document.querySelector(".modal");
    await act(async () => {
      fireEvent.click(modalCard);
    });

    // Modal should still be open
    expect(screen.getByPlaceholderText("Current password")).toBeInTheDocument();
  });
});

// ─── 2. Input Validation ─────────────────────────────────────────────────────

describe("Change Password — Input Validation", () => {
  test("shows error toast when current password is empty", async () => {
    await renderAndOpenPasswordModal();

    await act(async () => { submitPasswordForm(); });

    await waitFor(
      () => expect(screen.getByText("Enter your current password.")).toBeInTheDocument(),
      { timeout: 5000 }
    );
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  test("shows error toast when new password is empty", async () => {
    await renderAndOpenPasswordModal();

    fill("Current password", "OldPassword123!");
    // Leave new password and confirm password empty

    await act(async () => { submitPasswordForm(); });

    await waitFor(
      () => expect(screen.getByText("Enter a new password.")).toBeInTheDocument(),
      { timeout: 5000 }
    );
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  test("shows error toast when confirm password is empty", async () => {
    await renderAndOpenPasswordModal();

    fill("Current password", "OldPassword123!");
    fill("New password", "NewPassword123!");
    // Leave confirm password empty

    await act(async () => { submitPasswordForm(); });

    await waitFor(
      () =>
        expect(
          screen.getByText("Please confirm the new password.")
        ).toBeInTheDocument(),
      { timeout: 5000 }
    );
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  test("shows error toast when new password and confirm password do not match", async () => {
    await renderAndOpenPasswordModal();

    fill("Current password", "OldPassword123!");
    fill("New password", "NewPassword123!");
    fill("Confirm password", "DifferentPassword456!");

    await act(async () => { submitPasswordForm(); });

    await waitFor(
      () =>
        expect(
          screen.getByText("New password and confirm password do not match.")
        ).toBeInTheDocument(),
      { timeout: 5000 }
    );
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  test("shows error toast when new password is too short (< 8 characters)", async () => {
    await renderAndOpenPasswordModal();

    fill("Current password", "OldPassword123!");
    fill("New password", "Short1!");
    fill("Confirm password", "Short1!");

    await act(async () => { submitPasswordForm(); });

    // Use exact string to avoid matching the always-visible helper text
    await waitFor(
      () =>
        expect(
          screen.getByText("Password must be at least 8 characters.")
        ).toBeInTheDocument(),
      { timeout: 5000 }
    );
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  test("validation runs in order: current → new → confirm → match → length", async () => {
    // Provide current + new but leave confirm empty — should hit confirm error, not match error
    await renderAndOpenPasswordModal();

    fill("Current password", "OldPassword123!");
    fill("New password", "NewPassword123!");
    // confirm password intentionally left empty

    await act(async () => { submitPasswordForm(); });

    await waitFor(
      () =>
        expect(
          screen.getByText("Please confirm the new password.")
        ).toBeInTheDocument(),
      { timeout: 5000 }
    );
  });
});

// ─── 3. Password Visibility Toggles ──────────────────────────────────────────

describe("Change Password — Password Visibility Toggles", () => {
  test("current password field starts hidden (type='password')", async () => {
    await renderAndOpenPasswordModal();
    expect(screen.getByPlaceholderText("Current password")).toHaveAttribute(
      "type",
      "password"
    );
  });

  test("clicking Show current password reveals the field", async () => {
    await renderAndOpenPasswordModal();
    const toggleBtn = screen.getByRole("button", { name: /show current password/i });

    await act(async () => { fireEvent.click(toggleBtn); });

    expect(screen.getByPlaceholderText("Current password")).toHaveAttribute("type", "text");
  });

  test("clicking Show new password reveals the new password field", async () => {
    await renderAndOpenPasswordModal();
    const toggleBtn = screen.getByRole("button", { name: /show new password/i });

    await act(async () => { fireEvent.click(toggleBtn); });

    expect(screen.getByPlaceholderText("New password")).toHaveAttribute("type", "text");
  });

  test("clicking Show confirm password reveals the confirm password field", async () => {
    await renderAndOpenPasswordModal();
    const toggleBtn = screen.getByRole("button", { name: /show confirm password/i });

    await act(async () => { fireEvent.click(toggleBtn); });

    expect(screen.getByPlaceholderText("Confirm password")).toHaveAttribute("type", "text");
  });

  test("toggling visibility twice returns the field to type='password'", async () => {
    await renderAndOpenPasswordModal();
    const toggleBtn = screen.getByRole("button", { name: /show current password/i });

    await act(async () => { fireEvent.click(toggleBtn); });
    await act(async () => { fireEvent.click(toggleBtn); });

    expect(screen.getByPlaceholderText("Current password")).toHaveAttribute(
      "type",
      "password"
    );
  });
});

// ─── 4. Wrong Current Password ───────────────────────────────────────────────

describe("Change Password — Wrong Current Password", () => {
  test("shows friendly error when current password is incorrect", async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Current password is incorrect." },
    });

    await renderAndOpenPasswordModal();

    fill("Current password", "WrongPassword!");
    fill("New password", "NewPassword456@A");
    fill("Confirm password", "NewPassword456@A");

    await act(async () => { submitPasswordForm(); });

    await waitFor(
      () =>
        expect(screen.getByText("Current password is incorrect.")).toBeInTheDocument(),
      { timeout: 10000 }
    );

    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });
});

// ─── 5. Successful Password Change (AAL2 already met) ────────────────────────

describe("Change Password — Successful Update (AAL2)", () => {
  test("calls signInWithPassword with the current user email and typed password", async () => {
    await renderAndOpenPasswordModal();

    fill("Current password", "OldPassword123!");
    fill("New password", "NewPassword456@A");
    fill("Confirm password", "NewPassword456@A");

    await act(async () => { submitPasswordForm(); });

    await waitFor(
      () =>
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "OldPassword123!",
        }),
      { timeout: 10000 }
    );
  });

  test("calls updateUser with the new password", async () => {
    await renderAndOpenPasswordModal();

    fill("Current password", "OldPassword123!");
    fill("New password", "NewPassword456@A");
    fill("Confirm password", "NewPassword456@A");

    await act(async () => { submitPasswordForm(); });

    await waitFor(
      () =>
        expect(supabase.auth.updateUser).toHaveBeenCalledWith({
          password: "NewPassword456@A",
        }),
      { timeout: 10000 }
    );
  });

  test("shows success toast 'Password updated successfully.'", async () => {
    await renderAndOpenPasswordModal();

    fill("Current password", "OldPassword123!");
    fill("New password", "NewPassword456@A");
    fill("Confirm password", "NewPassword456@A");

    await act(async () => { submitPasswordForm(); });

    await waitFor(
      () =>
        expect(screen.getByText("Password updated successfully.")).toBeInTheDocument(),
      { timeout: 10000 }
    );
  });

  test("clears the form fields after a successful update", async () => {
    await renderAndOpenPasswordModal();

    fill("Current password", "OldPassword123!");
    fill("New password", "NewPassword456@A");
    fill("Confirm password", "NewPassword456@A");

    await act(async () => { submitPasswordForm(); });

    await waitFor(
      () =>
        expect(screen.getByText("Password updated successfully.")).toBeInTheDocument(),
      { timeout: 10000 }
    );

    // After success, form fields should be cleared
    expect(screen.getByPlaceholderText("Current password")).toHaveValue("");
    expect(screen.getByPlaceholderText("New password")).toHaveValue("");
    expect(screen.getByPlaceholderText("Confirm password")).toHaveValue("");
  });

  test("inserts an audit log row with action 'PASSWORD_CHANGED'", async () => {
    await renderAndOpenPasswordModal();

    fill("Current password", "OldPassword123!");
    fill("New password", "NewPassword456@A");
    fill("Confirm password", "NewPassword456@A");

    await act(async () => { submitPasswordForm(); });

    await waitFor(
      () =>
        expect(screen.getByText("Password updated successfully.")).toBeInTheDocument(),
      { timeout: 10000 }
    );

    // supabase.from("audit_logs").insert([...]) should have been called
    expect(supabase.from).toHaveBeenCalledWith("audit_logs");
    const insertCall = supabase.from.mock.results.find(
      (r) => r.value && typeof r.value.insert === "function"
    );
    expect(insertCall).toBeDefined();
    expect(insertCall.value.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ action: "PASSWORD_CHANGED" }),
      ])
    );
  });
});

// ─── 6. MFA-Required Flow ────────────────────────────────────────────────────

describe("Change Password — MFA Required Flow", () => {
  beforeEach(() => {
    // Override to AAL1 so MFA is required
    supabase.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal1", nextLevel: "aal2" },
      error: null,
    });
    supabase.auth.mfa.listFactors.mockResolvedValue({
      data: { totp: [{ id: "factor-1", status: "verified" }] },
      error: null,
    });
  });

  test("shows MFA code input and 'Verify MFA and update password' button when AAL1", async () => {
    await renderAndOpenPasswordModal();

    fill("Current password", "OldPassword123!");
    fill("New password", "NewPassword456@A");
    fill("Confirm password", "NewPassword456@A");

    await act(async () => { submitPasswordForm(); });

    await waitFor(
      () => expect(screen.getByPlaceholderText("6-digit code")).toBeInTheDocument(),
      { timeout: 10000 }
    );

    expect(
      screen.getByRole("button", { name: /verify mfa and update password/i })
    ).toBeInTheDocument();
  });

  test("shows error toast prompting user to complete MFA", async () => {
    await renderAndOpenPasswordModal();

    fill("Current password", "OldPassword123!");
    fill("New password", "NewPassword456@A");
    fill("Confirm password", "NewPassword456@A");

    await act(async () => { submitPasswordForm(); });

    await waitFor(
      () =>
        expect(
          screen.getByText(/complete mfa below to finish updating your password/i)
        ).toBeInTheDocument(),
      { timeout: 10000 }
    );
  });

  test("shows error when MFA code is not 6 digits", async () => {
    await renderAndOpenPasswordModal();

    fill("Current password", "OldPassword123!");
    fill("New password", "NewPassword456@A");
    fill("Confirm password", "NewPassword456@A");

    await act(async () => { submitPasswordForm(); });

    await waitFor(
      () => expect(screen.getByPlaceholderText("6-digit code")).toBeInTheDocument(),
      { timeout: 10000 }
    );

    // Enter a 3-digit code (invalid)
    fireEvent.change(screen.getByPlaceholderText("6-digit code"), {
      target: { value: "123" },
    });

    const verifyBtn = screen.getByRole("button", {
      name: /verify mfa and update password/i,
    });
    await act(async () => { fireEvent.click(verifyBtn); });

    await waitFor(
      () =>
        expect(
          screen.getByText(/enter the 6-digit code from your authenticator app/i)
        ).toBeInTheDocument(),
      { timeout: 5000 }
    );

    expect(supabase.auth.mfa.challengeAndVerify).not.toHaveBeenCalled();
  });

  test(
    "shows error when MFA challengeAndVerify returns an error",
    async () => {
      // Override BEFORE rendering so the mock is in place when the component mounts
      supabase.auth.mfa.challengeAndVerify.mockResolvedValue({
        data: null,
        error: { message: "Invalid MFA code" },
      });

      await renderAndOpenPasswordModal();

      fill("Current password", "OldPassword123!");
      fill("New password", "NewPassword456@A");
      fill("Confirm password", "NewPassword456@A");

      await act(async () => { submitPasswordForm(); });

      // Wait for the MFA section to appear (AAL1 → beginMfaFlow sets mfaRequired=true)
      await waitFor(
        () => expect(screen.getByPlaceholderText("6-digit code")).toBeInTheDocument(),
        { timeout: 10000 }
      );

      fireEvent.change(screen.getByPlaceholderText("6-digit code"), {
        target: { value: "000000" },
      });

      const verifyBtn = screen.getByRole("button", {
        name: /verify mfa and update password/i,
      });
      await act(async () => { fireEvent.click(verifyBtn); });

      // getFriendlyError checks for "mfa" in the message first (line 157 of settings/page.js):
      //   if (message.includes("aal2") || message.includes("mfa")) → "Please complete MFA first..."
      // "Invalid MFA code" contains "mfa", so it hits that branch, NOT the "invalid" branch.
      await waitFor(
        () =>
          expect(
            screen.getByText("Please complete MFA first, then try updating your password.")
          ).toBeInTheDocument(),
        { timeout: 10000 }
      );

      expect(supabase.auth.updateUser).not.toHaveBeenCalled();
    },
    20000
  );

  test("successful MFA verify calls updateUser and shows success toast", async () => {
    await renderAndOpenPasswordModal();

    fill("Current password", "OldPassword123!");
    fill("New password", "NewPassword456@A");
    fill("Confirm password", "NewPassword456@A");

    await act(async () => { submitPasswordForm(); });

    await waitFor(
      () => expect(screen.getByPlaceholderText("6-digit code")).toBeInTheDocument(),
      { timeout: 10000 }
    );

    fireEvent.change(screen.getByPlaceholderText("6-digit code"), {
      target: { value: "654321" },
    });

    const verifyBtn = screen.getByRole("button", {
      name: /verify mfa and update password/i,
    });
    await act(async () => { fireEvent.click(verifyBtn); });

    await waitFor(
      () =>
        expect(
          supabase.auth.mfa.challengeAndVerify
        ).toHaveBeenCalledWith({ factorId: "factor-1", code: "654321" }),
      { timeout: 10000 }
    );

    await waitFor(
      () =>
        expect(supabase.auth.updateUser).toHaveBeenCalledWith({
          password: "NewPassword456@A",
        }),
      { timeout: 10000 }
    );

    await waitFor(
      () =>
        expect(
          screen.getByText("MFA verified and password updated successfully.")
        ).toBeInTheDocument(),
      { timeout: 5000 }
    );
  });
});

// ─── 7. updateUser Error Handling ────────────────────────────────────────────

describe("Change Password — updateUser Error Handling", () => {
  test("shows error toast when updateUser returns an error", async () => {
    supabase.auth.updateUser.mockResolvedValue({
      data: null,
      error: { message: "Password update failed on server." },
    });

    await renderAndOpenPasswordModal();

    fill("Current password", "OldPassword123!");
    fill("New password", "NewPassword456@A");
    fill("Confirm password", "NewPassword456@A");

    await act(async () => { submitPasswordForm(); });

    await waitFor(
      () =>
        expect(
          screen.getByText("Password update failed on server.")
        ).toBeInTheDocument(),
      { timeout: 10000 }
    );
  });
});

// ─── 8. Toast Behaviour ──────────────────────────────────────────────────────

describe("Change Password — Toast Behaviour", () => {
  test("error toast has the CSS class 'toast--error'", async () => {
    await renderAndOpenPasswordModal();

    await act(async () => { submitPasswordForm(); });

    await waitFor(
      () => expect(screen.getByText("Enter your current password.")).toBeInTheDocument(),
      { timeout: 5000 }
    );

    const toastEl = screen.getByText("Enter your current password.").closest(".toast");
    expect(toastEl).toHaveClass("toast--error");
  });

  test("success toast has the CSS class 'toast--success'", async () => {
    await renderAndOpenPasswordModal();

    fill("Current password", "OldPassword123!");
    fill("New password", "NewPassword456@A");
    fill("Confirm password", "NewPassword456@A");

    await act(async () => { submitPasswordForm(); });

    await waitFor(
      () =>
        expect(screen.getByText("Password updated successfully.")).toBeInTheDocument(),
      { timeout: 10000 }
    );

    const toastEl = screen
      .getByText("Password updated successfully.")
      .closest(".toast");
    expect(toastEl).toHaveClass("toast--success");
  });

  test("toast disappears after the auto-dismiss timer fires", async () => {
    jest.useFakeTimers();

    await renderAndOpenPasswordModal();

    await act(async () => { submitPasswordForm(); });

    await waitFor(
      () => expect(screen.getByText("Enter your current password.")).toBeInTheDocument(),
      { timeout: 5000 }
    );

    // Advance timers past the 4500 ms auto-dismiss delay
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(
        screen.queryByText("Enter your current password.")
      ).not.toBeInTheDocument();
    });

    jest.useRealTimers();
  });
});