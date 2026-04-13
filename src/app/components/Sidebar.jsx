"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Settings,
  MessageSquareText,
  UserStar,
  Clock,
  FileText,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import "./Sidebar.css";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const items = [
    { label: "Dashboard", href: "/dashboard", Icon: LayoutDashboard },
    { label: "Parts", href: "/admin-parts", Icon: Package },
    { label: "Contacts", href: "/dashboard/customer-messages", Icon: MessageSquareText },
    { label: "Review", href: "/dashboard/admin-reviews", Icon: UserStar },
    { label: "Audit Log", href: "/dashboard/audit", Icon: ClipboardList },
    { label: "Home Content", href: "/dashboard/home-content", Icon: FileText },
    { label: "Settings", href: "/settings", Icon: Settings },
    { label: "Metrics", href: "/dashboard/metric", Icon: Clock },
  ];

  const sidebarInner = (
    <>
      <div
        className="adminSidebarHeader"
        style={{
          borderBottom: isDark ? "1px solid #374151" : "1px solid #e2e8f0",
          backgroundColor: isDark ? "#111827" : "#ffffff",
        }}
      >
        <h2
          className="adminSidebarHeaderTitle"
          style={{ color: isDark ? "#f9fafb" : "#0f172a" }}
        >
          Dashboard
        </h2>

        <button
          type="button"
          className="adminSidebarClose"
          onClick={() => setMobileOpen(false)}
          aria-label="Close sidebar"
        >
          <X size={20} />
        </button>
      </div>

      <ul className="adminSidebarNav">
        {items.map(({ label, href, Icon }) => {
          const active = pathname === href;
          return (
            <li
              key={label}
              className={`${"adminSidebarItem"} ${
                active ? "adminSidebarItemActive" : ""
              }`}
              onClick={() => router.push(href)}
              style={{
                backgroundColor: active
                  ? (isDark ? "#1f2937" : "#e2e8f0")
                  : "transparent",
                color: active
                  ? (isDark ? "#ffffff" : "#0f172a")
                  : (isDark ? "#d1d5db" : "#334155"),
                border: active
                  ? (isDark ? "1px solid #4b5563" : "1px solid #cbd5e1")
                  : "1px solid transparent",
              }}
            >
              <Icon size={20} />
              <span>{label}</span>
            </li>
          );
        })}
      </ul>
    </>
  );

  return (
    <>
      <button
        type="button"
        className="adminSidebarToggle"
        onClick={() => setMobileOpen(true)}
        aria-label="Open sidebar"
        style={{
          backgroundColor: isDark ? "#111827" : "#ffffff",
          border: isDark ? "1px solid #374151" : "1px solid #cbd5e1",
          color: isDark ? "#f9fafb" : "#0f172a",
        }}
      >
        <Menu size={20} />
      </button>

      <aside
        className="adminSidebar adminSidebarDesktop"
        style={{
          backgroundColor: isDark ? "#111827" : "#ffffff",
          borderRight: isDark ? "1px solid #374151" : "1px solid #e2e8f0",
          color: isDark ? "#f9fafb" : "#0f172a",
        }}
      >
        {sidebarInner}
      </aside>

      <div
        className={`adminSidebarOverlay ${mobileOpen ? "adminSidebarOverlayOpen" : ""}`}
        onClick={() => setMobileOpen(false)}
      >
        <aside
          className="adminSidebar adminSidebarMobile"
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: isDark ? "#111827" : "#ffffff",
            borderRight: isDark ? "1px solid #374151" : "1px solid #e2e8f0",
            color: isDark ? "#f9fafb" : "#0f172a",
          }}
        >
          {sidebarInner}
        </aside>
      </div>
    </>
  );
}