// src/app/components/footer.js
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false,
});

export function Footer() {
  const [footerContent, setFooterContent] = useState(null); // { hours: [{ day, open, close }], phone, email }
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
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Fetch footer content from Supabase on mount
  useEffect(() => {
    async function fetchFooter() {
      const preview =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("preview") === "1"; // Check if we're in preview mode

      // If in preview mode, check if user is admin to determine which content to fetch
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      // Check if user is admin
      let isAdmin = false;
      if (session) {
        const { data: adminRow } = await supabase
          .from("admins")
          .select("user_id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        isAdmin = !!adminRow;
      }

      // If preview mode and user is admin, fetch draft content; otherwise, fetch published content
      const column = preview && isAdmin ? "draft" : "published";

      // Fetch the footer content from Supabase
      const { data, error } = await supabase
        .from("site_content")
        .select(`key, ${column}`)
        .eq("key", "footer")
        .maybeSingle();

      if (error) {
        console.error("footer fetch error:", error);
        return;
      }

      setFooterContent(data?.[column] ?? null);
    }

    // Call the fetch function
    fetchFooter();
  }, []);

  return (
    <footer className="bg-main-bg text-main-text border-t dark:border-gray-700">
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[auto_1fr_1fr_1fr] gap-8 items-start">
        {/* Social media icons */}
        <div className="flex flex-row gap-4 items-center justify-center md:justify-start">
          <a
            href="https://www.instagram.com/danscomputerrepairsacramento/"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-opacity hover:opacity-70"
            aria-label="Visit our Instagram page"
          >
            <Image
              src="/insta.svg"
              alt="Instagram"
              width={24}
              height={24}
              className="w-6 h-6"
              style={{ filter: isDark ? "brightness(0) invert(1)" : "none" }}
            />
          </a>

          <a
            href="https://www.yelp.com/biz/dan-s-computer-repair-sacramento-2"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-opacity hover:opacity-70"
            aria-label="Visit our Yelp page"
          >
            <Image
              src="/yelp.svg"
              alt="Yelp"
              width={24}
              height={24}
              className="w-6 h-6"
              style={{ filter: isDark ? "brightness(0) invert(1)" : "none" }}
            />
          </a>
        </div>

        {/* About Us (static for now) */}
        <div>
          <h3 className="font-semibold mb-3">About Us</h3>
          <ul className="space-y-1 text-sm">
            <li>
              <Link href="/service-request" className="hover:underline">
                Computer diagnostics
              </Link>
            </li>
            <li>
              <Link href="/service-request" className="hover:underline">
                Laptop &amp; desktop repair
              </Link>
            </li>
            <li>
              <Link href="/service-request" className="hover:underline">
                Virus and malware removal
              </Link>
            </li>
            <li>
              <Link href="/service-request" className="hover:underline">
                Data recovery
              </Link>
            </li>
            <li>
              <Link href="/create-computer-configuration-form" className="hover:underline">
                Custom PC builds
              </Link>
            </li>
            <li>
              <Link href="/service-request" className="hover:underline">
                System upgrades
              </Link>
            </li>
          </ul>
        </div>

        {/* Location + Contact (dynamic) */}
        <div>
          <h3 className="font-semibold mb-3">Location</h3>
          <p className="text-sm">Sacramento, CA 95842</p>

          {/* Business Hours */}
          <div className="text-sm mt-1 space-y-1">
            {footerContent?.hours?.length ? (
              footerContent.hours.map((h, i) => (
                <p key={i}>
                  {h.day}: {h.open} - {h.close}
                </p>
              ))
            ) : (
              <p>Mon - Sat: 7 AM - 9 PM</p>
            )}
          </div>

          {/* Phone */}
          <p className="text-sm mt-2">
            {footerContent?.phone ?? "(916) 320-6955"}
          </p>

          {/* Email */}
          {footerContent?.email && (
            <p className="text-sm">{footerContent.email}</p>
          )}
        </div>

        {/* Customer Support */}
        <div>
          <h3 className="font-semibold mb-3">Customer Support</h3>
          <ul className="space-y-1 text-sm">
            <li>
              <Link href="/service-request" className="hover:underline">
                Request a repair
              </Link>
            </li>
            <li>
              <Link href="/contact-form" className="hover:underline">
                Contact technician
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Map */}
      <div className="max-w-6xl mx-auto px-6">
        <h3 className="font-semibold mb-3">Our Service Area</h3>
        <div className="h-72 md:h-96 w-full rounded overflow-hidden border dark:border-gray-700">
          <MapComponent isDark={isDark} />
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t dark:border-gray-700 text-center text-xs text-gray-500 dark:text-gray-400 py-4 mt-6">
        © {new Date().getFullYear()} Dan&apos;s Computer Repair — All rights reserved.
      </div>
    </footer>
  );
}