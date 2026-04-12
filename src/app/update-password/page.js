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

  const [mfaOpen, setMfaOpen] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState(null);

  const [pendingPassword, setPendingPassword] = useState("");

  const router = useRouter();

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

        <div className="border border-neutral-300 rounded-md bg-white">
          <div className="p-6 md:p-8">
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="form-label">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    className="form-input pr-10"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-neutral-500 hover:text-neutral-700 cursor-pointer"
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
                <label className="form-label">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="form-input pr-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-neutral-500 hover:text-neutral-700 cursor-pointer"
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
                className={`btn-primary btn-full mt-2${loading ? " btn-disabled-grey" : ""}`}
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Two-factor Verification Popup */}
      {mfaOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="w-full max-w-sm modal-card">
            <h2>Two-factor Verification</h2>
            <p>
              Enter the 6-digit code from your authenticator app to finish
              resetting your password.
            </p>

            <form onSubmit={handleVerifyMFAAndUpdatePassword} className="space-y-3">
              <input
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                className="form-input"
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
                  className="btn-secondary"
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
                  className="btn-primary"
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
