import Link from "next/link";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  MessageSquare,
  Settings as SettingsIcon,
  ClipboardList,
} from "lucide-react";

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
      {/* Sidebar */}
      <aside className="w-[250px] bg-[#E2E8F0] text-black">
        <div className="p-5 border-b border-[#cbd5e1]">
          <h2 className="text-2xl text-center">Dashboard</h2>
        </div>

        <nav aria-label="Sidebar" className="flex flex-col">
          {/* Dashboard link */}
          <Link
            href="/dashboard"
            className="text-lg flex items-center justify-center gap-2.5 p-5 border-b border-[#cbd5e1] hover:bg-[#cbd5e1]"
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </Link>

          {/* Orders (button kept for parity with existing UI) */}
          <button className="text-lg flex items-center justify-center gap-2.5 p-5 border-b border-[#cbd5e1] hover:bg-[#cbd5e1]">
            <ShoppingBag size={20} />
            <span>Orders</span>
          </button>

          {/* Parts link */}
          <Link
            href="/admin-parts"
            className="text-lg flex items-center justify-center gap-2.5 p-5 border-b border-[#cbd5e1] hover:bg-[#cbd5e1]"
          >
            <Package size={20} />
            <span>Parts</span>
          </Link>

          {/* Reviews */}
          <Link
            href="/dashboard/admin-reviews"
            className="text-lg flex items-center justify-center gap-2.5 p-5 border-b border-[#cbd5e1] hover:bg-[#cbd5e1]"
          >
            <MessageSquare size={20} />
            <span>Review</span>
          </Link>

          {/* Active Audit Log tab (styled as active) */}
          <Link
            href="/dashboard/audit"
            className="text-lg flex items-center justify-center gap-2.5 p-5 border-b border-[#cbd5e1] hover:bg-[#cbd5e1] bg-[#cbd5e1]"
          >
            <ClipboardList size={20} />
            <span>Audit Log</span>
          </Link>

          {/* Settings */}
          <Link
            href="/settings"
            className="text-lg flex items-center justify-center gap-2.5 p-5 border-b border-[#cbd5e1] hover:bg-[#cbd5e1]"
          >
            <SettingsIcon size={20} />
            <span>Settings</span>
          </Link>
        </nav>
      </aside>

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