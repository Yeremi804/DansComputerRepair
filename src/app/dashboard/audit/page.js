import Sidebar from "../../components/Sidebar";
import DashboardAuditPanel from "../DashboardAuditPanel.js";

// Page metadata for Next.js (used by app router).
export const metadata = {
  title: "Audit Log",
  description: "Admin audit log",
};

/**
 * AuditLogPage (server component)
 *
 * - This is a simple wrapper page that:
 *   1) validates required Supabase env vars are present (so the client can use them),
 *   2) mounts the client-side DashboardAuditPanel and passes the Supabase info.
 */

export default async function AuditLogPage() {
  // These env vars are used client-side by the DashboardAuditPanel to initialize
  // a Supabase client, we validate early so we can show a clear error if missing
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON) {
    // Return a helpful message when the environment is not set, mainly for dev purposes
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold">Audit Log</h1>
        <p className="mt-4 text-red-700">
          Missing Supabase environment variables. Set{" "}
          <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code>,
          then restart the dev server.
        </p>
      </div>
    );
  }

  // Render the admin layout (sidebar + main). The DashboardAuditPanel is a
  // client component (it uses the browser Supabase client and hooks).
  return (
    <div className="flex min-h-screen">
      <Sidebar />

      {/* Main content area */}
      <main className="flex-1 p-8 bg-white">
        <h1 className="mb-4 text-3xl font-bold">Audit Log</h1>

        {/*
          DashboardAuditPanel is a client component that:
            - receives the Supabase URL + anon key to initialize a client
            - fetches recent audit_logs and displays them
          Passing env vars from the server to the client via props (safe for anon key).
        */}
        <DashboardAuditPanel
          supabaseUrl={SUPABASE_URL}
          supabaseAnonKey={SUPABASE_ANON}
        />
      </main>
    </div>
  );
}