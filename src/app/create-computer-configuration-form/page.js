"use client";

import { useState, useEffect } from 'react';

export default function CreateComputerConfigurationForm() {
  const [status, setStatus] = useState(null);
  // Tracks whether the user has consented to receive SMS notifications (mirrors service-request form)
  const [smsConsent, setSmsConsent] = useState(false);
  const [cpus, setCpus] = useState([]);
  const [gpus, setGpus] = useState([]);
  const [motherboards, setMotherboards] = useState([]);
  const [memories, setMemories] = useState([]);
  const [storages, setStorages] = useState([]);
  const [psus, setPsus] = useState([]);
  const [casesList, setCasesList] = useState([]);
  const [coolings, setCoolings] = useState([]);
  const [operatingSystems, setOperatingSystems] = useState([]);
  const [networkings, setNetworkings] = useState([]);
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

  useEffect(() => {
    const types = [
      'cpu','gpu','motherboard','memory','storage','psu',
      'case','cooling','operating_system','networking'
    ];

    const setters = {
      cpu: setCpus,
      gpu: setGpus,
      motherboard: setMotherboards,
      memory: setMemories,
      storage: setStorages,
      psu: setPsus,
      case: setCasesList,
      cooling: setCoolings,
      operating_system: setOperatingSystems,
      networking: setNetworkings,
    };

    async function fetchAll() {
      await Promise.all(types.map(async (t) => {
        // Skip fetch if setter is null (mock data is used instead)
        if (!setters[t]) return;
        try {
          const res = await fetch(`/api/options?type=${encodeURIComponent(t)}`);
          if (!res.ok) return setters[t]([]);
          const json = await res.json();
          setters[t](json.data || []);
        } catch {
          setters[t]([]);
        }
      }));
    }

    fetchAll();
  }, []);

  function handleSelectChange(e) {
    const el = e.target;
    if (!el) return;
    // Update inline color directly since styles are applied via inline style (not Tailwind classes)
    el.style.color = el.value === '' ? '#94a3b8' : (isDark ? '#e2e8f0' : '#0f172a');
  }

  function formatPrice(v) {
    if (v == null || v === '') return '';
    const n = Number(v);
    if (Number.isNaN(n)) return String(v);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('sending');

    // Save form reference before async operations — e.currentTarget becomes null after await
    const formEl = e.currentTarget;
    const fd = new FormData(formEl);
    const payload = {
      ...Object.fromEntries(fd.entries()),
      sms_consent: smsConsent, // Include SMS consent alongside the rest of the form data
    };

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();
      setStatus('submitted');
      setSmsConsent(false); // Reset SMS consent checkbox on successful submission
      formEl.reset(); // Use saved reference instead of e.currentTarget
    } catch {
      setStatus('error');
    }
  }

  /* --- Shared inline styles (structure unchanged, only visual values updated) --- */

  /* Grid layout: auto-fit columns, consistent with service-request form */
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1.5rem',
  };

  /* Full-width input sizing */
  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
  };

  /* Shared style for all text inputs — font size matches service-request form (.input: 14px) */
  const fieldInputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 12px',
    border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',   /* Matches sidebar/card border color across the site */
    borderRadius: '6px',
    fontSize: '14px',              /* Matches .input font-size in service-request/page.module.css */
    color: isDark ? '#e2e8f0' : '#1e293b',
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  };

  /* Shared style for all select dropdowns */
  const fieldSelectStyle = {
    ...fieldInputStyle,
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    /* Custom dropdown arrow SVG */
    backgroundImage: isDark
      ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E\")"
      : "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    backgroundSize: '16px',
    paddingRight: '36px',
    color: '#94a3b8', /* Default placeholder color */
  };

  const placeholderOptionStyle = {
    color: '#64748b',
  };

  const dropdownOptionStyle = {
    color: isDark ? '#e2e8f0' : '#0f172a',
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
  };

  /* Label style consistent with service-request form (.label: 0.875rem / 14px) */
  const labelStyle = {
    display: 'block',
    fontSize: '0.875rem',          /* Matches .label font-size in service-request/page.module.css */
    fontWeight: '500',
    color: isDark ? '#cbd5e1' : '#475569',              /* Slate-600, matches service-request label color */
    marginBottom: '6px',
  };

  /* Section heading style (h2, h3) */
  const sectionHeadingStyle = {
    fontWeight: '600',
    color: isDark ? '#e2e8f0' : '#334155',         /* Slate-700 */
    paddingBottom: '8px',
    borderBottom: isDark ? '1px solid #334155' : '1px solid #e2e8f0', /* Subtle divider, matches service-request sectionHeader */
    marginBottom: '20px',
  };

  //change teh background color and text color to match the current theme. use var(--current-bg) and var(--current-text) for the colors, which are set in the global styles based on the theme (light/dark)
  return (
    <main style={{ minHeight: '100vh', backgroundColor: 'var(--current-bg)', padding: '32px 16px' }}>
      <form
        onSubmit={handleSubmit}
        style={{ margin: '0 auto', maxWidth: '960px' }}
      >
        {/* Page title: matches .title style from service-request form */}
        <h1 style={{
          fontSize: '1.875rem',
          fontWeight: '600',
          marginBottom: '24px',
          color: 'var(--current-text)',
        }}>
          Computer Configuration Form
        </h1>

        {/* Form card: matches .formBox style from service-request form */}
        <div style={{
          border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '32px',
          backgroundColor: isDark ? '#111827' : '#ffffff',
          boxShadow: '0 4px 6px -1px rgba(11, 63, 115, 0.12), 0 2px 4px -1px rgba(11, 63, 115, 0.08)',
        }}>

          {/* Section 1: Customer Information */}
          <h2 style={{
            fontWeight: '600',
            fontSize: '1rem',
            color: 'var(--section-heading-color)',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--section-heading-border)',
            marginBottom: '20px',
            marginTop: '4px',
          }}>
            1. Customer Information
          </h2>

          <div style={gridStyle}>
            {[
              'Name',
              'Phone Number',
              'Email Address',
              'Budget Range',
              'Intended Use',
            ].map((label) => (
              <div key={label}>
                <label className="form-label">{label}</label>
                <input
                  name={label}
                  placeholder={label}
                  className="form-input"
                />
              </div>
            ))}
          </div>

          {/* SMS consent checkbox — identical pattern to service-request form */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', marginBottom: '20px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={smsConsent}
              onChange={(e) => setSmsConsent(e.target.checked)}
              className="checkbox-accent"
            />
            <span style={{ fontSize: '0.875rem', color: isDark ? '#cbd5e1' : '#475569', lineHeight: '1.4' }}>
              I agree to receive SMS notifications about my computer configuration status.
            </span>
          </label>

          {/* Section 2: Core Components */}
          <h3 style={{
            fontWeight: '600',
            fontSize: '1rem',
            color: 'var(--section-heading-color)',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--section-heading-border)',
            marginBottom: '20px',
            marginTop: '28px',
          }}>
            2. Core Components
          </h3>

          <div style={gridStyle}>
            {[
              ['CPU', 'Select a CPU', cpus],
              ['GPU', 'Select a GPU', gpus],
              ['Motherboard', 'Select a Motherboard', motherboards],
              ['Memory', 'Select RAM Size', memories],
              ['Storage', 'Select Storage Option', storages],
              ['PSU', 'Select a PSU', psus],
              ['Case', 'Select a Case', casesList],
            ].map(([name, placeholder, list]) => (
              <div key={name}>
                <label className="form-label">{name}</label>
                <select
                  name={name}
                  onChange={handleSelectChange}
                  className="form-input form-select"
                >
                  <option value="">{placeholder}</option>
                  {list.map((i) => (
                    <option key={i.id ?? i.name} value={i.value ?? i.name}>
                      {i.name}{i.price != null ? ` — ${formatPrice(i.price)}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Section 3: Additional Options */}
          <h3 style={{
            fontWeight: '600',
            fontSize: '1rem',
            color: 'var(--section-heading-color)',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--section-heading-border)',
            marginBottom: '20px',
            marginTop: '28px',
          }}>
            3. Additional Options
          </h3>

          <div style={gridStyle}>
            {[
              ['Cooling', 'Select Cooling Option', coolings],
              ['Operating System', 'Select an OS', operatingSystems],
              ['Networking', 'Select Networking Option', networkings],
            ].map(([name, placeholder, list]) => (
              <div key={name}>
                <label className="form-label">{name}</label>
                <select
                  name={name}
                  onChange={handleSelectChange}
                  className="form-input form-select"
                >
                  <option value="">{placeholder}</option>
                  {list.map((i) => (
                    <option key={i.id ?? i.name} value={i.value ?? i.name}>
                      {i.name}{i.price != null ? ` — ${formatPrice(i.price)}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Section 4: Other Requests / Questions */}
          <h3 style={{
            fontWeight: '600',
            fontSize: '1rem',
            color: 'var(--section-heading-color)',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--section-heading-border)',
            marginBottom: '20px',
            marginTop: '28px',
          }}>
            4. Other Requests / Questions
          </h3>

          <textarea
            name="otherRequests"
            rows={6}
            placeholder="Additional info, special requests, or questions"
            className="form-input"
            style={{ resize: 'vertical', minHeight: '120px' }}
          />

          {/* Submit button row: centered inside the form card */}
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
            <button
              type="submit"
              disabled={status === 'sending'}
              className={`btn-primary btn-wide${status === 'sending' ? ' opacity-50 cursor-not-allowed' : ''}`}
            >
              {status === 'sending' ? 'Submitting...' : 'Submit'}
            </button>
          </div>

          {/* Status messages: inside the form card, left-aligned to match service-request form style */}
          {status === 'sending'   && <p style={{ marginTop: '12px', fontSize: '0.875rem', color: isDark ? '#cbd5e1' : '#475569' }}>Sending…</p>}
          {status === 'submitted' && <p style={{ marginTop: '12px', fontSize: '0.875rem', color: '#065f46' }}>Submitted — we will contact you soon.</p>}
          {status === 'error'     && <p style={{ marginTop: '12px', fontSize: '0.875rem', color: '#9b1c1c' }}>Error sending — try again.</p>}
        </div>
      </form>
    </main>
  );
}