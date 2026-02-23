// NextResponse is used to create a response that can set cookies
// which is needed for clearing the auth cookies on logout
import { NextResponse } from "next/server";
// createSupabaseServerClient is a helper function that creates a Supabase client instance
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() { // POST is used to trigger the logout action here
  const supabase = await createSupabaseServerClient();
// Created to update the table to have the last sign out time, which can be used for security purposes, and also for analytics purposes.
  const {data : { user}, error: userError} = await supabase.auth.getUser(); // get the current user, if there is no user, it means the user is already logged out, so we can just return a success response
  if (user) {
    const { error: updateError } = 
    await supabase
      .from("profiles")
      .update({ Last_Sign_Out: new Date().toISOString() })
      .eq("id", user.id)
      .select();

    if (updateError) {
      console.error("Error updating last sign out time:", updateError);
      // We can choose to return an error response here, but since the main goal is to log out the user, we can just log the error and continue with the logout process.
    } else {
      console.log("Last sign out time updated successfully for user:", user.id);}
  } else {
    console.log("No user found, user is already logged out.");
  }

  await supabase.auth.signOut(); // clears SSR cookies via cookie hooks
  return NextResponse.json({ ok: true });
}