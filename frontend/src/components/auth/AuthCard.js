'use client';

import { Crown } from 'lucide-react';
import { useTenant } from '@/context/TenantContext';
import Reveal from '@/components/ui/Reveal';

/**
 * Shared shell for all /auth/* pages: centered card on a soft gold-tinted
 * background, hotel branding, serif title + subtitle. Keeps every auth page
 * (login, register, otp, forgot/reset password) visually consistent.
 */
export default function AuthCard({ title, subtitle, maxWidth = 'max-w-md', children }) {
  const { hotel } = useTenant() || {};

  return (
    <div className="min-h-[75vh] flex items-center justify-center bg-gradient-to-b from-primary-50/60 to-white px-4 py-12">
      <Reveal className={`w-full ${maxWidth}`}>
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center mb-3">
            <Crown className="w-5 h-5" />
          </div>
          <p className="text-xs font-medium text-gray-400">{hotel?.name || 'Grand Horizon'}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {title && <h1 className="font-display text-2xl font-semibold text-center text-gray-900 mb-1.5">{title}</h1>}
          {subtitle && <p className="text-center text-gray-500 text-sm mb-6">{subtitle}</p>}
          {children}
        </div>
      </Reveal>
    </div>
  );
}
