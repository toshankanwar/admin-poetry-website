'use client';
import { useState, useEffect, useRef } from 'react';
import { db, auth } from '@/lib/firebase';
import {
  collection,
  query,
  getDocs,
  orderBy,
  addDoc,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc,
  where
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { AnimatePresence, motion } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  CalendarIcon,
  UserIcon,
  DocumentIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

// Toast component
function Toast({ message, type = "success", onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 30, scale: 0.95 }}
      className={`
        fixed top-8 right-8 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border
        ${type === 'success'
          ? 'bg-green-50 border-green-200 text-green-700'
          : 'bg-red-50 border-red-200 text-red-700'
        }
      `}
      role="alert"
    >
      {type === 'success' ? (
        <CheckCircleIcon className="h-6 w-6 text-green-500 flex-shrink-0" />
      ) : (
        <ExclamationCircleIcon className="h-6 w-6 text-red-500 flex-shrink-0" />
      )}
      <span>{message}</span>
      <button className="ml-2 px-2" onClick={onClose} aria-label="Close toast">
        <XMarkIcon className="h-5 w-5" />
      </button>
    </motion.div>
  );
}

function formatDate(ts) {
  if (!ts?.toDate) return '';
  const date = ts.toDate();
  // Format: dd/mm/yyyy, then show time
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // months are 0-indexed
  const year = date.getFullYear();
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `${day}/${month}/${year} ${time}`;
}

const sortOptions = [
  { label: 'Newest First', value: 'newest' },
  { label: 'Oldest First', value: 'oldest' },
  { label: 'A → Z (Title)', value: 'az' },
  { label: 'Z → A (Title)', value: 'za' },
];

// Helper to auto-generate slug and ensure uniqueness
async function generateUniqueSlug(title, excludeId = null) {
  if (!title) return '';
  let baseSlug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // non-alphanumeric to hyphen
    .replace(/^-+|-+$/g, ''); // remove leading/trailing hyphens
  let slug = baseSlug;
  let counter = 1;

  // Get all poem slugs, except the one being edited
  const snap = await getDocs(collection(db, 'poems'));
  const allSlugs = snap.docs
    .filter((d) => d.id !== excludeId)
    .map((d) => d.data().slug);

  while (allSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return slug;
}

// Helper: Send announcement to mailing list
async function sendPoemAnnouncement(poem) {
  const mailingListSnap = await getDocs(
    query(collection(db, 'mailingList'))
  );
  const emails = mailingListSnap.docs
    .map(doc => doc.data())
    .filter(u => u.subscribed !== false && !!u.email)
    .map(u => u.email);

  if (emails.length === 0) return;
  await fetch('/api/send-poem-announcement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      emails,
      poem: {
        title: poem.title,
        author: poem.author,
        slug: poem.slug,
        content: poem.content,
        datePosted: new Date().toISOString(),
      },
    }),
  });
}

