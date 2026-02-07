"use client";

import { useEffect, useState } from "react"; // Import useState to manage admin status and checking state
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createSupabaseBrowserClient } from "@/lib/supabase/client"; // Import the function to create a Supabase client for browser use

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
  useEffect(() => { // Create a Supabase client for browser use
    const supabase = createSupabaseBrowserClient();

    // Function to check if the user is an admin
    async function loadAdminStatus() { // Set checking to true while we verify admin status
      setChecking(true);

      // Get the current user
      const { data: { user } } = await supabase.auth.getUser(); // If no user is logged in, set admin status to false and stop checking
      if (!user) {
        setIsAdmin(false);
        setChecking(false);
        return;
      }

      // Fetch the user's profile to check their role
      const { data: profile } = await supabase
        .from("profiles") // Access the profiles table to get the user's role
        .select("role")   // Select only the role column
        .eq("id", user.id) // Filter by the current user's ID
        .single(); // Expect a single result since user IDs are unique

        // Set admin status based on the role
      setIsAdmin(profile?.role === "admin"); // If the role is "admin", set isAdmin to true, otherwise false
      setChecking(false); // Set checking to false after we've determined the admin status
    } 

    // Initial check on mount
    loadAdminStatus();

    // Listen for auth state changes to update admin status in real-time
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadAdminStatus(); // Re-check admin status whenever the authentication state changes (e.g., login/logout)

    });
    // Clean up the subscription on unmount
    return () => sub.subscription.unsubscribe(); // Unsubscribe from auth state changes when the component unmounts to prevent memory leaks
  }, []); // Empty dependency array means this effect runs once on mount and sets up the auth state listener

  // Handle logout for admin users
  async function handleLogout() { // Create a Supabase client for browser use
    const supabase = createSupabaseBrowserClient(); // Sign out the user from Supabase and also call the logout API route to clear any server-side session
    await supabase.auth.signOut(); // Call the logout API route to clear any server-side session or cookies related to admin authentication
    await fetch("/api/logout", { method: "POST" }); // After logging out, clear the admin status and redirect to the login page

    // Clear admin status and redirect to login page
    setIsAdmin(false);
    router.replace("/admin-log-in"); // Use replace to prevent going back to the protected page after logout
    router.refresh(); // Refresh the page to ensure all state is reset and the user sees the login page without any cached admin state
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
