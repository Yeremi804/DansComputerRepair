// src/app/components/footer.js
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";

const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false,
});

export function Footer() {
  const [footerContent, setFooterContent] = useState(null); // { hours: [{ day, open, close }], phone, email }

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
    <footer className="bg-white text-gray-800 border-t mt-12">
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
            />
          </a>
        </div>

        {/* About Us (static for now) */}
        <div>
          <h3 className="font-semibold mb-3">About Us</h3>
          <ul className="space-y-1 text-sm">
            <li>Computer diagnostics</li>
            <li>Laptop &amp; desktop repair</li>
            <li>Virus and malware removal</li>
            <li>Data recovery</li>
            <li>Custom PC builds</li>
            <li>System upgrades</li>
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
            <li>Request a repair</li>
            <li>Track your service</li>
            <li>Warranty information</li>
            <li>Troubleshooting tips</li>
            <li>Contact technician</li>
          </ul>
        </div>
      </div>

      {/* Map */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="mt-4 h-72 md:h-96 w-full rounded overflow-hidden border">
          <MapComponent />
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t text-center text-xs text-gray-500 py-4 mt-6">
        © {new Date().getFullYear()} Dan&apos;s Computer Repair — All rights reserved.
      </div>
    </footer>
  );
}