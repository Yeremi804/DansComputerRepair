"use client";
import { useState } from 'react';
import { supabase } from '../../lib/supabase/client.js'; 
import styles from './page.module.css';

import { showFormRequestSentSuccess, showFormRequestSentError } from "@/lib/toastNotifs";

export default function ServiceRequest() {

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    deviceSelect: '',
    deviceText: '',
    serviceSelect: '',
    serviceText: '',
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

    if (!form.serviceSelect && !form.serviceText) {
      setStatus("error");
      alert("Please select a service or type your service in the 'Or specify' field.");
      return;
    }

    try {
      const submissionData = {
        customer_name: form.name,
        phone_number: form.phone,
        email: form.email,
        device_type: form.deviceSelect || form.deviceText,
        service_type: form.serviceSelect || form.serviceText,
        problem_start_date: form.started,
        problem_cause_idea: form.idea,
        additional_questions: form.questions,
        sms_consent: form.smsConsent,
      };

      const { error } = await supabase.from('service_requests').insert([submissionData]);
      if (error) throw error;

      setStatus('submitted');
      setForm({ name: '', phone: '', email: '', deviceSelect: '', deviceText: '', serviceSelect: '', serviceText: '', started: '', idea: '', questions: '', smsConsent: false });

    } catch (err) {
      setStatus('error');
      console.error('Error submitting to Supabase:', err);
    }
  }

  return (
    //Rememeber to change this to have the ability to change background. it been done in the page.module.css 
    <main className={styles.pageWrap}>
      <h1 className={styles.title}>Service Request Form</h1>

      <form onSubmit={handleSubmit} className={styles.formBox}>
        {/* Contact information group */}
        <div className={styles.sectionHeader}>1. Contact Information</div>

        {/* minimal, responsive tweak: auto-fit columns so fields wrap cleanly on mobile */}
        <div
          className={styles.grid3}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
          }}
        >
          <label className={styles.field}>
            <span className={styles.label}>Name</span>
            <input
              name="name"
              value={form.name}
              onChange={update}
              className={styles.input}
              placeholder="Name"
              required
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Phone number</span>
            <input
              name="phone"
              value={form.phone}
              onChange={update}
              className={styles.input}
              type="tel"
              placeholder="Phone Number"
              required
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Email address</span>
            <input
              name="email"
              value={form.email}
              onChange={update}
              className={styles.input}
              type="email"
              placeholder="Email Address"
              required
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </label>
	        </div>

	        <div className="mb-6">
	          <label className="flex items-start gap-3">
		            <input
		              type="checkbox"
		              name="smsConsent"
		              checked={form.smsConsent}
		              onChange={update}
		              className="checkbox-accent mt-1"
		            />
            <span className="form-label" style={{ marginBottom: 0 }}>
              I agree to receive SMS notifications about my repair status.
            </span>
	          </label>
	        </div>

          {/* Device Section */}
          <div className="space-y-8">
            <div className={styles.sectionHeader}>2. Device Information</div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.75rem',
              }}
            >
              <div className="flex flex-col">
                <label className="form-label">
                  Device
                </label>
                <select
                  name="deviceSelect"
                  value={form.deviceSelect}
                  onChange={update}
                  disabled={!!form.deviceText}
                  className="form-input"
                >
                  <option value="">Select a device</option>
                  <option>Desktop</option>
                  <option>Laptop</option>
                  <option>Tablet</option>
                  <option>Phone</option>
                </select>
              </div>

              <div className="flex flex-col">
                <label className="form-label">
                  Or Specify
                </label>
                <input
                  name="deviceText"
                  placeholder="Type your device here"
                  value={form.deviceText}
                  onChange={update}
                  disabled={!!form.deviceSelect}
                  className="form-input"
                />
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.75rem',
              }}
            >
              <div className="flex flex-col">
                <label className="form-label">
                  Service
                </label>
                <select
                  name="serviceSelect"
                  value={form.serviceSelect}
                  onChange={update}
                  disabled={!!form.serviceText}
                  className="form-input"
                >
                  <option value="">Select a service</option>
                  <option>Computer diagnostics</option>
                  <option>Laptop &amp; desktop repair</option>
                  <option>Virus and malware removal</option>
                  <option>Data recovery</option>
                  <option>System upgrades</option>
                </select>
              </div>

              <div className="flex flex-col">
                <label className="form-label">
                  Or Specify
                </label>
                <input
                  name="serviceText"
                  placeholder="Type your service here"
                  value={form.serviceText}
                  onChange={update}
                  disabled={!!form.serviceSelect}
                  className="form-input"
                />
              </div>
            </div>
          </div>

        {/* Problem description group */}
        <div className={styles.sectionHeader}>2. Problem Description</div>

        <div
          className={styles.grid2}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
          }}
        >
          <label className={styles.field}>
            <span className={styles.label}>When did the problem start?</span>
            <input
              name="started"
              value={form.started}
              onChange={update}
              className={styles.input}
              type="date"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Do you have any idea when the problem occurred?</span>
            <input
              name="idea"
              value={form.idea}
              onChange={update}
              className={styles.input}
              placeholder="e.g. After a software update, dropped the device..."
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </label>
        </div>

        {/* Additional questions freeform */}
        <label className={styles.field}>
          <span className={styles.label}>Any other questions you have?</span>
          <textarea
            name="questions"
            value={form.questions}
            onChange={update}
            className={styles.textarea}
            placeholder="Additional info, special requests, or questions"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </label>

          {/* Submit */}
          <div className="text-center pt-4">
            <button
              type="submit"
              disabled={status === 'sending'}
              className="btn-primary btn-wide"
            >
              {status === 'sending' ? 'Submitting...' : 'Submit'}
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
	    </main>
	  );
	}
