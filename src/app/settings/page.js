"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { LayoutDashboard,Settings as SettingsIcon,Package,Lock,Eye,EyeOff,ShieldCheck,} from "lucide-react";
import "./SettingsPage.css";

export default function SettingsPage() {
  const router = useRouter();

  // useStates for changing password, form handling, and toast notifications
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState(null);
  const [mfaLoading, setMfaLoading] = useState(false);

  const pushToast = (type, text) => {
    setToast({ type, text });
    window.clearTimeout(pushToast._t);
    pushToast._t = window.setTimeout(() => setToast(null), 4500);
  };

  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsModalOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen]);

  useEffect(() => {
    if (!isModalOpen) {
      setMfaRequired(false);
      setMfaCode("");
      setMfaFactorId(null);
      setMfaLoading(false);
    }
  }, [isModalOpen]);

  const getFriendlyError = (err) => {
    const raw = String(err?.message || "");
    const message = raw.toLowerCase();

    if (message.includes("aal2") || message.includes("mfa")) {
      return "Please complete MFA first, then try updating your password again.";
    }
    if (message.includes("invalid")) {
      return "Invalid MFA code. Please try again.";
    }
    return raw || "Failed to update account settings.";
  };

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

  const performPasswordUpdate = async () => {
    const updates = { password: newPassword };

    let res;
    if (supabase?.auth?.updateUser) {
      res = await supabase.auth.updateUser(updates);
    } else if (supabase?.auth?.update) {
      res = await supabase.auth.update(updates);
    } else {
      throw new Error("Supabase auth client does not expose updateUser/update.");
    }

    const error = res?.error ?? null;
    if (error) throw error;
  };

  const clearPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMfaRequired(false);
    setMfaCode("");
    setMfaFactorId(null);
  };

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
    // First, re-authenticate the user with their current password to ensure they are who they say they are and 
    // to check if MFA is required. If the session is too old, Supabase will require MFA before allowing sensitive operations like password updates.
    let updated = false;

    try {
      const { data: aalData, error: aalError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalError) throw aalError;

      if (aalData?.currentLevel !== "aal2") {
        await beginMfaFlow();
        pushToast("error", "Complete MFA below to finish updating your password.");
        return;
      }

      await performPasswordUpdate();
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
  // This function is called when the user submits the MFA code after being prompted that MFA verification is required. 
  // It attempts to verify the provided MFA code, and if successful, proceeds with updating the password. 
  // If there are any errors during MFA verification or password update, it shows appropriate error messages.
  const handleVerifyMfaAndUpdate = async () => {
    setToast(null);

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
      const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({
        factorId: mfaFactorId,
        code: mfaCode.trim(),
      });
      if (verifyErr) throw verifyErr;

      await performPasswordUpdate();
      clearPasswordForm();
      pushToast("success", "MFA verified and password updated successfully.");
    } catch (err) {
      console.error("MFA verification error:", err);
      pushToast("error", getFriendlyError(err));
    } finally {
      setMfaLoading(false);
    }
  };

  return (
    <div className="dashboard settings-only">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Dashboard</h2>
        </div>

        <ul>
          <li onClick={() => router.push("/dashboard")}>
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </li>

          <li onClick={() => router.push("/admin-parts")}>
            <Package size={18} />
            <span>Parts</span>
          </li>

          <li className="active">
            <SettingsIcon size={18} />
            <span>Settings</span>
          </li>
        </ul>
      </div>

      <main className="settings-main">
        <div className="settings-panel">
          <h2>Password</h2>
          <p>Manage your login credentials and security preferences.</p>
          <button className="open-modal-btn" type="button" onClick={() => setIsModalOpen(true)}>
            Change Password
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
                  <p>
                    Update your password. Enter your current password to verify the change.
                  </p>
                </div>
              
                <form onSubmit={handleUpdatePassword} className="password-form">

                  <div className="input-group">
                    <label htmlFor="current-password">Current Password</label>
                    <div className="input-row">
                      <span className="input-icon">
                        <Lock size={18} />
                      </span>
                      // The current password field includes a toggle to show/hide the password for better usability, especially when entering complex passwords.
                      <input
                        id="current-password"
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Current password"  // The placeholder provides a hint to the user about what to enter in this field.
                        autoComplete="current-password" // This helps browsers understand that this field is for the current password, which can improve autofill behavior and security.
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
                        // If MFA verification is required, show the input for the MFA code. because if the user's session is ended or too old, 
                        // Supabase will require them to complete MFA verification before allowing sensitive operations like password updates.
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

        {toast && (
          <div className={`toast ${toast.type === "error" ? "toast--error" : "toast--success"}`}>
            {toast.text}
          </div>
        )}
      </main>
    </div>
  );
}
