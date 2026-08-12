'use client';

import { Suspense } from 'react';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Link from 'next/link';
import AuthCard from '@/components/auth/AuthCard';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();

  useEffect(() => {
    if (!token) {
      toast.error('Invalid or missing reset token');
      router.replace('/auth/forgot-password');
    }
  }, [token, router]);

  const onSubmit = async ({ password }) => {
    try {
      await authApi.resetPassword({ token, newPassword: password });
      toast.success('Password reset! Please sign in.');
      router.push('/auth/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed. Link may have expired.');
    }
  };

  return (
    <AuthCard title="Reset Password" subtitle="Enter your new password below" maxWidth="max-w-sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">New Password</label>
          <input
            type="password"
            className="input"
            placeholder="Min 8 characters"
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 8, message: 'At least 8 characters' },
            })}
          />
          {errors.password && <p className="error-message">{errors.password.message}</p>}
        </div>
        <div>
          <label className="label">Confirm Password</label>
          <input
            type="password"
            className="input"
            placeholder="Repeat password"
            {...register('confirm', {
              required: 'Please confirm your password',
              validate: (val) => val === watch('password') || 'Passwords do not match',
            })}
          />
          {errors.confirm && <p className="error-message">{errors.confirm.message}</p>}
        </div>
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? 'Resetting…' : 'Reset Password'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-5">
        <Link href="/auth/login" className="text-primary-600 hover:underline">Back to Sign In</Link>
      </p>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[75vh] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-primary-600" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
