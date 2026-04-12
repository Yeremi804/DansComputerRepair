"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Sidebar from "../../components/Sidebar";

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    <div className="flex min-h-screen bg-main-bg">
      <Sidebar />
      <main className="flex-1 p-8 md:ml-0">
        <h1 className="text-3xl font-bold text-main-text mb-6">Audit Log</h1>
        <div className="overflow-x-auto">
          <div className="border border-neutral-300 rounded-md overflow-hidden bg-white">
            <div className="grid grid-cols-5 bg-neutral-100 border-b border-neutral-300">
              <div className="p-4 font-semibold text-sm">Time</div>
              <div className="p-4 font-semibold text-sm">Actor</div>
              <div className="p-4 font-semibold text-sm">Action</div>
              <div className="p-4 font-semibold text-sm">Entity</div>
              <div className="p-4 font-semibold text-sm">Entity ID</div>
            </div>
            <div>
              {logs.length === 0 ? (
                <div className="p-4 text-sm text-neutral-500">No audit logs found.</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="grid grid-cols-5 border-b border-neutral-300 hover:bg-neutral-50">
                    <div className="p-4 text-sm">{new Date(log.created_at).toLocaleString()}</div>
                    <div className="p-4 text-sm">{log.actor_email ?? "—"}</div>
                    <div className="p-4 text-sm">{log.action}</div>
                    <div className="p-4 text-sm">{log.entity_type}</div>
                    <div className="p-4 text-sm">{log.entity_id ?? "—"}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
