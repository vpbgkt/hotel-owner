'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';
import AuthCard from '@/components/auth/AuthCard';
import { Eye, EyeOff, XCircle } from 'lucide-react';

function CompleteRegistrationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { completeRegistration } = useAuth();

  const [status, setStatus] = useState('checking'); // 'checking' | 'valid' | 'invalid'
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register, handleSubmit, watch, setError, formState: { errors } } = useForm();

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }
    authApi.verifyRegistrationToken(token)
      .then((res) => {
        setEmail(res.data.data?.email || '');
        setStatus('valid');
      })
      .catch(() => setStatus('invalid'));
  }, [token]);

  const onSubmit = async (data) => {
    if (data.password !== data.confirmPassword) {
      setError('confirmPassword', { message: 'Passwords do not match' });
      return;
    }
    setLoading(true);
    try {
      await completeRegistration({
        token,
        name: data.name,
        phone: data.phone || undefined,
        password: data.password,
      });
      toast.success('Account created!');
      router.push('/');
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors?.length) {
        apiErrors.forEach(({ field, message }) => setError(field, { type: 'server', message }));
      } else {
        toast.error(err.response?.data?.message || 'Could not complete registration');
      }
    } finally {
      setLoading(false);
    }
  };

  if (status === 'checking') {
    return (
      <AuthCard title="Verifying…" subtitle="">
        <div className="flex justify-center py-6">
          <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-primary-600" />
        </div>
      </AuthCard>
    );
  }

  if (status === 'invalid') {
    return (
      <AuthCard title="Link expired or invalid" subtitle="">
        <div className="flex flex-col items-center text-center py-2">
          <XCircle className="w-10 h-10 text-red-600 mb-3" />
          <p className="text-gray-700">This verification link is invalid or has expired.</p>
          <Link href="/auth/register" className="btn-primary w-full mt-6 text-center">
            Start over
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Complete Your Account" subtitle={email ? `Verified: ${email}` : 'Set your details'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Full Name</label>
          <input className="input" placeholder="John Doe" {...register('name', { required: 'Name is required' })} />
          {errors.name && <p className="error-message">{errors.name.message}</p>}
        </div>
        <div>
          <label className="label">Phone (optional)</label>
          <input className="input" placeholder="+919999999999" {...register('phone')} />
          <p className="text-xs text-gray-400 mt-1">Format: +919876543210 (no spaces)</p>
          {errors.phone && <p className="error-message">{errors.phone.message}</p>}
        </div>
        <div>
          <label className="label">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              className="input pr-10"
              placeholder="••••••••"
              {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Minimum 8 characters' } })}
            />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="error-message">{errors.password.message}</p>}
        </div>
        <div>
          <label className="label">Confirm Password</label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              className="input pr-10"
              placeholder="••••••••"
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (val) => val === watch('password') || 'Passwords do not match',
              })}
            />
            <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1} aria-label={showConfirm ? 'Hide password' : 'Show password'}>
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="error-message">{errors.confirmPassword.message}</p>}
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>
    </AuthCard>
  );
}

export default function CompleteRegistrationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[75vh] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-primary-600" />
      </div>
    }>
      <CompleteRegistrationForm />
    </Suspense>
  );
}
