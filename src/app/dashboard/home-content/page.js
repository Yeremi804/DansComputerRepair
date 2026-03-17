"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client"; // For using the existing client
import Sidebar from "../../components/Sidebar"; // Admin sidebar component
// This page allows admins to edit the "About Us" section of the homepage and the footer content
export default function HomeContentPage() {
  const router = useRouter();

  // State variables
  const [isAdmin, setIsAdmin] = useState(false); // track if user is admin
  const [loading, setLoading] = useState(true); // track loading state
  const [saving, setSaving] = useState(false); // track saving/publishing state
  const [msg, setMsg] = useState(""); // feedback message for user

  // Draft states for the content being edited
  const [aboutDraft, setAboutDraft] = useState({ title: "", body: "" }); // for "About Us" section
  const [footerDraft, setFooterDraft] = useState({ phone: "", email: "", hours: [] }); // for footer content

  // Friendly Business Hours editor
  const [hoursRows, setHoursRows] = useState([
    { day: "Mon - Sat", open: "7 AM", close: "9 PM" },
  ]);

  // Helper functions for managing the hours editor
  function updateHourRow(idx, field, value) {
    setHoursRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
    );
  }

  // Add a new empty row to the hours editor
  function addHourRow() {
    setHoursRows((prev) => [...prev, { day: "", open: "", close: "" }]);
  }

  // Remove a row from the hours editor by index
  function removeHourRow(idx) {
    setHoursRows((prev) => prev.filter((_, i) => i !== idx));
  }

  // Build a clean hours array by trimming values and filtering out empty rows
  function buildCleanHours() {
    return hoursRows
      .map((r) => ({
        day: String(r.day ?? "").trim(),
        open: String(r.open ?? "").trim(),
        close: String(r.close ?? "").trim(),
      }))
      .filter((r) => r.day || r.open || r.close);
  }

  // On mount, check if user is admin and load drafts
  useEffect(() => {
    async function boot() {
      setLoading(true);
      setMsg("");

      // 1) must be logged in
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (!session) {
        router.push("/admin-login"); // change to login route
        return;
      }

      // 2) must be in admins table
      const { data: adminRow, error: adminErr } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      // If there's an error or no admin row, user is not authorized
      if (adminErr || !adminRow) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      // 3) load drafts
      const { data, error } = await supabase
        .from("site_content")
        .select("key,draft")
        .in("key", ["home_about", "footer"]);

      if (error) {
        console.error(error);
        setMsg("Failed to load content.");
        setLoading(false);
        return;
      }

      // Map the results for easy access
      const map = new Map((data || []).map((r) => [r.key, r.draft]));
      const about = map.get("home_about") ?? { title: "", body: "" };
      const footer = map.get("footer") ?? { phone: "", email: "", hours: [] };

      setAboutDraft(about);
      setFooterDraft(footer);

      // Initialize friendly hours editor from footer.hours
      const hours = Array.isArray(footer.hours) ? footer.hours : [];
      setHoursRows(
        hours.length ? hours : [{ day: "Mon - Sat", open: "7 AM", close: "9 PM" }]
      );

      setLoading(false);
    }

    boot();
  }, [router]);

  // Function to save the current drafts to the "draft" column in Supabase
  async function saveDraft() {
    setSaving(true);
    setMsg("");

    // Build clean hours array from the friendly editor before saving
    const cleanHours = buildCleanHours();

    // Prepare updates for both "home_about" and "footer"
    const updates = [
      { key: "home_about", draft: aboutDraft },
      { key: "footer", draft: { ...footerDraft, hours: cleanHours } },
    ];

    // Update each row in Supabase with the new draft content
    for (const row of updates) {
      const { error } = await supabase
        .from("site_content")
        .update({ draft: row.draft, updated_at: new Date().toISOString() })
        .eq("key", row.key);

      // If there's an error during the update, log it and show a message
      if (error) {
        console.error(error);
        setMsg("Save failed (check RLS).");
        setSaving(false);
        return;
      }
    }

    setMsg("Draft saved.");
    setSaving(false);
  }

  // Function to publish the current drafts by copying them to the "published" column in Supabase
  async function publish() {
    setSaving(true);
    setMsg("");

    // Build clean hours array from the friendly editor before publishing
    const cleanHours = buildCleanHours();

    // Prepare publish updates for both "home_about" and "footer"
    const publishRows = [
      { key: "home_about", published: aboutDraft },
      { key: "footer", published: { ...footerDraft, hours: cleanHours } },
    ];

    // Update each row in Supabase with the new published content
    for (const row of publishRows) {
      const { error } = await supabase
        .from("site_content")
        .update({ published: row.published, updated_at: new Date().toISOString() })
        .eq("key", row.key);

      // If there's an error during the update, log it and show a message
      if (error) {
        console.error(error);
        setMsg("Publish failed (check RLS).");
        setSaving(false);
        return;
      }
    }

    setMsg("Published Successfully ✅");
    setSaving(false);
  }

  // Render logic
  if (loading) return <div className="p-8">Loading…</div>;

  // If not an admin, show unauthorized message
  if (!isAdmin) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Home Content</h1>
        <p className="mt-3 text-red-700">You are not authorized to view this page.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50">
      <div className="flex">
        <Sidebar />
  
        <main className="min-h-screen flex-1 px-4 py-10">
          <div className="mx-auto max-w-5xl">
            {/* Page header */}
            <div className="mb-6">
              <h1 className="text-3xl font-semibold text-slate-900">Home Content</h1>
              <p className="mt-1 text-sm text-slate-600">
                Edit drafts, preview changes, and publish updates to the live site.
              </p>
            </div>
  
            {/* Status message */}
            {msg && (
              <div className="mb-6 rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-700 shadow-sm">
                {msg}
              </div>
            )}
  
            {/* Main card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              {/* About Us */}
              <section className="pb-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">About Us (Draft)</h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    home_about
                  </span>
                </div>
  
                <div className="grid gap-4">
                  <label className="block">
                    <div className="mb-1 text-sm font-medium text-slate-700">Title</div>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                      value={aboutDraft.title ?? ""}
                      onChange={(e) =>
                        setAboutDraft({ ...aboutDraft, title: e.target.value })
                      }
                      placeholder="About Us"
                    />
                  </label>
  
                  <label className="block">
                    <div className="mb-1 text-sm font-medium text-slate-700">Body</div>
                    <textarea
                      className="w-full min-h-[140px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                      value={aboutDraft.body ?? ""}
                      onChange={(e) =>
                        setAboutDraft({ ...aboutDraft, body: e.target.value })
                      }
                      placeholder="Write your About Us text..."
                    />
                  </label>
                </div>
              </section>
  
              <div className="my-6 border-t border-slate-200" />
  
              {/* Footer */}
              <section className="pb-2">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Footer (Draft)</h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    footer
                  </span>
                </div>
  
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <div className="mb-1 text-sm font-medium text-slate-700">Phone</div>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                      value={footerDraft.phone ?? ""}
                      onChange={(e) =>
                        setFooterDraft({ ...footerDraft, phone: e.target.value })
                      }
                      placeholder="(555) 555-5555"
                    />
                  </label>
  
                  <label className="block">
                    <div className="mb-1 text-sm font-medium text-slate-700">Email</div>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                      value={footerDraft.email ?? ""}
                      onChange={(e) =>
                        setFooterDraft({ ...footerDraft, email: e.target.value })
                      }
                      placeholder="example@email.com"
                    />
                  </label>
                </div>
  
                {/* Business Hours (friendly editor) */}
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Business Hours</span>
  
                    {/* quick fill */}
                    <button
                      type="button"
                      onClick={() =>
                        setHoursRows([{ day: "Mon - Sat", open: "7 AM", close: "9 PM" }])
                      }
                      className="text-xs font-semibold text-slate-700 hover:text-slate-900 underline underline-offset-4"
                    >
                      Quick fill: Mon - Sat 7 AM - 9 PM
                    </button>
                  </div>
  
                  <div className="space-y-3">
                    {hoursRows.map((row, idx) => (
                      <div
                        key={idx}
                        className="grid gap-3 md:grid-cols-4 items-end"
                      >
                        <label className="block">
                          <div className="mb-1 text-xs font-medium text-slate-600">Day(s)</div>
                          <input
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                            value={row.day ?? ""}
                            onChange={(e) => updateHourRow(idx, "day", e.target.value)}
                            placeholder="Mon - Sat"
                          />
                        </label>
  
                        <label className="block">
                          <div className="mb-1 text-xs font-medium text-slate-600">Open</div>
                          <input
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                            value={row.open ?? ""}
                            onChange={(e) => updateHourRow(idx, "open", e.target.value)}
                            placeholder="7 AM"
                          />
                        </label>
  
                        <label className="block">
                          <div className="mb-1 text-xs font-medium text-slate-600">Close</div>
                          <input
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                            value={row.close ?? ""}
                            onChange={(e) => updateHourRow(idx, "close", e.target.value)}
                            placeholder="9 PM"
                          />
                        </label>
  
                        <button
                          type="button"
                          onClick={() => removeHourRow(idx)}
                          disabled={hoursRows.length === 1}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                          title={hoursRows.length === 1 ? "Keep at least one row" : "Remove"}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
  
                  <button
                    type="button"
                    onClick={addHourRow}
                    className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
                  >
                    + Add another day range
                  </button>
                </div>
              </section>
  
              {/* Actions */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  onClick={saveDraft}
                  disabled={saving}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
                >
                  Save Draft
                </button>
  
                <a
                  href="/?preview=1"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
                >
                  Preview Draft
                </a>
  
                <button
                  onClick={publish}
                  disabled={saving}
                  className="rounded-lg bg-pink-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-pink-800 disabled:opacity-50"
                >
                  Publish
                </button>
  
                {saving && <span className="text-sm text-slate-500">Working…</span>}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
