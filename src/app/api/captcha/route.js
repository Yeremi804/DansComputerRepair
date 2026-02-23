import { NextResponse } from "next/server";

export async function GET() {
  // 1. Generate a random 4-character string from the range of uppercase letters, lowercase letters, and digits (excluding easily confused characters)
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz23456789';
  let captchaText = '';
  //this enable to generate a random strring of 4 characters from the character strings
  for (let i = 0; i < 4; i++) {
    captchaText += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  
  // This avoids any 'ENOENT' errors because there are no files to open! Learn the hard way 
  const svg = `
    <svg width="150" height="50" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f0f0f0"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
            font-family="Arial, sans-serif" font-size="30" fill="#333" 
            letter-spacing="5">
        ${captchaText}
      </text>
      <line x1="0" y1="10" x2="150" y2="40" stroke="gray" stroke-width="2" opacity="0.5"/>
      <line x1="0" y1="40" x2="150" y2="10" stroke="gray" stroke-width="2" opacity="0.5"/>
    </svg>
  `.trim();

  const response = NextResponse.json({ svg });


  //Store the captcha answer in a cookie for verification later. The cookie is set to HttpOnly to prevent client-side access, and SameSite is set to Strict for security.
  response.cookies.set("captcha_answer", captchaText, {
    httpOnly: true,
    path: "/",
    sameSite: "strict",
  });

  return response;
}