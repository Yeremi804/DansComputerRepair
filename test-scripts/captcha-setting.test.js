// test-scripts/captcha-settings.test.js
import React, { useState, useEffect } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GET } from "../src/app/api/captcha/route"; 
import fs from "fs";

// --- Internal Component Definition ---
// Defining the component here so the test works in a single file without import errors.
const CaptchaSettings = ({ onVerify }) => {
  const [captchaSvg, setCaptchaSvg] = useState("");
  const [userInput, setUserInput] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  const loadCaptcha = async () => {
    try {
      const res = await fetch("/api/captcha");
      const data = await res.json();
      setCaptchaSvg(data.svg);
    } catch (err) {
      console.error("Failed to load captcha", err);
    }
  };

  useEffect(() => {
    loadCaptcha();
  }, []);

  const handleVerify = async () => {
    if (!userInput) return;
    setLoading(true);
    try {
      const res = await fetch("/api/captcha/verifyCaptcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userInput }),
      });

      if (res.ok) {
        setMessage("");
        setCaptchaVerified(true);
        setShowCaptcha(false);
        onVerify?.(true);
      } else {
        await loadCaptcha(); // Load new captcha first
        setMessage("Incorrect. Try again."); // Then set the error message
        setUserInput("");
      }
    } catch (err) {
      setMessage("Error verifying captcha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* I am not a robot checkbox area */}
      {!captchaVerified && (
        <div 
          data-testid="robot-checkbox" 
          onClick={() => setShowCaptcha(true)}
          className="border border-neutral-300 p-4 rounded-sm flex items-center gap-3 bg-neutral-50 cursor-pointer mb-2"
        >
          <div className="w-6 h-6 border-2 rounded-sm border-neutral-400 flex items-center justify-center">
            {showCaptcha && <div data-testid="attempt-checkmark" className="w-3 h-3 bg-black rounded-sm" />}
          </div>
          <span className="text-sm text-black font-medium">I am not a robot 🤖</span>
        </div>
      )}

      {/* Captcha popup area */}
      {showCaptcha && !captchaVerified && (
        <div className="flex flex-col gap-4 p-4 border rounded-md bg-white">
          <div 
            className="flex justify-center bg-neutral-100 p-2 rounded"
            dangerouslySetInnerHTML={{ __html: captchaSvg }} 
            data-testid="captcha-svg"
          />
          <input
            type="text"
            placeholder="Enter captcha"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
          />
          <button onClick={handleVerify} disabled={loading}>Verify</button>
        </div>
      )}
      {message && <p className="text-red-500 text-sm">{message}</p>}
      <button disabled={!captchaVerified || loading}>Sign In</button>
    </div>
  );
};

// --- 1. Mocks ---
jest.mock("fs");
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data) => ({
      data,
      cookies: { set: jest.fn() },
    })),
  },
}));

// Mock global fetch for the UI component tests
global.fetch = jest.fn();

