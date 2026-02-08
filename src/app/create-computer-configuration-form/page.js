"use client";

import { useState, useEffect } from 'react';

export default function CreateComputerConfigurationForm() {
  const [status, setStatus] = useState(null);
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
    if (el.value === '') {
      el.classList.add('text-gray-400');
      el.classList.remove('text-black');
    } else {
      el.classList.remove('text-gray-400');
      el.classList.add('text-black');
    }
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

    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();
      setStatus('submitted');
      e.currentTarget.reset();
    } catch {
      setStatus('error');
    }
  }

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1.5rem',
  };

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
  };

  return (
    <main className="min-h-screen bg-white text-black">
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl mb-6">Computer Configuration Form</h1>

        <div className="border border-neutral-300 bg-white px-6 py-4">
          <h2 className="text-2xl mt-4 mb-6">1.Customer Information</h2>

          <div style={gridStyle}>
            {[
              'Name',
              'Phone Number',
              'Email Address',
              'Budget Range',
              'Intended Use',
            ].map((label) => (
              <div key={label}>
                <label className="block text-sm mb-1">{label}</label>
                <input
                  name={label}
                  placeholder={label}
                  className="border border-black px-3 py-2"
                  style={inputStyle}
                />
              </div>
            ))}
          </div>

          <h3 className="mt-8 mb-6">2. Core Components</h3>

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
                <label className="block text-sm mb-1">{name}</label>
                <select
                  name={name}
                  onChange={handleSelectChange}
                  className="border border-neutral-300 py-2 bg-white text-gray-400"
                  style={inputStyle}
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

          <h3 className="mt-8 mb-4">3. Additional Options</h3>

          <div style={gridStyle}>
            {[
              ['Cooling', 'Select Cooling Option', coolings],
              ['Operating System', 'Select an OS', operatingSystems],
              ['Networking', 'Select Networking Option', networkings],
            ].map(([name, placeholder, list]) => (
              <div key={name}>
                <label className="block text-sm mb-1">{name}</label>
                <select
                  name={name}
                  onChange={handleSelectChange}
                  className="border border-neutral-300 py-2 bg-white text-gray-400"
                  style={inputStyle}
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

          <h3 className="mt-8 mb-2">4. Other request / Questions</h3>
          <textarea
            name="otherRequests"
            rows={6}
            placeholder="Additional info, special requests, or questions"
            className="border border-neutral-300 px-3 py-2"
            style={inputStyle}
          />
        </div>

        <div className="mt-6 flex justify-end">
          <button type="submit" className="bg-green-600 text-white px-6 py-3 rounded-md">
            Submit Configuration
          </button>
        </div>

        {status === 'sending' && <p className="mt-4 text-sm">Sending…</p>}
        {status === 'submitted' && <p className="mt-4 text-sm text-green-600">Submitted — we will contact you soon.</p>}
        {status === 'error' && <p className="mt-4 text-sm text-red-600">Error sending — try again.</p>}
      </form>
    </main>
  );
}
