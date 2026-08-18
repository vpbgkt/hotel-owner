'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import AuthCard from '@/components/auth/AuthCard';
import { ArrowLeft } from 'lucide-react';

export default function OTPLoginPage() {
  const router = useRouter();
  const { verifyOTP } = useAuth();
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const sendOTP = async (e) => {
    e.preventDefault();
    if (!phone) return;
    setLoading(true);
    try {
      await authApi.requestOTP(phone);
      toast.success('OTP sent to your phone');
      setStep('otp');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const confirmOTP = async (e) => {
    e.preventDefault();
    if (!otp) return;
    setLoading(true);
    try {
      const userData = await verifyOTP({ phone, otp, name });
      toast.success('Logged in!');
      if (['HOTEL_ADMIN', 'HOTEL_STAFF'].includes(userData?.role)) {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="OTP Login"
      subtitle={step === 'phone' ? 'Enter your phone number' : `Enter the OTP sent to ${phone}`}
      maxWidth="max-w-sm"
    >
      {step === 'phone' ? (
        <form onSubmit={sendOTP} className="space-y-4">
          <div>
            <label className="label">Phone Number</label>
            <input className="input" placeholder="+919999999999" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Sending…' : 'Send OTP'}</button>
        </form>
      ) : (
        <form onSubmit={confirmOTP} className="space-y-4">
          <div>
            <label className="label">OTP</label>
            <input className="input text-2xl tracking-[0.5em] text-center" maxLength={6} placeholder="000000" value={otp} onChange={(e) => setOtp(e.target.value)} />
          </div>
          <div>
            <label className="label">Your Name (if new user)</label>
            <input className="input" placeholder="Optional" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Verifying…' : 'Verify OTP'}</button>
          <button type="button" onClick={() => { setStep('phone'); setOtp(''); }} className="flex items-center justify-center gap-1.5 w-full text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-3.5 h-3.5" /> Change number
          </button>
        </form>
      )}

      <p className="text-center text-sm text-gray-500 mt-5">
        <Link href="/auth/login" className="text-primary-600 hover:underline">Use email instead</Link>
      </p>
    </AuthCard>
  );
}
