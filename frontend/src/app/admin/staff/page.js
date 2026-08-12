'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { adminApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Modal from '@/components/ui/Modal';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';

const ROLES = ['HOTEL_ADMIN', 'RECEPTIONIST', 'MANAGER', 'HOUSEKEEPING'];

export default function AdminStaffPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [staff, setStaff] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'HOTEL_ADMIN')) router.replace('/dashboard');
  }, [loading, isAuthenticated, user, router]);

  const fetchStaff = () => {
    setLoadingData(true);
    adminApi.getStaff()
      .then((res) => setStaff(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoadingData(false));
  };

  useEffect(() => { if (isAuthenticated) fetchStaff(); }, [isAuthenticated]);

  const openCreate = () => { setEditing(null); reset({ role: 'RECEPTIONIST' }); setModalOpen(true); };
  const openEdit = (member) => {
    setEditing(member);
    reset({ name: member.user?.name, email: member.user?.email, role: member.role });
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      if (editing) {
        await adminApi.updateStaff(editing.id, { role: data.role });
        toast.success('Staff updated');
      } else {
        await adminApi.createStaff(data);
        toast.success('Staff member created');
      }
      setModalOpen(false);
      fetchStaff();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const removeStaff = async (id) => {
    if (!confirm('Remove this staff member?')) return;
    try {
      await adminApi.deleteStaff(id);
      setStaff((prev) => prev.filter((s) => s.id !== id));
      toast.success('Staff member removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <main className="min-h-[80vh] bg-gray-50/50">
      <AdminPageHeader
        title="Staff Management"
        description="Manage your team and their access roles"
        actions={
          <button onClick={openCreate} className="btn-primary text-sm">
            <Plus className="w-4 h-4 mr-1.5 inline" />Add Staff
          </button>
        }
      />

      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
        {loadingData ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-2xl" />)}</div>
        ) : staff.length === 0 ? (
          <p className="text-center py-16 text-gray-400">No staff members yet.</p>
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  {['Name', 'Email', 'Role', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3.5 text-gray-500 text-xs uppercase tracking-wide font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {staff.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-gray-900">{member.user?.name}</td>
                    <td className="px-4 py-3.5 text-gray-500">{member.user?.email}</td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full font-medium">{member.role}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(member)} className="text-xs btn-secondary px-3 py-1.5">Edit Role</button>
                        <button onClick={() => removeStaff(member.id)} className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Staff Role' : 'Add Staff Member'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!editing && (
            <>
              <div>
                <label className="label">Full Name</label>
                <input className="input" {...register('name', { required: 'Name is required' })} />
                {errors.name && <p className="error-message">{errors.name.message}</p>}
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" {...register('email', { required: 'Email is required' })} />
                {errors.email && <p className="error-message">{errors.email.message}</p>}
              </div>
              <div>
                <label className="label">Temporary Password</label>
                <input type="password" className="input" {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Min 8 characters' } })} />
                {errors.password && <p className="error-message">{errors.password.message}</p>}
              </div>
            </>
          )}
          <div>
            <label className="label">Role</label>
            <select className="input" {...register('role', { required: true })}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
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
