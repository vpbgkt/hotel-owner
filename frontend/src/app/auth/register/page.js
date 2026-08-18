'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import AuthCard from '@/components/auth/AuthCard';
import { MailCheck } from 'lucide-react';

export default function RegisterPage() {
  const { requestRegistration } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState(null);

  const { register, handleSubmit, setError, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await requestRegistration(data.email);
      setSentTo(data.email);
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors?.length) {
        apiErrors.forEach(({ field, message }) => setError(field, { type: 'server', message }));
      } else {
        toast.error(err.response?.data?.message || 'Could not send verification email');
      }
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setLoading(true);
    try {
      await requestRegistration(sentTo);
      toast.success('Verification email sent again');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not resend email');
    } finally {
      setLoading(false);
    }
  };

  if (sentTo) {
    return (
      <AuthCard title="Check your email" subtitle="One more step to create your account">
        <div className="flex flex-col items-center text-center py-2">
          <MailCheck className="w-10 h-10 text-primary-600 mb-3" />
          <p className="text-gray-700">
            We sent a verification link to <span className="font-semibold">{sentTo}</span>.
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Open the link to verify your email and finish setting up your account. The link expires in 24 hours.
          </p>
          <button onClick={resend} disabled={loading} className="text-sm text-primary-600 hover:underline mt-5 disabled:opacity-50">
            {loading ? 'Sending…' : 'Resend verification email'}
          </button>
          <button onClick={() => setSentTo(null)} className="text-sm text-gray-500 hover:underline mt-2">
            Use a different email
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-primary-600 hover:underline font-medium">Sign in</Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Create Account" subtitle="Enter your email to get started">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            className="input"
            placeholder="you@example.com"
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
            })}
          />
          {errors.email && <p className="error-message">{errors.email.message}</p>}
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Sending…' : 'Verify Email'}
        </button>
        <p className="text-xs text-gray-400 text-center">
          We&apos;ll email you a link to verify your address, then you can set your name and password.
        </p>
      </form>

      <p className="text-center text-sm text-gray-500 mt-5">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-primary-600 hover:underline font-medium">Sign in</Link>
      </p>
    </AuthCard>
  );
}
