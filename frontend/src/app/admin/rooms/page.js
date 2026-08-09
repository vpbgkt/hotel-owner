'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { adminApi, uploadApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { formatCurrency } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { ROOM_AMENITY_OPTIONS } from '@/lib/amenities';

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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="label mb-0">Room Images</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs px-3 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : '📁 Upload'}
          </button>
          <button type="button" onClick={addUrl} className="text-xs px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50">
            + Add URL
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
      </div>

      {images.length === 0 && (
        <p className="text-xs text-gray-400 italic">No images yet. Upload files or paste image URLs.</p>
      )}

      <div className="space-y-2">
        {images.map((url, i) => (
          <div key={i} className="flex items-center gap-2">
            {resolveImgUrl(url) && (
              <img src={resolveImgUrl(url)} alt="" className="w-12 h-10 object-cover rounded border flex-shrink-0" onError={(e) => (e.target.style.display = 'none')} />
            )}
            <input
              type="text"
              className="input flex-1 text-sm"
              placeholder="https://... or /uploads/filename.jpg"
              value={url}
              onChange={(e) => setUrl(i, e.target.value)}
            />
            <button type="button" onClick={() => remove(i)} className="text-red-500 hover:text-red-700 flex-shrink-0 text-lg leading-none">×</button>
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
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="label mb-0">Room Amenities</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newAmenity}
            onChange={(e) => setNewAmenity(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
            placeholder="e.g. Sea View"
            className="input text-sm py-1.5 w-36"
          />
          <button type="button" onClick={addCustom} className="text-xs px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 whitespace-nowrap">
            + Add amenities option
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {allOptions.map((a) => (
          <label key={a} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 has-[:checked]:bg-primary-50 transition">
            <input type="checkbox" checked={amenities.includes(a)} onChange={() => toggle(a)} />
            <span className="text-sm">{a}</span>
          </label>
        ))}
      </div>
      <p className="text-xs text-gray-400">{amenities.length} selected</p>
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
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Room Types</h1>
        <button onClick={openCreate} className="btn-primary">+ Add Room Type</button>
      </div>

      {loadingData ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-xl" />)}</div>
      ) : roomTypes.length === 0 ? (
        <p className="text-center py-16 text-gray-400">No room types yet. Add your first one.</p>
      ) : (
        <div className="space-y-3">
          {roomTypes.map((rt) => {
            const thumb = resolveImgUrl(rt.images?.[0]);
            return (
              <div key={rt.id} className="card p-4 flex justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                  {thumb ? (
                    <img src={thumb} alt={rt.name} className="w-16 h-14 object-cover rounded-lg flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-14 bg-gray-100 rounded-lg flex items-center justify-center text-gray-300 flex-shrink-0 text-2xl">🏠</div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">{rt.name}</h3>
                    <p className="text-sm text-gray-500">{rt.totalRooms} rooms · Max {rt.maxGuests} guests · {formatCurrency(rt.basePriceDaily)}/night</p>
                    <p className="text-xs text-gray-400 mt-0.5">{rt.images?.length || 0} image(s)</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => openEdit(rt)} className="btn-secondary text-sm px-3 py-1.5">Edit / Images</button>
                  <button onClick={() => deleteRoomType(rt.id)} className="text-sm px-3 py-1.5 border border-red-300 text-red-600 rounded hover:bg-red-50">Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Room Type' : 'Add Room Type'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div>
            <label className="label">Name</label>
            <input className="input" {...register('name', { required: 'Name is required' })} />
            {errors.name && <p className="error-message">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={3} {...register('description')} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Price per Night (₹)</label>
              <input type="number" className="input" {...register('basePriceDaily', { required: true, min: 1, valueAsNumber: true })} />
            </div>
            <div>
              <label className="label">Max Occupancy</label>
              <input type="number" className="input" {...register('maxGuests', { required: true, min: 1, valueAsNumber: true })} />
              <p className="text-xs text-gray-400 mt-1">Total adults + children</p>
            </div>
            <div>
              <label className="label">Total Rooms</label>
              <input type="number" className="input" {...register('totalRooms', { required: true, min: 1, valueAsNumber: true })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Max Adults</label>
              <input type="number" className="input" {...register('maxAdults', { required: true, min: 1, valueAsNumber: true })} />
            </div>
            <div>
              <label className="label">Max Children</label>
              <input type="number" className="input" {...register('maxChildren', { required: true, min: 0, valueAsNumber: true })} />
            </div>
          </div>

          {/* Amenity Manager */}
          <div className="border-t pt-4">
            <AmenityManager amenities={amenities} options={ROOM_AMENITY_OPTIONS} onChange={setAmenities} />
          </div>

          {/* Image Manager */}
          <div className="border-t pt-4">
            <ImageManager images={images} onChange={setImages} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Saving…' : editing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </main>
  );
}
