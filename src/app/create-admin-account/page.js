'use client';

import { useState, useTransition } from 'react';
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

// Shared input style — kept for onFocus/onBlur dynamic border manipulation
const baseInputStyle = {};
const errorInputStyle = {};

function InputField({ label, name, type = 'text', placeholder, required, error, onBlurValidate, ...rest }) {
  const [touched, setTouched] = useState(false);

  return (
    <div>
      <label className="form-label">
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        className={`form-input${error && touched ? ' input-error' : ''}`}
        onBlur={(e) => {
          setTouched(true);
          if (onBlurValidate) onBlurValidate(e.target.value);
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

        {/* Form card */}
        <div
          style={{
            border: '1px solid var(--form-card-border)',
            borderRadius: 'var(--form-card-radius)',
            backgroundColor: 'var(--form-card-bg)',
            boxShadow: 'var(--form-card-shadow)',
          }}
        >
          <form className="p-6 md:p-8" onSubmit={onSubmit} noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* First name */}
              <div>
                <label className="form-label">
                  First name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  placeholder="First name"
                  required
                  className={`form-input${errors.firstName ? ' input-error' : ''}`}
                  onBlur={(e) => setFieldError('firstName', e.target.value.trim() ? '' : 'First name is required.')}
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                )}
              </div>

              {/* Last name */}
              <div>
                <label className="form-label">
                  Last name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  placeholder="Last name"
                  required
                  className={`form-input${errors.lastName ? ' input-error' : ''}`}
                  onBlur={(e) => setFieldError('lastName', e.target.value.trim() ? '' : 'Last name is required.')}
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                )}
              </div>

              {/* Email address */}
              <div className="md:col-span-2">
                <label className="form-label">
                  Email address <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="Email address"
                  required
                  className={`form-input${errors.email ? ' input-error' : ''}`}
                  onBlur={(e) => setFieldError('email', e.target.value.trim() ? '' : 'Email address is required.')}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Phone number */}
              <div>
                <label className="form-label">
                  Phone number <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="e.g. 555-123-4567"
                  required
                  className={`form-input${errors.phone ? ' input-error' : ''}`}
                  onBlur={(e) => setFieldError('phone', validatePhone(e.target.value) || '')}
                  aria-invalid={!!errors.phone}
                  aria-describedby={errors.phone ? 'phone-error' : undefined}
                />
                {errors.phone && (
                  <p id="phone-error" className="mt-1 text-sm text-red-600">{errors.phone}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="form-label">
                  Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  placeholder="Minimum 10 characters"
                  required
                  className={`form-input${errors.password ? ' input-error' : ''}`}
                  onBlur={(e) => setFieldError('password', validatePassword(e.target.value) || '')}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                {errors.password && (
                  <p id="password-error" className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="form-label">
                  Confirm password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Minimum 10 characters"
                  required
                  className={`form-input${errors.confirmPassword ? ' input-error' : ''}`}
                  onBlur={(e) => setFieldError('confirmPassword', e.target.value.trim() ? '' : 'Please confirm your password.')}
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                />
                {errors.confirmPassword && (
                  <p id="confirm-password-error" className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>

            </div>

            {/* Sign up button */}
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
              <button
                type="submit"
                disabled={isPending}
                className={`btn-primary btn-wide${isPending ? ' opacity-60 cursor-not-allowed' : ''}`}
              >
                {isPending ? 'Creating account…' : 'Sign up'}
              </button>
            </div>
          </form>

          {/* Divider + Sign in */}
          <div className="p-6 md:p-8 border-t border-neutral-200">
            <div className="flex justify-center items-center gap-2">
              <span className="text-sm text-neutral-500">Or</span>
              <a
                href="/admin-log-in"
                className="btn-outline"
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
