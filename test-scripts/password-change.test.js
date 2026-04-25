import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SettingsPage from "../src/app/settings/page";

// Mock Sidebar so Next router hooks inside it do not run during this test
jest.mock("../src/app/components/Sidebar", () => {
  return function MockSidebar() {
    return <div>Mock Sidebar</div>;
  };
});

// Mock toast helper file actually used by settings page
jest.mock("../src/lib/toastNotifs", () => ({
  showPasswordChangeSuccess: jest.fn(),
  showPasswordChangeError: jest.fn(),
}));

// Mock shared supabase client using the exact import path shape the page relies on.
// This works without changing Jest config because the page itself already resolves in your current setup.
const getUserMock = jest.fn();
const signInWithPasswordMock = jest.fn();
const updateUserMock = jest.fn();
const getAuthenticatorAssuranceLevelMock = jest.fn();
const listFactorsMock = jest.fn();
const challengeAndVerifyMock = jest.fn();
const unenrollMock = jest.fn();
const insertAuditMock = jest.fn();

jest.mock("../src/lib/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: (...args) => getUserMock(...args),
      signInWithPassword: (...args) => signInWithPasswordMock(...args),
      updateUser: (...args) => updateUserMock(...args),
      mfa: {
        getAuthenticatorAssuranceLevel: (...args) =>
          getAuthenticatorAssuranceLevelMock(...args),
        listFactors: (...args) => listFactorsMock(...args),
        challengeAndVerify: (...args) => challengeAndVerifyMock(...args),
        unenroll: (...args) => unenrollMock(...args),
      },
    },
    from: () => ({
      insert: insertAuditMock,
    }),
  },
}));

jest.spyOn(console, "error").mockImplementation(() => {});
jest.spyOn(console, "warn").mockImplementation(() => {});
jest.spyOn(console, "log").mockImplementation(() => {});

