'use client';

import Link from 'next/link';
import { useTenant } from '@/context/TenantContext';
import { getAmenityIcon } from '@/lib/amenities';
import { MapPin, Phone, Mail, Instagram, Facebook, Globe, Crown } from 'lucide-react';

function resolveImg(url) {
  if (!url) return null;
  if (url.startsWith('/uploads/') || url.startsWith('http')) return url;
  return null;
}

export default function Footer() {
  const { hotel } = useTenant() || {};
  const hotelName = hotel?.name || 'Grand Horizon';
  const logoUrl = resolveImg(hotel?.logoUrl);
  const year = new Date().getFullYear();

  const socials = [
    hotel?.instagram && { icon: Instagram, href: hotel.instagram.startsWith('http') ? hotel.instagram : `https://instagram.com/${hotel.instagram.replace('@', '')}`, label: 'Instagram' },
    hotel?.facebook && { icon: Facebook, href: hotel.facebook.startsWith('http') ? hotel.facebook : `https://${hotel.facebook}`, label: 'Facebook' },
    hotel?.website && { icon: Globe, href: hotel.website.startsWith('http') ? hotel.website : `https://${hotel.website}`, label: 'Website' },
  ].filter(Boolean);

  return (
    <footer className="bg-gray-950 text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            {logoUrl ? (
              <img src={logoUrl} alt={hotelName} className="h-9 w-auto object-contain" />
            ) : (
              <Crown className="w-6 h-6 text-primary-400" />
            )}
            <h3 className="text-white font-display text-xl font-semibold tracking-wide">{hotelName}</h3>
          </div>
          <p className="text-sm leading-relaxed text-gray-400">
            {hotel?.description?.slice(0, 150) || 'A premier luxury hotel offering world-class hospitality, fine dining, and unforgettable moments.'}
          </p>
          {socials.length > 0 && (
            <div className="flex items-center gap-3 mt-5">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-9 h-9 rounded-full border border-gray-700 flex items-center justify-center text-gray-300 hover:bg-primary-600 hover:border-primary-600 hover:text-white transition-colors"
                >
                  <s.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Explore */}
        <div>
          <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-widest">Explore</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/" className="hover:text-primary-400 transition-colors">Home</Link></li>
            <li><Link href="/rooms/book" className="hover:text-primary-400 transition-colors">Rooms &amp; Booking</Link></li>
            <li><Link href="/about" className="hover:text-primary-400 transition-colors">About Us</Link></li>
            <li><Link href="/contact" className="hover:text-primary-400 transition-colors">Contact</Link></li>
          </ul>
        </div>

        {/* Account */}
        <div>
          <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-widest">Account</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/bookings" className="hover:text-primary-400 transition-colors">My Booking</Link></li>
            <li><Link href="/user/profile" className="hover:text-primary-400 transition-colors">Profile</Link></li>
            <li><Link href="/auth/login" className="hover:text-primary-400 transition-colors">Sign In</Link></li>
            <li><Link href="/auth/register" className="hover:text-primary-400 transition-colors">Create Account</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-widest">Get in Touch</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" />
              <span>{hotel?.address ? `${hotel.address}${hotel.city ? ', ' + hotel.city : ''}` : '42 MG Road, Bangalore'}</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-primary-400 flex-shrink-0" />
              <a href={`tel:${hotel?.phone || '+919876543210'}`} className="hover:text-primary-400 transition-colors">{hotel?.phone || '+91 98765 43210'}</a>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-primary-400 flex-shrink-0" />
              <a href={`mailto:${hotel?.email || 'info@grandhorizon.com'}`} className="hover:text-primary-400 transition-colors break-all">{hotel?.email || 'info@grandhorizon.com'}</a>
            </li>
          </ul>
          {hotel?.amenities?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {hotel.amenities.slice(0, 4).map((a) => {
                const Icon = getAmenityIcon(a);
                return (
                  <span key={a} className="flex items-center gap-1.5 text-xs bg-gray-800 text-gray-300 px-2.5 py-1 rounded-full">
                    <Icon className="w-3 h-3 text-primary-400" /> {a}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-gray-800 py-5 text-center text-xs text-gray-500 px-4">
        © {year} {hotelName}. All rights reserved. · Crafted for exceptional hospitality.
      </div>
    </footer>
  );
}
