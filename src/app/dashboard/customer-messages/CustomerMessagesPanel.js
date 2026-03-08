'use client';

import { useEffect, useMemo, useState, Fragment } from 'react';
import { createClient } from '@supabase/supabase-js';
import dayjs from 'dayjs';


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Checked', label: 'Checked' },
];

const SORT_OPTIONS = [
  { value: 'az', label: 'A-Z (Name)' },
  { value: 'date', label: 'Newest' },
];

function StatusBadge({ status, id, refresh, setMessages }) {
  const key = String(status || '').toLowerCase();

  let colorClass = '';
  if (key.includes('pending')) colorClass = 'bg-gray-200 text-gray-900';
  else if (key.includes('checked')) colorClass = 'bg-green-200 text-green-900';
  else colorClass = 'bg-blue-200 text-blue-900';

  const handleChange = async (event) => {
  const newStatus = event.target.value;

  console.log("Updating:", id, newStatus);

  const { data, error } = await supabase
    .from("contact_messages")
    .update({ status: newStatus })
    .eq("id", id)
    .select();

  console.log("UPDATED:", data);
  console.log("ERROR:", error);

  refresh();
};

  return (
    <span className={`inline-block rounded-md px-2 py-1 font-semibold ${colorClass}`}>
      <select
        value={status}
        onChange={handleChange}
        className="bg-transparent"
      >
        <option value="Pending">Pending</option>
        <option value="Checked">Checked</option>
      </select>
    </span>
  );
}

export default function CustomerMessagesPanel() {

  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('date');
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setMessages(data);
    else console.error(error);
  };

  const filteredMessages = useMemo(() => {

    const byStatus =
      statusFilter === 'all'
        ? messages
        : messages.filter(
            msg =>
              String(msg?.status || '').toLowerCase() ===
              statusFilter.toLowerCase()
          );

    const term = searchTerm.trim().toLowerCase();

    const searched = !term
      ? byStatus
      : byStatus.filter(msg =>
          ['name', 'email', 'message'].some(field =>
            String(msg?.[field] || '')
              .toLowerCase()
              .includes(term)
          )
        );

    const sorted = [...searched].sort((a, b) => {
      if (sortField === 'az') {
        return String(a?.name || '').localeCompare(String(b?.name || ''));
      }

      if (sortField === 'date') {
        const aDate = dayjs(a?.created_at);
        const bDate = dayjs(b?.created_at);

        return bDate.valueOf() - aDate.valueOf();
      }

      return 0;
    });

    return sorted;

  }, [messages, searchTerm, statusFilter, sortField]);

  function renderDetails(row) {
    return (
      <tr>
        <td colSpan={6} className="bg-gray-50 p-6 text-left text-sm border-t border-gray-200">

          <div className="mb-3">
            <strong>Email:</strong> {row.email}
          </div>

          <div className="mb-3">
            <strong>Phone:</strong> {row.phone || 'N/A'}
          </div>

          <div>
            <strong>Message:</strong>
            <p className="mt-2 whitespace-pre-wrap">{row.message}</p>
          </div>

        </td>
      </tr>
    );
  }

  return (
    <div className="rounded-lg bg-red-100 p-4 text-gray-900 shadow-sm hover:shadow-lg">

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-4">

        <input
          type="text"
          placeholder="Search messages"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        />

        <label className="flex items-center gap-2 text-sm font-medium">
          Status
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded border border-gray-300 px-3 py-2"
          >
            {STATUS_FILTER_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm font-medium">
          Sort
          <select
            value={sortField}
            onChange={(event) => setSortField(event.target.value)}
            className="rounded border border-gray-300 px-3 py-2"
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

      </div>

      {/* Table */}
      <div className="max-h-[500px] overflow-y-auto rounded border border-gray-200 bg-white">

        <table className="w-full border-collapse text-left text-sm">

          <thead className="sticky top-0 bg-gray-50">
            <tr className="border-b-2 border-gray-200">
              <th></th>
              <th className="px-3 py-2 font-semibold">ID</th>
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">Email</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Date</th>
            </tr>
          </thead>

          <tbody>

            {filteredMessages.map((row) => (
              <Fragment key={row.id}>
                <tr key={row.id} className="odd:bg-white even:bg-gray-50">

                  <td className="px-1 py-3">
                    <button
                      className="text-lg cursor-pointer"
                      onClick={() =>
                        setExpandedRow(expandedRow === row.id ? null : row.id)
                      }
                    >
                      {expandedRow === row.id ? '▼' : '▶'}
                    </button>
                  </td>

                  <td className ="px-3 py-3">{row.id}</td>

                  <td className="px-3 py-3">{row.name}</td>

                  <td className="px-3 py-3">{row.email}</td>

                  <td className="px-3 py-3">
                    <StatusBadge
  status={row.status}
  id={row.id}
  refresh={fetchMessages}
  setMessages={setMessages}
/>
                  </td>

                  <td className="px-3 py-3">
                    {dayjs(row.created_at).format('MMM DD YYYY')}
                  </td>

                </tr>

                {expandedRow === row.id && renderDetails(row)}

              </Fragment>
            ))}

            {filteredMessages.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                  No messages found
                </td>
              </tr>
            )}

          </tbody>

        </table>

      </div>

    </div>
  );
}