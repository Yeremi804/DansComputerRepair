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
      <div className="p-4 sm:p-6 md:p-8 bg-main-bg text-main-text min-h-screen overflow-x-hidden">
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
    <div className="flex min-h-screen bg-main-bg overflow-x-hidden">
      <Sidebar />

      {/* Main content area */}
      <main className="flex-1 min-w-0 bg-main-bg px-3 pb-4 pt-24 sm:px-6 sm:pb-6 sm:pt-24 lg:p-8 overflow-x-hidden">
        <h1 className="mb-4 text-3xl text-main-text font-bold">Audit Log</h1>

        <div className="w-full max-w-full overflow-x-auto overflow-y-hidden">
          <div className="min-w-[900px]">
            <DashboardAuditPanel
              supabaseUrl={SUPABASE_URL}
              supabaseAnonKey={SUPABASE_ANON}
            />
          </div>
        </div>
      </main>
    </div>
  );
}