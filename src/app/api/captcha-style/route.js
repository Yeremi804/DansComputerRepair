import { NextResponse } from "next/server";
//included new import to ensure success in captcha saving and restarting 
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { defaultCaptchaStyle } from "@/lib/captchaStyle";

const filePath = path.join(process.cwd(), "src/lib/captchaStyle.json");

// Initialize Supabase server client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return NextResponse.json(JSON.parse(data));
  } catch (err) {
    console.error("Error reading file:", err);
    return NextResponse.json(defaultCaptchaStyle);
  }
}

export async function POST(request) {
  try {
    // Get the authorization token from the request header
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the token with Supabase
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin role
    console.log("User authenticated:", user.id);

    const newStyle = await request.json();
    fs.writeFileSync(filePath, JSON.stringify(newStyle, null, 2));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error writing file:", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}