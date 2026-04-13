"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

/**
 * DashboardAuditPanel
 *
 * Client-side component that queries the `audit_logs` table and renders
 * a small table of recent entries
*/

export default function DashboardAuditPanel() {
  // logs: array of audit log objects
  const [logs, setLogs] = useState([]);
  // loading & error UI state
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
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

  // Fetch the most recent 50 audit log rows on mount
  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setErrorMsg("");

      // Query: id, created_at, actor_email, action, entity_type, entity_id
      // Order by created_at descending to show newest first.
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, created_at, actor_email, action, entity_type, entity_id")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        // Log error in console and show a helpful message in the UI
        console.error("Audit logs fetch error:", error);
        setErrorMsg(error.message ?? "Failed to load audit logs.");
        setLogs([]);
      } else {
        // Normalize missing data to empty array
        setLogs(data ?? []);
      }

      setLoading(false);
    };

    fetchLogs();
  }, []);

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
      )}
    </div>
  );
}