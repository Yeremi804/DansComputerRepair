"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Settings as SettingsIcon,
  Package,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import "./SettingsPage.css";

export default function SettingsPage() {
  const router = useRouter();

  // useStates for changing credentials
  const [currentEmail, setCurrentEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const emailRegex = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, []);

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

  const handleUpdateCredentials = async (e) => {
    e.preventDefault();
    setToast(null);

    if (!newEmail.trim() && !newPassword.trim()) {
      pushToast("error", "Enter a new email or a new password.");
      return;
    }
    if (newEmail.trim() && !emailRegex.test(newEmail.trim())) {
      pushToast("error", "Enter a valid new email address.");
      return;
    }
    if (newPassword.trim()) {
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
    }

    setLoading(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const userEmail = userData?.user?.email ?? "";
      const normalizedUserEmail = userEmail.toLowerCase();
      const normalizedCurrentEmail = currentEmail.trim().toLowerCase();

      const isCurrentEmailMatch =
        Boolean(normalizedCurrentEmail) && normalizedCurrentEmail === normalizedUserEmail;

      let isCurrentPasswordMatch = false;
      if (currentPassword.trim() && normalizedUserEmail) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedUserEmail,
          password: currentPassword,
        });
        isCurrentPasswordMatch = !signInError;
      }

      if (!isCurrentEmailMatch && !isCurrentPasswordMatch) {
        pushToast("error", "Enter your current email or password to verify this change.");
        return;
      }

      const updates = {};
      if (newEmail.trim() && newEmail.trim().toLowerCase() !== normalizedUserEmail) {
        updates.email = newEmail.trim();
      }
      if (newPassword.trim()) {
        updates.password = newPassword;
      }

      if (Object.keys(updates).length === 0) {
        pushToast("error", "No changes detected.");
        return;
      }

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

      pushToast(
        "success",
        updates.email
          ? "Update submitted. Check your inbox to confirm the email change."
          : "Password updated successfully."
      );
    } catch (err) {
      console.error("Password update error:", err);
      pushToast("error", err?.message ?? "Failed to update account settings.");
    } finally {
      setLoading(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
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
                    Update your email and password. Provide your current email or password to verify
                    the change.
                  </p>
                </div>

                <form onSubmit={handleUpdateCredentials} className="password-form">
                  <div className="input-group">
                    <label htmlFor="current-email">Current Email</label>
                    <div className="input-row">
                      <span className="input-icon">
                        <Mail size={18} />
                      </span>
                      <input
                        id="current-email"
                        type="email"
                        value={currentEmail}
                        onChange={(e) => setCurrentEmail(e.target.value)}
                        placeholder="Current email"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor="current-password">Current Password</label>
                    <div className="input-row">
                      <span className="input-icon">
                        <Lock size={18} />
                      </span>
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
                    <label htmlFor="new-email">New Email</label>
                    <div className="input-row">
                      <span className="input-icon">
                        <Mail size={18} />
                      </span>
                      <input
                        id="new-email"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="New email"
                        autoComplete="email"
                      />
                    </div>
                  </div>

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

                  <motion.button
                    type="submit"
                    className="save-btn"
                    whileHover={{ scale: 1.02 }}
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Update credentials"}
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