'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { userApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Reveal from '@/components/ui/Reveal';
import { User, Mail, Phone, AlertTriangle } from 'lucide-react';

export default function ProfilePage() {
  const { user, loading, isAuthenticated, updateUser } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm();

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace('/auth/login');
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (user) reset({ name: user.name, email: user.email || '', phone: user.phone || '' });
  }, [user, reset]);

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const res = await userApi.updateProfile(data);
      updateUser(res.data.data);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) return null;

  return (
    <main className="bg-white min-h-[70vh]">
      <div className="max-w-2xl mx-auto px-5 sm:px-8 py-12 lg:py-16">
        <Reveal className="flex items-center gap-4 mb-10">
          <div className="w-16 h-16 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center text-2xl font-bold flex-shrink-0">
            {user.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <span className="eyebrow">Your Account</span>
            <h1 className="font-display text-2xl md:text-3xl font-semibold text-gray-900 mt-2">{user.name}</h1>
          </div>
        </Reveal>

        <Reveal delay={60}>
          <div className="rounded-2xl border border-gray-100 p-6 sm:p-7">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-5">Personal Information</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="label flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-gray-400" /> Full Name</label>
                <input className="input" {...register('name', { required: 'Name is required' })} />
                {errors.name && <p className="error-message">{errors.name.message}</p>}
              </div>
              <div>
                <label className="label flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-gray-400" /> Email</label>
                <input type="email" className="input" {...register('email')} />
                {user.email && !user.emailVerified && (
                  <p className="text-xs text-amber-600 mt-1">Email not verified</p>
                )}
              </div>
              <div>
                <label className="label flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400" /> Phone</label>
                <input className="input" {...register('phone')} />
              </div>

              <button type="submit" disabled={saving || !isDirty} className="btn-primary w-full sm:w-auto">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          </div>
        </Reveal>

        <Reveal delay={100} className="mt-8 p-6 sm:p-7 bg-red-50 rounded-2xl border border-red-100">
          <h3 className="font-semibold text-red-800 mb-1.5 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Danger Zone
          </h3>
          <p className="text-sm text-red-600 mb-4">Deactivating your account is permanent and cannot be undone.</p>
          <button
            onClick={() => {
              if (confirm('Are you sure? This will deactivate your account.')) {
                userApi.deactivate().then(() => {
                  localStorage.removeItem('accessToken');
                  localStorage.removeItem('refreshToken');
                  router.push('/');
                }).catch(() => toast.error('Failed to deactivate account'));
              }
            }}
            className="text-sm px-4 py-2.5 border border-red-200 text-red-700 rounded-full hover:bg-red-100 transition-colors font-medium"
          >
            Deactivate Account
          </button>
        </Reveal>
      </div>
    </main>
  );
}
