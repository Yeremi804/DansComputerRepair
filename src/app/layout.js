// src/app/layout.js
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Header from "./components/Header.js";
import { Footer } from "./components/footer.js";
import Chatbot from "./components/chatbot.js";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Dan's Computer Repair",
  description: "Tech services provided to you by Dan",
  icons: {
    icon: "/favicon.ico",   
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen bg-white text-black`}
      >
        {/* Header displayed on every page */}
        <Header />

        {/* Chatbot component available on every page */}
        <Chatbot />

        {/* Main content */}
        <main className="flex-grow">{children}</main>

        {/* Footer displayed on every page */}
        <Footer />

        {/* Vercel Speed Insights */}
        <SpeedInsights />
      </body>
    </html>
  );
}
