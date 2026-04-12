import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { defaultCaptchaStyle } from "@/lib/captchaStyle";

const filePath = path.join(process.cwd(), "src/lib/captchaStyle.json");

export async function GET() {
  let style;
  try {
    const data = fs.readFileSync(filePath, "utf8");
    style = JSON.parse(data);
  } catch (err) {
    console.error("Error reading captcha style file:", err);
    style = defaultCaptchaStyle;
  }

  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz23456789";
  let captchaText = "";
  for (let i = 0; i < style.captchaLength; i++) {
    captchaText += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  const svg = `
    <svg width="${style.width}" height="${style.height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${style.background}" />
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
            font-family="${style.fontFamily}" font-size="${style.fontSize}"
            fill="${style.textColor}" letter-spacing="${style.letterSpacing}">
        ${captchaText}
      </text>
      <line x1="0" y1="10" x2="${style.width}" y2="${style.height - 10}"
            stroke="${style.lineColor}" stroke-width="${style.lineWidth}" opacity="${style.lineOpacity}" />
      <line x1="0" y1="${style.height - 10}" x2="${style.width}" y2="10"
            stroke="${style.lineColor}" stroke-width="${style.lineWidth}" opacity="${style.lineOpacity}" />
    </svg>
  `.trim();

  const response = NextResponse.json({ svg });
  response.cookies.set("captcha_answer", captchaText, {
    httpOnly: true,
    path: "/",
    sameSite: "strict",
  });
  return response;
}