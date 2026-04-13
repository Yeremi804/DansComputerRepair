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
function StatusBadge({ status, row, router }) {
  const key = String(status || '').toLowerCase(); //uses tolowercase for easier comparison

  // Restore original color logic (as in your previous version)
  let colorClass = '';
  if (key.includes('pending')) colorClass = 'bg-gray-200 text-gray-900';
  else if (key.includes('in progress') || key.includes('in-progress') || key.includes('progress')) colorClass = 'bg-blue-200 text-blue-900';
  else if (key.includes('complete')) colorClass = 'bg-green-200 text-green-900';
  else if (key.includes('cancel')) colorClass = 'bg-red-200 text-red-900';
  else colorClass = 'bg-blue-200 text-blue-900';

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
      >
        {STATUS_UPDATE_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
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
function DetailCard({ title, children }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{title}</p>
      </div>
      <div className="px-4 py-3 flex flex-col gap-2.5">
        {children}
      </div>
    </div>
  );
}

// Single key-value row inside a card — label on top, value below (Shopify pattern)
function DetailRow({ label, value }) {
  return (
    <div>
      <p className="text-[11px] text-gray-400 font-medium mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 font-medium leading-snug">{value || 'N/A'}</p>
    </div>
  );
}

// Spec chip — compact pill for hardware components (used in Config Form)
function SpecChip({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-400 w-28 shrink-0 pt-0.5">{label}</span>
      <span className="text-xs text-gray-800 font-medium leading-snug">{value}</span>
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
          <td colSpan={6} className="border-t border-gray-200 bg-gray-50 px-4 py-4">
            {/* Top meta bar — order ID + date stamp (Shopify/Stripe header pattern) */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  Order #{row.ID}
                </span>
                <span className="text-gray-300">·</span>
                <span className="text-xs text-gray-400">
                  {formatDateCALong(row.Dates)}
                </span>
              </div>
              <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                Computer Configuration
              </span>
            </div>

            {/* 3-column card grid — Shopify sidebar card pattern */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

              {/* Card 1: Customer — Budget Range & Intended Use here */}
              <DetailCard title="Customer">
                <DetailRow label="Name" value={row.Customer} />
                <DetailRow label="Phone" value={row.phone} />
                <DetailRow label="Email" value={row.email} />
                {/* Budget Range and Intended Use */}
                <div className="mt-1 pt-2 border-t border-gray-100 flex flex-col gap-2">
                  <DetailRow
                    label="Budget Range"
                    value={row.budget_range || 'Not specified'}
                  />
                  <DetailRow
                    label="Intended Use"
                    value={row.intended_use || 'Not specified'}
                  />
                </div>
              </DetailCard>

              {/* Card 2: Component Specs — compact chip list pattern */}
              <DetailCard title="Component Specifications">
                <SpecChip label="Processor" value={row.cpu} />
                <SpecChip label="Graphics Card" value={row.gpu} />
                <SpecChip label="Memory" value={row.memory} />
                <SpecChip label="Storage" value={row.storage} />
                <SpecChip label="Motherboard" value={row.motherboard} />
              </DetailCard>

              {/* Card 3: Build Details */}
              <DetailCard title="Build Details">
                <SpecChip label="Case" value={row.case} />
                <SpecChip label="OS" value={row.operating_system} />
                <SpecChip label="Power Supply" value={row.psu} />
                <SpecChip label="Cooling" value={row.cooling} />
                <SpecChip label="Networking" value={row.networking} />
              </DetailCard>
            </div>

            {/* Notes — only shown if present, amber tinted (Shopify "Notes" card pattern) */}
            {(row.other_requests || row.Notes) && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-500 mb-1">
                  Notes / Other Requests
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
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
          <td colSpan={6} className="border-t border-gray-200 bg-gray-50 px-4 py-4">
            {/* Top meta bar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  Order #{row.ID}
                </span>
                <span className="text-gray-300">·</span>
                <span className="text-xs text-gray-400">
                  {formatDateCALong(row.Dates)}
                </span>
              </div>
              <span className="inline-flex items-center rounded-full bg-teal-50 border border-teal-200 px-2.5 py-0.5 text-xs font-semibold text-teal-700">
                Service Request
              </span>
            </div>

            {/* 2-column card grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

              {/* Card 1: Customer */}
              <DetailCard title="Customer">
                <DetailRow label="Name" value={row.Customer} />
                <DetailRow label="Phone" value={row.phone_number} />
                <DetailRow label="Email" value={row.email} />
                <DetailRow label="Device Type" value={row.device_type} />
                <DetailRow label="Service Type" value={row.service_type || 'No specification.'} />
              </DetailCard>

              {/* Card 2: Problem Description */}
              <DetailCard title="Problem Description">
                <DetailRow
                  label="When did the problem start?"
                  value={row.problem_start_date || 'No specification.'}
                />
                <DetailRow
                  label="Do you know what caused it?"
                  value={row.problem_cause_idea || 'No specification.'}
                />
                <DetailRow
                  label="Additional questions"
                  value={row.additional_questions || 'No specification.'}
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
    <div className="rounded-lg bg-red-100 p-4 text-gray-900 shadow-sm hover:shadow-lg hover:border hover:border-pink-300">
      {/* Top controls: search + filter */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        {/* Search input */}
        <div className="relative flex-1 min-w-[240px] max-w-[420px]">
          <input
            type="text"
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            placeholder="Search orders"
            className="w-full rounded border border-gray-400 bg-gray-100 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-500"
          />
        </div>

        {/* Status filter dropdown */}
        <label className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <span>Status</span>
          <select
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {STATUS_FILTER_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {/* Month filter dropdown */}
        <label className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <span>Month</span>
          <select
            value={monthFilter}
            onChange={event => setMonthFilter(event.target.value)}
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {MONTH_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {/* Sort dropdown */}
        <label className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <span>Sort</span>
          <select
            value={sortField}
            onChange={event => setSortField(event.target.value)}
            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Table wrapper with scroll */}
      <div className="max-h-96 overflow-x-auto overflow-y-auto rounded border border-gray-200 bg-white">
        <table className="min-w-[1100px] w-full table-fixed border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-gray-50 text-gray-700">
            <tr className="border-b-2 border-gray-200">
              <th className="w-10"></th>
              <th className="w-20 px-3 py-2 font-semibold">ID</th>
              <th className="w-52 px-3 py-2 font-semibold">Customer</th>
              <th className="w-44 px-3 py-2 font-semibold">Status</th>
              <th className="w-40 px-3 py-2 font-semibold">Date</th>
              <th className="w-[28%] min-w-[220px] px-3 py-2 font-semibold whitespace-nowrap">Notes</th>
              <th className="w-[18%] min-w-[170px] px-3 py-2 font-semibold whitespace-nowrap">Source</th>
            </tr>
          </thead>
          <tbody className="text-gray-900">
            {filteredRows.map((row, index) => (
              <React.Fragment key={`${row.Source}-${row.ID ?? index}`}>
                <tr className="odd:bg-white even:bg-gray-50">
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
                    />
                  </td>
                  <td className="w-40 px-3 py-3 align-top whitespace-nowrap">
                    {normalizeValue(row, 'Dates')}
                  </td>
                  <td className="w-[28%] min-w-[220px] px-3 py-3 align-top">
                    <div className="max-w-full truncate whitespace-nowrap" title={row.Notes || ''}>
                      {row.Notes}
                    </div>
                  </td>
                  <td className="w-[18%] min-w-[170px] px-3 py-3 align-top">
                    <div className="max-w-full truncate whitespace-nowrap" title={row.Source || ''}>
                      {row.Source}
                    </div>
                  </td>
                </tr>
                {expandedRow === row.ID && renderDetails(row)}
              </React.Fragment>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-sm text-gray-500"
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