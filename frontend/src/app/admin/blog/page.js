'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { blogApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Modal from '@/components/ui/Modal';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';

export default function AdminBlogPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'HOTEL_ADMIN')) router.replace('/dashboard');
  }, [loading, isAuthenticated, user, router]);

  const fetchPosts = () => {
    setLoadingData(true);
    blogApi.listAdmin({ includeUnpublished: true })
      .then((res) => setPosts(res.data.data?.data || []))
      .catch(() => {})
      .finally(() => setLoadingData(false));
  };

  useEffect(() => { if (isAuthenticated) fetchPosts(); }, [isAuthenticated]);

  const openCreate = () => { setEditing(null); reset({}); setModalOpen(true); };
  const openEdit = (post) => {
    setEditing(post);
    reset({ title: post.title, content: post.content, excerpt: post.excerpt, metaTitle: post.metaTitle, metaDescription: post.metaDescription });
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      if (editing) {
        await blogApi.update(editing.id, data);
        toast.success('Post updated');
      } else {
        await blogApi.create(data);
        toast.success('Post created');
      }
      setModalOpen(false);
      fetchPosts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const togglePublish = async (post) => {
    try {
      if (post.status === 'PUBLISHED') {
        await blogApi.archive(post.id);
        toast.success('Post archived');
      } else {
        await blogApi.publish(post.id);
        toast.success('Post published');
      }
      fetchPosts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const deletePost = async (id) => {
    if (!confirm('Delete this post?')) return;
    try {
      await blogApi.delete(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
      toast.success('Deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <main className="min-h-[80vh] bg-gray-50/50">
      <AdminPageHeader
        title="Blog Posts"
        description="Manage articles published on the hotel website"
        actions={
          <button onClick={openCreate} className="btn-primary text-sm">
            <Plus className="w-4 h-4 mr-1.5 inline" />New Post
          </button>
        }
      />

      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
        {loadingData ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-2xl" />)}</div>
        ) : posts.length === 0 ? (
          <p className="text-center py-16 text-gray-400">No blog posts yet.</p>
        ) : (
          <div className="space-y-2">
            {posts.map((post) => (
              <div key={post.id} className="rounded-2xl border border-gray-100 bg-white p-4 flex flex-wrap justify-between items-center gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-gray-900 truncate">{post.title}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {dayjs(post.createdAt).format('DD MMM YYYY')} ·{' '}
                    <span className={post.status === 'PUBLISHED' ? 'text-green-600' : 'text-gray-400'}>{post.status}</span>
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => openEdit(post)} className="btn-secondary text-xs px-3 py-1.5">Edit</button>
                  <button
                    onClick={() => togglePublish(post)}
                    className={`text-xs px-3 py-1.5 rounded-lg border ${post.status === 'PUBLISHED' ? 'border-yellow-200 text-yellow-700 hover:bg-yellow-50' : 'border-green-200 text-green-700 hover:bg-green-50'}`}
                  >
                    {post.status === 'PUBLISHED' ? 'Archive' : 'Publish'}
                  </button>
                  <button onClick={() => deletePost(post.id)} className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Post' : 'New Post'} maxWidth="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input className="input" {...register('title', { required: 'Title is required' })} />
            {errors.title && <p className="error-message">{errors.title.message}</p>}
          </div>
          <div>
            <label className="label">Excerpt</label>
            <textarea className="input resize-none" rows={2} {...register('excerpt')} />
          </div>
          <div>
            <label className="label">Content</label>
            <textarea className="input resize-none" rows={10} {...register('content', { required: 'Content is required' })} />
            {errors.content && <p className="error-message">{errors.content.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Meta Title</label>
              <input className="input" {...register('metaTitle')} />
            </div>
            <div>
              <label className="label">Meta Description</label>
              <input className="input" {...register('metaDescription')} />
            </div>
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
