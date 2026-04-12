"use client";
import { useEffect, useState } from "react"; // React hooks for managing state and side effects
import { Eye, EyeOff } from "lucide-react"; // 2 icons for password state
import { supabase } from "@/lib/supabase/client"; // supabase client for authentication and database interactions
import { useRouter } from "next/navigation"; // Next.js hook for programmatic navigation

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false); // hide password by default
  const [email, setEmail] = useState(""); // used by supabase
  const [password, setPassword] = useState(""); // used by supabase
  const [loading, setLoading] = useState(false);  // used by supabase
  const [error, setError] = useState("");  // used by supabase
  const [rememberMe, setRememberMe] = useState(false);
  // Captcha states that enable captcah to pop up, store the svg, store the user input, store the error message, and store the verification status
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaSvg, setCaptchaSvg] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  const [captchaVerified, setCaptchaVerified] = useState(false);
  // Forgot Password States
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState("");
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState("");

 

  //load captcha on component mount
  const loadCaptcha = async () => {
    const response = await fetch("/api/captcha");
    const data = await response.json();
    setCaptchaSvg(data.svg);
  };

  //activate the function ahead of time so that the captcha can load while the user is filling out their email and password. This way, when they click the "I'm not a robot" box, the captcha will already be there without any delay.
  useEffect(() => {
    loadCaptcha();
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    const rememberedPassword = localStorage.getItem('rememberedPassword');
    // Only pre-fill fields if Remember Me was explicitly checked before
    const wasRemembered = localStorage.getItem('rememberMeChecked') === 'true';
    if (wasRemembered && rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
    if (wasRemembered && rememberedPassword) {
      setPassword(rememberedPassword);
    }
  }, []);

  //Function to verify the captcha input against the cookie value
  const fetchCaptcha = async () => {
    setCaptchaError("");

    const response = await fetch("/api/captcha/verifyCaptcha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userInput: captchaInput }),
    });

    //if it is okay based on the verifyCaptcha API, it read the status being 200
    if (response.ok) {
      setCaptchaVerified(true);
      setShowCaptcha(false);
      //optionally clear the captcha input and error message is put in the label textbox
    } else {
      setCaptchaError("Captcha verification failed. Please try again.");
      setCaptchaInput("");
      loadCaptcha(); // Load a new captcha on failure
    }
  };


  // MFA with TOTP (Time-based One Time Password)
  const [mfaOpen, setMfaOpen] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState(null);
  const router = useRouter();

  async function handleForgotPassword(e) {
    e.preventDefault();
    setForgotPasswordError("");
    setForgotPasswordMessage("");
    setForgotPasswordLoading(true);

    const emailToReset = forgotPasswordEmail.trim();

    if (!emailToReset) {
      setForgotPasswordError("Please enter your email address.");
      setForgotPasswordLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailToReset, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) {
        setForgotPasswordError(error.message);
        return;
      }

      setForgotPasswordMessage(
        "Password reset email sent. Please check your inbox."
      );
    } catch (err) {
      console.error(err);
      setForgotPasswordError("Unable to send reset email. Please try again.");
    } finally {
      setForgotPasswordLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // First, check if captcha is verified before proceeding with login also testing if you can access the cookie value for verification. This is important since if we can find exploit to bypasss the captcha, then we can bypass the MFA as well since MFA is only triggered after successful captcha verification.
    if (!captchaVerified) {
      setError("Please complete the captcha verification.");
      return;
    }

    setError("");
    setLoading(true);

    const emailTrimmed = email.trim();

    try {
      // The regular login
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: emailTrimmed,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      // Remember email/password if checked
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', emailTrimmed);
        localStorage.setItem('rememberedPassword', password);
        localStorage.setItem('rememberMeChecked', 'true');
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
        localStorage.removeItem('rememberMeChecked');
      }



      // Save cookies for the middleware
      const { data: sess } = await supabase.auth.getSession();
      await fetch("/api/session/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: sess?.session?.access_token,
          refresh_token: sess?.session?.refresh_token,
        }),
      });

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser(); // get the current user, if there is an error or no user, it means the login failed somehow, so we can just return a error response

      if (userError || !user) {
        setError(userError?.message || "Unable to retrieve user after login.");
        return;
      }

      if (user) { // included this part to ensure that it capture the cookeis or data to update and addinto the metric unit table.
        await supabase
          .from("profiles")
          .update({ Last_sign_in: new Date().toISOString() })
          .eq("id", user.id)
          .select();
      }

      // Checks the AAL
      const { data: aalData, error: aalError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalError) {
        setError(aalError.message);
        return;
      }

      // If already AAL2 verified, then routes you to /admin
      if (aalData?.currentLevel === "aal2") {
        router.replace("/dashboard");
        return;
      }

      // If not AAl2 verified, then check TOTP factors
      const { data: factors, error: listErr } =
        await supabase.auth.mfa.listFactors();

      if (listErr) {
        setError(listErr.message);
        return;
      }

      // Checks if the user has a MFA setup.
      const TOTP = factors.totp || [];
      const verifiedTOTP = TOTP.find((f) => f.status === "verified");

      // If no MFA, then it prompts this error message.
      if (!verifiedTOTP) {
        // Either send them to sign up page for MFA, or prompt them on the spot.
        setError(
          "User currently does not have a MFA setup. Redirecting user to setup MFA..."
        );

        setTimeout(() => {
          router.replace("/init-mfa");
        }, 3000);

        return;
      }

      // Create a challenge and open MFA popup. I believe this part is related to using existing factors.
      const { error: chalErr } = await supabase.auth.mfa.challenge({
        factorId: verifiedTOTP.id,
      });

      if (chalErr) {
        setError(chalErr.message);
        return;
      }

      // Setup was successful, will prompt user for their code.
      setMfaFactorId(verifiedTOTP.id);
      setMfaCode("");
      setMfaError("");
      setMfaOpen(true);
    } catch (e) {
      console.error(e);
      setError("Network error. Reload and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function submitMFA(e) {
    e.preventDefault();
    setMfaError("");

    if (!mfaFactorId) {
      setMfaError("No TOTP factor.");
      return;
    }

    // Verify the 6-digit MFA code
    const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({
      factorId: mfaFactorId,
      code: mfaCode.trim(),
    });

    if (verifyErr) {
      setMfaError(verifyErr.message || "Invalid code");
      return;
    }

    //Included this part to ensure that it capture the cookeis or data to update and addinto the metric unit table.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from("profiles")
        .update({ last_sign_in: new Date().toISOString() })
        .eq("id", user.id)
        .select();

      console.log("Last sign in time updated successfully for user:", user.id);
    }

    // User login with MFA was successful
    setMfaOpen(false);
    setMfaCode("");

    router.replace("/dashboard");
  }

  return (
    //only bg-main-bg, don't change  text black or else it becomes unreadable in the dark mode
    <main className="min-h-screen bg-main-bg text-main-text transition-colors duration-300">
      <section className="mx-auto max-w-3xl p-6">
        <h1 className="text-3xl font-semibold mb-6">Admin Log in</h1>

        {/* Card Area */}
        <div className="border border-neutral-300 rounded-md bg-white">
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-4">
            {/* Email Only */}
            <div>
              <label className="form-label">Email address</label>
              <input
                type="email"
                name="email"
                placeholder="Enter email address"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password + Eye toggle */}
            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className="form-input pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-neutral-500 hover:text-neutral-700 cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff size={18} strokeWidth={1.5} />
                  ) : (
                    <Eye size={18} strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>

            {error && <div className="text-red-600 text-sm">{error}</div>}

            {/*This is what the user clicks first */}
            {!captchaVerified && (
              <div
                // When the user clicks this box, it sets showCaptcha to true, which triggers the drawer to open with the captcha inside.
                onClick={() => setShowCaptcha(true)}
                className="border border-neutral-300 p-4 rounded-md flex items-center gap-3 bg-neutral-50 cursor-pointer mb-2"
              >
                <div className="w-6 h-6 border-2 rounded-sm border-neutral-400 flex items-center justify-center">
                  {showCaptcha && <div className="w-3 h-3 bg-green-600 rounded-sm" />}
                </div>
                <span className="text-sm text-neutral-700 font-medium">
                  I am not a robot 🤖
                </span>
              </div>
            )}

            {/*This pops open when showCaptcha is true */}
            {showCaptcha && !captchaVerified && (
              <div className="border border-neutral-300 p-4 mb-4 space-y-3 bg-white rounded-md animate-in slide-in-from-top-1">
                {/* The SVG Image open from the string of line to have it shown on clients*/}
                <div
                  className="bg-neutral-100 p-2 rounded-md flex justify-center pointer-events-none"
                  dangerouslySetInnerHTML={{ __html: captchaSvg }}
                />

                {/* The Input Field */}
                <input
                  type="text"
                  // If there is a captcha error, show that as the placeholder. Otherwise, show the default "Type the characters above"
                  placeholder={captchaError ? captchaError : "Type the characters above"}
                  className="form-input pointer-events-auto"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                />

                {/* The "Check" Button */}
                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={fetchCaptcha}
                    className="btn-primary btn-wide pointer-events-auto"
                  >
                    {captchaVerified ? "Verifying..." : "Check"}
                  </button>
                </div>
              </div>
            )}

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between text-sm mb-8">
              <label className="flex items-center text-neutral-700 gap-2 cursor-pointer">
                <input type="checkbox" className="checkbox-accent" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotPasswordOpen(true);
                  setForgotPasswordEmail(email);
                  setForgotPasswordError("");
                  setForgotPasswordMessage("");
                }}
                className="text-blue-600 hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            {/* Sign in button — grey when CAPTCHA not yet verified */}
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
              <button
                type="submit"
                disabled={loading || !captchaVerified}
                className={`btn-primary btn-wide mt-2${!captchaVerified ? " btn-disabled-grey" : ""}`}
              >
                {loading ? "Loading..." : "Sign In"}
              </button>
            </div>
          </form>

          {/* Divider and Sign up */}
          <div className="border-t border-neutral-300 p-6 flex justify-end items-center gap-2">
            <span className="text-sm text-neutral-600">Or</span>
            <button
              type="button"
              onClick={() => router.push("/create-admin-account")}
              className="btn-outline"
            >
              Sign up
            </button>
          </div>
        </div>
      </section>

      {/* Forgot Password Popup */}
      {forgotPasswordOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="w-full max-w-md modal-card">
            <h2>Reset Password</h2>
            <p>Enter your email address and we will send you a password reset link.</p>

            <form onSubmit={handleForgotPassword} className="space-y-3">
              <input
                type="email"
                className="form-input"
                placeholder="Enter email address"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                autoFocus
                required
              />

              {forgotPasswordError && (
                <div className="text-red-600 text-sm">{forgotPasswordError}</div>
              )}

              {forgotPasswordMessage && (
                <div className="text-green-700 text-sm">
                  {forgotPasswordMessage}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setForgotPasswordOpen(false);
                    setForgotPasswordError("");
                    setForgotPasswordMessage("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotPasswordLoading}
                  className="btn-primary"
                >
                  {forgotPasswordLoading ? "Sending..." : "Send Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MFA Popup */}
      {mfaOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="w-full max-w-sm modal-card">
            <h2>Two-factor Verification</h2>
            <p>Enter the 6-digit code from your authenticator app.</p>

            <form onSubmit={submitMFA} className="space-y-3">
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
                  onClick={async () => {
                    setMfaOpen(false);
                    setMfaCode("");
                    await supabase.auth.signOut();
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
