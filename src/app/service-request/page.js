"use client";
import { useState } from 'react';
import { supabase } from '../../lib/supabase/client.js'; 

export default function ServiceRequest() {

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    deviceSelect: '',
    deviceText: '',
    started: '',
    idea: '',
    questions: '',
    smsConsent: false,
  });

  const [status, setStatus] = useState(null);

  function update(e) {
    const { name, value, type, checked } = e.target;
    setForm((s) => ({ ...s, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('sending');

    if (!form.deviceSelect && !form.deviceText) {
      setStatus("error");
      alert("Please select a device or type your device in the 'Or specify' field.");
      return;
    }

    try {
      const submissionData = {
        customer_name: form.name,
        phone_number: form.phone,
        email: form.email,
        device_type: form.deviceSelect || form.deviceText,
        problem_start_date: form.started,
        problem_cause_idea: form.idea,
        additional_questions: form.questions,
        sms_consent: form.smsConsent,
      };

      const { error } = await supabase.from('service_requests').insert([submissionData]);
      if (error) throw error;

      setStatus('submitted');
      setForm({ name: '', phone: '', email: '', deviceSelect: '', deviceText: '', started: '', idea: '', questions: '', smsConsent: false });

    } catch (err) {
      setStatus('error');
      console.error('Error submitting to Supabase:', err);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 py-28 px-6">
      <div className="max-w-4xl mx-auto">

        {/* Clean, readable title */}
        <h1 className="text-4xl font-medium font-semibold text-slate-900 text-center mb-14 tracking-tight">
          Service Request Form
        </h1>

        {/* Card with stronger visual separation */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-14 space-y-16"
        >

          {/* Contact Section */}
          <div className="space-y-8">
            <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">
              Contact Information
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.75rem',
              }}
            >
              <div className="flex flex-col">
                <label className="text-sm text-gray-700 mb-2">
                  Name
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={update}
                  required
                  className="rounded-lg px-4 py-3 border border-gray-300 bg-gray-50 focus:outline-none focus:border-black"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={update}
                  type="tel"
                  required
                  className="rounded-lg px-4 py-3 border border-gray-300 bg-gray-50 focus:outline-none focus:border-black"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  name="email"
                  value={form.email}
                  onChange={update}
                  type="email"
                  required
                  className="rounded-lg px-4 py-3 border border-gray-300 bg-gray-50 focus:outline-none focus:border-black"
                />
              </div>
            </div>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                name="smsConsent"
                checked={form.smsConsent}
                onChange={update}
                className="mt-1 h-4 w-4"
              />
              <span className="text-sm text-gray-700">
                I agree to receive SMS notifications about my repair status.
              </span>
            </label>
          </div>

          {/* Device Section */}
          <div className="space-y-8">
            <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">
              Device Information
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.75rem',
              }}
            >
              <div className="flex flex-col">
                <label className="text-sm text-gray-700 mb-2">
                  Device
                </label>
                <select
                  name="deviceSelect"
                  value={form.deviceSelect}
                  onChange={update}
                  disabled={!!form.deviceText}
                  className="rounded-lg px-4 py-3 border border-gray-300 bg-gray-50 focus:outline-none focus:border-black"
                >
                  <option value="">Select a device</option>
                  <option>Desktop</option>
                  <option>Laptop</option>
                  <option>Tablet</option>
                  <option>Phone</option>
                </select>
              </div>

              <div className="flex flex-col">
                <label className="text-sm text-gray-700 mb-2">
                  Or Specify
                </label>
                <input
                  name="deviceText"
                  placeholder="Type your device here"
                  value={form.deviceText}
                  onChange={update}
                  disabled={!!form.deviceSelect}
                  className="rounded-lg px-4 py-3 border border-gray-300 bg-gray-50 focus:outline-none focus:border-black"
                />
              </div>
            </div>
          </div>

          {/* Problem Section */}
          <div className="space-y-8">
            <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">
              Problem Description
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.75rem',
              }}
            >
              <div className="flex flex-col">
                <label className="text-sm text-gray-700 mb-2">
                  When did the problem start?
                </label>
                <input
                  name="started"
                  value={form.started}
                  onChange={update}
                  type="date"
                  className="rounded-lg px-4 py-3 border border-gray-300 bg-gray-50 focus:outline-none focus:border-black"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm text-gray-700 mb-2">
                  Do you have any idea when it occurred?
                </label>
                <input
                  name="idea"
                  value={form.idea}
                  onChange={update}
                  className="rounded-lg px-4 py-3 border border-gray-300 bg-gray-50 focus:outline-none focus:border-black"
                />
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-sm text-gray-700 mb-2">
                Additional Details
              </label>
              <textarea
                name="questions"
                value={form.questions}
                onChange={update}
                rows={4}
                className="rounded-lg px-4 py-3 border border-gray-300 bg-gray-50 focus:outline-none focus:border-black"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="text-center pt-4">
            <button
              type="submit"
              disabled={status === 'sending'}
              className="px-8 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              {status === 'sending' ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>

          {status === 'submitted' && (
            <p className="text-center text-green-600">
              Submitted — admin will be notified.
            </p>
          )}
          {status === 'error' && (
            <p className="text-center text-red-600">
              Error sending form.
            </p>
          )}

        </form>
      </div>
    </main>
  );
}