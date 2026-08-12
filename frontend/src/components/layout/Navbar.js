'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { useState, useEffect } from 'react';
import { Menu, X, User, CalendarCheck, LogOut, ShieldCheck, ChevronDown, Crown } from 'lucide-react';

function resolveImg(url) {
  if (!url) return null;
  if (url.startsWith('/uploads/') || url.startsWith('http')) return url;
  return null;
}

const PUBLIC_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/rooms/book', label: 'Rooms' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { hotel } = useTenant() || {};
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Transparent-over-hero only on the homepage; solid everywhere else.
  const overHero = pathname === '/';
  const solid = !overHero || scrolled || menuOpen;

  useEffect(() => {
    if (!overHero) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [overHero]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const logoUrl = resolveImg(hotel?.logoUrl);
  const hotelName = hotel?.name || 'Grand Horizon';

  const authedLinks = isAuthenticated
    ? [
        { href: '/bookings', label: 'My Booking' },
        ...(user?.role === 'HOTEL_ADMIN' ? [{ href: '/admin', label: 'Admin' }] : []),
      ]
    : [];
  const navLinks = [...PUBLIC_LINKS, ...authedLinks];

  const isActive = (href) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  const linkColor = solid
    ? 'text-gray-600 hover:text-primary-700'
    : 'text-white/90 hover:text-white';

  return (
    <>
    {/* On non-home pages the navbar is fixed & solid, so reserve its height. */}
    {!overHero && <div className="h-16 md:h-20" aria-hidden />}
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        solid
          ? 'bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 md:h-20 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 min-w-0" onClick={() => setMenuOpen(false)}>
          {logoUrl ? (
            <img src={logoUrl} alt={hotelName} className="h-9 w-auto object-contain" />
          ) : (
            <Crown className={`w-6 h-6 ${solid ? 'text-primary-600' : 'text-white drop-shadow'}`} />
          )}
          <span className={`font-display text-lg md:text-xl font-semibold tracking-wide truncate ${solid ? 'text-gray-900' : 'text-white drop-shadow'}`}>
            {hotelName}
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-7 lg:gap-9 text-sm font-medium">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`relative py-1 transition-colors ${linkColor} ${
                isActive(l.href) ? 'after:w-full' : 'after:w-0'
              } after:absolute after:left-0 after:-bottom-0.5 after:h-0.5 after:bg-primary-500 after:transition-all hover:after:w-full`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-4">
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setDropOpen((o) => !o)}
                onBlur={() => setTimeout(() => setDropOpen(false), 150)}
                className={`flex items-center gap-2 font-medium transition-colors px-2 py-1.5 rounded-full ${
                  solid ? 'text-gray-700 hover:bg-gray-50' : 'text-white hover:bg-white/10'
                }`}
              >
                <span className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center font-semibold text-xs">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </span>
                <span className="max-w-[6rem] truncate">{user?.name?.split(' ')[0]}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${dropOpen ? 'rotate-180' : ''}`} />
              </button>
              {dropOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50">
                  <div className="px-4 py-2.5 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                    <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                  </div>
                  <Link href="/user/profile" onClick={() => setDropOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50">
                    <User className="w-4 h-4 text-primary-600" /> Profile
                  </Link>
                  <Link href="/bookings" onClick={() => setDropOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50">
                    <CalendarCheck className="w-4 h-4 text-primary-600" /> My Booking
                  </Link>
                  {user?.role === 'HOTEL_ADMIN' && (
                    <Link href="/admin" onClick={() => setDropOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50">
                      <ShieldCheck className="w-4 h-4 text-primary-600" /> Admin
                    </Link>
                  )}
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      onClick={() => { setDropOpen(false); logout(); }}
                      className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/auth/login" className={`text-sm font-medium transition-colors ${linkColor}`}>Sign in</Link>
              <Link href="/auth/register" className="btn-primary text-sm py-2 px-5">Book Now</Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className={`md:hidden p-2 -mr-2 ${solid ? 'text-gray-700' : 'text-white'}`}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

    </nav>

    {/* Mobile drawer — rendered outside <nav> so it isn't clipped */}
    {menuOpen && (
      <div className="md:hidden fixed inset-x-0 top-16 bottom-0 z-[60] bg-white overflow-y-auto">
        <div className="px-4 py-5 space-y-1">
          {isAuthenticated && (
            <div className="flex items-center gap-3 px-3 py-3 bg-primary-50 rounded-xl mb-3">
              <span className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-semibold">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
          )}

          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className={`block px-3 py-3 rounded-xl text-base font-medium transition-colors ${
                isActive(l.href) ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {l.label}
            </Link>
          ))}

          <div className="border-t border-gray-100 mt-3 pt-3">
            {isAuthenticated ? (
              <button
                onClick={() => { setMenuOpen(false); logout(); }}
                className="flex items-center gap-2 w-full px-3 py-3 text-red-600 rounded-xl hover:bg-red-50 text-left font-medium"
              >
                <LogOut className="w-5 h-5" /> Sign out
              </button>
            ) : (
              <div className="space-y-2">
                <Link href="/auth/login" onClick={() => setMenuOpen(false)} className="block px-3 py-3 text-gray-700 rounded-xl hover:bg-gray-50 font-medium">Sign in</Link>
                <Link href="/auth/register" onClick={() => setMenuOpen(false)} className="btn-primary w-full">Book Now</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}
