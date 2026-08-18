'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { adminApi, uploadApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { formatCurrency } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import toast from 'react-hot-toast';
import { ROOM_AMENITY_OPTIONS } from '@/lib/amenities';
import { Plus, Upload, ImageOff, X } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000';

function resolveImgUrl(url) {
  if (!url) return null;
  // /uploads/... paths are proxied through Next.js rewrites
  if (url.startsWith('/uploads/') || url.startsWith('http')) return url;
  return null;
}

function ImageManager({ images, onChange }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const addUrl = () => onChange([...images, '']);

  const setUrl = (i, val) => {
    const next = [...images];
    next[i] = val;
    onChange(next);
  };

  const remove = (i) => onChange(images.filter((_, idx) => idx !== i));

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const res = await uploadApi.uploadMultiple(files);
      const newUrls = (res.data.data?.files || []).map((f) => f.url);
      onChange([...images, ...newUrls]);
      toast.success(`${newUrls.length} image(s) uploaded`);
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{images.length} image{images.length !== 1 ? 's' : ''} added</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" /> {uploading ? 'Uploading…' : 'Upload'}
          </button>
          <button type="button" onClick={addUrl} className="flex items-center gap-1 text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">
            <Plus className="w-3.5 h-3.5" /> Add URL
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
      </div>

      {images.length === 0 && (
        <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl">
          <ImageOff className="w-6 h-6 text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-400">No images yet. Upload files or paste URLs.</p>
        </div>
      )}

      <div className="space-y-2">
        {images.map((url, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-gray-100 bg-gray-50/50">
            {resolveImgUrl(url) && (
              <img src={resolveImgUrl(url)} alt="" className="w-12 h-10 object-cover rounded-lg flex-shrink-0" onError={(e) => (e.target.style.display = 'none')} />
            )}
            <input
              type="text"
              className="input flex-1 text-sm"
              placeholder="https://... or /uploads/filename.jpg"
              value={url}
              onChange={(e) => setUrl(i, e.target.value)}
            />
            <button type="button" onClick={() => remove(i)} className="w-7 h-7 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AmenityManager({ amenities, options, onChange }) {
  const [newAmenity, setNewAmenity] = useState('');

  const toggle = (a) =>
    onChange(amenities.includes(a) ? amenities.filter((x) => x !== a) : [...amenities, a]);

  const addCustom = () => {
    const name = newAmenity.trim();
    if (!name) return;
    if (amenities.some((a) => a.toLowerCase() === name.toLowerCase())) {
      toast.error('Amenity already added');
      return;
    }
    onChange([...amenities, name]);
    setNewAmenity('');
  };

  // Merge default options with any already-selected custom ones so they stay visible.
  const allOptions = [...options, ...amenities.filter((a) => !options.includes(a))];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          value={newAmenity}
          onChange={(e) => setNewAmenity(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          placeholder="e.g. Sea View"
          className="input text-sm py-1.5 w-40"
        />
        <button type="button" onClick={addCustom} className="flex items-center gap-1 text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 whitespace-nowrap">
          <Plus className="w-3.5 h-3.5" /> Add Custom
        </button>
        <span className="text-xs text-gray-400 ml-auto">{amenities.length} selected</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {allOptions.map((a) => (
          <label key={a} className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl border border-transparent hover:bg-gray-50 has-[:checked]:bg-primary-50 has-[:checked]:border-primary-200 transition">
            <input type="checkbox" checked={amenities.includes(a)} onChange={() => toggle(a)} className="rounded text-primary-600 focus:ring-primary-500" />
            <span className="text-sm text-gray-700">{a}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function AdminRoomsPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [roomTypes, setRoomTypes] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [images, setImages] = useState([]);
  const [amenities, setAmenities] = useState([]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'HOTEL_ADMIN')) router.replace('/dashboard');
  }, [loading, isAuthenticated, user, router]);

  const fetchRooms = () => {
    setLoadingData(true);
    adminApi.listRoomTypes({})
      .then((res) => setRoomTypes(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoadingData(false));
  };

  useEffect(() => { if (isAuthenticated) fetchRooms(); }, [isAuthenticated]);

  const openCreate = () => {
    setEditing(null);
    setImages([]);
    setAmenities([]);
    reset({});
    setModalOpen(true);
  };

  const openEdit = (rt) => {
    setEditing(rt);
    setImages(rt.images || []);
    setAmenities(rt.amenities || []);
    reset({
      name: rt.name,
      description: rt.description,
      basePriceDaily: rt.basePriceDaily,
      maxGuests: rt.maxGuests,
      maxAdults: rt.maxAdults,
      maxChildren: rt.maxChildren,
      totalRooms: rt.totalRooms,
    });
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    const payload = { ...data, images: images.filter(Boolean), amenities };
    try {
      if (editing) {
        await adminApi.updateRoomType(editing.id, payload);
        toast.success('Room type updated');
      } else {
        await adminApi.createRoomType(payload);
        toast.success('Room type created');
      }
      setModalOpen(false);
      fetchRooms();
    } catch (err) {
      const apiErr = err.response?.data;
      const fieldErrors = apiErr?.errors?.map((e) => `${e.field}: ${e.message}`).join(', ');
      toast.error(fieldErrors || apiErr?.message || 'Save failed');
    }
  };

  const deleteRoomType = async (id) => {
    if (!confirm('Delete this room type? This cannot be undone.')) return;
    try {
      await adminApi.deleteRoomType(id);
      setRoomTypes((prev) => prev.filter((r) => r.id !== id));
      toast.success('Deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <main className="min-h-[80vh] bg-gray-50/50">
      <AdminPageHeader
        title="Room Types"
        description="Manage room categories, pricing, amenities and images"
        actions={
          <button onClick={openCreate} className="btn-primary text-sm">
            <Plus className="w-4 h-4 mr-1.5 inline" />Add Room Type
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8">
        {loadingData ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-2xl" />)}</div>
        ) : roomTypes.length === 0 ? (
          <p className="text-center py-16 text-gray-400">No room types yet. Add your first one.</p>
        ) : (
          <div className="space-y-3">
            {roomTypes.map((rt) => {
              const thumb = resolveImgUrl(rt.images?.[0]);
              return (
                <div key={rt.id} className="rounded-2xl border border-gray-100 bg-white p-4 flex flex-wrap justify-between items-center gap-4">
                  <div className="flex items-center gap-4">
                    {thumb ? (
                      <img src={thumb} alt={rt.name} className="w-16 h-14 object-cover rounded-lg flex-shrink-0" />
                    ) : (
                      <div className="w-16 h-14 bg-gray-50 rounded-lg flex items-center justify-center text-gray-300 flex-shrink-0">
                        <ImageOff className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">{rt.name}</h3>
                      <p className="text-sm text-gray-500">{rt.totalRooms} rooms · Max {rt.maxGuests} guests · {formatCurrency(rt.basePriceDaily)}/night</p>
                      <p className="text-xs text-gray-400 mt-0.5">{rt.images?.length || 0} image(s)</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => openEdit(rt)} className="btn-secondary text-sm px-3 py-1.5">Edit / Images</button>
                    <button onClick={() => deleteRoomType(rt.id)} className="text-sm px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Room Type' : 'Add Room Type'} maxWidth="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Basic Information</h3>
            <div>
              <label className="label">Room Name</label>
              <input className="input" placeholder="e.g. Deluxe Room" {...register('name', { required: 'Name is required' })} />
              {errors.name && <p className="error-message">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input resize-none" rows={3} placeholder="Brief description of the room type..." {...register('description')} />
            </div>
          </div>

          {/* Pricing & Capacity */}
          <div className="space-y-4 pt-5 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Pricing & Capacity</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Price / Night (₹)</label>
                <input type="number" className="input" placeholder="3500" {...register('basePriceDaily', { required: true, min: 1, valueAsNumber: true })} />
              </div>
              <div>
                <label className="label">Max Occupancy</label>
                <input type="number" className="input" placeholder="2" {...register('maxGuests', { required: true, min: 1, valueAsNumber: true })} />
                <p className="text-xs text-gray-400 mt-1">Adults + children</p>
              </div>
              <div>
                <label className="label">Total Rooms</label>
                <input type="number" className="input" placeholder="10" {...register('totalRooms', { required: true, min: 1, valueAsNumber: true })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Max Adults</label>
                <input type="number" className="input" placeholder="2" {...register('maxAdults', { required: true, min: 1, valueAsNumber: true })} />
              </div>
              <div>
                <label className="label">Max Children</label>
                <input type="number" className="input" placeholder="0" {...register('maxChildren', { required: true, min: 0, valueAsNumber: true })} />
              </div>
            </div>
          </div>

          {/* Amenities */}
          <div className="pt-5 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Amenities</h3>
            <AmenityManager amenities={amenities} options={ROOM_AMENITY_OPTIONS} onChange={setAmenities} />
          </div>

          {/* Images */}
          <div className="pt-5 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Room Images</h3>
            <ImageManager images={images} onChange={setImages} />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-5 border-t border-gray-100">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Saving…' : editing ? 'Update Room Type' : 'Create Room Type'}
            </button>
          </div>
        </form>
      </Modal>
    </main>
  );
}
