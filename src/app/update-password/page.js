"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function UpdatePasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isDark, setIsDark] = useState(false);

  const [mfaOpen, setMfaOpen] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState(null);

  const [pendingPassword, setPendingPassword] = useState("");

  const router = useRouter();

  useEffect(() => {
    const syncTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    syncTheme();

    const observer = new MutationObserver(() => {
      syncTheme();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        console.log("Password recovery session detected.");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleUpdatePassword(e) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setMfaError("");

    if (!newPassword || !confirmPassword) {
      setError("Please fill in both password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      const { data: aalData, error: aalError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalError) {
        setError(aalError.message);
        return;
      }

      if (aalData?.currentLevel !== "aal2") {
        const { data: factors, error: listErr } =
          await supabase.auth.mfa.listFactors();

        if (listErr) {
          setError(listErr.message);
          return;
        }

        const verifiedTOTP = (factors?.totp || []).find(
          (factor) => factor.status === "verified"
        );

        if (verifiedTOTP) {
          const { error: chalErr } = await supabase.auth.mfa.challenge({
            factorId: verifiedTOTP.id,
          });

          if (chalErr) {
            setError(chalErr.message);
            return;
          }

          setPendingPassword(newPassword);
          setMfaFactorId(verifiedTOTP.id);
          setMfaCode("");
          setMfaError("");
          setMfaOpen(true);
          return;
        }
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccessMessage("Password updated successfully. Redirecting to login...");

      setTimeout(() => {
        router.replace("/admin-log-in");
      }, 2000);
    } catch (err) {
      console.error(err);
      setError("Unable to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyMFAAndUpdatePassword(e) {
    e.preventDefault();
    setMfaError("");
    setError("");
    setLoading(true);

    if (!mfaFactorId) {
      setMfaError("No TOTP factor found.");
      setLoading(false);
      return;
    }

    if (!pendingPassword) {
      setMfaError("No pending password update found.");
      setLoading(false);
      return;
    }

    try {
      const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({
        factorId: mfaFactorId,
        code: mfaCode.trim(),
      });

      if (verifyErr) {
        setMfaError(verifyErr.message || "Invalid code");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: pendingPassword,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setMfaOpen(false);
      setMfaCode("");
      setPendingPassword("");
      setSuccessMessage("Password updated successfully. Redirecting to login...");

      setTimeout(() => {
        router.replace("/admin-log-in");
      }, 2000);
    } catch (err) {
      console.error(err);
      setMfaError("Unable to verify MFA. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-main-bg text-main-text transition-colors duration-300">
      <section className="mx-auto max-w-2xl p-6">
        <h1 className="text-3xl font-semibold mb-6">Set New Password</h1>

        <div
          className="border rounded-md"
          style={{
            borderColor: isDark ? "#374151" : "#d4d4d8",
            backgroundColor: isDark ? "#111827" : "#ffffff",
          }}
        >
          <div className="p-6 md:p-8">
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label
                  className="block text-sm mb-1"
                  style={{ color: isDark ? "#e5e7eb" : "#111827" }}
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    className="w-full rounded-sm px-3 py-2 pr-10"
                    style={{
                      border: `1px solid ${isDark ? "#4b5563" : "#000000"}`,
                      backgroundColor: isDark ? "#1f2937" : "#ffffff",
                      color: isDark ? "#ffffff" : "#111827",
                    }}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 cursor-pointer"
                    style={{ color: isDark ? "#9ca3af" : "#737373" }}
                  >
                    {showNewPassword ? (
                      <EyeOff size={18} strokeWidth={1.5} />
                    ) : (
                      <Eye size={18} strokeWidth={1.5} />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  className="block text-sm mb-1"
                  style={{ color: isDark ? "#e5e7eb" : "#111827" }}
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="w-full rounded-sm px-3 py-2 pr-10"
                    style={{
                      border: `1px solid ${isDark ? "#4b5563" : "#000000"}`,
                      backgroundColor: isDark ? "#1f2937" : "#ffffff",
                      color: isDark ? "#ffffff" : "#111827",
                    }}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    className="absolute right-3 top-2.5 cursor-pointer"
                    style={{ color: isDark ? "#9ca3af" : "#737373" }}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} strokeWidth={1.5} />
                    ) : (
                      <Eye size={18} strokeWidth={1.5} />
                    )}
                  </button>
                </div>
              </div>

              {error && <div className="text-red-600 text-sm">{error}</div>}
              {successMessage && (
                <div className="text-green-700 text-sm">{successMessage}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full font-medium py-2 rounded-sm mt-2 cursor-pointer transition-colors"
                style={{
                  backgroundColor: loading
                    ? (isDark ? "#374151" : "#d4d4d8")
                    : (isDark ? "#ffffff" : "#000000"),
                  color: loading
                    ? (isDark ? "#9ca3af" : "#737373")
                    : (isDark ? "#000000" : "#ffffff"),
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Two-factor Verification Popup */}
      {mfaOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            className="w-full max-w-sm rounded-md p-6 space-y-4 shadow-xl"
            style={{
              backgroundColor: isDark ? "#111827" : "#ffffff",
              border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
            }}
          >
            <h2
              className="text-lg font-semibold"
              style={{ color: isDark ? "#ffffff" : "#111827" }}
            >
              Two-factor Verification
            </h2>
            <p
              className="text-sm"
              style={{ color: isDark ? "#e5e7eb" : "#000000" }}
            >
              Enter the 6-digit code from your authenticator app to finish
              resetting your password.
            </p>

            <form onSubmit={handleVerifyMFAAndUpdatePassword} className="space-y-3">
              <input
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                className="w-full rounded-sm px-3 py-2"
                style={{
                  border: `1px solid ${isDark ? "#4b5563" : "#000000"}`,
                  backgroundColor: isDark ? "#1f2937" : "#ffffff",
                  color: isDark ? "#ffffff" : "#111827",
                }}
                placeholder="123456"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                autoFocus
                required
              />

              {mfaError && <div className="text-red-600 text-sm">{mfaError}</div>}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="px-3 py-2 rounded-sm cursor-pointer"
                  style={{
                    border: `1px solid ${isDark ? "#4b5563" : "#000000"}`,
                    backgroundColor: isDark ? "#1f2937" : "#ffffff",
                    color: isDark ? "#ffffff" : "#111827",
                  }}
                  onClick={() => {
                    setMfaOpen(false);
                    setMfaCode("");
                    setMfaError("");
                    setPendingPassword("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-2 rounded-sm cursor-pointer"
                  style={{
                    backgroundColor: isDark ? "#ffffff" : "#000000",
                    color: isDark ? "#000000" : "#ffffff",
                  }}
                >
                  Verify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
