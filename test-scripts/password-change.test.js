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
});