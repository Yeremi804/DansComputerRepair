"use client";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export default function Header() {
  const router = useRouter();
  
  const [open, setOpen] = useState(false);

  const handleNavigation = (path) => {
    setOpen(false);
    router.push(path);
  };

  const MotionButton = motion.button;

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
  ];

  return (
    <header className="w-full border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:py-4">
        {/* Brand */}
        <div
          className="flex items-center gap-3 min-w-0 cursor-pointer"
          onClick={() => handleNavigation("/")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleNavigation("/");
          }}
        >
          <img
            src="/Danlogo.jpg"
            alt="Dan's Computer Repair Logo"
            width="64"
            height="64"
            className="h-12 w-12 md:h-16 md:w-16 rounded-md object-contain flex-shrink-0"
          />
          <div className="leading-tight">
            <h1 className="font-semibold tracking-tight text-gray-900 text-base sm:text-lg md:text-xl truncate">
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
                  className="rounded px-2 py-1 text-gray-700 hover:text-gray-900 hover:underline hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
                >
                  {l.label}
                </MotionButton>
              </li>
            ))}
          </ul>
        </nav>

        {/* Mobile Hamburger Button*/}
        <div className="md:hidden flex items-center flex-shrink-0">
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="rounded px-3 py-2 text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile dropdown for navigation to different pages*/}
      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t border-gray-200 bg-white"
          >
            <div className="mx-auto max-w-6xl px-4 py-3">
              <ul className="flex flex-col gap-2">
                {links.map((l) => (
                  <li key={l.path}>
                    <button
                      type="button"
                      onClick={() => handleNavigation(l.path)}
                      className="w-full rounded px-3 py-2 text-left text-gray-700 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
                    >
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
