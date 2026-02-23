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
    el.style.color = el.value === '' ? '#94a3b8' : '#0f172a';
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
    border: '1px solid #cbd5e1',   /* Matches sidebar/card border color across the site */
    borderRadius: '6px',
    fontSize: '14px',              /* Matches .input font-size in service-request/page.module.css */
    color: '#1e293b',
    backgroundColor: '#ffffff',
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
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    backgroundSize: '16px',
    paddingRight: '36px',
    color: '#94a3b8', /* Default placeholder color */
  };

  /* Label style consistent with service-request form (.label: 0.875rem / 14px) */
  const labelStyle = {
    display: 'block',
    fontSize: '0.875rem',          /* Matches .label font-size in service-request/page.module.css */
    fontWeight: '500',
    color: '#475569',              /* Slate-600, matches service-request label color */
    marginBottom: '6px',
  };

  /* Section heading style (h2, h3) */
  const sectionHeadingStyle = {
    fontWeight: '600',
    color: '#334155',         /* Slate-700 */
    paddingBottom: '8px',
    borderBottom: '1px solid #e2e8f0', /* Subtle divider, matches service-request sectionHeader */
    marginBottom: '20px',
  };

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '32px 16px' }}>
      <form
        onSubmit={handleSubmit}
        style={{ margin: '0 auto', maxWidth: '960px' }}
      >
        {/* Page title: matches .title style from service-request form */}
        <h1 style={{
          fontSize: '1.875rem',
          fontWeight: '600',
          marginBottom: '24px',
          color: '#1e293b',
        }}>
          Computer Configuration Form
        </h1>

        {/* Form card: matches .formBox style from service-request form */}
        <div style={{
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '32px',
          backgroundColor: '#ffffff',
          boxShadow: '0 4px 6px -1px rgba(11, 63, 115, 0.12), 0 2px 4px -1px rgba(11, 63, 115, 0.08)',
        }}>

          {/* Section 1: Customer Information */}
          {/* Font size matches h3 section headings (1rem) for visual consistency */}
          <h2 style={{ ...sectionHeadingStyle, fontSize: '1rem', marginTop: '4px' }}>
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
                <label style={labelStyle}>{label}</label>
                <input
                  name={label}
                  placeholder={label}
                  style={fieldInputStyle}
                />
              </div>
            ))}
          </div>

          {/* SMS consent checkbox — identical pattern to service-request form */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '8px',
            marginBottom: '20px',
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={smsConsent}
              onChange={(e) => setSmsConsent(e.target.checked)}
              style={{
                width: '16px',
                height: '16px',
                cursor: 'pointer',
                accentColor: '#16a34a', /* Green accent to match the submit button */
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: '0.875rem', color: '#475569', lineHeight: '1.4' }}>
              I agree to receive SMS notifications about my computer configuration status.
            </span>
          </label>

          {/* Section 2: Core Components */}
          <h3 style={{ ...sectionHeadingStyle, fontSize: '1rem', marginTop: '28px' }}>
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
                <label style={labelStyle}>{name}</label>
                <select
                  name={name}
                  onChange={handleSelectChange}
                  style={fieldSelectStyle}
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
          <h3 style={{ ...sectionHeadingStyle, fontSize: '1rem', marginTop: '28px' }}>
            3. Additional Options
          </h3>

          <div style={gridStyle}>
            {[
              ['Cooling', 'Select Cooling Option', coolings],
              ['Operating System', 'Select an OS', operatingSystems],
              ['Networking', 'Select Networking Option', networkings],
            ].map(([name, placeholder, list]) => (
              <div key={name}>
                <label style={labelStyle}>{name}</label>
                <select
                  name={name}
                  onChange={handleSelectChange}
                  style={fieldSelectStyle}
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
          <h3 style={{ ...sectionHeadingStyle, fontSize: '1rem', marginTop: '28px' }}>
            4. Other Requests / Questions
          </h3>

          <textarea
            name="otherRequests"
            rows={6}
            placeholder="Additional info, special requests, or questions"
            style={{
              ...fieldInputStyle,
              resize: 'vertical', /* Allow vertical resize only */
              minHeight: '120px',
            }}
          />

          {/* Submit button row: centered inside the form card */}
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
            <button
              type="submit"
              disabled={status === 'sending'}
              style={{
                backgroundColor: status === 'sending' ? '#86efac' : '#16a34a', /* Green-300 when disabled, Green-600 otherwise */
                color: '#ffffff',
                border: 'none',
                padding: '12px 80px', /* Matches .submitBtn padding in service-request/page.module.css */
                borderRadius: '6px',
                fontSize: '0.9375rem',
                fontWeight: '600',
                cursor: status === 'sending' ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s ease',
              }}
            >
              {status === 'sending' ? 'Submitting...' : 'Submit'}
            </button>
          </div>

          {/* Status messages: inside the form card, left-aligned to match service-request form style */}
          {status === 'sending'   && <p style={{ marginTop: '12px', fontSize: '0.875rem', color: '#475569' }}>Sending…</p>}
          {status === 'submitted' && <p style={{ marginTop: '12px', fontSize: '0.875rem', color: '#065f46' }}>Submitted — we will contact you soon.</p>}
          {status === 'error'     && <p style={{ marginTop: '12px', fontSize: '0.875rem', color: '#9b1c1c' }}>Error sending — try again.</p>}
        </div>
      </form>
    </main>
  );
}