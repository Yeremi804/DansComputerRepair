"use client";

import { useEffect,useRef,useState } from "react"; // Import useState to manage admin status and checking state
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createSupabaseBrowserClient } from "@/lib/supabase/client"; // Import the function to create a Supabase client for browser use
import { ChevronDown, LayoutDashboard, LogOut, Settings } from "lucide-react";

export default function Header() {
  const router = useRouter();
  
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [currentUserName, setCurrentUserName] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  const handleNavigation = (path) => {
    setOpen(false);
    router.push(path);
  };

  const MotionButton = motion.button;

  const [checking, setChecking] = useState(true);
  const [userPresent, setUserPresent] = useState(false);
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

  // Check auth status on mount and on auth state changes
  useEffect(() => {
    // Create a Supabase client for browser use
    const supabase = createSupabaseBrowserClient();

    async function loadAuthState() {
      setChecking(true);

      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();

      // If no user is logged in, clear all auth-related state
      if (!user) {
        setUserPresent(false);
        setCurrentUserName("");
        setCurrentUserEmail("");
        setProfileOpen(false);
        setChecking(false);
        return;
      }

      // A user *is* logged in
      setUserPresent(true);
      setCurrentUserName(getDisplayName(user));
      setCurrentUserEmail(String(user.email || ""));
      setChecking(false);
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
  }, []);

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

    // Create a Supabase client for browser use
    const supabase = createSupabaseBrowserClient();

    // Sign out client-side
    await supabase.auth.signOut();


    // Clear auth state and redirect to admin login
    setUserPresent(false);
    setCurrentUserName("");
    setCurrentUserEmail("");
    setProfileOpen(false);
    router.replace("/admin-log-in"); // Prevent back-navigation into admin pages
    router.refresh(); // Ensure all cached state is cleared
  }

  const handleProfileNavigation = (path) => {
    setProfileOpen(false);
    handleNavigation(path);
  };

  return (
    <header className="w-full border-b border-gray-200 bg-white">
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
            <h1 className="font-semibold tracking-tight text-gray-900">
              Dan&apos;s Computer Repair
            </h1>
            <p className="text-sm text-gray-600">
              IT Services and Computer Repair
            </p>
          </div>
        </div>

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
                  className="rounded px-2 py-1 text-gray-700 hover:text-gray-900 hover:underline hover:bg-red-100"
                >
                  {l.label}
                </MotionButton>
              </li>
            ))}

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
        <div className="md:hidden flex items-center">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded px-3 py-2 text-gray-700 hover:bg-gray-100"
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
            className="md:hidden overflow-hidden border-t border-gray-200 bg-white"
          >
            <div className="mx-auto max-w-6xl px-4 py-3">
              <ul className="flex flex-col gap-2">
                {links.map((l) => (
                  <li key={l.path}>
                    <button
                      type="button"
                      onClick={() => handleNavigation(l.path)}
                      className="w-full rounded px-3 py-2 text-left text-gray-700 hover:bg-red-100"
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
    </header>
  );
}