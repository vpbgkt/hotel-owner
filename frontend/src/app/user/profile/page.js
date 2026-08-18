'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { userApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Reveal from '@/components/ui/Reveal';
import { User, Mail, Phone } from 'lucide-react';

export default function ProfilePage() {
  const { user, loading, isAuthenticated, updateUser } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm();

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace('/auth/login');
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (user) reset({ name: user.name, phone: user.phone || '' });
  }, [user, reset]);

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      // Email is intentionally omitted — it is the verified account identity and
      // is set once during registration, so it cannot be changed here.
      const res = await userApi.updateProfile({ name: data.name, phone: data.phone });
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
                <input type="email" className="input bg-gray-50 text-gray-500 cursor-not-allowed" value={user.email || ''} disabled readOnly />
                <p className="text-xs text-gray-400 mt-1">Your verified email can&apos;t be changed.</p>
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
      </div>
    </main>
  );
}
