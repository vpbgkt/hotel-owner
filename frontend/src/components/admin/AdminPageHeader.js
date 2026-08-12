'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/**
 * Consistent header bar for admin sub-pages: back link, title, optional
 * description, and optional right-aligned actions (buttons, filters, etc).
 * Mirrors the white bar + border-b pattern used on the admin dashboard.
 */
export default function AdminPageHeader({ title, description, backHref = '/admin', backLabel = 'Back to Dashboard', actions, children }) {
  return (
    <div className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          {backHref && (
            <Link href={backHref} className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary-600 transition-colors mb-2">
              <ArrowLeft className="w-3.5 h-3.5" /> {backLabel}
            </Link>
          )}
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3 flex-shrink-0">{actions}</div>}
      </div>
      {children && (
        <div className="max-w-7xl mx-auto px-5 sm:px-8 pb-5">{children}</div>
      )}
    </div>
  );
}
