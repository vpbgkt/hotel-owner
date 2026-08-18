'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { adminApi, hotelsApi, uploadApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { HOTEL_AMENITY_OPTIONS } from '@/lib/amenities';
import { Upload, Plus, X } from 'lucide-react';

const HOTEL_ID = '11111111-1111-1111-1111-111111111111';
const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000';

function resolveImg(url) {
  if (!url) return null;
  // /uploads/... paths are proxied through Next.js rewrites
  if (url.startsWith('/uploads/') || url.startsWith('http')) return url;
  return null;
}

function ImageUploadField({ label, value, onChange, hint }) {
  const ref = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadApi.uploadMultiple([file]);
      const url = res.data.data?.files?.[0]?.url;
      if (url) { onChange(url); toast.success('Image uploaded'); }
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-start gap-3">
        {resolveImg(value) && (
          <img src={resolveImg(value)} alt={label} className="w-24 h-16 object-cover rounded-lg border flex-shrink-0" onError={(e) => (e.target.style.display = 'none')} />
        )}
        <div className="flex-1 space-y-2">
          <input type="text" className="input text-sm" placeholder="Paste image URL or upload a file" value={value || ''} onChange={(e) => onChange(e.target.value)} />
          <div className="flex gap-2">
            <button type="button" onClick={() => ref.current?.click()} disabled={uploading} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
              <Upload className="w-3.5 h-3.5" /> {uploading ? 'Uploading…' : 'Upload File'}
            </button>
            {value && <button type="button" onClick={() => onChange('')} className="text-xs px-3 py-1.5 border text-red-600 border-red-200 rounded-lg hover:bg-red-50">Remove</button>}
          </div>
          {hint && <p className="text-xs text-gray-400">{hint}</p>}
          <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </div>
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('branding');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [heroImages, setHeroImages] = useState([]);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [amenityOptions, setAmenityOptions] = useState(HOTEL_AMENITY_OPTIONS);
  const [newAmenity, setNewAmenity] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#c5a880');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'HOTEL_ADMIN')) router.replace('/dashboard');
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role !== 'HOTEL_ADMIN') return;
    hotelsApi.getById(HOTEL_ID)
      .then((res) => {
        const h = res.data.data;
        setCoverImageUrl(h.coverImageUrl || '');
        setLogoUrl(h.logoUrl || '');
        setHeroImages(h.heroImages || []);
        setPrimaryColor(h.themeConfig?.primaryColor || '#c5a880');
        setBackgroundColor(h.themeConfig?.backgroundColor || '#ffffff');
        const savedAmenities = h.amenities || [];
        setSelectedAmenities(savedAmenities);
        // Make sure any custom amenities already saved on the hotel (but not
        // part of the default list) still show up as an option in the grid.
        setAmenityOptions((prev) => {
          const extra = savedAmenities.filter((a) => !prev.includes(a));
          return extra.length ? [...prev, ...extra] : prev;
        });
        reset({
          gstRate: ((h.gstRate ?? 0.12) * 100).toFixed(0),
          checkInTime: h.checkInTime || '14:00',
          checkOutTime: h.checkOutTime || '11:00',
          name: h.name || '',
          phone: h.phone || '',
          email: h.email || '',
          address: h.address || '',
          city: h.city || '',
          state: h.state || '',
          pincode: h.pincode || '',
          description: h.description || '',
          starRating: h.starRating || 5,
          bookingModel: h.bookingModel || 'DAILY',
          website: h.website || '',
          instagram: h.instagram || '',
          facebook: h.facebook || '',
        });
      })
      .catch(() => toast.error('Failed to load hotel settings'));
  }, [user, reset]);

  const onSave = async (data) => {
    setSaving(true);
    try {
      const gstRate = parseFloat(data.gstRate) / 100;
      if (isNaN(gstRate) || gstRate < 0 || gstRate > 1) { toast.error('GST must be 0–100'); setSaving(false); return; }
      await adminApi.updateHotel({
        ...data, gstRate, coverImageUrl, logoUrl, heroImages,
        amenities: selectedAmenities,
        themeConfig: { primaryColor, backgroundColor },
      });
      toast.success('Settings saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const toggleAmenity = (a) =>
    setSelectedAmenities((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);

  const addAmenity = () => {
    const name = newAmenity.trim();
    if (!name) return;
    const exists = amenityOptions.some((a) => a.toLowerCase() === name.toLowerCase());
    if (exists) {
      toast.error('This amenity already exists');
      return;
    }
    setAmenityOptions((prev) => [...prev, name]);
    setSelectedAmenities((prev) => [...prev, name]);
    setNewAmenity('');
  };

  if (loading || !user) return null;

  const tabs = [
    { id: 'branding', label: 'Branding' },
    { id: 'theme', label: 'Theme' },
    { id: 'general', label: 'General' },
    { id: 'amenities', label: 'Amenities' },
    { id: 'tax', label: 'Tax & GST' },
    { id: 'timing', label: 'Timings' },
    { id: 'contact', label: 'Contact' },
  ];

  return (
    <main className="min-h-[80vh] bg-gray-50/50">
      <AdminPageHeader title="Hotel Settings" description="Manage branding, theme, tax and contact information" />

      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSave)}>
        {activeTab === 'branding' && (
          <div className="card p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Branding & Images</h2>
              <p className="text-sm text-gray-500 mb-5">These images appear on the homepage hero, booking pages and confirmations.</p>
            </div>
            <ImageUploadField label="Cover / Hero Image" value={coverImageUrl} onChange={setCoverImageUrl} hint="Recommended: 1920×1080px landscape. Full-page hero background." />
            <ImageUploadField label="Hotel Logo" value={logoUrl} onChange={setLogoUrl} hint="Recommended: square or landscape PNG with transparent background." />
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Gallery Images</label>
                <button type="button" onClick={() => setHeroImages((p) => [...p, ''])} className="flex items-center gap-1 text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"><Plus className="w-3.5 h-3.5" /> Add Image</button>
              </div>
              {heroImages.length === 0 && <p className="text-xs text-gray-400 italic">No gallery images yet.</p>}
              <div className="space-y-2">
                {heroImages.map((url, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {resolveImg(url) && <img src={resolveImg(url)} alt="" className="w-12 h-10 object-cover rounded border flex-shrink-0" onError={(e) => (e.target.style.display = 'none')} />}
                    <input type="text" className="input flex-1 text-sm" placeholder="Image URL" value={url}
                      onChange={(e) => { const n = [...heroImages]; n[i] = e.target.value; setHeroImages(n); }} />
                    <button type="button" onClick={() => setHeroImages((h) => h.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700 flex-shrink-0"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'theme' && (
          <div className="card p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Theme &amp; Colors</h2>
              <p className="text-sm text-gray-500">Set the primary accent and page background used across the guest-facing website. Changes apply site-wide after saving.</p>
            </div>

            {/* Primary color */}
            <div>
              <label className="label">Primary Color</label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-11 w-14 rounded-lg border border-gray-300 cursor-pointer p-1 bg-white"
                  aria-label="Pick primary color"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="input w-32 font-mono text-sm"
                  placeholder="#c5a880"
                />
                <div className="flex items-center gap-1.5">
                  {['#c5a880', '#1cc3b2', '#b8860b', '#0f766e', '#9333ea', '#dc2626', '#2563eb', '#111827'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setPrimaryColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition ${primaryColor.toLowerCase() === c ? 'border-gray-900 scale-110' : 'border-white shadow'}`}
                      style={{ backgroundColor: c }}
                      aria-label={`Use ${c}`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">Used for buttons, links, highlights and accents. Default: #c5a880</p>
            </div>

            {/* Background color */}
            <div>
              <label className="label">Background Color</label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="h-11 w-14 rounded-lg border border-gray-300 cursor-pointer p-1 bg-white"
                  aria-label="Pick background color"
                />
                <input
                  type="text"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="input w-32 font-mono text-sm"
                  placeholder="#ffffff"
                />
                <div className="flex items-center gap-1.5">
                  {['#ffffff', '#fafaf9', '#f8fafc', '#f5f5f4'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setBackgroundColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition ${backgroundColor.toLowerCase() === c ? 'border-gray-900 scale-110' : 'border-gray-300'}`}
                      style={{ backgroundColor: c }}
                      aria-label={`Use ${c}`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">Main page background. Default: #ffffff (white)</p>
            </div>

            {/* Live preview */}
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500">Preview</div>
              <div className="p-6" style={{ backgroundColor }}>
                <p className="font-semibold text-gray-900 mb-3">Sample content</p>
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" className="px-5 py-2.5 rounded-full text-white font-medium shadow-sm" style={{ backgroundColor: primaryColor }}>
                    Book Now
                  </button>
                  <span className="font-medium" style={{ color: primaryColor }}>Accent link</span>
                  <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ backgroundColor: primaryColor + '22', color: primaryColor }}>
                    Badge
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => { setPrimaryColor('#c5a880'); setBackgroundColor('#ffffff'); }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Reset to defaults
            </button>
          </div>
        )}

        {activeTab === 'general' && (
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">General Info</h2>
            <div><label className="label">Hotel Name</label><input className="input" {...register('name', { required: true })} /></div>
            <div><label className="label">Description</label><textarea className="input h-28 resize-none" {...register('description')} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Star Rating</label>
                <select className="input" {...register('starRating')}>
                  {[1,2,3,4,5].map((s) => <option key={s} value={s}>{s} Star{s>1?'s':''}</option>)}
                </select>
              </div>
              <div><label className="label">Booking Model</label>
                <select className="input" {...register('bookingModel')}>
                  <option value="DAILY">Daily Only</option>
                  <option value="HOURLY">Hourly Only</option>
                  <option value="BOTH">Daily + Hourly</option>
                </select>
              </div>
            </div>
            <div className="pt-2 border-t">
              <h3 className="font-medium text-gray-800 mb-3">Social Links</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label text-xs">Website</label><input className="input" placeholder="https://yourhotel.com" {...register('website')} /></div>
                <div><label className="label text-xs">Instagram</label><input className="input" placeholder="@yourhotel" {...register('instagram')} /></div>
                <div><label className="label text-xs">Facebook</label><input className="input" placeholder="facebook.com/…" {...register('facebook')} /></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'amenities' && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-1 gap-3 flex-wrap">
              <h2 className="text-lg font-semibold text-gray-900">Hotel Amenities</h2>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newAmenity}
                  onChange={(e) => setNewAmenity(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAmenity(); } }}
                  placeholder="e.g. Pet Friendly"
                  className="input text-sm py-1.5 w-44"
                />
                <button type="button" onClick={addAmenity} className="flex items-center gap-1 text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap">
                  <Plus className="w-3.5 h-3.5" /> Add amenities option
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-4">Selected amenities display on the hotel page and in search results.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {amenityOptions.map((a) => (
                <label key={a} className="flex items-center gap-2 cursor-pointer p-2.5 rounded-lg hover:bg-gray-50 has-[:checked]:bg-primary-50 transition">
                  <input type="checkbox" checked={selectedAmenities.includes(a)} onChange={() => toggleAmenity(a)} />
                  <span className="text-sm">{a}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">{selectedAmenities.length} selected</p>
          </div>
        )}

        {activeTab === 'tax' && (
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">GST / Tax Settings</h2>
            <p className="text-sm text-gray-500">Applied to all new bookings. Existing bookings keep their original rate.</p>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <input type="number" step="0.1" min="0" max="100" className="input pr-8" placeholder="12"
                  {...register('gstRate', { required: true, min: 0, max: 100 })} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">%</span>
              </div>
              <span className="text-sm text-gray-500">e.g. 12 for 12% GST</span>
            </div>
          </div>
        )}

        {activeTab === 'timing' && (
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Check-in / Check-out Times</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Check-in Time</label><input type="time" className="input" {...register('checkInTime')} /></div>
              <div><label className="label">Check-out Time</label><input type="time" className="input" {...register('checkOutTime')} /></div>
            </div>
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Contact Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Phone</label><input className="input" placeholder="+910000000000" {...register('phone')} /></div>
              <div><label className="label">Email</label><input type="email" className="input" {...register('email')} /></div>
            </div>
            <div><label className="label">Address</label><input className="input" {...register('address')} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="label">City</label><input className="input" {...register('city')} /></div>
              <div><label className="label">State</label><input className="input" {...register('state')} /></div>
              <div><label className="label">Pincode</label><input className="input" {...register('pincode')} /></div>
            </div>
          </div>
        )}

        <div className="flex justify-end mt-4">
          <button type="submit" disabled={saving} className="btn-primary px-8">
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </form>
      </div>
    </main>
  );
}
