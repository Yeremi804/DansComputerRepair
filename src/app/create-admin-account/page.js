'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signUp } from '@/app/(auth)/actions';

function validatePassword(pw) {
  if (!pw || pw.length < 10) return 'Password must be at least 10 characters.';
  return null;
}

// US phone number validation
// Based on Paul Schreiber's approach (Stack Overflow, 36 upvotes):
//   Step 1 — FORMAT: strict regex enforcing paired parentheses, no mixed/consecutive separators
//   Step 2 — DIGITS: strip formatting, apply NANP rules (area code & exchange start with 2-9)
//
// Accepted formats: 5552345678 | 555-234-5678 | (555) 234-5678 | (555)234-5678
//                   555.234.5678 | 555 234 5678 | 1-555-234-5678 | +1 555-234-5678
function validatePhone(phone) {
  if (!phone || phone.trim() === '') return 'Phone number is required.';

  const raw = phone.trim();
  const errMsg = 'Please enter a valid US phone number (e.g. (555) 234-5678 or 555-234-5678).';

  // Step 1: FORMAT — parentheses must be paired; separators must be consistent
  // Bare 10 digits OR optional +1/1 prefix followed by (NXX) or NXX then sep NXX sep XXXX
  const formatRegex = /^(\+?1[\s\-\.]?)?((\(\d{3}\)[\s\-\.]?|\d{3}[\s\-\.])\d{3}[\s\-\.]\d{4})$|^(\+?1[\s\-\.]?)?\d{10}$/;
  if (!formatRegex.test(raw)) {
    return errMsg;
  }

  // Step 2: DIGITS — strip all non-digit chars, remove leading country code 1 if 11 digits
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);

  if (digits.length !== 10) return errMsg;

  // NANP rule: area code and exchange must start with 2-9
  // (ref: /^[2-9]\d{2}[2-9]\d{2}\d{4}$/ — Paul Schreiber, Stack Overflow)
  if (!/^[2-9]\d{2}[2-9]\d{2}\d{4}$/.test(digits)) {
    return errMsg;
  }

  return null;
}

// Shared input style
const baseInputStyle = {
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
};

const errorInputStyle = {
  ...baseInputStyle,
  border: '1px solid #ef4444',
};

