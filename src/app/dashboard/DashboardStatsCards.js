"use client";

import { useEffect, useState } from "react";

export default function DashboardStatsCards({ totalOrder, ongoingOrders, completedOrders }) {
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

  return (
    <section className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
      <div
        className="p-4 flex flex-col items-center justify-center rounded-xl shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
        style={{
          backgroundColor: isDark ? "#1f2937" : "#ffffff",
          border: isDark ? "1px solid #374151" : "1px solid #e2e8f0",
          color: isDark ? "#ffffff" : "#0f172a",
        }}
      >
        <h3>Total Orders</h3>
        <p className="text-2xl my-2">{totalOrder}</p>
      </div>

      <div
        className="p-4 flex flex-col items-center justify-center rounded-xl shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
        style={{
          backgroundColor: isDark ? "#1f2937" : "#ffffff",
          border: isDark ? "1px solid #374151" : "1px solid #e2e8f0",
          color: isDark ? "#ffffff" : "#0f172a",
        }}
      >
        <h3>Ongoing</h3>
        <p className="text-2xl my-2">{ongoingOrders}</p>
        <p style={{ color: isDark ? "#d1d5db" : "#475569" }}>Open support tickets</p>
      </div>

      <div
        className="p-4 flex flex-col items-center justify-center rounded-xl shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
        style={{
          backgroundColor: isDark ? "#1f2937" : "#ffffff",
          border: isDark ? "1px solid #374151" : "1px solid #e2e8f0",
          color: isDark ? "#ffffff" : "#0f172a",
        }}
      >
        <h3>Completed</h3>
        <p className="text-2xl my-2">{completedOrders}</p>
        <p style={{ color: isDark ? "#d1d5db" : "#475569" }}>job(s)</p>
      </div>
    </section>
  );
}