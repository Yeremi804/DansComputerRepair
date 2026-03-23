import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsPage from "../src/app/settings/page";
import { supabase } from "../src/lib/supabase/client";

jest.mock("../src/app/settings/SettingsPage.css", () => ({}));

jest.mock("../src/app/components/Sidebar", () => {
  return function Sidebar() {
    return <div>Sidebar</div>;
  };
});

jest.mock("framer-motion", () => ({
  motion: {
    button: ({ children, whileHover, whileTap, ...props }) => (
      <button {...props}>{children}</button>
    ),
  },
}));

jest.mock("lucide-react", () => ({
  Lock: () => <span>Lock</span>,
  Eye: () => <span>Eye</span>,
  EyeOff: () => <span>EyeOff</span>,
  ShieldCheck: () => <span>ShieldCheck</span>,
  Mail: () => <span>Mail</span>,
}));

jest.mock("../src/lib/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      signInWithPassword: jest.fn(),
      updateUser: jest.fn(),
      signOut: jest.fn(),
      mfa: {
        getAuthenticatorAssuranceLevel: jest.fn(),
        listFactors: jest.fn(),
        challengeAndVerify: jest.fn(),
        unenroll: jest.fn(),
      },
    },
    from: jest.fn(),
  },
}));

describe("SettingsPage audit log tests", () => {
  let auditInsertMock;

  beforeEach(() => {
    jest.clearAllMocks();

    auditInsertMock = jest.fn().mockResolvedValue({ error: null });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    supabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          email: "test@example.com",
          user_metadata: {
            firstName: "John",
            lastName: "Smithleton",
          },
        },
      },
      error: null,
    });

    supabase.from.mockImplementation((table) => {
      if (table === "audit_logs") {
        return {
          insert: auditInsertMock,
        };
      }

      return {
        insert: jest.fn(),
        select: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      };
    });
  });

  test("creates PASSWORD_CHANGED audit log after successful password update", async () => {
    const user = userEvent.setup();

    supabase.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          email: "test@example.com",
        },
      },
      error: null,
    });

    supabase.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal2" },
      error: null,
    });

    supabase.auth.updateUser.mockResolvedValue({
      data: {},
      error: null,
    });

    render(<SettingsPage />);

    await user.click(screen.getByRole("button", { name: /change password/i }));

    const modal = screen
      .getByRole("heading", { name: /change credentials/i })
      .closest(".settings-card");
    const modalScope = within(modal);

    await user.type(
      modalScope.getByPlaceholderText("Current password"),
      "OldPassword123!"
    );
    await user.type(
      modalScope.getByPlaceholderText("New password"),
      "NewPassword123!"
    );
    await user.type(
      modalScope.getByPlaceholderText("Confirm password"),
      "NewPassword123!"
    );

    await user.click(
      modalScope.getByRole("button", { name: /update password/i })
    );

    await waitFor(() => {
      expect(auditInsertMock).toHaveBeenCalledWith([
        expect.objectContaining({
          actor_user_id: "user-123",
          actor_email: "test@example.com",
          action: "PASSWORD_CHANGED",
          entity_type: "users",
          entity_id: "user-123",
          metadata: { via_mfa: false },
        }),
      ]);
    });
  });

  test("creates EMAIL_UPDATED audit log after successful email update", async () => {
    const user = userEvent.setup();

    supabase.auth.updateUser.mockResolvedValue({
      data: {},
      error: null,
    });

    render(<SettingsPage />);

    await user.click(screen.getByRole("button", { name: /^update email$/i }));

    const modal = screen
      .getByRole("heading", { name: /^update email$/i })
      .closest(".settings-card");
    const modalScope = within(modal);

    await user.type(
      modalScope.getByLabelText(/new email address/i),
      "newemail@test.com"
    );
    await user.type(
      modalScope.getByLabelText(/confirm email address/i),
      "newemail@test.com"
    );

    await user.click(
      modalScope.getByRole("button", { name: /^update email$/i })
    );

    await waitFor(() => {
      expect(auditInsertMock).toHaveBeenCalledWith([
        expect.objectContaining({
          actor_user_id: "user-123",
          actor_email: "test@example.com",
          action: "EMAIL_UPDATED",
          entity_type: "users",
          entity_id: "user-123",
          metadata: { email_updated: true },
        }),
      ]);
    });
  });

  test("creates PROFILE_NAME_UPDATED audit log after successful profile name update", async () => {
    const user = userEvent.setup();

    supabase.auth.updateUser.mockResolvedValue({
      data: {},
      error: null,
    });

    render(<SettingsPage />);

    await user.click(screen.getByRole("button", { name: /update name/i }));

    const modal = screen
      .getByRole("heading", { name: /update name/i })
      .closest(".settings-card");
    const modalScope = within(modal);

    const firstNameInput = modalScope.getByLabelText(/first name/i);
    const lastNameInput = modalScope.getByLabelText(/last name/i);

    await user.clear(firstNameInput);
    await user.type(firstNameInput, "Jane");
    await user.clear(lastNameInput);
    await user.type(lastNameInput, "Doe");

    await user.click(modalScope.getByRole("button", { name: /save name/i }));

    await waitFor(() => {
      expect(auditInsertMock).toHaveBeenCalledWith([
        expect.objectContaining({
          actor_user_id: "user-123",
          actor_email: "test@example.com",
          action: "PROFILE_NAME_UPDATED",
          entity_type: "users",
          entity_id: "user-123",
          metadata: {
            has_first_name: true,
            has_last_name: true,
          },
        }),
      ]);
    });
  });

  test("creates MFA_UNENROLLED audit log after successful MFA unenroll", async () => {
    const user = userEvent.setup();

    //skip routing, since thats just meant for users like us to be re-routed after mfa is unenrolled
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    supabase.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          email: "test@example.com",
        },
      },
      error: null,
    });

    supabase.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal2" },
      error: null,
    });

    supabase.auth.mfa.listFactors.mockResolvedValue({
      data: {
        totp: [
          { id: "factor-1", status: "verified" },
          { id: "factor-2", status: "verified" },
        ],
        phone: [],
      },
      error: null,
    });

    supabase.auth.mfa.unenroll.mockResolvedValue({ error: null });
    supabase.auth.signOut.mockResolvedValue({ error: null });

    render(<SettingsPage />);

    await user.click(screen.getByRole("button", { name: /unenroll mfa/i }));

    const modal = screen
      .getByRole("heading", { name: /unenroll mfa/i })
      .closest(".settings-card");
    const modalScope = within(modal);

    await user.type(
      modalScope.getByPlaceholderText("Current password"),
      "CurrentPassword123!"
    );

    await user.click(
      modalScope.getByRole("button", { name: /confirm unenroll/i })
    );

    await waitFor(() => {
      expect(auditInsertMock).toHaveBeenCalledWith([
        expect.objectContaining({
          actor_user_id: "user-123",
          actor_email: "test@example.com",
          action: "MFA_UNENROLLED",
          entity_type: "users",
          entity_id: "user-123",
          metadata: {
            factor_ids: ["factor-1", "factor-2"],
            factor_count: 2,
          },
        }),
      ]);
    });

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });
});