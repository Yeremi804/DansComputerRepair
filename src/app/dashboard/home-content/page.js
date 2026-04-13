"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Sidebar from "../../components/Sidebar";

export default function HomeContentPage() {
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [isDark, setIsDark] = useState(false);

  const [aboutDraft, setAboutDraft] = useState({ title: "", body: "" });
  const [footerDraft, setFooterDraft] = useState({
    phone: "",
    email: "",
    hours: [],
  });

  const [chatbotDraft, setChatbotDraft] = useState({
    enabled: true,
  });

  const [hoursRows, setHoursRows] = useState([
    { day: "Mon - Sat", open: "7 AM", close: "9 PM" },
  ]);

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
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  function updateHourRow(idx, field, value) {
    setHoursRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
    );
  }

  function addHourRow() {
    setHoursRows((prev) => [...prev, { day: "", open: "", close: "" }]);
  }

  function removeHourRow(idx) {
    setHoursRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function buildCleanHours() {
    return hoursRows
      .map((r) => ({
        day: String(r.day ?? "").trim(),
        open: String(r.open ?? "").trim(),
        close: String(r.close ?? "").trim(),
      }))
      .filter((r) => r.day || r.open || r.close);
  }

  useEffect(() => {
    async function boot() {
      setLoading(true);
      setMsg("");

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (!session) {
        router.push("/admin-login");
        return;
      }

      const { data: adminRow, error: adminErr } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (adminErr || !adminRow) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      const { data, error } = await supabase
        .from("site_content")
        .select("key,draft")
        .in("key", ["home_about", "footer", "chatbot_settings"]);

      if (error) {
        console.error(error);
        setMsg("Failed to load content.");
        setLoading(false);
        return;
      }

      const map = new Map((data || []).map((r) => [r.key, r.draft]));
      const about = map.get("home_about") ?? { title: "", body: "" };
      const footer = map.get("footer") ?? { phone: "", email: "", hours: [] };
      const chatbot = map.get("chatbot_settings") ?? { enabled: true };

      setAboutDraft(about);
      setFooterDraft(footer);
      setChatbotDraft({
        enabled: Boolean(chatbot.enabled),
      });

      const hours = Array.isArray(footer.hours) ? footer.hours : [];
      setHoursRows(
        hours.length
          ? hours
          : [{ day: "Mon - Sat", open: "7 AM", close: "9 PM" }]
      );

      setLoading(false);
    }

    boot();
  }, [router]);

  async function saveDraft() {
    setSaving(true);
    setMsg("");

    const cleanHours = buildCleanHours();

    const updates = [
      { key: "home_about", draft: aboutDraft },
      { key: "footer", draft: { ...footerDraft, hours: cleanHours } },
      { key: "chatbot_settings", draft: chatbotDraft },
    ];

    for (const row of updates) {
      const { error } = await supabase
        .from("site_content")
        .update({ draft: row.draft, updated_at: new Date().toISOString() })
        .eq("key", row.key);

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

  async function publish() {
    setSaving(true);
    setMsg("");

    const cleanHours = buildCleanHours();

    const publishRows = [
      { key: "home_about", published: aboutDraft },
      { key: "footer", published: { ...footerDraft, hours: cleanHours } },
      { key: "chatbot_settings", published: chatbotDraft },
    ];

    for (const row of publishRows) {
      const { error } = await supabase
        .from("site_content")
        .update({ published: row.published, updated_at: new Date().toISOString() })
        .eq("key", row.key);

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

  if (loading) return <div className="p-8 bg-main-bg text-main-text">Loading…</div>;

  if (!isAdmin) {
    return (
      <div className="p-8 bg-main-bg text-main-text min-h-screen">
        <h1 className="text-2xl font-bold">Home Content</h1>
        <p className="mt-3 text-red-700">
          You are not authorized to view this page.
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-main-bg text-main-text">
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="flex-1 px-4 py-10">
          <div className="mx-auto max-w-5xl">
            <div className="mb-6">
              <h1 className="text-3xl font-semibold text-main-text">
                Home Content
              </h1>
              <p className="mt-1 text-sm" style={{ color: isDark ? "#9ca3af" : "#475569" }}>
                Edit drafts, preview changes, and publish updates to the live
                site.
              </p>
            </div>

            {msg && (
              <div
                className="mb-6 rounded-lg px-4 py-3 shadow-sm"
                style={{
                  border: isDark ? "1px solid #374151" : "1px solid #e2e8f0",
                  backgroundColor: isDark ? "#111827" : "#ffffff",
                  color: isDark ? "#e5e7eb" : "#334155",
                }}
              >
                {msg}
              </div>
            )}

            <div
              className="rounded-2xl p-6 shadow-sm"
              style={{
                border: isDark ? "1px solid #374151" : "1px solid #e2e8f0",
                backgroundColor: isDark ? "#0f172a" : "#ffffff",
              }}
            >
              <section className="pb-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2
                    className="text-lg font-semibold"
                    style={{ color: isDark ? "#ffffff" : "#0f172a" }}
                  >
                    About Us (Draft)
                  </h2>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
                      color: isDark ? "#e5e7eb" : "#334155",
                    }}
                  >
                    home_about
                  </span>
                </div>

                <div className="grid gap-4">
                  <label className="block">
                    <div
                      className="mb-1 text-sm font-medium"
                      style={{ color: isDark ? "#e5e7eb" : "#334155" }}
                    >
                      Title
                    </div>
                    <input
                      className="w-full rounded-lg px-3 py-2 outline-none transition"
                      style={{
                        border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
                        backgroundColor: isDark ? "#1e293b" : "#ffffff",
                        color: isDark ? "#ffffff" : "#0f172a",
                      }}
                      value={aboutDraft.title ?? ""}
                      onChange={(e) =>
                        setAboutDraft({ ...aboutDraft, title: e.target.value })
                      }
                      placeholder="About Us"
                    />
                  </label>

                  <label className="block">
                    <div
                      className="mb-1 text-sm font-medium"
                      style={{ color: isDark ? "#e5e7eb" : "#334155" }}
                    >
                      Body
                    </div>
                    <textarea
                      className="w-full min-h-[140px] rounded-lg px-3 py-2 outline-none transition"
                      style={{
                        border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
                        backgroundColor: isDark ? "#1e293b" : "#ffffff",
                        color: isDark ? "#ffffff" : "#0f172a",
                      }}
                      value={aboutDraft.body ?? ""}
                      onChange={(e) =>
                        setAboutDraft({ ...aboutDraft, body: e.target.value })
                      }
                      placeholder="Write your About Us text..."
                    />
                  </label>
                </div>
              </section>

              <div
                className="my-6 border-t"
                style={{ borderColor: isDark ? "#334155" : "#e2e8f0" }}
              />

              <section className="pb-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Chatbot Visibility (Draft)
                  </h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    chatbot_settings
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        Website Chatbot
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        Enable or disable the chatbot on the live website.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setChatbotDraft((prev) => ({
                          ...prev,
                          enabled: !prev.enabled,
                        }))
                      }
                      className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
                        chatbotDraft.enabled
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-slate-700 hover:bg-slate-800"
                      }`}
                    >
                      {chatbotDraft.enabled ? "Enabled" : "Disabled"}
                    </button>
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    Current draft state:{" "}
                    <span className="font-semibold">
                      {chatbotDraft.enabled ? "Show chatbot" : "Hide chatbot"}
                    </span>
                  </p>
                </div>
              </section>

              <div className="my-6 border-t border-slate-200" />

              <section className="pb-2">
                <div className="mb-4 flex items-center justify-between">
                  <h2
                    className="text-lg font-semibold"
                    style={{ color: isDark ? "#ffffff" : "#0f172a" }}
                  >
                    Footer (Draft)
                  </h2>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
                      color: isDark ? "#e5e7eb" : "#334155",
                    }}
                  >
                    footer
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <div
                      className="mb-1 text-sm font-medium"
                      style={{ color: isDark ? "#e5e7eb" : "#334155" }}
                    >
                      Phone
                    </div>
                    <input
                      className="w-full rounded-lg px-3 py-2 outline-none transition"
                      style={{
                        border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
                        backgroundColor: isDark ? "#1e293b" : "#ffffff",
                        color: isDark ? "#ffffff" : "#0f172a",
                      }}
                      value={footerDraft.phone ?? ""}
                      onChange={(e) =>
                        setFooterDraft({
                          ...footerDraft,
                          phone: e.target.value,
                        })
                      }
                      placeholder="(555) 555-5555"
                    />
                  </label>

                  <label className="block">
                    <div
                      className="mb-1 text-sm font-medium"
                      style={{ color: isDark ? "#e5e7eb" : "#334155" }}
                    >
                      Email
                    </div>
                    <input
                      className="w-full rounded-lg px-3 py-2 outline-none transition"
                      style={{
                        border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
                        backgroundColor: isDark ? "#1e293b" : "#ffffff",
                        color: isDark ? "#ffffff" : "#0f172a",
                      }}
                      value={footerDraft.email ?? ""}
                      onChange={(e) =>
                        setFooterDraft({
                          ...footerDraft,
                          email: e.target.value,
                        })
                      }
                      placeholder="example@email.com"
                    />
                  </label>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className="text-sm font-medium"
                      style={{ color: isDark ? "#e5e7eb" : "#334155" }}
                    >
                      Business Hours
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setHoursRows([
                          { day: "Mon - Sat", open: "7 AM", close: "9 PM" },
                        ])
                      }
                      className="text-xs font-semibold underline underline-offset-4"
                      style={{ color: isDark ? "#e5e7eb" : "#334155" }}
                    >
                      Quick fill: Mon - Sat 7 AM - 9 PM
                    </button>
                  </div>

                  <div className="space-y-3">
                    {hoursRows.map((row, idx) => (
                      <div key={idx} className="grid gap-3 items-end md:grid-cols-4">
                        <label className="block">
                          <div
                            className="mb-1 text-xs font-medium"
                            style={{ color: isDark ? "#9ca3af" : "#475569" }}
                          >
                            Day(s)
                          </div>
                          <input
                            className="w-full rounded-lg px-3 py-2 outline-none transition"
                            style={{
                              border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
                              backgroundColor: isDark ? "#1e293b" : "#ffffff",
                              color: isDark ? "#ffffff" : "#0f172a",
                            }}
                            value={row.day ?? ""}
                            onChange={(e) =>
                              updateHourRow(idx, "day", e.target.value)
                            }
                            placeholder="Mon - Sat"
                          />
                        </label>

                        <label className="block">
                          <div
                            className="mb-1 text-xs font-medium"
                            style={{ color: isDark ? "#9ca3af" : "#475569" }}
                          >
                            Open
                          </div>
                          <input
                            className="w-full rounded-lg px-3 py-2 outline-none transition"
                            style={{
                              border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
                              backgroundColor: isDark ? "#1e293b" : "#ffffff",
                              color: isDark ? "#ffffff" : "#0f172a",
                            }}
                            value={row.open ?? ""}
                            onChange={(e) =>
                              updateHourRow(idx, "open", e.target.value)
                            }
                            placeholder="7 AM"
                          />
                        </label>

                        <label className="block">
                          <div
                            className="mb-1 text-xs font-medium"
                            style={{ color: isDark ? "#9ca3af" : "#475569" }}
                          >
                            Close
                          </div>
                          <input
                            className="w-full rounded-lg px-3 py-2 outline-none transition"
                            style={{
                              border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
                              backgroundColor: isDark ? "#1e293b" : "#ffffff",
                              color: isDark ? "#ffffff" : "#0f172a",
                            }}
                            value={row.close ?? ""}
                            onChange={(e) =>
                              updateHourRow(idx, "close", e.target.value)
                            }
                            placeholder="9 PM"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => removeHourRow(idx)}
                          disabled={hoursRows.length === 1}
                          className="rounded-lg px-3 py-2 text-sm font-semibold shadow-sm transition disabled:opacity-50"
                          style={{
                            border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
                            backgroundColor: isDark ? "#1e293b" : "#ffffff",
                            color: isDark ? "#ffffff" : "#0f172a",
                          }}
                          title={
                            hoursRows.length === 1 ? "Keep at least one row" : "Remove"
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addHourRow}
                    className="mt-3 rounded-lg px-3 py-2 text-sm font-semibold transition"
                    style={{
                      backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
                      color: isDark ? "#ffffff" : "#0f172a",
                    }}
                  >
                    + Add another day range
                  </button>
                </div>
              </section>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  onClick={saveDraft}
                  disabled={saving}
                  className="rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition disabled:opacity-50"
                  style={{
                    backgroundColor: isDark ? "#ffffff" : "#0f172a",
                    color: isDark ? "#000000" : "#ffffff",
                  }}
                >
                  Save Draft
                </button>

                <a
                  href="/?preview=1"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition"
                  style={{
                    border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
                    backgroundColor: isDark ? "#1e293b" : "#ffffff",
                    color: isDark ? "#ffffff" : "#0f172a",
                  }}
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

                {saving && (
                  <span
                    className="text-sm"
                    style={{ color: isDark ? "#9ca3af" : "#64748b" }}
                  >
                    Working…
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}