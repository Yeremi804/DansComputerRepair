"use client";
import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function ContactFormPage() {

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [errors, setErrors] = useState({});

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
          border: "1px solid var(--form-card-border)",
          borderRadius: "var(--form-card-radius)",
          padding: "var(--form-card-padding)",
          backgroundColor: "var(--form-card-bg)",
          boxShadow: "var(--form-card-shadow)",
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
          <h2 style={{
            fontWeight: "600",
            fontSize: "1rem",
            color: "var(--section-heading-color)",
            paddingBottom: "8px",
            borderBottom: "1px solid var(--section-heading-border)",
            marginBottom: "20px",
          }}>
            Contact Information
          </h2>

          {/* Inputs */}
          <div style={gridStyle}>
            <div>
              <label htmlFor="name" className="form-label">
                Name
              </label>
              <input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Full Name"
                className={`form-input${errors.name ? " input-error" : ""}`}
              />
              {errors.name && (
                <p style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: "4px" }}>
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email Address"
                className={`form-input${errors.email ? " input-error" : ""}`}
              />
              {errors.email && (
                <p style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: "4px" }}>
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="form-label">
                Phone Number (optional)
              </label>
              <input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Phone Number"
                className={`form-input${errors.phone ? " input-error" : ""}`}
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
            <label htmlFor="message" className="form-label">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows={6}
              placeholder="Your message..."
              className={`form-input${errors.message ? " input-error" : ""}`}
              style={{ resize: "vertical", minHeight: "120px" }}
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
              className="btn-primary btn-wide"
            >
              Submit
            </button>
          </div>

        </div>
      </form>
    </main>
  );
}