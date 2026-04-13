"use client";
import React, { useState } from "react";
import { supabase } from "@/lib/supabase/client"; 

export default function ReviewFormPage() {
  

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [errors, setErrors] = useState({});

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  };

  const isValidPhone = (phone) => {
    const cleaned = phone.replace(/\D/g, "");
    return cleaned.length === 10;
  };

  const isValidName = (name) => {
    return /^[A-Za-z\s'-]+$/.test(name);
  };

  const isValidMessage = (text) => {
    return /^[A-Za-z0-9\s.,!?'"()\-]*$/.test(text);
  };

  const [file, setFile] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [hover, setHover] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    emailOrPhone: "",
    reviewTitle: "",
    rating: "",
    reviewText: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    // NAME validation while typing
    if (name === "name") {
      if (!/^[A-Za-z\s'-]*$/.test(value)) return;
    }

    // EMAIL OR PHONE validation while typing
    if (name === "emailOrPhone") {
      if (!/^[A-Za-z0-9@.\-\s()]*$/.test(value)) return;
    }

    // MESSAGE validation while typing
    if (name === "reviewText") {
      if (!/^[A-Za-z0-9\s.,!?'"()\-]*$/.test(value)) return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // clear error
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  const validationErrors = validateForm();
  if (Object.keys(validationErrors).length > 0) {
    setErrors(validationErrors);
    return;
  }

  setErrors({});
  setUploading(true);

  let uploadedPhotoUrl = null;

  // Upload photo if selected and get public URL
  if (file) {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("reviews-photos")
      .upload(fileName, file);

    if (uploadError) {
      setErrorMessage("Photo upload failed.");
      setUploading(false);
      return;
    }

    const { data } = supabase.storage
      .from("reviews-photos")
      .getPublicUrl(fileName);

    uploadedPhotoUrl = data.publicUrl;
  }

  //  Insert review data
  const { error } = await supabase.from("reviews").insert([
    {
      ...formData,
      photoUrl: uploadedPhotoUrl,
    },
  ]);

  setUploading(false);

  if (error) {
    setErrorMessage("There was an error submitting your review.");
  } else {
    setSuccessMessage("Thank you for your review!");
    setFormData({
      name: "",
      emailOrPhone: "",
      reviewTitle: "",
      rating: "",
      reviewText: "",
    });
    setFile(null);
    setPhotoUrl(null);
  }

  setTimeout(() => {
    setSuccessMessage("");
    setErrorMessage("");
  }, 10000);
};

  

  const validateForm = () => {
  const newErrors = {};

  if (!formData.name.trim()) {
    newErrors.name = "Name is required";
  }else if (!isValidName(formData.name)) {
    newErrors.name = "Name can only contain letters, spaces, apostrophes, and hyphens";
  }

  if (!formData.emailOrPhone.trim()) {
    newErrors.emailOrPhone = "Email or phone is required";
  } else if (
    !isValidEmail(formData.emailOrPhone) &&
    !isValidPhone(formData.emailOrPhone)
  ) {
    newErrors.emailOrPhone = "Enter a valid email or phone number";
  }

  if (!formData.reviewTitle.trim()) {
    newErrors.reviewTitle = "Review title is required";
  }

  if (!formData.rating) {
    newErrors.rating = "Please select a rating";
  }

  if (!formData.reviewText.trim()) {
    newErrors.reviewText = "Review cannot be empty";
  } else if (!isValidMessage(formData.reviewText)) {
    newErrors.reviewText = "Invalid characters in review";
  }

  return newErrors;
};

  /* ---------- SHARED STYLES ---------- */

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "1.5rem",
  };

  const fieldInputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    fontSize: "14px",
    color: "#1e293b",
    backgroundColor: "#ffffff",
    outline: "none",
  };

  const labelStyle = {
    display: "block",
    fontSize: "0.875rem",
    fontWeight: "500",
    color: "#475569",
    marginBottom: "6px",
  };

  const sectionHeadingStyle = {
    fontWeight: "600",
    color: "#334155",
    paddingBottom: "8px",
    borderBottom: "1px solid #e2e8f0",
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
          Share Your Experience
        </h1>

        {/* Card */}
        <div style={{
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "32px",
          backgroundColor: "#ffffff",
          boxShadow: "0 4px 6px -1px rgba(11,63,115,0.12), 0 2px 4px -1px rgba(11,63,115,0.08)",
        }}>

          {/* Messages */}
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
            Review Details
          </h2>

          {/* Inputs */}
          <div style={gridStyle}>
            <div>
              <label htmlFor="name" style={labelStyle}>
                Name
              </label>
              <input
                name="name"
                id="name"
                value={formData.name}
                onChange={handleChange}
                style={{
                  ...fieldInputStyle,
                  borderColor: errors.name ? "#dc2626" : "#cbd5e1",
                }}
              />

              {errors.name && (
                <p style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: "4px" }}>
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="emailOrPhone" style={labelStyle}>
                Email or Phone
              </label>
              <input 
                name="emailOrPhone" 
                id="emailOrPhone"
                value={formData.emailOrPhone} 
                onChange={handleChange} 
                style={
                  { ...fieldInputStyle,
                      borderColor: errors.emailOrPhone ? "#dc2626" : "#cbd5e1" 
            }}
                 />
              {errors.emailOrPhone && (
                <p style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: "4px" }}>
                  {errors.emailOrPhone}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="reviewTitle" style={labelStyle}>
                Review Title
              </label>
              <input name="reviewTitle" 
                id="reviewTitle"
                value={formData.reviewTitle} 
                onChange={handleChange} 
                style={
                  { ...fieldInputStyle,
                      borderColor: errors.reviewTitle ? "#dc2626" : "#cbd5e1"
                   }}
                 />
              {errors.reviewTitle && (
                <p style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: "4px" }}>
                  {errors.reviewTitle}
                </p>
              )}
            </div>
          </div>

          {/* Rating */}
          <div style={{ marginTop: "20px" }}>
            <label htmlFor="rating" style={labelStyle}>
              Rating
            </label>
            <div style={{ fontSize: "24px", cursor: "pointer" }}>
              {[1,2,3,4,5].map((star) => (
                <span
                  key={star}
                  onClick={() => setFormData(prev => ({ ...prev, rating: String(star) }))}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(null)}
                  style={{ color: star <= (hover || Number(formData.rating)) ? "#facc15" : "#cbd5e1" }}
                >
                  ★
                </span>
              ))}
            </div>
            {errors.rating && (
              <p style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: "4px" }}>
                {errors.rating}
              </p>
            )}
          </div>

          {/* Review Text */}
          <div style={{ marginTop: "20px" }}>
            <label htmlFor="reviewText" style={labelStyle}>
              Review
            </label>
            <textarea
              name="reviewText"
              id="reviewText"
              value={formData.reviewText}
              onChange={handleChange}
              rows={6}
              style={{ ...fieldInputStyle,
                 minHeight: "120px", resize: "vertical",
                 borderColor: errors.reviewText ? "#dc2626" : "#cbd5e1"
              }}
              placeholder="Write your review here..."
              maxLength={500}
              
            />
            {errors.reviewText && (
              <p style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: "4px" }}>
                {errors.reviewText}
              </p>
            )}
          </div>

          {/* Photo Upload */}
          <div style={{ marginTop: "20px" }}>
            <label htmlFor="photo" style={labelStyle}>
              Upload a Photo
            </label>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input
                type="file"
                accept="image/*"
                id="photo"
                onChange={(e) => {
                  const selectedFile = e.target.files[0];

                  if (selectedFile) {
                    if (!selectedFile.type.startsWith("image/")) {
                      setErrorMessage("Please upload a valid image file.");

      
                      setFile(null);
                      setPhotoUrl(null);

                      return;
                    }

    
                    setErrorMessage("");

                    setFile(selectedFile);

                    const previewUrl = URL.createObjectURL(selectedFile);
                    setPhotoUrl(previewUrl);
                  } else {
                    setFile(null);
                    setPhotoUrl(null);
                  }
                }}
                style={fieldInputStyle}
              />

              
            </div>

            {photoUrl && (
              <div style={{ marginTop: "12px" }}>
                <img
                  src={photoUrl}
                  alt="preview"
                  style={{ width: "120px", height: "120px", objectFit: "cover", borderRadius: "6px" }}
                />
                <p style={{ fontSize: "0.875rem", color: "#065f46", marginTop: "4px" }}>
                  Ready to upload. It will be attached to your review.
                </p>
              </div>
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
              Submit Review
            </button>
          </div>

        </div>
      </form>
    </main>
  );
}