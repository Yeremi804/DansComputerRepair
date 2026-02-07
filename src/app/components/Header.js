"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function Header() {
  const router = useRouter();
  const handleNavigation = (path) => router.push(path);
  const MotionButton = motion.button;

  // State to track if the user is an admin and if we're still checking
  const [isAdmin, setIsAdmin] = useState(false); // Default to false until we check
  const [checking, setChecking] = useState(true); // Track if we're still checking the admin status

  // Small interaction animations
  const hover = { scale: 1.05 };
  const tap = { scale: 0.95 };

  // Check admin status on mount and on auth state changes
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    // Function to check if the user is an admin
    async function loadAdminStatus() {
      setChecking(true);

      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        setChecking(false);
        return;
      }

      // Fetch the user's profile to check their role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

        // Set admin status based on the role
      setIsAdmin(profile?.role === "admin");
      setChecking(false);
    } 

    // Initial check on mount
    loadAdminStatus();

    // Listen for auth state changes to update admin status in real-time
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadAdminStatus();

    });
    // Clean up the subscription on unmount
    return () => sub.subscription.unsubscribe();
  }, []);

  // Handle logout for admin users
  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    await fetch("/api/logout", { method: "POST" });

    // Clear admin status and redirect to login page
    setIsAdmin(false);
    router.replace("/admin-log-in");
    router.refresh();
  }

  return (
    <header className="w-full border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:py-4">
        {/* Brand */}
        <div className="flex items-center gap-3"
          onClick={() => handleNavigation("/")}
        >
          <img
            src="/Danlogo.jpg"
            alt="Dan's Computer Repair Logo"
            width="64"
            height="64"
            className="h-16 w-16 rounded-md object-contain"
          />
          <div className="leading-tight">
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">
              Dan&apos;s Computer Repair
            </h1>
            <p className="text-sm text-gray-600">
              IT Services and Computer Repair
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="hidden md:block">
          <ul className="flex items-center gap-4">
            <li>
              <MotionButton
                type="button"
                onClick={() => handleNavigation("/")}
                whileHover={hover}
                whileTap={tap}
                className="rounded px-2 py-1 text-gray-700 hover:text-gray-900 hover:underline hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
              >
                Home
              </MotionButton>
            </li>

            <li>
              <MotionButton
                type="button"
                onClick={() => handleNavigation("/products")}
                whileHover={hover}
                whileTap={tap}
                className="rounded px-2 py-1 text-gray-700 hover:text-gray-900 hover:underline hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
              >
                Products
              </MotionButton>
            </li>

            {/* Computer Building */}
            <li>
              <MotionButton
                type="button"
                onClick={() =>
                  handleNavigation("/create-computer-configuration-form")
                }
                whileHover={hover}
                whileTap={tap}
                className="rounded px-2 py-1 text-gray-700 hover:text-gray-900 hover:underline hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
              >
                Computer Building
              </MotionButton>
            </li>

            {/* Service Request */}
            <li>
              <MotionButton
                type="button"
                onClick={() => handleNavigation("/service-request")}
                whileHover={hover}
                whileTap={tap}
                className="rounded px-2 py-1 text-gray-700 hover:text-gray-900 hover:underline hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
              >
                Service Request
              </MotionButton>
            </li>

            {/* Admin only Logout*/}
            {!checking && isAdmin && (
              <li>
                <MotionButton
                  type="button"
                  onClick={handleLogout}
                  whileHover={hover}
                  whileTap={tap}
                  className="rounded px-2 py-1 text-gray-700 hover:text-gray-900 hover:underline hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
                >
                  Logout
                </MotionButton>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}
