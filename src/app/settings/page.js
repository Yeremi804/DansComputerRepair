"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { LayoutDashboard, Settings as SettingsIcon, Package } from "lucide-react";
import "./SettingsPage.css";

export default function SettingsPage() {
  const router = useRouter();

  // useStates for changing password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!newPassword || !confirmPassword) {
      setMessage({ type: "error", text: "Please enter and confirm the new password." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New password and confirm password do not match." });
      return;
    }
    if (newPassword.length < 8) {
      setMessage({ type: "error", text: "Password must be at least 8 characters." });
      return;
    }

    setLoading(true);

    try {
      let res;
      if (supabase?.auth?.updateUser) {
        res = await supabase.auth.updateUser({ password: newPassword });
      } else if (supabase?.auth?.update) {
        res = await supabase.auth.update({ password: newPassword });
      } else {
        throw new Error("Supabase auth client does not expose updateUser/update.");
      }

      const error = res?.error ?? null;
      if (error) throw error;

      setMessage({ type: "success", text: "Password updated successfully." });
    } catch (err) {
      console.error("Password update error:", err);
      setMessage({ type: "error", text: err?.message ?? "Failed to update password." });
    } finally {
      setLoading(false);
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
        <div className="settings-card">
          <h2>Account Settings</h2>
          <p>Enter a new password below.</p>

          <form onSubmit={handleChangePassword} className="password-form">
            <label>
              New password
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                autoComplete="new-password"
              />
            </label>

            <label>
              Confirm new password
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
              />
            </label>

            <motion.button
              type="submit"
              className="save-btn"
              whileHover={{ scale: 1.03 }}
              disabled={loading}
            >
              {loading ? "Saving..." : "Change password"}
            </motion.button>
          </form>

          {message && (
            <div className={`message ${message.type === "error" ? "error" : "success"}`}>
              {message.text}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}