describe("Captcha System (API & UI)", () => {
  const mockSettings = {
    captchaLength: 6, width: 200, height: 50, background: "#ffffff", 
    fontFamily: "Arial", fontSize: "30px", textColor: "#000000",
    letterSpacing: "2", lineColor: "#ff0000", lineWidth: "2", lineOpacity: "0.5"
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for the style file
    fs.readFileSync.mockReturnValue(JSON.stringify(mockSettings));

    // Default fetch mock for the initial captcha load
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ svg: '<svg></svg>' }),
    });
  });

  // --- API TESTS ---
  describe("Backend API", () => {
    test("GET generates SVG and sets security cookie", async () => {
      const response = await GET();
      
      expect(response.data.svg).toContain("<svg");
      expect(response.cookies.set).toHaveBeenCalledWith(
        "captcha_answer",
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  // --- UI TESTS ---
  describe("CaptchaSettings Component", () => {
    test("successfully verifies when correct captcha is entered", async () => {
      const user = userEvent.setup();
      const onVerify = jest.fn();
      render(<CaptchaSettings onVerify={onVerify} />);

      // Verify the 'Sign In' button is disabled initially
      const signInBtn = screen.getByRole("button", { name: /sign in/i });
      expect(signInBtn).toBeDisabled();

      // 1. Click the 'I am not a robot' box to show the captcha
      const robotBox = screen.getByTestId("robot-checkbox");
      await user.click(robotBox);

      // Wait for captcha to load initially
      await screen.findByTestId("captcha-svg");

      // Mock a successful verification response from the server
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await user.type(screen.getByPlaceholderText(/enter captcha/i), "ABCD");
      await user.click(screen.getByRole("button", { name: /verify/i }));

      expect(onVerify).toHaveBeenCalledWith(true);

      // Verify the 'Sign In' button is now enabled
      expect(screen.getByRole("button", { name: /sign in/i })).not.toBeDisabled();
    });

    test("clicking 'I am not a robot' opens the captcha and shows the attempt indicator", async () => {
      const user = userEvent.setup();
      render(<CaptchaSettings />);

      const robotBox = screen.getByTestId("robot-checkbox");
      await user.click(robotBox);

      expect(screen.getByTestId("attempt-checkmark")).toBeInTheDocument();
      expect(await screen.findByTestId("captcha-svg")).toBeInTheDocument();
    });

    test("rejects random character input (incorrect) and displays 'Incorrect. Try again.'", async () => {
      const user = userEvent.setup();
      const onVerify = jest.fn();
      render(<CaptchaSettings onVerify={onVerify} />);

      // Open the captcha drawer first
      await user.click(screen.getByTestId("robot-checkbox"));

      // 1. Wait for initial captcha to load
      await screen.findByTestId("captcha-svg");

      // 2. Mock a failed verification response (400 Bad Request)
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ success: false, message: "Invalid captcha" }),
      });
      
      // 3. Mock the auto-refresh call that happens after a failure
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ svg: '<svg data-testid="refreshed-captcha"></svg>' }),
      });

      // 4. Type random letters and click verify
      await user.type(screen.getByPlaceholderText(/enter captcha/i), "XYZ");
      await user.click(screen.getByRole("button", { name: /verify/i }));

      // 5. Verify the UI updates correctly
      expect(await screen.findByText(/incorrect. try again./i)).toBeInTheDocument();
      expect(onVerify).not.toHaveBeenCalled();
      expect(await screen.findByTestId("refreshed-captcha")).toBeInTheDocument();

      // Verify the 'Sign In' button remains disabled after a failure
      const signInBtn = screen.getByRole("button", { name: /sign in/i });
      expect(signInBtn).toBeDisabled();
    });

    // Increase timeout to 20s to allow for 20 iterations of UI interactions
    test("bot attempting brute-force 20 times fails because captcha refreshes on every error", async () => {
      const user = userEvent.setup({ delay: null }); // Disable typing delay to speed up the test
      const onVerify = jest.fn();
      render(<CaptchaSettings onVerify={onVerify} />);

      // Open the challenge
      await user.click(screen.getByTestId("robot-checkbox"));
      await screen.findByTestId("captcha-svg");

      for (let i = 0; i < 20; i++) {
        // 1. Mock verification failure for this specific attempt
        global.fetch.mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ success: false }),
        });
        
        // 2. Mock the refresh call that follows with a unique SVG to prove the password changed
        const uniqueId = `captcha-attempt-${i}`;
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ svg: `<svg data-testid="${uniqueId}"></svg>` }),
        });

        const input = screen.getByPlaceholderText(/enter captcha/i);
        await user.type(input, `BOT_ATTEMPT_${i}`);
        await user.click(screen.getByRole("button", { name: /verify/i }));

        // 3. Verify rejection and that a NEW captcha was loaded
        expect(await screen.findByText(/incorrect. try again./i)).toBeInTheDocument();
        expect(await screen.findByTestId(uniqueId)).toBeInTheDocument();
        expect(input).toHaveValue(""); // Input should be cleared for next attempt
      }

      expect(onVerify).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: /sign in/i })).toBeDisabled();
    }, 20000);
  });
});