export default function PoemsPage() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [poems, setPoems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search/sort/modal
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editPoem, setEditPoem] = useState(null);
  const searchInput = useRef();

  // Toast state
  const [toast, setToast] = useState(null);
  const toastTimeout = useRef();

  // Show toast helper
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // Fetch user/admin
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return setUser(null);
      setUser(user);
      const userDoc = await getDocs(query(collection(db, 'users')));
      const docData = userDoc.docs.find((d) => d.id === user.uid)?.data();
      setIsAdmin(docData?.role === 'admin');
    });
    return () => unsub();
  }, []);

  // Fetch poems
  const fetchPoems = async () => {
    setLoading(true);
    const q = query(collection(db, 'poems'), orderBy('datePosted', 'desc'));
    const snap = await getDocs(q);
    setPoems(
      snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchPoems();
  }, []);

  // CRUD
  const handleAddPoem = async (form) => {
    try {
      // Generate unique slug
      const slug = await generateUniqueSlug(form.title);
      await addDoc(collection(db, 'poems'), {
        ...form,
        slug,
        datePosted: serverTimestamp(),
        views: 0,
        likes: 0,
      });
      showToast("Poem added successfully!");
      fetchPoems();
      // Send mail to mailing list
      await sendPoemAnnouncement({ ...form, slug });
    } catch (err) {
      showToast("Failed to add poem.", "error");
    }
  };
  const handleEditPoem = async (id, form) => {
    try {
      // If title changed, regenerate slug (but keep current id out of conflict check)
      let slug = form.slug;
      if (form.title && (!form.slug || form.title !== editPoem.title)) {
        slug = await generateUniqueSlug(form.title, id);
      }
      await updateDoc(doc(db, 'poems', id), {
        ...form,
        slug,
      });
      showToast("Poem updated successfully!");
      fetchPoems();
    } catch (err) {
      showToast("Failed to update poem.", "error");
    }
  };
  const handleDeletePoem = async (id) => {
    if (confirm('Delete this poem?')) {
      try {
        // 1. Get the poem doc for the slug
        const poemDoc = poems.find((p) => p.id === id);
        if (poemDoc && poemDoc.slug) {
          // 2. Find all comments with poemSlug == poemDoc.slug
          const commentsQuery = query(
            collection(db, 'comments'),
            where('poemSlug', '==', poemDoc.slug)
          );
          const commentsSnap = await getDocs(commentsQuery);
          // 3. Delete all matching comments
          const batchDeletes = commentsSnap.docs.map((comment) =>
            deleteDoc(doc(db, 'comments', comment.id))
          );
          await Promise.all(batchDeletes);
        }
        // 4. Delete the poem
        await deleteDoc(doc(db, 'poems', id));
        showToast("Poem and all its comments deleted successfully!");
        fetchPoems();
      } catch (err) {
        showToast("Failed to delete poem.", "error");
      }
    }
  };

  // Sorting and Filtering
  const filteredPoems = poems
    .filter(
      (p) =>
        p.title?.toLowerCase().includes(search.toLowerCase()) ||
        p.author?.toLowerCase().includes(search.toLowerCase()) ||
        p.slug?.toLowerCase().includes(search.toLowerCase()) ||
        p.content?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sort === 'newest') return (b.datePosted?.seconds ?? 0) - (a.datePosted?.seconds ?? 0);
      if (sort === 'oldest') return (a.datePosted?.seconds ?? 0) - (b.datePosted?.seconds ?? 0);
      if (sort === 'az') return (a.title || '').localeCompare(b.title || '');
      if (sort === 'za') return (b.title || '').localeCompare(a.title || '');
      return 0;
    });

  // Modal close helper
  const closeModal = () => {
    setShowAddModal(false);
    setEditPoem(null);
  };

  return (
    <>
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      <div className={`p-2 sm:p-6 bg-purple-50 min-h-screen transition-all duration-300 lg:ml-64`}>
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
            <div>
            <h1 className="text-3xl font-bold text-purple-700 flex items-center gap-2 pt-12 sm:pt-0 px-2 sm:px-0">
  <DocumentIcon className="h-8 w-8 text-purple-400" />
  Poems
</h1>
              <p className="text-gray-500 mt-1">Manage all poems on the platform</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow font-medium transition"
              >
                <PlusIcon className="h-5 w-5" />
                Add Poem
              </button>
            </div>
          </div>

          {/* Search + Sort */}
          <div className="flex flex-col gap-3 sm:flex-row items-center justify-between bg-white p-4 rounded-xl shadow border border-purple-100 mb-7">
            <div className="relative w-full sm:w-1/2">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
              <input
                ref={searchInput}
                type="text"
                className="pl-10 pr-3 w-full h-11 rounded-lg border-2 border-purple-100 focus:border-purple-400 focus:ring-purple-200 transition text-gray-700 placeholder-purple-300"
                placeholder="Search by title, author, slug, or content..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-600"
                  onClick={() => {
                    setSearch('');
                    searchInput.current?.focus();
                  }}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>
            <div className="flex gap-2 items-center w-full sm:w-auto">
              <span className="text-sm text-gray-700 font-medium">Sort:</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-lg border-2 border-purple-100 px-3 py-2 focus:border-purple-400 focus:ring-purple-200 bg-purple-50 text-purple-700"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Poems List */}
          <div className="grid gap-6 md:grid-cols-2">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="rounded-xl p-6 min-h-[180px] bg-white border border-purple-100 shadow-lg"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: i * 0.07 }}
                >
                  <div className="animate-pulse">
                    <div className="h-6 w-1/3 bg-purple-100 rounded mb-4"></div>
                    <div className="h-4 w-1/2 bg-purple-50 rounded mb-2"></div>
                    <div className="h-4 w-full bg-purple-50 rounded mb-2"></div>
                    <div className="h-4 w-3/4 bg-purple-50 rounded"></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <svg className="animate-spin h-7 w-7 text-purple-300 opacity-60" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                  </div>
                </motion.div>
              ))
            ) : filteredPoems.length === 0 ? (
              <div className="col-span-full text-center py-16 text-purple-400">
                <DocumentIcon className="mx-auto h-10 w-10" />
                <p className="mt-2 text-lg">No poems found!</p>
              </div>
            ) : (
              filteredPoems.map((poem, idx) => (
                <motion.div
                  key={poem.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.03, boxShadow: '0 8px 32px 0 rgba(120, 78, 240, 0.15)' }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20, delay: idx * 0.04 }}
                  className="rounded-xl bg-white shadow-lg border border-purple-100 p-6 group flex flex-col transition-all duration-200 hover:shadow-2xl hover:border-purple-200"
                >
                  <div className="flex gap-2 items-center mb-1">
                    <h2 className="text-xl font-semibold text-purple-700 truncate flex-1">{poem.title}</h2>
                    <span className="bg-purple-100 text-purple-500 px-2 py-0.5 text-xs rounded font-medium">
                      {poem.slug}
                    </span>
                  </div>
                  <div className="flex gap-3 items-center text-sm text-purple-700 mb-2">
                    <UserIcon className="h-4 w-4 text-purple-400" />
                    {poem.author}
                    <CalendarIcon className="h-4 w-4 ml-3 text-purple-400" />
                    {formatDate(poem.datePosted)}
                  </div>
                  <div className="text-gray-700 mb-3 line-clamp-4 whitespace-pre-wrap">{poem.content}</div>
                  <div className="flex gap-2 mt-auto pt-2">
                    <button
                      onClick={() => setEditPoem(poem)}
                      className="px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 font-medium flex items-center gap-1 transition"
                    >
                      <PencilSquareIcon className="h-5 w-5" /> Edit
                    </button>
                    <button
                      onClick={() => handleDeletePoem(poem.id)}
                      className="px-3 py-1.5 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 font-medium flex items-center gap-1 transition"
                    >
                      <TrashIcon className="h-5 w-5" /> Delete
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Add/Edit Modal */}
          <AnimatePresence>
            {(showAddModal || editPoem) && (
              <PoemModal
                open={showAddModal || !!editPoem}
                onClose={closeModal}
                onSubmit={async (data) => {
                  if (editPoem) {
                    await handleEditPoem(editPoem.id, data);
                    setEditPoem(null);
                  } else {
                    await handleAddPoem(data);
                    setShowAddModal(false);
                  }
                }}
                initialForm={editPoem || undefined}
                isEdit={!!editPoem}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

// Add/Edit poem modal
function PoemModal({ open, onClose, onSubmit, initialForm, isEdit }) {
  const [form, setForm] = useState(
    initialForm || { title: '', content: '', author: '' }
  );
  const [loading, setLoading] = useState(false);
  const [slug, setSlug] = useState(initialForm?.slug || '');

  // Slug auto-generation on title change (for Add only)
  useEffect(() => {
    if (!isEdit) {
      const baseSlug = form.title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(baseSlug);
    } else {
      setSlug(initialForm?.slug || '');
    }
    // eslint-disable-next-line
  }, [form.title, isEdit]);

  useEffect(() => {
    setForm(initialForm || { title: '', content: '', author: '' });
    setSlug(initialForm?.slug || '');
  }, [initialForm, open]);

  if (!open) return null;

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({ ...form });
    setLoading(false);
    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        // push modal to right if sidebar is visible (desktop only)
        left: typeof window !== 'undefined' && window.innerWidth >= 1024 ? '16rem' : 0,
        width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'calc(100vw - 16rem)' : '100vw',
      }}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white w-full max-w-lg rounded-xl shadow-2xl p-8 relative"
      >
        <button
          className="absolute top-4 right-4 text-purple-400 hover:text-purple-700 transition"
          onClick={onClose}
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
        <h2 className="text-2xl font-bold mb-4 text-purple-700">
          {isEdit ? 'Edit Poem' : 'Add New Poem'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block mb-1 font-medium text-purple-700">Title</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-purple-200 rounded-lg bg-purple-50 focus:border-purple-400 focus:ring-1 focus:ring-purple-200 transition text-gray-900"
            />
            {!isEdit && slug && (
              <div className="text-xs mt-1 text-purple-400">
                Slug: <span className="font-mono">{slug}</span>
                <span className="ml-1 text-gray-400">(auto-generated)</span>
              </div>
            )}
          </div>
          <div>
            <label className="block mb-1 font-medium text-purple-700">Author</label>
            <input
              name="author"
              value={form.author}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-purple-200 rounded-lg bg-purple-50 focus:border-purple-400 focus:ring-1 focus:ring-purple-200 transition text-gray-900"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium text-purple-700">Content</label>
            <textarea
              name="content"
              value={form.content}
              onChange={handleChange}
              required
              rows={5}
              className="w-full px-4 py-2 border border-purple-200 rounded-lg bg-purple-50 focus:border-purple-400 focus:ring-1 focus:ring-purple-200 transition text-gray-900"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded-lg transition"
          >
            {loading ? 'Saving...' : isEdit ? 'Update Poem' : 'Add Poem'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}