"use client";
import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

export default function ContactFormPage() {

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [isDark, setIsDark] = useState(false);

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
      attributeFilter: ["class"]
    });

    return () => observer.disconnect();
  }, []);

  const isValidName = (name) => /^[A-Za-z\s'-]+$/.test(name);

  const isValidEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

  const isValidPhone = (phone) => {
    const cleaned = phone.replace(/\D/g, "");
    return cleaned.length === 10;
  };

  const isValidMessage = (text) =>
    /^[A-Za-z0-9\s.,!?'"()\-]*$/.test(text);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    // NAME restriction
    if (name === "name") {
      if (!/^[A-Za-z\s'-]*$/.test(value)) return;
    }

    // PHONE restriction
    if (name === "phone") {
      if (!/^[0-9()\-\s]*$/.test(value)) return;
    }

    // MESSAGE restriction
    if (name === "message") {
      if (!/^[A-Za-z0-9\s.,!?'"()\-]*$/.test(value)) return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // clear error for that field
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (!isValidName(formData.name)) {
      newErrors.name = "Invalid name format";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (formData.phone && !isValidPhone(formData.phone)) {
      newErrors.phone = "Invalid phone number";
    }

    if (!formData.message.trim()) {
      newErrors.message = "Message is required";
    } else if (!isValidMessage(formData.message)) {
      newErrors.message = "Invalid characters in message";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});

    const { data, error } = await supabase
      .from("contact_messages")
      .insert([formData]);

    if (error) {
      console.error(error);
      setErrorMessage("There was an error submitting your message. Please try again.");
    } else {
      setSuccessMessage("Thank you for reaching out! We will check your message soon.");
      setFormData({ name: "", email: "", phone: "", message: "" });
    }

    setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
    }, 10000);
  };

  /* ---------- SHARED STYLES (same as config form) ---------- */

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "1.5rem",
  };

  const fieldInputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    border: isDark ? "1px solid #475569" : "1px solid #cbd5e1",
    borderRadius: "6px",
    fontSize: "14px",
    color: isDark ? "#e2e8f0" : "#1e293b",
    backgroundColor: isDark ? "#0f172a" : "#ffffff",
    outline: "none",
  };

  const labelStyle = {
    display: "block",
    fontSize: "0.875rem",
    fontWeight: "500",
    color: isDark ? "#cbd5e1" : "#475569",
    marginBottom: "6px",
  };

  const sectionHeadingStyle = {
    fontWeight: "600",
    color: isDark ? "#e2e8f0" : "#334155",
    paddingBottom: "8px",
    borderBottom: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
    marginBottom: "20px",
  };

  /* ---------- UI ---------- */

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "var(--current-bg)", padding: "32px 16px" }}>
      <form onSubmit={handleSubmit} style={{ margin: "0 auto", maxWidth: "960px" }}>

        {/* Title */}
        <h1 style={{
          fontSize: "1.875rem",
          fontWeight: "600",
          marginBottom: "24px",
          color: "var(--current-text)",
        }}>
          Contact Us
        </h1>

        {/* Card */}
        <div style={{
          border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "32px",
          backgroundColor: isDark ? "#111827" : "#ffffff",
          boxShadow: "0 4px 6px -1px rgba(11,63,115,0.12), 0 2px 4px -1px rgba(11,63,115,0.08)",
        }}>

          {/* Status messages */}
          {successMessage && (
            <p style={{ marginBottom: "16px", fontSize: "0.875rem", color: "#065f46" }}>
              {successMessage}
            </p>
          )}
          {errorMessage && (
            <p style={{ marginBottom: "16px", fontSize: "0.875rem", color: "#9b1c1c" }}>
              {errorMessage}
            </p>
          )}

          {/* Section */}
          <h2 style={{ ...sectionHeadingStyle, fontSize: "1rem" }}>
            Contact Information
          </h2>

          {/* Inputs */}
          <div style={gridStyle}>
            <div>
              <label htmlFor="name" style={labelStyle}>
                Name
              </label>
              <input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Full Name"
                style={{ ...fieldInputStyle,
                        borderColor: errors.name ? "#dc2626" : (isDark ? "#475569" : "#cbd5e1") }}
              />
              {errors.name && (
                <p style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: "4px" }}>
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" style={labelStyle}>
                Email Address
              </label>
              <input
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email Address"
                style={{ ...fieldInputStyle,
                        borderColor: errors.email ? "#dc2626" : (isDark ? "#475569" : "#cbd5e1") }}
              />
              {errors.email && (
                <p style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: "4px" }}>
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="phone" style={labelStyle}>
                Phone Number (optional)
              </label>
              <input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Phone Number"
                style={{ ...fieldInputStyle,
                        borderColor: errors.phone ? "#dc2626" : (isDark ? "#475569" : "#cbd5e1") }}
              />
              {errors.phone && (
                <p style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: "4px" }}>
                  {errors.phone}
                </p>
              )}
            </div>
          </div>

          {/* Message */}
          <div style={{ marginTop: "20px" }}>
            <label htmlFor="message" style={labelStyle}>
              Message
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows={6}
              placeholder="Your message..."
              style={{
                ...fieldInputStyle,
                resize: "vertical",
                minHeight: "120px",
                borderColor: errors.message ? "#dc2626" : (isDark ? "#475569" : "#cbd5e1")
              }}
              maxLength={500}
            />
            {errors.message && (
              <p style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: "4px" }}>
                {errors.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <div style={{ marginTop: "24px", display: "flex", justifyContent: "center" }}>
            <button
              type="submit"
              style={{
                backgroundColor: "#16a34a",
                color: "#ffffff",
                border: "none",
                padding: "12px 80px",
                borderRadius: "6px",
                fontSize: "0.9375rem",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Submit
            </button>
          </div>

        </div>
      </form>
    </main>
  );
}