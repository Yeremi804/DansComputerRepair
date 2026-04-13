//needed to create new component file for this tile
'use client';
import { useRouter } from 'next/navigation';
import React, { useMemo, useState, useEffect } from 'react';
// Convert UTC timestamp to California time using Intl.DateTimeFormat
// Intl is built-in (Node.js + browser) and handles DST automatically — no extra packages needed
const CA_TZ = 'America/Los_Angeles';

// Normalize any Supabase timestamp to a valid ISO string that new Date() can parse as UTC.
// Handles all formats Supabase may return:
//   - "2026-03-08 07:40:10.406509"         (service_requests: space, no tz → append Z)
//   - "2026-03-07T23:30:00.406509+00:00"   (Configuration_Form: ISO with offset → leave as-is)
//   - "2026-03-07T23:30:00.406509Z"         (ISO with Z → leave as-is)
function toUTCIso(value) {
  if (!value) return null;
  let s = typeof value === 'string' ? value : String(value);
  s = s.replace(' ', 'T'); // space → T
  // Only append Z if there is no timezone info at all
  if (!/Z$/.test(s) && !/[+-]\d{2}:\d{2}$/.test(s)) {
    s = s + 'Z';
  }
  return s;
}

function formatDateCA(value) {
  if (!value) return '';
  const date = new Date(toUTCIso(value));
  if (isNaN(date.getTime())) return '';
  // Use Intl to get month/day/year in California timezone
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CA_TZ,
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).formatToParts(date);
  const p = {};
  parts.forEach(({ type, value: v }) => { p[type] = v; });
  return `${p.month} ${p.day} ${p.year}`;
}

function formatDateCALong(value) {
  if (!value) return 'N/A';
  const date = new Date(toUTCIso(value));
  if (isNaN(date.getTime())) return 'N/A';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CA_TZ,
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).formatToParts(date);
  const p = {};
  parts.forEach(({ type, value: v }) => { p[type] = v; });
  return `${p.month} ${p.day}, ${p.year}`;
}

// Status choices for filtering and updates
const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'Completed', label: 'Complete' },
  { value: 'In progress', label: 'In progress' },
  { value: 'Pending', label: 'Pending' },
];
const STATUS_UPDATE_OPTIONS = [
  { value: 'Completed', label: 'Complete' },
  { value: 'In progress', label: 'In progress' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Cancelled', label: 'Cancelled' }, // keep legacy/status edge cases
];

// Sort choices
const SORT_OPTIONS = [
  { value: 'az', label: 'A-Z (Customer)' },
  { value: 'date', label: 'Date' },
  { value: 'id', label: 'ID' },
];

const MONTH_OPTIONS = [
  { value: 'all', label: 'All months' },
  { value: 'Jan', label: 'Jan' },
  { value: 'Feb', label: 'Feb' },
  { value: 'Mar', label: 'Mar' },
  { value: 'Apr', label: 'Apr' },
  { value: 'May', label: 'May' },
  { value: 'Jun', label: 'Jun' },
  { value: 'Jul', label: 'Jul' },
  { value: 'Aug', label: 'Aug' },
  { value: 'Sep', label: 'Sep' },
  { value: 'Oct', label: 'Oct' },
  { value: 'Nov', label: 'Nov' },
  { value: 'Dec', label: 'Dec' },
];

//badge component for status display
function StatusBadge({ status, row, router, isDark }) {
  const key = String(status || '').toLowerCase(); //uses tolowercase for easier comparison

  // Restore original color logic (as in your previous version)
  let colorClass = '';
  if (key.includes('pending')) colorClass = isDark ? 'bg-gray-700 text-white' : 'bg-gray-400/80 text-gray-900';
  else if (key.includes('in progress') || key.includes('in-progress') || key.includes('progress')) colorClass = isDark ? 'bg-blue-900/90 text-blue-300' : 'bg-blue-300 text-blue-900';
  else if (key.includes('complete')) colorClass = isDark ? 'bg-green-900/90 text-green-300' : 'bg-green-300 text-green-900';
  else if (key.includes('cancel')) colorClass = isDark ? 'bg-red-900/90 text-red-300' : 'bg-red-300 text-red-900';
  else colorClass = isDark ? 'bg-blue-900/90 text-blue-300' : 'bg-blue-300 text-blue-900';

  const handleStatusChange = async (Event) => {
    const newStatus = Event.target.value;
    // Call API route to update status
    await fetch('/api/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: row.ID,
        source: row.Source,
        newStatus,
      }),
    });
    router.refresh();
  };
  return (
    <span className={`inline-block rounded-md px-2 py-1 font-semibold ${colorClass}`}>
      <select
        value={status}
        onChange={handleStatusChange}
        className={`bg-transparent outline-none ${isDark ? 'text-white' : 'text-gray-900'}`}
      >
        {STATUS_UPDATE_OPTIONS.map(option => (
          <option key={option.value} value={option.value} className={isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}>
            {option.label}
          </option>
        ))}
      </select>
    </span>
  );
}

