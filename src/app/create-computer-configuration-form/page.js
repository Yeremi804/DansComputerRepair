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
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1.75rem',
  };

  return (
    <main className="min-h-screen bg-gray-100 py-28 px-6">
      <div className="max-w-4xl mx-auto">

        {/* Title */}
        <h1 className="text-4xl font-semibold text-slate-900 text-center mb-14 tracking-tight">
          Computer Configuration Form
        </h1>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-14 space-y-16"
        >

          {/* Customer Info */}
          <div className="space-y-8">
            <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">
              Customer Information
            </h2>

            <div style={gridStyle}>
              {[
                'Name',
                'Phone Number',
                'Email Address',
                'Budget Range',
                'Intended Use',
              ].map((label) => (
                <div key={label} className="flex flex-col">
                  <label className="text-sm text-gray-700 mb-2">
                    {label}
                  </label>
                  <input
                    name={label}
                    placeholder={label}
                    className="rounded-lg px-4 py-3 border border-gray-300 bg-gray-50 focus:outline-none focus:border-black"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Computer Parts Section */}
          <div className="space-y-8">
            <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">
              Core Components
            </h2>

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
                <div key={name} className="flex flex-col">
                  <label className="text-sm text-gray-700 mb-2">
                    {name}
                  </label>
                  <select
                    name={name}
                    onChange={handleSelectChange}
                    className="rounded-lg px-4 py-3 border border-gray-300 bg-gray-50 text-gray-400 focus:outline-none focus:border-black"
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
          </div>

          {/* Extra Options */}
          <div className="space-y-8">
            <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">
              Additional Options
            </h2>

            <div style={gridStyle}>
              {[
                ['Cooling', 'Select Cooling Option', coolings],
                ['Operating System', 'Select an OS', operatingSystems],
                ['Networking', 'Select Networking Option', networkings],
              ].map(([name, placeholder, list]) => (
                <div key={name} className="flex flex-col">
                  <label className="text-sm text-gray-700 mb-2">
                    {name}
                  </label>
                  <select
                    name={name}
                    onChange={handleSelectChange}
                    className="rounded-lg px-4 py-3 border border-gray-300 bg-gray-50 text-gray-400 focus:outline-none focus:border-black"
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
          </div>

          {/* Additional/Other Requests */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">
              Other Requests / Questions
            </h2>

            <textarea
              name="otherRequests"
              rows={5}
              placeholder="Additional info, special requests, or questions"
              className="w-full rounded-lg px-4 py-3 border border-gray-300 bg-gray-50 focus:outline-none focus:border-black"
            />
          </div>

          {/* Submit */}
          <div className="text-center pt-4">
            <button
              type="submit"
              disabled={status === 'sending'}
              className="px-8 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              {status === 'sending' ? 'Submitting...' : 'Submit Configuration'}
            </button>
          </div>

          {status === 'submitted' && (
            <p className="text-center text-green-600">
              Submitted — we will contact you soon.
            </p>
          )}
          {status === 'error' && (
            <p className="text-center text-red-600">
              Error sending — try again.
            </p>
          )}

        </form>
      </div>
    </main>
  );
}