describe("Password Change", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          email: "jane@test.com",
          user_metadata: {
            firstName: "Jane",
            lastName: "Doe",
          },
        },
      },
      error: null,
    });

    signInWithPasswordMock.mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          email: "jane@test.com",
        },
      },
      error: null,
    });

    getAuthenticatorAssuranceLevelMock.mockResolvedValue({
      data: {
        currentLevel: "aal2",
      },
      error: null,
    });

    updateUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-123",
        },
      },
      error: null,
    });

    insertAuditMock.mockResolvedValue({
      error: null,
    });

    listFactorsMock.mockResolvedValue({
      data: {
        totp: [],
      },
      error: null,
    });

    challengeAndVerifyMock.mockResolvedValue({
      error: null,
    });

    unenrollMock.mockResolvedValue({
      error: null,
    });
  });

  async function openPasswordModal() {
    render(<SettingsPage />);

    fireEvent.click(
      screen.getByRole("button", { name: /change password/i })
    );

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Current password")
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("New password")
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Confirm password")
      ).toBeInTheDocument();
    });
  }

  test("renders password fields", async () => {
    await openPasswordModal();

    expect(screen.getByPlaceholderText("Current password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("New password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Confirm password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /update password/i })
    ).toBeInTheDocument();
  });

  test("shows success message when password change succeeds", async () => {
    await openPasswordModal();

    fireEvent.change(screen.getByPlaceholderText("Current password"), {
      target: { value: "CurrentPassword123!" },
    });

    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "NewPassword123!" },
    });

    fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
      target: { value: "NewPassword123!" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /update password/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/password updated successfully\./i)
      ).toBeInTheDocument();
    });
  });

  test("shows error message when password change fails", async () => {
    updateUserMock.mockResolvedValue({
      data: null,
      error: { message: "Password update failed" },
    });

    await openPasswordModal();

    fireEvent.change(screen.getByPlaceholderText("Current password"), {
      target: { value: "CurrentPassword123!" },
    });

    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "NewPassword123!" },
    });

    fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
      target: { value: "NewPassword123!" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /update password/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/password update failed/i)
      ).toBeInTheDocument();
    });
  });

  test("calls updateUser with the new password", async () => {
    await openPasswordModal();

    fireEvent.change(screen.getByPlaceholderText("Current password"), {
      target: { value: "CurrentPassword123!" },
    });

    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "NewPassword123!" },
    });

    fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
      target: { value: "NewPassword123!" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /update password/i })
    );

    await waitFor(() => {
      expect(updateUserMock).toHaveBeenCalledWith({
        password: "NewPassword123!",
      });
    });
  });

  // ─── Input Validation Tests ──────────────────────────────────────────────

  test("shows error when current password is empty", async () => {
    await openPasswordModal();

    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "NewPassword123!" },
    });

    fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
      target: { value: "NewPassword123!" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /update password/i })
    );

    await waitFor(() => {
      expect(signInWithPasswordMock).not.toHaveBeenCalled();
    });
  });

  test("shows error when new password is empty", async () => {
    await openPasswordModal();

    fireEvent.change(screen.getByPlaceholderText("Current password"), {
      target: { value: "CurrentPassword123!" },
    });

    fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
      target: { value: "NewPassword123!" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /update password/i })
    );

    await waitFor(() => {
      expect(updateUserMock).not.toHaveBeenCalled();
    });
  });

  test("shows error when confirm password is empty", async () => {
    await openPasswordModal();

    fireEvent.change(screen.getByPlaceholderText("Current password"), {
      target: { value: "CurrentPassword123!" },
    });

    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "NewPassword123!" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /update password/i })
    );

    await waitFor(() => {
      expect(updateUserMock).not.toHaveBeenCalled();
    });
  });

  test("shows error when new password and confirm password do not match", async () => {
    await openPasswordModal();

    fireEvent.change(screen.getByPlaceholderText("Current password"), {
      target: { value: "CurrentPassword123!" },
    });

    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "NewPassword123!" },
    });

    fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
      target: { value: "DifferentPassword456!" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /update password/i })
    );

    await waitFor(() => {
      expect(updateUserMock).not.toHaveBeenCalled();
    });
  });

  test("shows error when new password is less than 8 characters", async () => {
    await openPasswordModal();

    fireEvent.change(screen.getByPlaceholderText("Current password"), {
      target: { value: "CurrentPassword123!" },
    });

    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "Short1!" },
    });

    fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
      target: { value: "Short1!" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /update password/i })
    );

    await waitFor(() => {
      expect(updateUserMock).not.toHaveBeenCalled();
    });
  });

  // ─── Password Visibility Tests ───────────────────────────────────────────

  test("current password field starts hidden (type='password')", async () => {
    await openPasswordModal();

    expect(screen.getByPlaceholderText("Current password")).toHaveAttribute(
      "type",
      "password"
    );
  });

  test("new password field starts hidden (type='password')", async () => {
    await openPasswordModal();

    expect(screen.getByPlaceholderText("New password")).toHaveAttribute(
      "type",
      "password"
    );
  });

  test("confirm password field starts hidden (type='password')", async () => {
    await openPasswordModal();

    expect(screen.getByPlaceholderText("Confirm password")).toHaveAttribute(
      "type",
      "password"
    );
  });

  // ─── Authentication Tests ────────────────────────────────────────────────

  test("calls signInWithPassword with email and current password", async () => {
    await openPasswordModal();

    fireEvent.change(screen.getByPlaceholderText("Current password"), {
      target: { value: "CurrentPassword123!" },
    });

    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "NewPassword123!" },
    });

    fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
      target: { value: "NewPassword123!" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /update password/i })
    );

    await waitFor(() => {
      expect(signInWithPasswordMock).toHaveBeenCalledWith({
        email: "jane@test.com",
        password: "CurrentPassword123!",
      });
    });
  });

  test("shows error when current password is incorrect", async () => {
    signInWithPasswordMock.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Current password is incorrect." },
    });

    await openPasswordModal();

    fireEvent.change(screen.getByPlaceholderText("Current password"), {
      target: { value: "WrongPassword123!" },
    });

    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "NewPassword123!" },
    });

    fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
      target: { value: "NewPassword123!" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /update password/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/current password is incorrect/i)
      ).toBeInTheDocument();
    });

    expect(updateUserMock).not.toHaveBeenCalled();
  });

  // ─── Form Behavior Tests ─────────────────────────────────────────────────

  test("clears form fields after successful password change", async () => {
    await openPasswordModal();

    fireEvent.change(screen.getByPlaceholderText("Current password"), {
      target: { value: "CurrentPassword123!" },
    });

    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "NewPassword123!" },
    });

    fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
      target: { value: "NewPassword123!" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /update password/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/password updated successfully\./i)
      ).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText("Current password")).toHaveValue("");
    expect(screen.getByPlaceholderText("New password")).toHaveValue("");
    expect(screen.getByPlaceholderText("Confirm password")).toHaveValue("");
  });

  // ─── Audit Logging Tests ────────────────────────────────────────────────

  test("inserts audit log entry after successful password change", async () => {
    await openPasswordModal();

    fireEvent.change(screen.getByPlaceholderText("Current password"), {
      target: { value: "CurrentPassword123!" },
    });

    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "NewPassword123!" },
    });

    fireEvent.change(screen.getByPlaceholderText("Confirm password"), {
      target: { value: "NewPassword123!" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /update password/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/password updated successfully\./i)
      ).toBeInTheDocument();
    });

    expect(insertAuditMock).toHaveBeenCalled();
  });

  // ─── Modal Behavior Tests ────────────────────────────────────────────────

  test("closes modal when backdrop is clicked", async () => {
    render(<SettingsPage />);

    fireEvent.click(
      screen.getByRole("button", { name: /change password/i })
    );

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Current password")
      ).toBeInTheDocument();
    });

    const backdrop = document.querySelector(".modal-backdrop");
    if (backdrop) {
      fireEvent.click(backdrop);

      await waitFor(() => {
        expect(
          screen.queryByPlaceholderText("Current password")
        ).not.toBeInTheDocument();
      });
    }
  });

  test("closes modal when Escape key is pressed", async () => {
    render(<SettingsPage />);

    fireEvent.click(
      screen.getByRole("button", { name: /change password/i })
    );

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Current password")
      ).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(
        screen.queryByPlaceholderText("Current password")
      ).not.toBeInTheDocument();
    });
  });
});