// NextResponse is used to create a response that can set cookies
// which is needed for clearing the auth cookies on logout
import { NextResponse } from "next/server";
// createSupabaseServerClient is a helper function that creates a Supabase client instance
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() { // POST is used to trigger the logout action here
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut(); // clears SSR cookies via cookie hooks
  return NextResponse.json({ ok: true });
}