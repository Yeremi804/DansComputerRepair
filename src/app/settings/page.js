"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import {
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Mail,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import "./SettingsPage.css";

/**
 * SettingsPage
 *
 * - Allows the current user to change their password.
 * - Supports MFA flow (when Supabase requires AAL2).
 * - Inserts a best-effort audit row into `audit_logs` after a successful password change.
 *
 * IMPORTANT: audit rows MUST NOT contain secrets (passwords). We only record metadata.
 */

export default function SettingsPage() {
  // profile name form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nameLoading, setNameLoading] = useState(false);

  // form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [emailLoading, setEmailLoading] = useState(false);

  // visibility toggles for inputs
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // modal + MFA state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState(null);
  const [mfaLoading, setMfaLoading] = useState(false);

  const [isMfaUnenrollOpen, setIsMfaUnenrollOpen] = useState(false);
  const [unenrollMfaRequired, setUnenrollMfaRequired] = useState(false);
  const [unenrollMfaCode, setUnenrollMfaCode] = useState("");
  const [unenrollMfaFactorId, setUnenrollMfaFactorId] = useState(null);
  const [unenrollMfaLoading, setUnenrollMfaLoading] = useState(false);

  // small toast helper
  const pushToast = (type, text) => {
    setToast({ type, text });
    window.clearTimeout(pushToast._t);
    pushToast._t = window.setTimeout(() => setToast(null), 4500);
  };

  // -----------------------------
  // Audit helper (best-effort)
  // -----------------------------
  // Inserts a row into `audit_logs`. Does NOT store secrets.
  // If insert fails we log and continue (non-blocking).
  const insertAudit = async ({
    action,
    entity_type = "users",
    entity_id = null,
    metadata = {},
  }) => {
    try {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userRes?.user) {
        console.warn("Audit: could not get user for audit_log:", userErr);
        return;
      }

      const u = userRes.user;

      const { error: auditErr } = await supabase.from("audit_logs").insert([
        {
          actor_user_id: u.id,
          actor_email: u.email,
          action, // e.g. "PASSWORD_CHANGED"
          entity_type,
          entity_id: entity_id ?? u.id,
          metadata, // JSON object; avoid secrets
        },
      ]);

      if (auditErr) {
        console.error("Audit insert error:", auditErr);
      }
    } catch (err) {
      console.error("Audit logging failed:", err);
    }
  };

  // Logout helper
  const handleLogoutAfterMfaUnenroll = async () => {
    // clear server-side session/cookies
    await fetch("/api/logout", { method: "POST" });

    // sign out client-side
    await supabase.auth.signOut();

    // close popups (modals) and change states
    setCurrentPassword("");
    setUnenrollMfaCode("");
    setUnenrollMfaFactorId(null);
    setUnenrollMfaRequired(false);
    setIsMfaUnenrollOpen(false);

    // send user back to the login page
    window.location.href = "/admin-log-in";
  };

  // -----------------------------
  // Modal focus / escape handling
  // -----------------------------
  useEffect(() => {
    if (!isModalOpen && !isNameModalOpen && !isEmailModalOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsModalOpen(false);
        setIsNameModalOpen(false);
        setIsEmailModalOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen, isNameModalOpen, isEmailModalOpen]);

  useEffect(() => {
    if (!isModalOpen) {
      setMfaRequired(false);
      setMfaCode("");
      setMfaFactorId(null);
      setMfaLoading(false);
    }
  }, [isModalOpen]);

  // Load current profile name from auth metadata so users can edit it.
  useEffect(() => {
    const loadProfileName = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) return;

      const meta = data.user.user_metadata || {};
      setFirstName(String(meta.firstName || "").trim());
      setLastName(String(meta.lastName || "").trim());
    };

    loadProfileName();
  }, []);

  // -----------------------------
  // Helpers for MFA & update flow
  // -----------------------------
  const getFriendlyError = (err) => {
    const raw = String(err?.message || "");
    const message = raw.toLowerCase();

    if (message.includes("current password is incorrect")) {
      return "Current password is incorrect.";
    }
    if (message.includes("aal2") || message.includes("mfa")) {
      return "Please complete MFA first, then try updating your password.";
    }
    if (message.includes("invalid")) {
      return "Invalid MFA code. Please try again.";
    }
    return raw || "Failed to update account settings.";
  };

  // Kick off client-side flow to locate a verified TOTP factor and mark MFA required
  const beginMfaFlow = async () => {
    const { data: factors, error: listErr } = await supabase.auth.mfa.listFactors();
    if (listErr) throw listErr;

    const verifiedTotp = (factors?.totp || []).find((factor) => factor.status === "verified");
    if (!verifiedTotp) {
      throw new Error("No verified MFA factor found. Please set up MFA from the admin login flow.");
    }

    setMfaFactorId(verifiedTotp.id);
    setMfaCode("");
    setMfaRequired(true);
  };

  const beginUnenrollMfaFlow = async () => {
    const { data: factors, error: listErr } =
      await supabase.auth.mfa.listFactors();

    if (listErr) throw listErr;

    const verifiedTotp = (factors?.totp || []).find(
      (factor) => factor.status === "verified"
    );

    if (!verifiedTotp) {
      throw new Error("No verified MFA factor found.");
    }

    setUnenrollMfaFactorId(verifiedTotp.id);
    setUnenrollMfaCode("");
    setUnenrollMfaRequired(true);
  };

  // Verifies the entered current password before allowing a password change.
  const verifyCurrentPassword = async () => {
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw userErr;

    const currentUser = userRes?.user;
    const email = currentUser?.email;

    if (!currentUser?.id || !email) {
      throw new Error("Unable to verify current password for this account.");
    }

    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });

    if (signInErr || !signInData?.user) {
      throw new Error("Current password is incorrect.");
    }

    if (signInData.user.id !== currentUser.id) {
      throw new Error("Current password is incorrect.");
    }
  };

  // Centralized password update function.
  // Optionally accepts { viaMfa: true } to indicate MFA was used.
  const performPasswordUpdate = async ({ viaMfa = false } = {}) => {
    const updates = { password: newPassword };

    let res;
    if (supabase?.auth?.updateUser) {
      // modern Supabase client
      res = await supabase.auth.updateUser(updates);
    } else if (supabase?.auth?.update) {
      // older client shape
      res = await supabase.auth.update(updates);
    } else {
      throw new Error("Supabase auth client does not expose updateUser/update.");
    }

    const error = res?.error ?? null;
    if (error) throw error;

    // AUDIT: record that the password was changed (best-effort).
    // metadata should not contain sensitive data.
    await insertAudit({
      action: "PASSWORD_CHANGED",
      entity_type: "users",
      entity_id: null, // helper will default to current user
      metadata: { via_mfa: Boolean(viaMfa) },
    });
  };

  // Clear form values
  const clearPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMfaRequired(false);
    setMfaCode("");
    setMfaFactorId(null);
  };

  const clearEmailForm = () => {
    setNewEmail("");
    setConfirmEmail("");
  };

  const isValidEmailFormat = (value) => {
    const email = String(value || "").trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const showEmailFormatHelp = () => {
    window.alert(
      "Please enter a valid email address.\n\nA good email address should contain:\n- A username before @\n- Exactly one @ symbol\n- A domain name after @\n- A dot (.) in the domain, for example: name@example.com"
    );
  };

  // -----------------------------
  // Handlers: submit / verify MFA
  // -----------------------------
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setToast(null);

    if (!currentPassword.trim()) {
      pushToast("error", "Enter your current password.");
      return;
    }
    if (!newPassword.trim()) {
      pushToast("error", "Enter a new password.");
      return;
    }
    if (!confirmPassword.trim()) {
      pushToast("error", "Please confirm the new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      pushToast("error", "New password and confirm password do not match.");
      return;
    }
    if (newPassword.length < 8) {
      pushToast("error", "Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    let updated = false;

    try {
      await verifyCurrentPassword();

      // Check the current authenticator assurance level.
      // If it's not AAL2, Supabase may require MFA verification for sensitive ops.
      const { data: aalData, error: aalError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalError) throw aalError;

      if (aalData?.currentLevel !== "aal2") {
        // Start MFA flow — this sets mfaRequired and shows the MFA input in the modal.
        await beginMfaFlow();
        pushToast("error", "Complete MFA below to finish updating your password.");
        return;
      }

      // No extra MFA step required — perform update and audit
      await performPasswordUpdate({ viaMfa: false });
      updated = true;

      pushToast("success", "Password updated successfully.");
    } catch (err) {
      console.error("Password update error:", err);
      pushToast("error", getFriendlyError(err));
    } finally {
      setLoading(false);
      if (updated) clearPasswordForm();
    }
  };

  // Called when user enters MFA code and clicks verify -> then update password.
  const handleVerifyMfaAndUpdate = async () => {
    setToast(null);

    if (!currentPassword.trim()) {
      pushToast("error", "Enter your current password.");
      return;
    }
    if (!mfaFactorId) {
      pushToast("error", "MFA setup not found. Click Update password to start MFA verification.");
      return;
    }
    if (!/^\d{6}$/.test(mfaCode.trim())) {
      pushToast("error", "Enter the 6-digit code from your authenticator app.");
      return;
    }

    setMfaLoading(true);

    try {
      await verifyCurrentPassword();

      const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({
        factorId: mfaFactorId,
        code: mfaCode.trim(),
      });
      if (verifyErr) throw verifyErr;

      // Verified — perform update and audit (viaMfa: true)
      await performPasswordUpdate({ viaMfa: true });
      clearPasswordForm();
      pushToast("success", "MFA verified and password updated successfully.");
    } catch (err) {
      console.error("MFA verification error:", err);
      pushToast("error", getFriendlyError(err));
    } finally {
      setMfaLoading(false);
    }
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    setToast(null);

    const nextEmail = newEmail.trim();
    const confirm = confirmEmail.trim();

    if (!nextEmail) {
      pushToast("error", "Enter a new email address.");
      return;
    }

    if (!confirm) {
      pushToast("error", "Please confirm the new email address.");
      return;
    }

    if (nextEmail.toLowerCase() !== confirm.toLowerCase()) {
      pushToast("error", "New email and confirm email do not match.");
      return;
    }

    if (!isValidEmailFormat(nextEmail)) {
      pushToast("error", "Invalid email format.");
      showEmailFormatHelp();
      return;
    }

    setEmailLoading(true);

    try {
      let res;
      const updates = { email: nextEmail };
      const emailRedirectTo =
        process.env.NEXT_PUBLIC_SITE_URL
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
          : `${window.location.origin}/auth/callback`;

      if (supabase?.auth?.updateUser) {
        res = await supabase.auth.updateUser(updates, { emailRedirectTo });
      } else if (supabase?.auth?.update) {
        res = await supabase.auth.update(updates);
      } else {
        throw new Error("Supabase auth client does not expose updateUser/update.");
      }

      const error = res?.error ?? null;
      if (error) throw error;

      await insertAudit({
        action: "EMAIL_UPDATED",
        entity_type: "users",
        entity_id: null,
        metadata: { email_updated: true },
      });

      clearEmailForm();
      setIsEmailModalOpen(false);
      pushToast("success", "Email updated successfully.");
    } catch (err) {
      console.error("Email update error:", err);
      pushToast("error", getFriendlyError(err));
    } finally {
      setEmailLoading(false);
    }
  };

  // Handle MFA Unenroll
  const handleUnenrollMfa = async (e) => {
    e.preventDefault();
    setToast(null);

    if (!currentPassword.trim()) {
      pushToast("error", "Enter your current password.");
      return;
    }

    try {
      // Get current user
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userRes?.user) {
        throw new Error("User not authenticated.");
      }

      const email = userRes.user.email;

      // Re-auth
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (signInErr) {
        throw new Error("Current password is incorrect.");
      }

      const { data: aalData, error: aalError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalError) throw aalError;

      if (aalData?.currentLevel !== "aal2") {
        await beginUnenrollMfaFlow();
        pushToast("error", "Complete MFA below to finish unenrolling.");
        return;
      }

      // List the MFA factors
      const { data: factors, error: listErr } =
        await supabase.auth.mfa.listFactors();

      if (listErr) throw listErr;

      const verifiedFactors = [
        ...(factors?.totp || []),
        ...(factors?.phone || []),
      ].filter((factor) => factor.status === "verified");

      if (verifiedFactors.length === 0) {
        throw new Error("No verified MFA factors found.");
      }

      // Unenroll all verified factors
      for (const factor of verifiedFactors) {
        const { error: unenrollErr } = await supabase.auth.mfa.unenroll({
          factorId: factor.id,
        });

        if (unenrollErr) throw unenrollErr;
      }

      // audit
      await insertAudit({
        action: "MFA_UNENROLLED",
        metadata: {
          factor_ids: verifiedFactors.map((factor) => factor.id),
          factor_count: verifiedFactors.length,
        },
      });

      pushToast("success", "MFA successfully unenrolled.");
      
      // Logout user after the removal of MFA factors
      await handleLogoutAfterMfaUnenroll();

    } catch (err) {
      console.error("MFA unenroll error:", err);
      pushToast("error", err.message || "Failed to unenroll MFA.");
    }
  };

  const handleVerifyMfaAndUnenroll = async () => {
    setToast(null);

    if (!unenrollMfaFactorId) {
      pushToast("error", "MFA setup not found. Click Confirm Unenroll to start.");
      return;
    }

    if (!/^\d{6}$/.test(unenrollMfaCode.trim())) {
      pushToast("error", "Enter the 6-digit code from your authenticator app.");
      return;
    }

    setUnenrollMfaLoading(true);

    try {
      const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({
        factorId: unenrollMfaFactorId,
        code: unenrollMfaCode.trim(),
      });

      if (verifyErr) throw verifyErr;

      // Now we are AAL2 — safe to unenroll all verified factors
      const { data: factors, error: listErr } =
        await supabase.auth.mfa.listFactors();

      if (listErr) throw listErr;

      const verifiedFactors = [
        ...(factors?.totp || []),
        ...(factors?.phone || []),
      ].filter((factor) => factor.status === "verified");

      if (verifiedFactors.length === 0) {
        throw new Error("No verified MFA factors found.");
      }

      for (const factor of verifiedFactors) {
        const { error: unenrollErr } = await supabase.auth.mfa.unenroll({
          factorId: factor.id,
        });

        if (unenrollErr) throw unenrollErr;
      }

      await insertAudit({
        action: "MFA_UNENROLLED",
        metadata: {
          factor_ids: verifiedFactors.map((factor) => factor.id),
          factor_count: verifiedFactors.length,
        },
      });

      pushToast("success", "MFA successfully unenrolled.");
      
      // Logout user after the removal of MFA factors
      await handleLogoutAfterMfaUnenroll();

    } catch (err) {
      console.error("MFA verify+unenroll error:", err);
      pushToast("error", err.message || "Failed to verify MFA and unenroll.");
    } finally {
      setUnenrollMfaLoading(false);
    }
  };
  

  const handleUpdateName = async (e) => {
    e.preventDefault();
    setToast(null);

    const first = firstName.trim();
    const last = lastName.trim();
    const fullName = [first, last].filter(Boolean).join(" ").trim();

    if (!fullName) {
      pushToast("error", "Please enter at least first name or last name.");
      return;
    }

    setNameLoading(true);

    try {
      let res;
      const metadata = {
        firstName: first,
        lastName: last,
        full_name: fullName,
        name: fullName,
      };

      if (supabase?.auth?.updateUser) {
        res = await supabase.auth.updateUser({ data: metadata });
      } else if (supabase?.auth?.update) {
        res = await supabase.auth.update({ data: metadata });
      } else {
        throw new Error("Supabase auth client does not expose updateUser/update.");
      }

      const error = res?.error ?? null;
      if (error) throw error;

      await insertAudit({
        action: "PROFILE_NAME_UPDATED",
        entity_type: "users",
        entity_id: null,
        metadata: {
          has_first_name: Boolean(first),
          has_last_name: Boolean(last),
        },
      });

      pushToast("success", "Profile name updated successfully.");
      setIsNameModalOpen(false);
    } catch (err) {
      console.error("Profile name update error:", err);
      pushToast("error", getFriendlyError(err));
    } finally {
      setNameLoading(false);
    }
  };

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <div className="flex min-h-screen bg-main-bg">
      <Sidebar />

      <main className="flex-1 p-8 settings-main">
        <div className="settings-panel">
          <h2>Profile Name</h2>
          <p>Modify your profile name.</p>

          <button
            className="open-modal-btn"
            type="button"
            onClick={() => setIsNameModalOpen(true)}
          >
            Update Name
          </button>
        </div>

        <div className="settings-panel">
          <h2>Password</h2>
          <p>Manage your login credentials and security preferences.</p>
          <button
            className="open-modal-btn"
            type="button"
            onClick={() => setIsModalOpen(true)}
          >
            Change Password
          </button>
        </div>

        <div className="settings-panel">
          <h2>Email</h2>
          <p>Update your account email address.</p>
          <button
            className="open-modal-btn"
            type="button"
            onClick={() => setIsEmailModalOpen(true)}
          >
            Update Email
          </button>
        </div>

        <div className="settings-panel">
          <h2>MFA Unenroll</h2>
          <p>Remove multi-factor authentication from your account.</p>
          <button
            className="open-modal-btn"
            type="button"
            onClick={() => setIsMfaUnenrollOpen(true)}
          >
            Unenroll MFA
          </button>
        </div>

        {isModalOpen && (
          <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
            <div className="modal" onClick={(event) => event.stopPropagation()}>
              <div className="settings-card">
                <div className="settings-card__header">
                  <div className="settings-card__icon">
                    <ShieldCheck size={26} />
                  </div>
                  <h2>Change Credentials</h2>
                  <p>Update your password. Enter your current password to verify the change.</p>
                </div>

                <form onSubmit={handleUpdatePassword} className="password-form">
                  <div className="input-group">
                    <label htmlFor="current-password">Current Password</label>
                    <div className="input-row">
                      <span className="input-icon">
                        <Lock size={18} />
                      </span>
                      {/* current password field */}
                      <input
                        id="current-password"
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Current password"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="toggle-visibility"
                        onClick={() => setShowCurrentPassword((prev) => !prev)}
                        aria-label={
                          showCurrentPassword ? "Hide current password" : "Show current password"
                        }
                      >
                        {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="divider" />

                  <div className="input-group">
                    <label htmlFor="new-password">New Password</label>
                    <div className="input-row">
                      <span className="input-icon">
                        <Lock size={18} />
                      </span>
                      <input
                        id="new-password"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="toggle-visibility"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <span className="helper-text">
                      Must be at least 8 characters with upper, lower, number, and symbol.
                    </span>
                  </div>

                  <div className="input-group">
                    <label htmlFor="confirm-password">Confirm Password</label>
                    <div className="input-row">
                      <span className="input-icon">
                        <Lock size={18} />
                      </span>
                      <input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="toggle-visibility"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        aria-label={
                          showConfirmPassword ? "Hide confirm password" : "Show confirm password"
                        }
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* If MFA is required show the input and verify button */}
                  {mfaRequired && (
                    <div className="input-group">
                      <label htmlFor="mfa-code">MFA Code</label>
                      <div className="input-row">
                        <span className="input-icon">
                          <ShieldCheck size={18} />
                        </span>
                        <input
                          id="mfa-code"
                          inputMode="numeric"
                          pattern="[0-9]{6}"
                          maxLength={6}
                          value={mfaCode}
                          onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                          placeholder="6-digit code"
                          autoComplete="one-time-code"
                        />
                      </div>
                      <span className="helper-text">
                        Enter the 6-digit code from your authenticator app, then verify.
                      </span>
                      <motion.button
                        type="button"
                        className="save-btn"
                        whileHover={{ scale: 1.02 }}
                        disabled={mfaLoading}
                        onClick={handleVerifyMfaAndUpdate}
                      >
                        {mfaLoading ? "Verifying..." : "Verify MFA and update password"}
                      </motion.button>
                    </div>
                  )}

                  <motion.button
                    type="submit"
                    className="save-btn"
                    whileHover={{ scale: 1.02 }}
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Update password"}
                  </motion.button>
                </form>
              </div>
            </div>
          </div>
        )}

        {isMfaUnenrollOpen && (
          <div
            className="modal-backdrop"
            onClick={() => setIsMfaUnenrollOpen(false)}
          >
            <div
              className="modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="settings-card">
                <div className="settings-card__header">
                  <div className="settings-card__icon">
                    <ShieldCheck size={26} />
                  </div>
                  <h2>Unenroll MFA</h2>
                  <p>
                    Enter your current password to remove multi-factor authentication
                    from your account.
                  </p>
                </div>

                <form onSubmit={handleUnenrollMfa} className="password-form">
                  <div className="input-group">
                    <label htmlFor="unenroll-current-password">
                      Current Password
                    </label>
                    <div className="input-row">
                      <span className="input-icon">
                        <Lock size={18} />
                      </span>
                      <input
                        id="unenroll-current-password"
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Current password"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="toggle-visibility"
                        onClick={() =>
                          setShowCurrentPassword((prev) => !prev)
                        }
                      >
                        {showCurrentPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                      {unenrollMfaRequired && (
                        <div className="input-group">
                          <label htmlFor="unenroll-mfa-code">MFA Code</label>
                          <div className="input-row">
                            <span className="input-icon">
                              <ShieldCheck size={18} />
                            </span>
                            <input
                              id="unenroll-mfa-code"
                              inputMode="numeric"
                              pattern="[0-9]{6}"
                              maxLength={6}
                              value={unenrollMfaCode}
                              onChange={(e) =>
                                setUnenrollMfaCode(e.target.value.replace(/\D/g, ""))
                              }
                              placeholder="6-digit code"
                              autoComplete="one-time-code"
                            />
                          </div>

                          <motion.button
                            type="button"
                            className="save-btn"
                            whileHover={{ scale: 1.02 }}
                            disabled={unenrollMfaLoading}
                            onClick={handleVerifyMfaAndUnenroll}
                          >
                            {unenrollMfaLoading ? "Verifying..." : "Verify MFA and Unenroll"}
                          </motion.button>
                        </div>
                      )}

                  <motion.button
                    type="submit"
                    className="save-btn"
                    whileHover={{ scale: 1.02 }}
                  >
                    Confirm Unenroll
                  </motion.button>
                </form>
              </div>
            </div>
          </div>
        )}

        {isNameModalOpen && (
          <div className="modal-backdrop" onClick={() => setIsNameModalOpen(false)}>
            <div className="modal" onClick={(event) => event.stopPropagation()}>
              <div className="settings-card">
                <div className="settings-card__header">
                  <h2>Update Name</h2>
                  <p>Enter your preferred first and last name for the header profile display.</p>
                </div>

                <form onSubmit={handleUpdateName} className="password-form">
                  <div className="input-group">
                    <label htmlFor="first-name">First Name</label>
                    <div className="input-row">
                      <input
                        id="first-name"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First name"
                        autoComplete="given-name"
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor="last-name">Last Name</label>
                    <div className="input-row">
                      <input
                        id="last-name"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last name"
                        autoComplete="family-name"
                      />
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    className="save-btn"
                    whileHover={{ scale: 1.02 }}
                    disabled={nameLoading}
                  >
                    {nameLoading ? "Saving..." : "Save Name"}
                  </motion.button>
                </form>
              </div>
            </div>
          </div>
        )}

        {isEmailModalOpen && (
          <div className="modal-backdrop" onClick={() => setIsEmailModalOpen(false)}>
            <div className="modal" onClick={(event) => event.stopPropagation()}>
              <div className="settings-card">
                <div className="settings-card__header">
                  <div className="settings-card__icon">
                    <Mail size={26} />
                  </div>
                  <h2>Update Email</h2>
                  <p>Enter and confirm your new email address.</p>
                </div>

                <form onSubmit={handleUpdateEmail} className="password-form">
                  <div className="input-group">
                    <label htmlFor="new-email">New Email Address</label>
                    <div className="input-row">
                      <span className="input-icon">
                        <Mail size={18} />
                      </span>
                      <input
                        id="new-email"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="name@example.com"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor="confirm-email">Confirm Email Address</label>
                    <div className="input-row">
                      <span className="input-icon">
                        <Mail size={18} />
                      </span>
                      <input
                        id="confirm-email"
                        type="email"
                        value={confirmEmail}
                        onChange={(e) => setConfirmEmail(e.target.value)}
                        placeholder="name@example.com"
                        autoComplete="email"
                      />
                    </div>
                    <span className="helper-text">
                      Format example: name@example.com
                    </span>
                  </div>

                  <motion.button
                    type="submit"
                    className="save-btn"
                    whileHover={{ scale: 1.02 }}
                    disabled={emailLoading}
                  >
                    {emailLoading ? "Saving..." : "Update Email"}
                  </motion.button>
                </form>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className={`toast ${toast.type === "error" ? "toast--error" : "toast--success"}`}>
            {toast.text}
          </div>
        )}
      </main>
    </div>
  );
}
