"use client";

import { useEffect, useMemo, useRef, useState } from "react"; // Import useState to manage admin status and checking state
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client"; // Import the function to create a Supabase client for browser use
import { ChevronDown, LayoutDashboard, LogOut, Settings } from "lucide-react";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();

  // Routes to all admin pages
  const ADMIN_ROUTE_PREFIXES = ["/dashboard", "/admin-parts", "/settings"];
  const isAdminPage = ADMIN_ROUTE_PREFIXES.some((prefix) =>
    pathname?.startsWith(prefix)
  );

  // Create Supabase client once
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [currentUserName, setCurrentUserName] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const MotionButton = motion.button;

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Used for notification sound
  const audioRef = useRef(null);

  const handleNavigation = (path) => {
    setOpen(false);
    setNotifOpen(false);
    router.push(path);
  };

  // State to track if the user is an admin and if we're still checking
  const [isAdmin, setIsAdmin] = useState(false); // Default to false until we check
  const [checking, setChecking] = useState(true); // Track if we're still checking the admin status
  const [userPresent, setUserPresent] = useState(false); // Track if *any* user is logged in
  const profileMenuRef = useRef(null);

  // Small interaction animations
  const hover = { scale: 1.05 };
  const tap = { scale: 0.95 };

  const links = [
    { label: "Home", path: "/" },
    {
      label: "Computer Building",
      path: "/create-computer-configuration-form",
    },
    { label: "Service Request", path: "/service-request" },
    { label: "FAQ", path: "/faq" },
  ];

  //creating function to switch the theme between light and dark mode
  const toggleTheme = () => {
    //flipes the dark class on the <html> tag
    document.documentElement.classList.toggle("dark");

    //Optional: Save preference so it doesn't reset on refresh
    const isDark = document.documentElement.classList.contains("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    }
  }, []);

  const getDisplayName = (user) => {
    const meta = user?.user_metadata || {};
    const byParts = [meta.firstName, meta.lastName].filter(Boolean).join(" ").trim();
    const byFullName = String(meta.full_name || meta.name || "").trim();
    const byEmail = String(user?.email || "").split("@")[0];

    return byParts || byFullName || byEmail || "User";
  };

  const initials = String(currentUserName || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  // Close dropdowns on route change
  useEffect(() => {
    setNotifOpen(false);
    setOpen(false);
  }, [pathname]);

  // Check auth status on mount and on auth state changes
  useEffect(() => {
    async function loadAuthState() {
      setChecking(true);

      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();

      // If no user is logged in, clear all auth-related state
      if (!user) {
        setUserPresent(false);
        setIsAdmin(false);
        setCurrentUserName("");
        setCurrentUserEmail("");
        setProfileOpen(false);
        setNotifOpen(false);
        setNotifications([]);
        setUnreadCount(0);
        setChecking(false);
        return;
      }

      // A user *is* logged in
      setUserPresent(true);
      setCurrentUserName(getDisplayName(user));
      setCurrentUserEmail(String(user.email || ""));

      // Fetch the user's profile to check their role
      const { data: profile, error: profileError } = await supabase
        .from("profiles") // Access the profiles table
        .select("role")   // Select only the role column
        .eq("id", user.id) // Filter by the current user's ID
        .single(); // Expect a single result since user IDs are unique

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        setIsAdmin(false);
      } else {
        // Set admin status based on the role
        setIsAdmin(profile?.role === "admin");
      }

      setChecking(false); // Done checking
    }

    loadAuthState();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadAuthState();
    });

    // Clean up the subscription on unmount
    return () => {
      // Supabase SDK shape differs by version, so be defensive
      if (sub?.subscription?.unsubscribe) {
        sub.subscription.unsubscribe();
      } else if (typeof sub?.unsubscribe === "function") {
        sub.unsubscribe();
      }
    };
  }, [supabase]);

  // Notifications (on admin pages only)
  useEffect(() => {
    // If not in the right context, clear and do nothing
    if (!userPresent || !isAdmin || !isAdminPage) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    let channel;

    async function loadNotifications() {
      const { data, error } = await supabase
        .from("notifications")  // loads notifications from the Notifications table on Supabase
        .select("id, created_at, type, title, body, read_at")
        .order("created_at", { ascending: false })
        .limit(15); // limit how many notifications are shown at a time

      if (!error && data) {
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.read_at).length);
      }
    }

    loadNotifications();

    // Listen for new notifications inserted by triggers
    channel = supabase
      .channel("notifications-inserts")
      .on(
        "postgres_changes",
        // When a new form is created, it is inserted into the Notifications table
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const n = payload.new;

          setNotifications((prev) => [n, ...prev].slice(0, 15));
          setUnreadCount((c) => c + 1);

          // Notification sound
          try {
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play();
            }
          } catch {
            // autoplay may fail until user interacts
          }
        }
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase, userPresent, isAdmin, isAdminPage]);

  // Marks the notification as read
  async function markNotificationRead(id) {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("id", id)
      .is("read_at", null);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: now } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
  }

  // Mark all notifications as read
  async function markAllAsRead() {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .is("read_at", null);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.read_at ? n : { ...n, read_at: now }))
      );
      setUnreadCount(0);
    }
  }

  // Close profile dropdown on outside click / Escape.
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  async function handleLogout() {
    
    // Call the logout API route to clear any server-side session/cookies
    await fetch("/api/logout", { method: "POST" });

    // Sign out client-side
    await supabase.auth.signOut();


    // Clear auth state and redirect to admin login
    setUserPresent(false);
    setIsAdmin(false);
    setCurrentUserName("");
    setCurrentUserEmail("");
    setProfileOpen(false);
    setNotifOpen(false);
    setNotifications([]);
    setUnreadCount(0);
    router.replace("/admin-log-in"); // Prevent back-navigation into admin pages
    router.refresh(); // Ensure all cached state is cleared
  }

  const handleProfileNavigation = (path) => {
    setProfileOpen(false);
    handleNavigation(path);
  };

  //Changing the bg-white to custom global and layout color to switch dark mode incase color variable wants to be
  return (
    <header className="w-full border-b border-gray-200 bg-white">
      {/* Notification sound */}
      <audio ref={audioRef} src="/notify.mp3" preload="auto"/>

    <header className="w-full border-b border-gray-200 bg-main-bg text-main-text transition-colors duration-300">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:py-4">
        {/* Brand */}
        <div
          className="flex items-center gap-3 min-w-0 cursor-pointer"
          onClick={() => handleNavigation("/")}
          role="button"
          tabIndex={0}
        >
          <img
            src="/Danlogo.jpg"
            alt="Dan's Computer Repair Logo"
            width="64"
            height="64"
            className="h-12 w-12 md:h-16 md:w-16 rounded-md object-contain flex-shrink-0"
          />
          <div className="leading-tight">
            <h1 className="font-semibold tracking-tight text-main-text">
              Dan&apos;s Computer Repair
            </h1>
            <p className="text-sm text-main-text">
              IT Services and Computer Repair
            </p>
          </div>
        </div>

        <button 
          onClick={toggleTheme}
          className="ml-4 rounded px-3 py-2 text-main-text hover:bg-gray-100 dark:hover:bg-red-400 transition-colors duration-200"
        >
          🌓 Toggle Theme
        </button>

        {/* Desktop Nav */}
        <nav className="hidden md:block">
          <ul className="flex items-center gap-4">
            {links.map((l) => (
              <li key={l.path}>
                <MotionButton
                  type="button"
                  onClick={() => handleNavigation(l.path)}
                  whileHover={hover}
                  whileTap={tap}
                  className="rounded px-2 py-1 text-main-text hover:text-gray-900 hover:underline hover:bg-red-100"
                >
                  {l.label}
                </MotionButton>
              </li>
            ))}

            {/* Notifications (admin pages only) */}
            {!checking && userPresent && isAdmin && isAdminPage && (
              <li className="relative">
                <button
                  // Notifications button
                  type="button"
                  onClick={() => setNotifOpen((v) => !v)}
                  className="relative rounded p-2 text-gray-700 hover:bg-gray-100"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
                  )}
                </button>

                <AnimatePresence>
                  {notifOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="absolute right-0 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg z-50"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                        <div className="font-semibold text-gray-900">
                          Notifications
                        </div>
                        <button
                          // "Mark All as Read" button
                          type="button"
                          onClick={markAllAsRead}
                          className="text-sm rounded px-2 py-1 text-gray-700 hover:bg-gray-100"
                        >
                          Mark All as Read
                        </button>
                      </div>

                      {/* Scrollable Content */}
                      <div className="max-h-80 overflow-auto">
                        {notifications.length === 0 ? (
                          <div className="px-3 py-3 text-sm text-gray-600">
                            No notifications yet.
                          </div>
                        ) : (
                          <>
                            {/* New Notifications (Unread) */}
                            <div className="px-3 pt-3 pb-2 text-xs font-semibold text-gray-500 uppercase">
                              New Notifications
                            </div>

                            {notifications.filter((n) => !n.read_at).length === 0 ? (
                              <div className="px-3 pb-3 text-sm text-gray-600">
                                No new notifications.
                              </div>
                            ) : (
                              notifications
                                .filter((n) => !n.read_at)
                                .map((n) => (
                                  <button
                                    key={n.id}
                                    type="button"
                                    onClick={() => markNotificationRead(n.id)}
                                    className="w-full text-left px-3 py-3 border-b border-gray-50 hover:bg-gray-50"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <div className="text-sm font-medium text-gray-900">
                                          {n.title}
                                        </div>
                                        {n.body && (
                                          <div className="text-sm text-gray-700 mt-0.5">
                                            {n.body}
                                          </div>
                                        )}
                                        <div className="text-xs text-gray-500 mt-1">
                                          {new Date(n.created_at).toLocaleString()}
                                        </div>
                                      </div>
                                      <span className="mt-1 h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
                                    </div>
                                  </button>
                                ))
                            )}

                            {/* Past Notifications (Read) */}
                            <div className="px-3 pt-4 pb-2 text-xs font-semibold text-gray-500 uppercase border-t border-gray-100">
                              Past Notifications
                            </div>

                            {notifications.filter((n) => n.read_at).length === 0 ? (
                              <div className="px-3 pb-3 text-sm text-gray-600">
                                No past notifications.
                              </div>
                            ) : (
                              notifications
                                .filter((n) => n.read_at)
                                .map((n) => (
                                  <div
                                    key={n.id}
                                    className="px-3 py-3 border-b border-gray-50"
                                  >
                                    <div className="text-sm font-medium text-gray-900">
                                      {n.title}
                                    </div>
                                    {n.body && (
                                      <div className="text-sm text-gray-700 mt-0.5">
                                        {n.body}
                                      </div>
                                    )}
                                    <div className="text-xs text-gray-500 mt-1">
                                      {new Date(n.created_at).toLocaleString()}
                                    </div>
                                  </div>
                                ))
                            )}
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            )}

            {/* Logout button for logged-in users */}
            {!checking && userPresent && (
              <li className="relative" ref={profileMenuRef}>
                <MotionButton
                  type="button"
                  onClick={() => setProfileOpen((v) => !v)}
                  whileHover={hover}
                  whileTap={tap}
                  className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-2 py-1 text-slate-800 shadow-sm hover:border-slate-400"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E2E8F0] text-xs font-semibold text-slate-800">
                    {initials || "U"}
                  </span>
                  <span className="max-w-[130px] truncate text-sm font-medium">
                    {currentUserName}
                  </span>
                  <ChevronDown size={16} className="text-slate-600" />
                </MotionButton>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-300 bg-[#f3f4f6] text-slate-800 shadow-2xl"
                    >
                      <div className="bg-[#E2E8F0] px-4 py-4">
                        <p className="text-sm text-slate-700">Signed in as</p>
                        <p className="truncate text-lg font-semibold text-slate-900">{currentUserName}</p>
                      </div>

                      <div className="px-4 pb-4 pt-3">
                        <p className="mb-3 truncate text-sm text-slate-600">{currentUserEmail}</p>

                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => handleProfileNavigation("/dashboard")}
                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-200"
                          >
                            <LayoutDashboard size={16} />
                            Dashboard
                          </button>

                          <button
                            type="button"
                            onClick={() => handleProfileNavigation("/settings")}
                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-200"
                          >
                            <Settings size={16} />
                            Setting
                          </button>

                          <button
                            type="button"
                            onClick={handleLogout}
                            className="flex w-full items-center gap-2 rounded-md bg-red-100 px-3 py-2 text-left text-sm text-red-700 hover:bg-red-200"
                          >
                            <LogOut size={16} />
                            Log out
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            )}
          </ul>
        </nav>

        {/* Mobile Hamburger Button */}
        <div className="md:hidden flex items-center gap-2">
          {/* Mobile notifications bell (admin pages only) */}
          {!checking && userPresent && isAdmin && isAdminPage && (
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              className="relative rounded p-2 text-gray-700 hover:bg-gray-100"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded px-3 py-2 text-main-text hover:bg-gray-100"
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile dropdown for navigation to different pages */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-t border-gray-200 bg-main-bg text-main-text transition-colors duration-300"
          >
            <div className="mx-auto max-w-6xl px-4 py-3">
              <ul className="flex flex-col gap-2">
                {links.map((l) => (
                  <li key={l.path}>
                    <button
                      type="button"
                      onClick={() => handleNavigation(l.path)}
                      className="w-full rounded px-3 py-2 text-left text-main-text hover:bg-red-400"
                    >
                      {l.label}
                    </button>
                  </li>
                ))}

                {!checking && userPresent && (
                  <>
                    <li>
                      <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        Signed in as <span className="font-semibold">{currentUserName}</span>
                      </div>
                    </li>

                    <li>
                      <button
                        type="button"
                        onClick={() => handleNavigation("/dashboard")}
                        className="w-full rounded px-3 py-2 text-left text-gray-700 hover:bg-red-100"
                      >
                        Dashboard
                      </button>
                    </li>

                    <li>
                      <button
                        type="button"
                        onClick={() => handleNavigation("/settings")}
                        className="w-full rounded px-3 py-2 text-left text-gray-700 hover:bg-red-100"
                      >
                        Setting
                      </button>
                    </li>

                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          handleLogout();
                        }}
                        className="w-full rounded px-3 py-2 text-left bg-red-50 text-red-700 hover:bg-red-100"
                      >
                        Log out
                      </button>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile notifications dropdown */}
      <AnimatePresence>
        {notifOpen && !open && !checking && userPresent && isAdmin && isAdminPage && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="md:hidden border-t border-gray-200 bg-white"
          >
            <div className="mx-auto max-w-6xl px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-gray-900">Notifications</div>
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-sm rounded px-2 py-1 text-gray-700 hover:bg-gray-100"
                >
                  Mark All as Read
                </button>
              </div>

              <div className="mt-2 max-h-80 overflow-auto rounded border border-gray-100">
                {notifications.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-gray-600">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        if (!n.read_at) markNotificationRead(n.id);
                      }}
                      className="w-full text-left px-3 py-3 border-b border-gray-50 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{n.title}</div>
                          {n.body && (
                            <div className="text-sm text-gray-700 mt-0.5">{n.body}</div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(n.created_at).toLocaleString()}
                          </div>
                        </div>
                        {!n.read_at && (
                          <span className="mt-1 h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
