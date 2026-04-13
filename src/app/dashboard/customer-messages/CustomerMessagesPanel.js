'use client';

import { useEffect, useMemo, useState, Fragment } from 'react';
import { supabase } from "@/lib/supabase/client";
import dayjs from 'dayjs';


// options for status filter 
const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Checked', label: 'Checked' },
];

// options for sorting
const SORT_OPTIONS = [
  { value: 'az', label: 'A-Z (Name)' },
  { value: 'date', label: 'Newest' },
];

// component for status badge with dropdown to change status
function StatusBadge({ status, id, refresh, setMessages, isDark }) {
  const key = String(status || '').toLowerCase();

  // default to blue for unknown statuses, gray for pending, green for checked
  let colorClass = '';
  if (key.includes('pending')) colorClass = isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-900';
  else if (key.includes('checked')) colorClass = isDark ? 'bg-green-900 text-green-300' : 'bg-green-200 text-green-900';
  else colorClass = isDark ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-200 text-blue-900';

  // handle status change, update in supabase, then refresh messages
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

  // render the badge with a dropdown to change status
  return (
    <span className={`inline-block rounded-md px-2 py-1 font-semibold ${colorClass}`}>
      <select
        value={status}
        onChange={handleChange}
        className={`bg-transparent outline-none ${isDark ? 'text-white' : 'text-gray-900'}`}
      >
        <option value="Pending" className={isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}>Pending</option>
        <option value="Checked" className={isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}>Checked</option>
      </select>
    </span>
  );
}

// main component for customer messages panel
export default function CustomerMessagesPanel() {

  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('date');
  const [expandedRow, setExpandedRow] = useState(null);
  const [isDark, setIsDark] = useState(false);
  
  useEffect(() => {
    fetchMessages();
  }, []);

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

  // function to fetch messages from supabase
  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setMessages(data);
    else console.error(error);
  };

  // memoized filtered and sorted messages based on search term, status filter, and sort field
  const filteredMessages = useMemo(() => {
    // filter by status
    const byStatus =
      statusFilter === 'all'
        ? messages
        : messages.filter(
            msg =>
              String(msg?.status || '').toLowerCase() ===
              statusFilter.toLowerCase()
          );

    // filter by search term in name, email, or message fields
    const term = searchTerm.trim().toLowerCase();

    // if no search term, use status-filtered messages, otherwise filter further by search term
    const searched = !term
      ? byStatus
      : byStatus.filter(msg =>
          ['name', 'email', 'message'].some(field =>
            String(msg?.[field] || '')
              .toLowerCase()
              .includes(term)
          )
        );

    // sort the searched messages by name or date
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

  // function to render expanded row details
  function renderDetails(row) {
    return (
      <tr>
        <td colSpan={6} className={`p-6 text-left text-sm border-t ${isDark ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>

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

  // render the main panel with controls and table of messages
  return (
    <div className={`rounded-lg p-4 shadow-sm hover:shadow-lg border ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-slate-100 border-slate-300 text-gray-900'}`}>

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-4">

        {/* search input */}
        <input
          type="text"
          placeholder="Search messages"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className={`rounded border px-3 py-2 text-sm ${isDark ? 'border-gray-600 bg-gray-800 text-white placeholder:text-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400'}`}
        />
        {/* status filter dropdown */}
        <label className={`flex items-center gap-2 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Status
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className={`rounded border px-3 py-2 ${isDark ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
          >
            {STATUS_FILTER_OPTIONS.map(option => (
              <option key={option.value} value={option.value} className={isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {/* sort field dropdown */}
        <label className={`flex items-center gap-2 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Sort
          <select
            value={sortField}
            onChange={(event) => setSortField(event.target.value)}
            className={`rounded border px-3 py-2 ${isDark ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value} className={isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

      </div>

      {/* Table */}
      <div className={`max-h-[500px] overflow-x-auto overflow-y-auto rounded border ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>

        <table className="min-w-[900px] w-full border-collapse text-left text-sm">
          {/* table headers */}
          <thead className={`sticky top-0 ${isDark ? 'bg-gray-800 text-gray-200' : 'bg-gray-50 text-gray-700'}`}>
            <tr className={`border-b-2 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <th className="w-10"></th>
              <th className="w-20 px-3 py-2 font-semibold">ID</th>
              <th className="w-44 px-3 py-2 font-semibold">Name</th>
              <th className="w-64 px-3 py-2 font-semibold">Email</th>
              <th className="w-40 px-3 py-2 font-semibold">Status</th>
              <th className="w-36 px-3 py-2 font-semibold">Date</th>
            </tr>
          </thead>

          <tbody className={isDark ? 'text-gray-100' : 'text-gray-900'}>
            {/* render each message row, with expandable details */}
            {filteredMessages.map((row) => (
              <Fragment key={row.id}>
                <tr key={row.id} className={isDark ? 'odd:bg-gray-900 even:bg-gray-800/60' : 'odd:bg-white even:bg-gray-50'}>

                  <td className="w-10 px-1 py-3 align-top">
                    <button
                      className="text-lg cursor-pointer"
                      onClick={() =>
                        setExpandedRow(expandedRow === row.id ? null : row.id)
                      }
                    >
                      {expandedRow === row.id ? '▼' : '▶'}
                    </button>
                  </td>

                  <td className ="w-20 px-3 py-3 align-top">{row.id}</td>

                  <td className="w-44 px-3 py-3 align-top">{row.name}</td>

                  <td className="w-64 px-3 py-3 align-top whitespace-nowrap">{row.email}</td>

                  <td className="w-40 px-3 py-3 align-top">
                    <StatusBadge
                      status={row.status}
                      id={row.id}
                      refresh={fetchMessages}
                      setMessages={setMessages}
                      isDark={isDark}
                    />
                  </td>

                  <td className="w-36 px-3 py-3 align-top whitespace-nowrap">
                    {dayjs(row.created_at).format('MMM DD YYYY')}
                  </td>

                </tr>

                {expandedRow === row.id && renderDetails(row)}

              </Fragment>
            ))}
            {/* show message if no messages found after filtering */ }
            {filteredMessages.length === 0 && (
              <tr>
                <td colSpan={5} className={`px-3 py-6 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
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