'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import AuthCard from '@/components/auth/AuthCard';

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, setError, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    if (data.password !== data.confirmPassword) {
      setError('confirmPassword', { message: 'Passwords do not match' });
      return;
    }
    setLoading(true);
    try {
      const { confirmPassword, ...payload } = data;
      await registerUser(payload);
      toast.success('Account created!');
      router.push('/');
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors?.length) {
        apiErrors.forEach(({ field, message }) => setError(field, { type: 'server', message }));
      } else {
        toast.error(err.response?.data?.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Create Account" subtitle="Join us and start booking">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Full Name</label>
          <input className="input" placeholder="John Doe" {...register('name', { required: 'Name is required' })} />
          {errors.name && <p className="error-message">{errors.name.message}</p>}
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" className="input" placeholder="you@example.com" {...register('email', { required: 'Email is required' })} />
          {errors.email && <p className="error-message">{errors.email.message}</p>}
        </div>
        <div>
          <label className="label">Phone (optional)</label>
          <input className="input" placeholder="+919999999999" {...register('phone')} />
          <p className="text-xs text-gray-400 mt-1">Format: +919876543210 (no spaces)</p>
          {errors.phone && <p className="error-message">{errors.phone.message}</p>}
        </div>
        <div>
          <label className="label">Password</label>
          <input type="password" className="input" placeholder="••••••••" {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Minimum 8 characters' } })} />
          {errors.password && <p className="error-message">{errors.password.message}</p>}
        </div>
        <div>
          <label className="label">Confirm Password</label>
          <input type="password" className="input" placeholder="••••••••" {...register('confirmPassword', { required: 'Please confirm your password' })} />
          {errors.confirmPassword && <p className="error-message">{errors.confirmPassword.message}</p>}
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-5">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-primary-600 hover:underline font-medium">Sign in</Link>
      </p>
    </AuthCard>
  );
}
