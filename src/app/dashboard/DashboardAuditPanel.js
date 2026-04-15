"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function DashboardAuditPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from("audit_logs")
          .select("id, created_at, actor_email, action, entity_type, entity_id")
          .order("created_at", { ascending: false })
          .limit(50);

        if (fetchError) {
          setError(fetchError.message);
          return;
        }

        setLogs(data || []);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch audit logs");
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  if (loading) return <div className="bg-main-bg text-main-text p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className={`p-4 rounded-xl shadow-sm border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-100 border-slate-300 text-gray-900"}`}>
      {/* Simple, clear loading / empty / error states */}
      {loading && <p>Loading audit logs...</p>}
      {!loading && errorMsg && <p className="text-red-700 dark:text-red-400">{errorMsg}</p>}
      {!loading && !errorMsg && logs.length === 0 && <p className={isDark ? "text-gray-300" : ""}>No audit logs found.</p>}

      {/* Data table */}
      {!loading && !errorMsg && logs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b ${isDark ? "border-gray-700" : "border-slate-300"}`}>
                <th className="py-2 pr-4">Time</th>
                <th className="py-2 pr-4">Actor</th>
                <th className="py-2 pr-4">Action</th>
                <th className="py-2 pr-4">Entity</th>
                <th className="py-2 pr-4">Entity ID</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className={`border-b ${isDark ? "border-gray-700" : "border-slate-300"}`}>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {/* Convert server timestamp to local string for readability */}
                    <div className="flex flex-col leading-tight">
                      <span className="text-sm">
                        {new Date(log.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-xs opacity-70">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </td>

                  {/* Actor email (falls back to an em dash if missing) */}
                  <td className="py-2 pr-4">{log.actor_email ?? "—"}</td>

                  {/* Action string (e.g. PART_CREATED, PART_UPDATED, PART_DELETED) */}
                  <td className="py-2 pr-4">{log.action}</td>

                  {/* Entity type (table name or logical entity name) */}
                  <td className="py-2 pr-4">{log.entity_type}</td>

                  {/* Optional: entity_id (could be blank for some audit rows) */}
                  <td className="py-2 pr-4">{log.entity_id ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}