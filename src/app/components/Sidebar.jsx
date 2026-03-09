"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  ClipboardList,
  Settings,
  MessageSquareText,
  UserStar,
  Clock,
  FileText,
} from "lucide-react";

import "./Sidebar.css";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const items = [
    { label: "Dashboard", href: "/dashboard", Icon: LayoutDashboard },
    //{ label: "Orders", href: "/dashboard", Icon: ShoppingBag }, // temp fix; update when you have orders route
    //{ label: "Orders", href: "/dashboard", Icon: ShoppingBag }, // update when you have orders route
    { label: "Parts", href: "/admin-parts", Icon: Package },
    { label: "Contacts", href: "/dashboard/customer-messages", Icon: MessageSquareText },
    { label: "Review", href: "/dashboard/admin-reviews", Icon: UserStar },
    { label: "Audit Log", href: "/dashboard/audit", Icon: ClipboardList },
    { label: "Home Content", href: "/dashboard/home-content", Icon: FileText },
    { label: "Settings", href: "/settings", Icon: Settings },
    { label: "Metrics", href: "/dashboard/metric", Icon: Clock },
  ];

  return (
    <aside className="adminSidebar">
      <div className="adminSidebarHeader">
        <h2 className="adminSidebarHeaderTitle">Dashboard</h2>
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
            >
              <Icon size={20} />
              <span>{label}</span>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}