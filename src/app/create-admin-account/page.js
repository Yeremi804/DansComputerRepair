'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signUp } from '@/app/(auth)/actions';

function validatePassword(pw) {
  if (!pw || pw.length < 10) return 'Password must be at least 10 characters.';
  return null;
}

export default function CreateAdminAccountPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const [serverSuccess, setServerSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isPending, startTransition] = useTransition();

  function onSubmit(e) {
    e.preventDefault();
    setServerError('');
    setServerSuccess('');

    const form = e.currentTarget;
    const formData = new FormData(form);

    const pwErr = validatePassword(formData.get('password'));
    setPasswordError(pwErr || '');
    if (pwErr) return;

    startTransition(async () => {
      const res = await signUp(formData);
      if (!res?.ok) {
        setServerError('');
        requestAnimationFrame(() => {
          setServerError(res?.error || 'Something went wrong.');
        });
        return;
      }

      setServerSuccess('');
      requestAnimationFrame(() => {
        setServerSuccess(res.message || 'Account created.');
      });

      if (!res.needsConfirmation) {
        setTimeout(() => router.push('/init-mfa'), 700);
      } else {
        form.reset();
      }
    });
  }

  return (
    <main
      className="min-h-screen transition-colors duration-300"
      style={{ backgroundColor: 'var(--current-bg)' }}
    >
      <section className="mx-auto max-w-3xl p-6">
        <h1
          className="text-3xl font-semibold mb-6"
          style={{ color: 'var(--current-text)' }}
        >
          Create Admin account
        </h1>

        {/* Success Banner */}
        {serverSuccess && (
          <div
            role="status"
            aria-live="polite"
            className="mb-4 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800 motion-safe:animate-fadeIn"
          >
            {serverSuccess}
          </div>
        )}

        {/* Error Banner */}
        {serverError && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 motion-safe:animate-shake"
          >
            {serverError}
          </div>
        )}

        {/* Form card: modern shadow, white background (matches service-request / config form) */}
        <div
          className="rounded-lg bg-white"
          style={{
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(11, 63, 115, 0.12), 0 2px 4px -1px rgba(11, 63, 115, 0.08)',
          }}
        >
          <form className="p-6 md:p-8" onSubmit={onSubmit} noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* First name */}
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: '#475569' }}
                >
                  First name
                </label>
                <input
                  type="text"
                  name="firstName"
                  placeholder="First name"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#1e293b',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#cbd5e1';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Last name */}
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: '#475569' }}
                >
                  Last name
                </label>
                <input
                  type="text"
                  name="lastName"
                  placeholder="Last name"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#1e293b',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#cbd5e1';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Email address */}
              <div className="md:col-span-2">
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: '#475569' }}
                >
                  Email address
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="Email address"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#1e293b',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#cbd5e1';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Phone number */}
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: '#475569' }}
                >
                  Phone number
                </label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone number"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#1e293b',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#cbd5e1';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Password */}
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: '#475569' }}
                >
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  placeholder="Minimum 10 characters"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${passwordError ? '#ef4444' : '#cbd5e1'}`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#1e293b',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = passwordError ? '#ef4444' : '#3b82f6';
                    e.target.style.boxShadow = passwordError
                      ? '0 0 0 3px rgba(239, 68, 68, 0.15)'
                      : '0 0 0 3px rgba(59, 130, 246, 0.15)';
                  }}
                  onBlur={(e) => {
                    setPasswordError(validatePassword(e.target.value) || '');
                    e.target.style.borderColor = passwordError ? '#ef4444' : '#cbd5e1';
                    e.target.style.boxShadow = 'none';
                  }}
                  aria-invalid={!!passwordError}
                  aria-describedby={passwordError ? 'password-error' : undefined}
                />
                {passwordError && (
                  <p id="password-error" className="mt-1 text-sm text-red-600">
                    {passwordError}
                  </p>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: '#475569' }}
                >
                  Confirm password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Minimum 10 characters"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#1e293b',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#cbd5e1';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

            </div>

            {/* Sign up button */}
            <div className="mt-8">
              <button
                type="submit"
                disabled={isPending}
                style={{
                  width: '100%',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '6px',
                  fontSize: '0.9375rem',
                  fontWeight: '600',
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  opacity: isPending ? 0.6 : 1,
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => { if (!isPending) e.target.style.backgroundColor = '#15803d'; }}
                onMouseLeave={(e) => { if (!isPending) e.target.style.backgroundColor = '#16a34a'; }}
              >
                {isPending ? 'Creating account…' : 'Sign up'}
              </button>
            </div>
          </form>

          {/* Divider + Sign in */}
          <div
            className="p-6 md:p-8"
            style={{ borderTop: '1px solid #e2e8f0' }}
          >
            <div className="flex justify-center items-center gap-2">
              <span className="text-sm" style={{ color: '#64748b' }}>Or</span>
              <a
                href="/admin-log-in"
                style={{
                  backgroundColor: '#475569',
                  color: '#ffffff',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  textDecoration: 'none',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => { e.target.style.backgroundColor = '#334155'; }}
                onMouseLeave={(e) => { e.target.style.backgroundColor = '#475569'; }}
              >
                Sign in
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
