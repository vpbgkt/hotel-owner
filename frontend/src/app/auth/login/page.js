'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import AuthCard from '@/components/auth/AuthCard';
import { KeyRound, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('email'); // 'email' | 'phone'
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, setError, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const userData = await login(data);
      toast.success('Welcome back!');
      if (['HOTEL_ADMIN', 'HOTEL_STAFF'].includes(userData?.role)) {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors?.length) {
        apiErrors.forEach(({ field, message }) => setError(field, { type: 'server', message }));
      } else {
        toast.error(err.response?.data?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Sign In" subtitle="Welcome back to your account">
      {/* Mode Toggle */}
      <div className="flex rounded-full bg-gray-100 p-1 mb-6">
        <button type="button" onClick={() => setMode('email')} className={`flex-1 py-2 text-sm rounded-full font-medium transition-colors ${mode === 'email' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
          Email
        </button>
        <button type="button" onClick={() => setMode('phone')} className={`flex-1 py-2 text-sm rounded-full font-medium transition-colors ${mode === 'phone' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
          Phone / OTP
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {mode === 'email' ? (
          <>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="you@example.com" {...register('email', { required: 'Email is required' })} />
              {errors.email && <p className="error-message">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} className="input pr-10" placeholder="••••••••" {...register('password', { required: 'Password is required' })} />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="error-message">{errors.password.message}</p>}
            </div>
            <div className="text-right">
              <Link href="/auth/forgot-password" className="text-sm text-primary-600 hover:underline">Forgot password?</Link>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="label">Phone Number</label>
              <input className="input" placeholder="+919999999999" {...register('phone', { required: 'Phone is required' })} />
              {errors.phone && <p className="error-message">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="label">Password (if set)</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} className="input pr-10" placeholder="Leave blank to use OTP" {...register('password')} />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500">Or <Link href="/auth/otp" className="text-primary-600 underline">sign in with OTP</Link></p>
          </>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-5">
        Don&apos;t have an account?{' '}
        <Link href="/auth/register" className="text-primary-600 hover:underline font-medium">Create account</Link>
      </p>

      {/* Demo Credentials
      // <div className="mt-6 p-4 bg-primary-50 rounded-xl border border-primary-100 text-sm">
      //   <p className="font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
      //     <KeyRound className="w-3.5 h-3.5 text-primary-600" /> Demo Credentials
      //   </p>
      //   <div className="space-y-1.5 text-gray-700">
      //     <p><span className="font-medium">Admin:</span> admin@grandhorizon.com / Admin@123</p>
      //     <p><span className="font-medium">Guest:</span> guest@example.com / Guest@123</p>
      //   </div>
      // </div> */}
    </AuthCard>
  );
}
