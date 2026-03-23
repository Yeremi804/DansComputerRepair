'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

// Service role client bypasses RLS — used only for server-side admin operations
// (same pattern as /app/api/config/route.js)
function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Returns a user-friendly message for the UI and a detailed message for the dev console
function normalizeAuthError(error) {
  if (!error) return { userMessage: 'Sign up failed. Please try again.', devMessage: null };

  const msg = String(error.message || error).toLowerCase();
  const devMessage = error?.message || String(error);

  if (
    msg.includes('already registered') ||
    msg.includes('duplicate') ||
    msg.includes('already exists') ||
    msg.includes('user already registered') ||
    msg.includes('email address is already taken')
  ) {
    return {
      userMessage: 'An account with this email already exists.',
      devMessage,
    };
  }
  if (msg.includes('password')) {
    return {
      userMessage: 'Your password does not meet the requirements.',
      devMessage,
    };
  }
  if (msg.includes('invalid email') || msg.includes('email')) {
    return {
      userMessage: 'Please enter a valid email address.',
      devMessage,
    };
  }
  return {
    userMessage: 'Sign up failed. Please try again.',
    devMessage,
  };
}

export async function signUp(formData) {
  const supabase = await createSupabaseServerClient();

  const firstName = formData.get('firstName')?.trim();
  const lastName = formData.get('lastName')?.trim();
  const email = formData.get('email')?.trim();
  const phone = formData.get('phone')?.trim();
  const password = formData.get('password')?.trim();
  const confirmPassword = formData.get('confirmPassword')?.trim();

  // All fields are required
  if (!firstName) return { ok: false, error: 'First name is required.' };
  if (!lastName)  return { ok: false, error: 'Last name is required.' };
  if (!email)     return { ok: false, error: 'Email address is required.' };
  if (!password)  return { ok: false, error: 'Password is required.' };
  if (!confirmPassword) return { ok: false, error: 'Please confirm your password.' };
  if (password !== confirmPassword) return { ok: false, error: 'Passwords do not match.' };
  if (password.length < 10) return { ok: false, error: 'Password must be at least 10 characters.' };

  // Server-side phone validation (mirrors frontend — Paul Schreiber approach)
  if (!phone) return { ok: false, error: 'Phone number is required.' };
  const phoneErrMsg = 'Please enter a valid US phone number (e.g. (555) 234-5678 or 555-234-5678).';
  const phoneFormatRegex = /^(\+?1[\s\-\.]?)?((\(\d{3}\)[\s\-\.]?|\d{3}[\s\-\.])\d{3}[\s\-\.]\d{4})$|^(\+?1[\s\-\.]?)?\d{10}$/;
  if (!phoneFormatRegex.test(phone)) return { ok: false, error: phoneErrMsg };
  let phoneDigits = phone.replace(/\D/g, '');
  if (phoneDigits.length === 11 && phoneDigits.startsWith('1')) phoneDigits = phoneDigits.slice(1);
  if (phoneDigits.length !== 10 || !/^[2-9]\d{2}[2-9]\d{2}\d{4}$/.test(phoneDigits)) {
    return { ok: false, error: phoneErrMsg };
  }

  try {
    // Store phone in user_metadata so it is reliably saved regardless of email confirmation flow.
    // Passing `phone` directly to signUp() triggers Supabase SMS OTP verification and does NOT
    // populate the phone column without that flow. user_metadata is the correct approach here.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          firstName,
          lastName,
          phone,   // stored in raw_user_meta_data → accessible via user.user_metadata.phone
          role: 'admin',
        },
        emailRedirectTo:
          process.env.NEXT_PUBLIC_SITE_URL
            ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
            : 'http://localhost:3000/auth/callback',
      },
    });

    // Hard error from Supabase (network, config, etc.)
    if (error) {
      const { userMessage, devMessage } = normalizeAuthError(error);
      console.error('[SignUp] Supabase error:', devMessage);
      return { ok: false, error: userMessage, devMessage };
    }

    // Detect "silent duplicate" — Supabase returns no error but also no new user identity
    // when email confirmation is ON and the email is already registered.
    // Symptoms: data.user exists but data.user.identities is an empty array.
    if (!data?.user) {
      const msg = 'Sign up failed: no user was created. Please try again.';
      console.error('[SignUp] No user returned from Supabase. Full response:', JSON.stringify(data));
      return { ok: false, error: msg, devMessage: msg };
    }

    if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      // This is the canonical Supabase signal for "email already registered"
      const devMsg = `[SignUp] Duplicate email detected (identities=[]) for: ${email}`;
      console.error(devMsg);
      return {
        ok: false,
        error: 'An account with this email already exists.',
        devMessage: devMsg,
      };
    }

    // Save phone to the profiles table row for this user.
    // Uses service role client to bypass RLS — the newly created user has no session yet
    // (email confirmation ON) so the anon/user-scoped client would be rejected by RLS.
    // This is the same pattern used in /app/api/config/route.js for server-side inserts.
    const adminClient = createServiceRoleClient();
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({ id: data.user.id, phone }, { onConflict: 'id' });

    if (profileError) {
      // Non-blocking: sign-up itself succeeded; log the phone save failure for debugging
      console.error(
        '[SignUp] Failed to save phone to profiles table:',
        profileError.message,
        '| Details:',
        JSON.stringify(profileError)
      );
    } else {
      console.log('[SignUp] Phone saved to profiles table for user:', data.user.id);
    }

    const needsConfirmation = !data.session;
    return {
      ok: true,
      needsConfirmation,
      message: needsConfirmation
        ? 'Account created! Check your email to confirm your address.'
        : 'Account created and you are signed in.',
    };
  } catch (err) {
    // Unexpected errors — log full stack trace to console, show generic message to user
    console.error('[SignUp] Unexpected error:', err);
    return {
      ok: false,
      error: 'An unexpected error occurred. Please try again.',
      devMessage: err?.stack || String(err),
    };
  }
}
