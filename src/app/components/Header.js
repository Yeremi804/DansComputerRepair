"use client";

import { useEffect, useState } from "react"; // Import useState to manage admin status and checking state
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createSupabaseBrowserClient } from "@/lib/supabase/client"; // Import the function to create a Supabase client for browser use

export default function Header() {
  const router = useRouter();
  
  const [open, setOpen] = useState(false);

  const handleNavigation = (path) => {
    setOpen(false);
    router.push(path);
  };

  const MotionButton = motion.button;

  // State to track if the user is an admin and if we're still checking
  const [isAdmin, setIsAdmin] = useState(false); // Default to false until we check
  const [checking, setChecking] = useState(true); // Track if we're still checking the admin status
  const [userPresent, setUserPresent] = useState(false); // Track if *any* user is logged in

  // Small interaction animations
  const hover = { scale: 1.05 };
  const tap = { scale: 0.95 };

  const links = [
    { label: "Home", path: "/" },
    { label: "Products", path: "/products" },
    {
      label: "Computer Building",
      path: "/create-computer-configuration-form",
    },
    { label: "Service Request", path: "/service-request" },
    { label: "FAQ", path: "/faq" },
  ];

  // Check admin status on mount and on auth state changes
  useEffect(() => {
    // Create a Supabase client for browser use
    const supabase = createSupabaseBrowserClient();

    // Function to check if the user is logged in and/or an admin
    async function loadAdminStatus() {
      // Set checking to true while we verify admin status
      setChecking(true);

      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();

      // If no user is logged in, clear all auth-related state
      if (!user) {
        setUserPresent(false);
        setIsAdmin(false);
        setChecking(false);
        return;
      }

      // A user *is* logged in
      setUserPresent(true);

      // Fetch the user's profile to check their role
      const { data: profile } = await supabase
        .from("profiles") // Access the profiles table
        .select("role")   // Select only the role column
        .eq("id", user.id) // Filter by the current user's ID
        .single(); // Expect a single result since user IDs are unique

      // Set admin status based on the role
      setIsAdmin(profile?.role === "admin");
      setChecking(false); // Done checking
    }

    // Initial check on mount
    loadAdminStatus();

    // Listen for auth state changes to update admin status in real-time
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadAdminStatus();
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

  // Handle logout for logged-in users
  async function handleLogout() {
    // Create a Supabase client for browser use
    const supabase = createSupabaseBrowserClient();

    // Sign out client-side
    await supabase.auth.signOut();

    // Call the logout API route to clear any server-side session/cookies
    await fetch("/api/logout", { method: "POST" });

    // Clear auth state and redirect to admin login
    setUserPresent(false);
    setIsAdmin(false);
    router.replace("/admin-log-in"); // Prevent back-navigation into admin pages
    router.refresh(); // Ensure all cached state is cleared
  }

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
              <li>
                <MotionButton
                  type="button"
                  onClick={handleLogout}
                  whileHover={hover}
                  whileTap={tap}
                  className="rounded px-3 py-1 bg-red-50 text-red-700 hover:bg-red-100"
                >
                  Logout
                </MotionButton>
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
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        handleLogout();
                      }}
                      className="w-full rounded px-3 py-2 text-left bg-red-50 text-red-700 hover:bg-red-100"
                    >
                      Logout
                    </button>
                  </li>
                )}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