//function to normalize values for searching
function normalizeValue(row, field) {
  const value = row?.[field];
  if (value == null) return '';
  if (field === 'Dates') {
    // Both sources: UTC timestamp → California time via Intl.DateTimeFormat (consistent)
    return formatDateCA(value);
  }
  return String(value);
}

// ─── Detail panel sub-components (modern UI) ──────────────────────────

// Section card wrapper — white card with label, matches Shopify/Stripe sidebar card pattern
function DetailCard({ title, children, isDark }) {
  return (
    <div className={`${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border overflow-hidden`}>
      <div className={`px-4 py-2.5 border-b ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-gray-50'}`}>
        <p className={`text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>{title}</p>
      </div>
      <div className="px-4 py-3 flex flex-col gap-2.5">
        {children}
      </div>
    </div>
  );
}

// Single key-value row inside a card — label on top, value below (Shopify pattern)
function DetailRow({ label, value, isDark }) {
  return (
    <div>
      <p className={`text-[11px] font-medium mb-0.5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>{label}</p>
      <p className={`text-sm font-medium leading-snug ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{value || 'N/A'}</p>
    </div>
  );
}

// Spec chip — compact pill for hardware components (used in Config Form)
function SpecChip({ label, value, isDark }) {
  if (!value) return null;
  return (
    <div className={`flex items-start gap-2 py-1.5 border-b last:border-0 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
      <span className={`text-xs w-28 shrink-0 pt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>{label}</span>
      <span className={`text-xs font-medium leading-snug ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

//main tile component
export default function OrdersPanel({ rows, onFilteredChange }) {
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('az');
  const [monthFilter, setMonthFilter] = useState('all');
  const [expandedRow, setExpandedRow] = useState(null);
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

  const filteredRows = useMemo(() => {
    const byStatus =
      statusFilter === 'all'
        ? rows
        : rows.filter(
            row =>
              String(row?.Status || '').toLowerCase() ===
              statusFilter.toLowerCase()
          );

    const byMonth =
      monthFilter === 'all'
        ? byStatus
        : byStatus.filter(row => {
            const raw = row?.Dates;
            if (!raw) return false;
            // Both sources: UTC timestamp → California month via toUTCIso() (consistent)
            const d = new Date(toUTCIso(raw));
            if (isNaN(d.getTime())) return false;
            const mon = new Intl.DateTimeFormat('en-US', { timeZone: CA_TZ, month: 'short' }).format(d);
            return mon === monthFilter;
          });

    const term = searchTerm.trim().toLowerCase();
    const searched = !term
      ? byMonth
      : byMonth.filter(row =>
          ['ID', 'Customer', 'Status', 'Dates', 'Notes'].some(field =>
            normalizeValue(row, field).toLowerCase().includes(term)
          )
        );

    const sorted = [...searched].sort((a, b) => {
      if (sortField === 'az') {
        return String(a?.Customer || '').localeCompare(
          String(b?.Customer || '')
        );
      }
      if (sortField === 'date') {
        // Both sources: sort by UTC ms via toUTCIso() — timezone doesn't affect sort order
        const aMs = a?.Dates ? new Date(toUTCIso(a.Dates)).getTime() : NaN;
        const bMs = b?.Dates ? new Date(toUTCIso(b.Dates)).getTime() : NaN;
        if (isNaN(aMs) && isNaN(bMs)) return 0;
        if (isNaN(aMs)) return 1;
        if (isNaN(bMs)) return -1;
        return bMs - aMs;
      }
      if (sortField === 'id') {
        const aId = a?.ID ?? '';
        const bId = b?.ID ?? '';
        const aNum = Number(aId);
        const bNum = Number(bId);
        const bothNumeric =
          !Number.isNaN(aNum) && !Number.isNaN(bNum);
        if (bothNumeric) return aNum - bNum;
        return String(aId).localeCompare(String(bId));
      }
      return 0;
    });

    return sorted;
  }, [rows, searchTerm, statusFilter, sortField, monthFilter]);

  useEffect(() => {
  if (onFilteredChange) {
    onFilteredChange(filteredRows);
  }
}, [filteredRows, onFilteredChange]);

  // ─── Modern detail panel ──────────────────────────────────
  function renderDetails(row) {
    if (row.Source === 'Configuration_Form') {
      return (
        <tr>
          <td colSpan={7} className={`border-t px-4 py-4 ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
            {/* Top meta bar — order ID + date stamp (Shopify/Stripe header pattern) */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Order #{row.ID}
                </span>
                <span className={isDark ? 'text-gray-600' : 'text-gray-300'}>·</span>
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                  {formatDateCALong(row.Dates)}
                </span>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${isDark ? 'bg-indigo-900/40 border border-indigo-700 text-indigo-300' : 'bg-indigo-50 border border-indigo-200 text-indigo-700'}`}>
                Computer Configuration
              </span>
            </div>

            {/* 3-column card grid — Shopify sidebar card pattern */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

              {/* Card 1: Customer — Budget Range & Intended Use here */}
              <DetailCard title="Customer" isDark={isDark}>
                <DetailRow label="Name" value={row.Customer} isDark={isDark} />
                <DetailRow label="Phone" value={row.phone} isDark={isDark} />
                <DetailRow label="Email" value={row.email} isDark={isDark} />
                {/* Budget Range and Intended Use */}
                <div className={`mt-1 pt-2 flex flex-col gap-2 ${isDark ? 'border-t border-gray-700' : 'border-t border-gray-100'}`}>
                  <DetailRow
                    label="Budget Range"
                    value={row.budget_range || 'Not specified'}
                    isDark={isDark}
                  />
                  <DetailRow
                    label="Intended Use"
                    value={row.intended_use || 'Not specified'}
                    isDark={isDark}
                  />
                </div>
              </DetailCard>

              {/* Card 2: Component Specs — compact chip list pattern */}
              <DetailCard title="Component Specifications" isDark={isDark}>
                <SpecChip label="Processor" value={row.cpu} isDark={isDark} />
                <SpecChip label="Graphics Card" value={row.gpu} isDark={isDark} />
                <SpecChip label="Memory" value={row.memory} isDark={isDark} />
                <SpecChip label="Storage" value={row.storage} isDark={isDark} />
                <SpecChip label="Motherboard" value={row.motherboard} isDark={isDark} />
              </DetailCard>

              {/* Card 3: Build Details */}
              <DetailCard title="Build Details" isDark={isDark}>
                <SpecChip label="Case" value={row.case} isDark={isDark} />
                <SpecChip label="OS" value={row.operating_system} isDark={isDark} />
                <SpecChip label="Power Supply" value={row.psu} isDark={isDark} />
                <SpecChip label="Cooling" value={row.cooling} isDark={isDark} />
                <SpecChip label="Networking" value={row.networking} isDark={isDark} />
              </DetailCard>
            </div>

            {/* Notes — only shown if present, amber tinted (Shopify "Notes" card pattern) */}
            {(row.other_requests || row.Notes) && (
              <div className={`mt-3 rounded-lg border px-4 py-3 ${isDark ? 'border-amber-700 bg-amber-900/20' : 'border-amber-200 bg-amber-50'}`}>
                <p className={`text-[11px] font-semibold uppercase tracking-widest mb-1 ${isDark ? 'text-amber-300' : 'text-amber-500'}`}>
                  Notes / Other Requests
                </p>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                  {row.other_requests || row.Notes}
                </p>
              </div>
            )}
          </td>
        </tr>
      );
    } else if (row.Source === 'service_requests') {
      return (
        <tr>
          <td colSpan={7} className={`border-t px-4 py-4 ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
            {/* Top meta bar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Order #{row.ID}
                </span>
                <span className={isDark ? 'text-gray-600' : 'text-gray-300'}>·</span>
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                  {formatDateCALong(row.Dates)}
                </span>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${isDark ? 'bg-teal-900/40 border border-teal-700 text-teal-300' : 'bg-teal-50 border border-teal-200 text-teal-700'}`}>
                Service Request
              </span>
            </div>

            {/* 2-column card grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

              {/* Card 1: Customer */}
              <DetailCard title="Customer" isDark={isDark}>
                <DetailRow label="Name" value={row.Customer} isDark={isDark} />
                <DetailRow label="Phone" value={row.phone_number} isDark={isDark} />
                <DetailRow label="Email" value={row.email} isDark={isDark} />
                <DetailRow label="Device Type" value={row.device_type} isDark={isDark} />
                <DetailRow label="Service Type" value={row.service_type || 'No specification.'} isDark={isDark} />
              </DetailCard>

              {/* Card 2: Problem Description */}
              <DetailCard title="Problem Description" isDark={isDark}>
                <DetailRow
                  label="When did the problem start?"
                  value={row.problem_start_date || 'No specification.'}
                  isDark={isDark}
                />
                <DetailRow
                  label="Do you know what caused it?"
                  value={row.problem_cause_idea || 'No specification.'}
                  isDark={isDark}
                />
                <DetailRow
                  label="Additional questions"
                  value={row.additional_questions || 'No specification.'}
                  isDark={isDark}
                />
              </DetailCard>
            </div>
          </td>
        </tr>
      );
    }
    return null;
  }
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className={`rounded-lg p-4 shadow-sm transition hover:shadow-lg ${isDark ? 'bg-gray-900 text-white border border-gray-700' : 'bg-slate-100 text-gray-900 border border-slate-300'}`}>
      {/* Top controls: search + filter */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        {/* Search input */}
        <div className="relative flex-1 min-w-[240px] max-w-[420px]">
          <input
            type="text"
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            placeholder="Search orders"
            className={`w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDark ? 'border-gray-600 bg-gray-800 text-white placeholder:text-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'}`}
          />
        </div>

        {/* Status filter dropdown */}
        <label className={`flex items-center gap-2 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <span>Status</span>
          <select
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
            className={`rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDark ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
          >
            {STATUS_FILTER_OPTIONS.map(option => (
              <option key={option.value} value={option.value} className={isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {/* Month filter dropdown */}
        <label className={`flex items-center gap-2 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <span>Month</span>
          <select
            value={monthFilter}
            onChange={event => setMonthFilter(event.target.value)}
            className={`rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDark ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
          >
            {MONTH_OPTIONS.map(option => (
              <option key={option.value} value={option.value} className={isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {/* Sort dropdown */}
        <label className={`flex items-center gap-2 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <span>Sort</span>
          <select
            value={sortField}
            onChange={event => setSortField(event.target.value)}
            className={`rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDark ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value} className={isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Table wrapper with scroll */}
      <div className={`max-h-96 overflow-x-auto overflow-y-auto rounded border ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>
        <table className="min-w-[1100px] w-full table-fixed border-collapse text-left text-sm">
          <thead className={`sticky top-0 ${isDark ? 'bg-gray-800 text-gray-200' : 'bg-gray-50 text-gray-700'}`}>
            <tr className={`border-b-2 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <th className="w-10"></th>
              <th className="w-20 px-3 py-2 font-semibold">ID</th>
              <th className="w-52 px-3 py-2 font-semibold">Customer</th>
              <th className="w-44 px-3 py-2 font-semibold">Status</th>
              <th className="w-40 px-3 py-2 font-semibold">Date</th>
              <th className="px-3 py-2 font-semibold">Notes</th>
              <th className="w-52 px-3 py-2 font-semibold">Source</th>
            </tr>
          </thead>
          <tbody className={isDark ? 'text-gray-100' : 'text-gray-900'}>
            {filteredRows.map((row, index) => (
              <React.Fragment key={`${row.Source}-${row.ID ?? index}`}>
                <tr className={isDark ? 'odd:bg-gray-900 even:bg-gray-800/60' : 'odd:bg-white even:bg-gray-50'}>
                  <td className="w-10 px-1 py-3 align-top">
                    <button
                      className="text-lg cursor-pointer hover:opacity-70"
                      onClick={() => setExpandedRow(expandedRow === row.ID ? null : row.ID)}
                    >
                      {expandedRow === row.ID ? '▼' : '▶'}
                    </button>
                  </td>
                  <td className="w-20 px-3 py-3 align-top">{row.ID}</td>
                  <td className="w-52 px-3 py-3 align-top">{row.Customer}</td>
                  <td className="w-44 px-3 py-3 align-top">
                    <StatusBadge
                      status={row.Status}
                      row={row}
                      router={router}
                      isDark={isDark}
                    />
                  </td>
                  <td className="w-40 px-3 py-3 align-top whitespace-nowrap">
                    {normalizeValue(row, 'Dates')}
                  </td>
                  <td className="px-3 py-3 align-top">{row.Notes}</td>
                  <td className="w-52 px-3 py-3 align-top">{row.Source}</td>
                </tr>
                {expandedRow === row.ID && renderDetails(row)}
              </React.Fragment>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className={`px-3 py-6 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  No orders match the search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}