function InputField({ label, name, type = 'text', placeholder, required, error, onBlurValidate, isDark, ...rest }) {
  const [touched, setTouched] = useState(false);

  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#475569' }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        style={
          error && touched
            ? {
                ...errorInputStyle,
                color: isDark ? '#e2e8f0' : '#1e293b',
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
              }
            : {
                ...baseInputStyle,
                border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                color: isDark ? '#e2e8f0' : '#1e293b',
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
              }
        }
        onFocus={(e) => {
          e.target.style.borderColor = error && touched ? '#ef4444' : '#3b82f6';
          e.target.style.boxShadow = error && touched
            ? '0 0 0 3px rgba(239, 68, 68, 0.15)'
            : '0 0 0 3px rgba(59, 130, 246, 0.15)';
        }}
        onBlur={(e) => {
          setTouched(true);
          if (onBlurValidate) onBlurValidate(e.target.value);
          e.target.style.borderColor = error && touched ? '#ef4444' : (isDark ? '#475569' : '#cbd5e1');
          e.target.style.boxShadow = 'none';
        }}
        aria-invalid={!!(error && touched)}
        aria-describedby={error && touched ? `${name}-error` : undefined}
        {...rest}
      />
      {error && touched && (
        <p id={`${name}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export default function CreateAdminAccountPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const [serverSuccess, setServerSuccess] = useState('');
  const [errors, setErrors] = useState({});
  const [isPending, startTransition] = useTransition();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const syncTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    syncTheme();

    const observer = new MutationObserver(() => {
      syncTheme();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"]
    });

    return () => observer.disconnect();
  }, []);

  function setFieldError(field, msg) {
    setErrors((prev) => ({ ...prev, [field]: msg || '' }));
  }

  function onSubmit(e) {
    e.preventDefault();
    setServerError('');
    setServerSuccess('');

    const form = e.currentTarget;
    const formData = new FormData(form);

    const firstName = formData.get('firstName')?.trim();
    const lastName = formData.get('lastName')?.trim();
    const email = formData.get('email')?.trim();
    const phone = formData.get('phone')?.trim();
    const password = formData.get('password')?.trim();
    const confirmPassword = formData.get('confirmPassword')?.trim();

    // Validate all fields
    const newErrors = {};
    if (!firstName) newErrors.firstName = 'First name is required.';
    if (!lastName) newErrors.lastName = 'Last name is required.';
    if (!email) newErrors.email = 'Email address is required.';
    newErrors.phone = validatePhone(phone) || '';
    newErrors.password = validatePassword(password) || '';
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    // Force all fields as touched by setting errors
    setErrors(newErrors);

    const hasErrors = Object.values(newErrors).some((v) => v !== '');
    if (hasErrors) return;

    startTransition(async () => {
      const res = await signUp(formData);
      if (!res?.ok) {
        // Log detailed dev message to console, show user-friendly message in UI
        if (res?.devMessage) {
          console.error('[SignUp Error]', res.devMessage);
        }
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
        setErrors({});
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
            className="mb-4 rounded-md border px-4 py-3 text-sm motion-safe:animate-fadeIn"
            style={{
              borderColor: isDark ? '#15803d' : '#86efac',
              backgroundColor: isDark ? '#052e16' : '#f0fdf4',
              color: isDark ? '#bbf7d0' : '#166534',
            }}
          >
            {serverSuccess}
          </div>
        )}

        {/* Error Banner */}
        {serverError && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-4 rounded-md border px-4 py-3 text-sm motion-safe:animate-shake"
            style={{
              borderColor: isDark ? '#b91c1c' : '#fca5a5',
              backgroundColor: isDark ? '#450a0a' : '#fef2f2',
              color: isDark ? '#fecaca' : '#991b1b',
            }}
          >
            {serverError}
          </div>
        )}

        {/* Form card */}
        <div
          className="rounded-lg"
          style={{
            border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
            backgroundColor: isDark ? '#111827' : '#ffffff',
            boxShadow: '0 4px 6px -1px rgba(11, 63, 115, 0.12), 0 2px 4px -1px rgba(11, 63, 115, 0.08)',
          }}
        >
          <form className="p-6 md:p-8" onSubmit={onSubmit} noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* First name */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#475569' }}>
                  First name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  placeholder="First name"
                  required
                  style={
                    errors.firstName
                      ? {
                          ...errorInputStyle,
                          color: isDark ? '#e2e8f0' : '#1e293b',
                          backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        }
                      : {
                          ...baseInputStyle,
                          border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                          color: isDark ? '#e2e8f0' : '#1e293b',
                          backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        }
                  }
                  onFocus={(e) => {
                    e.target.style.borderColor = errors.firstName ? '#ef4444' : '#3b82f6';
                    e.target.style.boxShadow = errors.firstName
                      ? '0 0 0 3px rgba(239, 68, 68, 0.15)'
                      : '0 0 0 3px rgba(59, 130, 246, 0.15)';
                  }}
                  onBlur={(e) => {
                    setFieldError('firstName', e.target.value.trim() ? '' : 'First name is required.');
                    e.target.style.borderColor = isDark ? '#475569' : '#cbd5e1';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                )}
              </div>

              {/* Last name */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#475569' }}>
                  Last name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  placeholder="Last name"
                  required
                  style={
                    errors.lastName
                      ? {
                          ...errorInputStyle,
                          color: isDark ? '#e2e8f0' : '#1e293b',
                          backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        }
                      : {
                          ...baseInputStyle,
                          border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                          color: isDark ? '#e2e8f0' : '#1e293b',
                          backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        }
                  }
                  onFocus={(e) => {
                    e.target.style.borderColor = errors.lastName ? '#ef4444' : '#3b82f6';
                    e.target.style.boxShadow = errors.lastName
                      ? '0 0 0 3px rgba(239, 68, 68, 0.15)'
                      : '0 0 0 3px rgba(59, 130, 246, 0.15)';
                  }}
                  onBlur={(e) => {
                    setFieldError('lastName', e.target.value.trim() ? '' : 'Last name is required.');
                    e.target.style.borderColor = isDark ? '#475569' : '#cbd5e1';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                )}
              </div>

              {/* Email address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#475569' }}>
                  Email address <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="Email address"
                  required
                  style={
                    errors.email
                      ? {
                          ...errorInputStyle,
                          color: isDark ? '#e2e8f0' : '#1e293b',
                          backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        }
                      : {
                          ...baseInputStyle,
                          border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                          color: isDark ? '#e2e8f0' : '#1e293b',
                          backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        }
                  }
                  onFocus={(e) => {
                    e.target.style.borderColor = errors.email ? '#ef4444' : '#3b82f6';
                    e.target.style.boxShadow = errors.email
                      ? '0 0 0 3px rgba(239, 68, 68, 0.15)'
                      : '0 0 0 3px rgba(59, 130, 246, 0.15)';
                  }}
                  onBlur={(e) => {
                    setFieldError('email', e.target.value.trim() ? '' : 'Email address is required.');
                    e.target.style.borderColor = isDark ? '#475569' : '#cbd5e1';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Phone number */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#475569' }}>
                  Phone number <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="e.g. 555-123-4567"
                  required
                  style={
                    errors.phone
                      ? {
                          ...errorInputStyle,
                          color: isDark ? '#e2e8f0' : '#1e293b',
                          backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        }
                      : {
                          ...baseInputStyle,
                          border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                          color: isDark ? '#e2e8f0' : '#1e293b',
                          backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        }
                  }
                  onFocus={(e) => {
                    e.target.style.borderColor = errors.phone ? '#ef4444' : '#3b82f6';
                    e.target.style.boxShadow = errors.phone
                      ? '0 0 0 3px rgba(239, 68, 68, 0.15)'
                      : '0 0 0 3px rgba(59, 130, 246, 0.15)';
                  }}
                  onBlur={(e) => {
                    setFieldError('phone', validatePhone(e.target.value) || '');
                    e.target.style.borderColor = isDark ? '#475569' : '#cbd5e1';
                    e.target.style.boxShadow = 'none';
                  }}
                  aria-invalid={!!errors.phone}
                  aria-describedby={errors.phone ? 'phone-error' : undefined}
                />
                {errors.phone && (
                  <p id="phone-error" className="mt-1 text-sm text-red-600">{errors.phone}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#475569' }}>
                  Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  placeholder="Minimum 10 characters"
                  required
                  style={
                    errors.password
                      ? {
                          ...errorInputStyle,
                          color: isDark ? '#e2e8f0' : '#1e293b',
                          backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        }
                      : {
                          ...baseInputStyle,
                          border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                          color: isDark ? '#e2e8f0' : '#1e293b',
                          backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        }
                  }
                  onFocus={(e) => {
                    e.target.style.borderColor = errors.password ? '#ef4444' : '#3b82f6';
                    e.target.style.boxShadow = errors.password
                      ? '0 0 0 3px rgba(239, 68, 68, 0.15)'
                      : '0 0 0 3px rgba(59, 130, 246, 0.15)';
                  }}
                  onBlur={(e) => {
                    setFieldError('password', validatePassword(e.target.value) || '');
                    e.target.style.borderColor = isDark ? '#475569' : '#cbd5e1';
                    e.target.style.boxShadow = 'none';
                  }}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                {errors.password && (
                  <p id="password-error" className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#475569' }}>
                  Confirm password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Minimum 10 characters"
                  required
                  style={
                    errors.confirmPassword
                      ? {
                          ...errorInputStyle,
                          color: isDark ? '#e2e8f0' : '#1e293b',
                          backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        }
                      : {
                          ...baseInputStyle,
                          border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                          color: isDark ? '#e2e8f0' : '#1e293b',
                          backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        }
                  }
                  onFocus={(e) => {
                    e.target.style.borderColor = errors.confirmPassword ? '#ef4444' : '#3b82f6';
                    e.target.style.boxShadow = errors.confirmPassword
                      ? '0 0 0 3px rgba(239, 68, 68, 0.15)'
                      : '0 0 0 3px rgba(59, 130, 246, 0.15)';
                  }}
                  onBlur={(e) => {
                    setFieldError('confirmPassword', e.target.value.trim() ? '' : 'Please confirm your password.');
                    e.target.style.borderColor = isDark ? '#475569' : '#cbd5e1';
                    e.target.style.boxShadow = 'none';
                  }}
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                />
                {errors.confirmPassword && (
                  <p id="confirm-password-error" className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
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
            style={{ borderTop: isDark ? '1px solid #334155' : '1px solid #e2e8f0' }}
          >
            <div className="flex justify-center items-center gap-2">
              <span className="text-sm" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Or</span>
              <a
                href="/admin-log-in"
                style={{
                  backgroundColor: isDark ? '#334155' : '#475569',
                  color: '#ffffff',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  textDecoration: 'none',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => { e.target.style.backgroundColor = '#334155'; }}
                onMouseLeave={(e) => { e.target.style.backgroundColor = isDark ? '#334155' : '#475569'; }}
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