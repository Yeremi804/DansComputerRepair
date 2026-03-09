"use client";
import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";

// main component for contact form page
export default function ContactFormPage() {

    // initialize supabase client with environment variables
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

    // success and error messages for form submission
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    // handle form input changes, update formData state
    const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
    };
    // handle form submission, insert data into supabase, show success or error message
    const handleSubmit = async (e) => {

    e.preventDefault();

    // insert form data into supabase table "contact_messages"
    const { data, error } = await supabase.from("contact_messages").insert([
      {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        message: formData.message,
      },
    ]);
    // if there's an error, log it and show error message, otherwise show success message and reset form
    if (error) {
      console.error(error);
      setErrorMessage("There was an error submitting your message. Please try again.");
    } else {
      console.log("Inserted:", data);
      setSuccessMessage("Thank you for reaching out! We will check your message soon.");
        setFormData({
        name: "",
        email: "",
        phone: "",
        message: "",
      });
    }
    // clear success and error messages after 10 seconds
    setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
    }, 10000);

    };


  // form data state
  const [formData, setFormData] = useState({
      name: "",
      email: "",
      phone: "",
      message: "",
    });
  
     //
  return (

    <main className="min-h-screen bg-white text-black">

      <section className="mx-auto max-w-3xl p-6">

        <h1 className="text-2xl font-semibold mb-6">
          Leave us a message! We would love to hear from you.
        </h1>

        <div className="border border-neutral-400 bg-white">
          {/* show success message if form submission is successful */ }
          {successMessage && (
            <div className="bg-green-100 text-green-800 p-4 border-b border-green-200">
              {successMessage}
            </div>
          )}
          {/* show error message if form submission fails */ }
          {errorMessage && (
            <div className="bg-red-100 text-red-800 p-4 border-b border-red-200">
              {errorMessage}
            </div>
          )}

          {/* contact form */ }
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-4">
            {/* form field for name*/ }
            <div>
              <label className="block text-med mb-1">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Full Name"
                className="w-full border border-black px-3 py-2"
                required
              />
            </div>

            {/* form field for email*/ }
            <div>
              <label className="block text-med mb-1">
                Email Address
              </label>
              <input
                type="text"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email Address"
                className="w-full border border-black px-3 py-2"
                required
              />
            </div>

            {/* form field for phone number (optional) */ }
            <div>
              <label className="block text-med mb-1">Phone Number (optional)</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Phone Number"
                className="w-full border border-black px-3 py-2"
              />
            </div>

        
            {/* form field for message */ }
            <div>
              <label htmlFor="message" className="block text-med mb-1">Message</label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                className="w-full border border-black py-8 px-3"
                required
              />
            </div>

            <div className="mb-4">
              

              
            </div>
            {/* submit button */ }
            <div className="border-t border-neutral-300 p-6 md:p-8">
              <div className="flex justify-center items-center gap-2">
                <button
                  type="submit"
                  className="w-3/4 bg-[#8fbd7e] text-black px-4 py-2 font-bold hover:bg-[#6dab5c]"
                >
                  Submit
                </button>
              </div>

            </div>
          </form>
        </div>
      </section>
    </main>
  );
}