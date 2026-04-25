'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
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

export default function CreateAdminAccountPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const [serverSuccess, setServerSuccess] = useState('');
  const [errors, setErrors] = useState({});
  const [isPending, startTransition] = useTransition();
  const [isDark, setIsDark] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

    setErrors(newErrors);

    const hasErrors = Object.values(newErrors).some((v) => v !== '');
    if (hasErrors) return;

    startTransition(async () => {
      const res = await signUp(formData);
      if (!res?.ok) {
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

  const labelClass = `block text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-slate-800'}`;
  const inputClass = (hasError) =>
    `w-full border rounded-sm px-3 py-2 ${
      hasError
        ? isDark
          ? 'border-red-500 bg-gray-800 text-white placeholder:text-gray-400'
          : 'border-red-500 bg-white text-slate-900 placeholder:text-slate-400'
        : isDark
          ? 'border-gray-600 bg-gray-800 text-white placeholder:text-gray-400'
          : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400'
    }`;

  return (
    <main className="min-h-screen bg-main-bg text-main-text transition-colors duration-300">
      <section className="mx-auto max-w-3xl p-6">
        <h1 className="text-3xl font-semibold mb-6">Create Admin account</h1>

        {/* Success Banner */}
        {serverSuccess && (
          <div
            role="status"
            aria-live="polite"
            className={`mb-4 rounded-md border px-4 py-3 text-sm motion-safe:animate-fadeIn ${
              isDark
                ? 'border-green-700 bg-green-950 text-green-200'
                : 'border-green-300 bg-green-50 text-green-800'
            }`}
          >
            {serverSuccess}
          </div>
        )}

        {/* Error Banner */}
        {serverError && (
          <div
            role="alert"
            aria-live="assertive"
            className={`mb-4 rounded-md border px-4 py-3 text-sm motion-safe:animate-shake ${
              isDark
                ? 'border-red-700 bg-red-950 text-red-200'
                : 'border-red-300 bg-red-50 text-red-800'
            }`}
          >
            {serverError}
          </div>
        )}

        {/* Card Area */}
        <div className={`border rounded-md ${isDark ? 'border-gray-700 bg-gray-900' : 'border-neutral-300 bg-white'}`}>
          <form onSubmit={onSubmit} className="p-6 md:p-8 space-y-4" noValidate>
            {/* First name */}
            <div>
              <label className={labelClass}>
                First name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="firstName"
                placeholder="Enter first name"
                required
                className={inputClass(errors.firstName)}
                onBlur={(e) =>
                  setFieldError('firstName', e.target.value.trim() ? '' : 'First name is required.')
                }
                aria-invalid={!!errors.firstName}
              />
              {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
            </div>

            {/* Last name */}
            <div>
              <label className={labelClass}>
                Last name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="lastName"
                placeholder="Enter last name"
                required
                className={inputClass(errors.lastName)}
                onBlur={(e) =>
                  setFieldError('lastName', e.target.value.trim() ? '' : 'Last name is required.')
                }
                aria-invalid={!!errors.lastName}
              />
              {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
            </div>

            {/* Email address */}
            <div>
              <label className={labelClass}>
                Email address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                placeholder="Enter email address"
                required
                className={inputClass(errors.email)}
                onBlur={(e) =>
                  setFieldError('email', e.target.value.trim() ? '' : 'Email address is required.')
                }
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            {/* Phone number */}
            <div>
              <label className={labelClass}>
                Phone number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                placeholder="e.g. 555-123-4567"
                required
                className={inputClass(errors.phone)}
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
              <label className={labelClass}>
                Password <span className="text-red-500">*</span>
              </label>
              <div className={`relative ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Minimum 10 characters"
                  required
                  className={`${inputClass(errors.password)} pr-10`}
                  onBlur={(e) => setFieldError('password', validatePassword(e.target.value) || '')}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-2.5 cursor-pointer ${isDark ? 'text-gray-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  {showPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className={labelClass}>
                Confirm password <span className="text-red-500">*</span>
              </label>
              <div className={`relative ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="Minimum 10 characters"
                  required
                  className={`${inputClass(errors.confirmPassword)} pr-10`}
                  onBlur={(e) =>
                    setFieldError(
                      'confirmPassword',
                      e.target.value.trim() ? '' : 'Please confirm your password.'
                    )
                  }
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                />
                <button
                  type="button"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={`absolute right-3 top-2.5 cursor-pointer ${isDark ? 'text-gray-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  {showConfirmPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p id="confirm-password-error" className="mt-1 text-sm text-red-600">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Sign up button */}
            <button
              type="submit"
              disabled={isPending}
              className={`w-full font-medium py-2 rounded-sm mt-2 cursor-pointer transition-colors ${
                isPending
                  ? isDark
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isPending ? 'Creating account…' : 'Sign up'}
            </button>
          </form>

          {/* Divider + Sign in */}
          <div className={`border-t p-6 flex justify-end items-center gap-2 ${isDark ? 'border-gray-700' : 'border-slate-300'}`}>
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Or</span>
            <a
              href="/admin-log-in"
              className={`font-medium px-4 py-2 rounded-sm cursor-pointer no-underline ${isDark ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-slate-600 hover:bg-slate-700 text-white'}`}
            >
              Sign in
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
