// src/app/auth/callback/page.js
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // JS version: no type annotation here
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('Verifying your email… please wait.');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const syncTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    syncTheme();

    const observer = new MutationObserver(() => {
      syncTheme();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const run = async () => {
      const code = searchParams.get('code');

      if (!code) {
        setStatus('error');
        setMessage('Missing verification code. Please use the link from your email.');
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        setStatus('error');
        setMessage('This verification link is invalid or has expired. Please try again.');
        return;
      }

      setStatus('success');
      setMessage('Email verified! Redirecting to your dashboard…');
      setTimeout(() => router.replace('/dashboard'), 800);
    };

    run();
  }, [router, searchParams]);

  return (
    <div
      className="min-h-screen grid place-items-center"
      style={{
        backgroundColor: isDark ? '#030712' : '#ffffff',
        color: isDark ? '#ffffff' : '#000000',
      }}
    >
      <div
        className="w-[92%] max-w-md rounded-md px-6 py-5"
        style={{
          border: `1px solid ${isDark ? '#374151' : '#d4d4d8'}`,
          backgroundColor: isDark ? '#111827' : '#ffffff',
        }}
      >
        <div className="flex items-center gap-3">
          {status === 'loading' && (
            <div
              className="w-5 h-5 rounded-full border-2 animate-spin"
              style={{
                borderColor: isDark ? '#4b5563' : '#d4d4d8',
                borderTopColor: isDark ? '#f3f4f6' : '#404040',
              }}
            />
          )}
          {status === 'success' && <div className="w-5 h-5 rounded-full bg-green-600" />}
          {status === 'error' && <div className="w-5 h-5 rounded-full bg-red-600" />}
          <h1
            className="text-lg font-semibold"
            style={{ color: isDark ? '#ffffff' : '#000000' }}
          >
            {status === 'loading' ? 'Verifying…' : status === 'success' ? 'Verified' : 'Verification issue'}
          </h1>
        </div>

        <p
          className="mt-3 text-sm"
          style={{
            color:
              status === 'error'
                ? '#b91c1c'
                : status === 'success'
                  ? '#15803d'
                  : isDark
                    ? '#d1d5db'
                    : '#404040',
          }}
        >
          {message}
        </p>

        {status === 'error' && (
          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <a
              href="/admin-log-in"
              className="inline-flex justify-center rounded-md px-4 py-2"
              style={{
                backgroundColor: isDark ? '#ffffff' : '#171717',
                color: isDark ? '#000000' : '#ffffff',
              }}
            >
              Go to Sign in
            </a>
            <a
              href="/create-admin-account"
              className="inline-flex justify-center rounded-md px-4 py-2"
              style={{
                border: `1px solid ${isDark ? '#374151' : '#d4d4d8'}`,
                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                color: isDark ? '#ffffff' : '#000000',
              }}
            >
              Create account
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
