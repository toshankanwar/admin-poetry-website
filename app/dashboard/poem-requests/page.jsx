'use client';
import { useEffect, useState, useRef, useMemo } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import slugify from 'slugify';
import { formatDistanceToNow } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';

// Helper to send email from the server-side API route
async function sendDecisionEmail({ toEmail, poemTitle, isApproved, note, poemLink }) {
  const greeting = `Hello,`;
  const body = isApproved
    ? `We are delighted to inform you that your poem "${poemTitle}" has been approved and published on PoemSites!\n\n`
    : `Thank you for submitting your poem "${poemTitle}" to PoemSites.\n\nUnfortunately, your poem was not approved at this time.\n\n`;

  const noteSection = `Moderator's Note: ${note || 'No additional comments.'}\n\n`;

  const shareSection = isApproved
    ? `You can view your published poem here:\n${poemLink}\n\nFeel free to share your poem with your friends and family! We encourage you to keep writing and sharing your creativity with our community.\n\n`
    : `We encourage you to keep writing and submit more poems in the future. Your passion for poetry is valued!\n\n`;

  // Developer note for approval
  const devNoteApproved =
    `Congratulations once again from the developer of PoemSites, Toshan Kanwar!\n` +
    `Know more at: https://toshankanwar.website/\n\n`;

  // Developer note for rejection/encouragement
  const devNoteRejected =
    `A personal note from the developer of PoemSites, Toshan Kanwar:\n` +
    `Don't be discouraged—every great poet faces rejection at some point!\n` +
    `Keep writing, keep submitting, and let your creativity shine. \n` +
    `Learn more about me here: https://toshankanwar.website/\n\n`;

  const closing = `Thank you for being a part of PoemSites.\n\nWarm regards,\nTeam PoemSites`;

  await fetch('http://localhost:5001/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: toEmail,
      subject: isApproved
        ? `Your poem "${poemTitle}" has been approved!`
        : `Your poem "${poemTitle}" was not approved`,
      text: `${greeting}\n\n${body}${noteSection}${shareSection}` +
        (isApproved ? devNoteApproved : devNoteRejected) +
        closing,
    }),
  });
}

const SORT_OPTIONS = [
  { value: 'latest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'title-az', label: 'Title (A-Z)' },
  { value: 'title-za', label: 'Title (Z-A)' },
  { value: 'author-az', label: 'Author (A-Z)' },
  { value: 'author-za', label: 'Author (Z-A)' },
];

export default function PoemRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [noteModal, setNoteModal] = useState({ open: false, type: '', req: null });
  const [note, setNote] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('latest');
  const toastTimeout = useRef();

  // Fetch all requests
  const fetchRequests = async () => {
    const querySnapshot = await getDocs(collection(db, 'poemRequests'));
    const data = await Promise.all(
      querySnapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        // Try to get user's email (assume userId/email field is present)
        let userEmail = data.email || '';
        if (!userEmail && data.userId) {
          // Fetch from users collection if userId is available
          try {
            const userDoc = await getDoc(doc(db, 'users', data.userId));
            userEmail = userDoc.exists() ? (userDoc.data().email || '') : '';
          } catch {}
        }
        return {
          id: docSnap.id,
          ...data,
          timestamp: data.timestamp?.toDate() || null,
          userEmail,
        };
      })
    );
    setRequests(data);
  };

  // Show toast helper
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  useEffect(() => {
    fetchRequests();
    return () => { if (toastTimeout.current) clearTimeout(toastTimeout.current); };
  }, []);

  // Approve/Reject with note modal
  const handleApproveWithNote = (req) => {
    setNote('');
    setNoteModal({ open: true, type: 'approve', req });
  };
  const handleRejectWithNote = (req) => {
    setNote('');
    setNoteModal({ open: true, type: 'reject', req });
  };

  // Handle Approve
  const onApprove = async () => {
    const req = noteModal.req;
    setProcessingId(req.id);
    setLoading(true);
    let poemSlugBase = slugify(req.title, { lower: true, strict: true });
    let poemSlug = poemSlugBase;
    let counter = 1;
    // Ensure SLUG is unique
    const poemsSnap = await getDocs(collection(db, 'poems'));
    const allSlugs = poemsSnap.docs.map(d => d.data().slug);
    while (allSlugs.includes(poemSlug)) {
      poemSlug = `${poemSlugBase}-${counter++}`;
    }
    try {
      await addDoc(collection(db, 'poems'), {
        title: req.title,
        content: req.content,
        author: req.userName || 'Anonymous',
        slug: poemSlug,
        datePosted: serverTimestamp(),
      });
      await deleteDoc(doc(db, 'poemRequests', req.id));
      // Send email if possible
      if (req.userEmail) {
        const domain = typeof window !== 'undefined'
          ? window.location.origin
          : 'https://poems.toshankanwar.website'; // fallback for SSR, adjust domain as needed
        const poemLink = `${domain}/poem/${poemSlug}`;
        await sendDecisionEmail({
          toEmail: req.userEmail,
          poemTitle: req.title,
          isApproved: true,
          note,
          poemLink,
        });
      }
      showToast("Poem approved and user notified!");
      setNoteModal({ open: false, type: '', req: null });
      fetchRequests();
    } catch (err) {
      showToast("Error approving poem.", "error");
    }
    setProcessingId(null);
    setLoading(false);
  };

  // Handle Reject
  const onReject = async () => {
    const req = noteModal.req;
    setProcessingId(req.id);
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'poemRequests', req.id));
      // Send email if possible
      if (req.userEmail) {
        await sendDecisionEmail({
          toEmail: req.userEmail,
          poemTitle: req.title,
          isApproved: false,
          note,
          poemLink: null,
        });
      }
      showToast("Poem rejected and user notified!");
      setNoteModal({ open: false, type: '', req: null });
      fetchRequests();
    } catch (err) {
      showToast("Error rejecting poem.", "error");
    }
    setProcessingId(null);
    setLoading(false);
  };

  // Filtering and sorting
  const filteredSortedRequests = useMemo(() => {
    let filtered = requests;
    if (search.trim() !== '') {
      const s = search.trim().toLowerCase();
      filtered = filtered.filter(
        r =>
          r.title?.toLowerCase().includes(s) ||
          r.userName?.toLowerCase().includes(s) ||
          r.content?.toLowerCase().includes(s) ||
          r.userEmail?.toLowerCase().includes(s)
      );
    }
    switch (sort) {
      case 'latest':
        filtered = filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        break;
      case 'oldest':
        filtered = filtered.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        break;
      case 'title-az':
        filtered = filtered.sort((a, b) => (b.title || '').localeCompare(a.title || '', undefined, { sensitivity: 'base' }));
        break;
      case 'title-za':
        filtered = filtered.sort((a, b) => (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' }));
        break;
      case 'author-az':
        filtered = filtered.sort((a, b) => (b.userName || '').localeCompare(a.userName || '', undefined, { sensitivity: 'base' }));
        break;
      case 'author-za':
        filtered = filtered.sort((a, b) => (a.userName || '').localeCompare(b.userName || '', undefined, { sensitivity: 'base' }));
        break;
      default:
        break;
    }
    return filtered;
  }, [requests, search, sort]);

  return (
    <div className="transition-all duration-300 bg-purple-50 min-h-screen px-2 sm:px-8 py-6 lg:ml-64">
      {/* Toast */}
      {toast && (
        <div className={`
          fixed top-8 right-8 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border
          ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}
        `}>
          {toast.message}
        </div>
      )}

      <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4 text-purple-700 pt-10 sm:pt-0 px-2 sm:px-0">
  Pending Poem Requests
</h1>
        {/* Search & Sort Controls */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
  <div className="relative flex-1">
    <input
      type="text"
      className="w-full rounded-lg border border-purple-200 px-4 py-2 bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-300 focus:outline-none transition-all duration-150
        hover:border-purple-400 placeholder-purple-300 text-purple-800 pr-10"
      placeholder="Search by title, author, content, or email..."
      value={search}
      onChange={e => setSearch(e.target.value)}
      style={{
        boxShadow: search ? '0 0 0 2px #a78bfa33' : undefined,
      }}
    />
    {/* Search icon, right inside the input */}
    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
      <svg
        className="w-5 h-5 text-purple-300"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    </div>
  </div>
  <div className="relative">
    <select
      className={`
        rounded-lg border border-purple-200 bg-white px-3 py-2 pr-8 text-purple-800
        focus:border-purple-400 focus:ring-2 focus:ring-purple-300 focus:outline-none
        hover:border-purple-400 transition-all duration-150
        cursor-pointer appearance-none
      `}
      value={sort}
      onChange={e => setSort(e.target.value)}
      style={{
        boxShadow: sort ? '0 0 0 2px #a78bfa33' : undefined,
      }}
    >
      {SORT_OPTIONS.map(opt => (
        <option key={opt.value} value={opt.value} className="text-purple-700">
          {opt.label}
        </option>
      ))}
    </select>
    {/* Custom dropdown arrow with purple color */}
    <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
      <svg
        className="w-4 h-4 text-purple-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  </div>
</div>
        {filteredSortedRequests.length === 0 ? (
          <div className="text-purple-300 py-16 text-lg text-center bg-white rounded-xl border border-purple-100 shadow">
            No pending requests.
          </div>
        ) : (
          <div className="grid gap-7">
            {filteredSortedRequests.map((req) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, type: 'spring' }}
                className="rounded-xl border border-purple-100 bg-white shadow-md hover:shadow-xl transition-shadow p-0 overflow-hidden"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 px-7 py-6">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-lg text-purple-800 truncate">{req.title}</div>
                    <div className="flex flex-wrap gap-3 mt-1 text-sm text-purple-500">
                      <span>
                        By: <span className="font-medium">{req.userName || 'Unknown'}</span>
                      </span>
                      <span>
                        {req.timestamp
                          ? formatDistanceToNow(new Date(req.timestamp), { addSuffix: true })
                          : 'unknown time'}
                      </span>
                      {req.userEmail && (
                        <span className="bg-purple-50 text-purple-500 px-2 py-0.5 rounded text-xs">
                          {req.userEmail}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 md:mt-0">
                    <button
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition-all shadow-sm"
                      onClick={() => handleApproveWithNote(req)}
                      disabled={loading || processingId === req.id}
                    >
                      Approve
                    </button>
                    <button
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-all shadow-sm"
                      onClick={() => handleRejectWithNote(req)}
                      disabled={loading || processingId === req.id}
                    >
                      Reject
                    </button>
                  </div>
                </div>
                <div className="px-7 pb-7 pt-0">
                  <div className="bg-purple-50 border border-purple-100 rounded-md p-4 text-gray-800 whitespace-pre-line text-base font-sans">
                    {req.content}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Note Modal */}
      <AnimatePresence>
        {noteModal.open && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white w-full max-w-md rounded-xl shadow-2xl p-8 relative border border-purple-200"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
            >
              <button
                className="absolute top-4 right-4 text-purple-300 hover:text-purple-700 transition"
                onClick={() => setNoteModal({ open: false, type: '', req: null })}
              >
                <XIconSVG />
              </button>
              <h2 className="text-xl font-bold mb-3 text-purple-700">
                {noteModal.type === 'approve' ? 'Approve Poem' : 'Reject Poem'}
              </h2>
              <div className="mb-2 text-purple-700 font-medium">
                {noteModal.req?.title}
              </div>
              <div className="mb-4">
                <label className="block text-purple-600 font-medium mb-1">
                  {noteModal.type === 'approve'
                    ? 'Note to user (optional, will be sent with approval):'
                    : 'Note to user (required, will be sent with rejection):'}
                </label>
                <textarea
                  rows={4}
                  className="w-full rounded-lg border border-purple-200 px-3 py-2 bg-purple-50 focus:border-purple-400 focus:ring-1 focus:ring-purple-200 transition"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  required={noteModal.type === 'reject'}
                  placeholder={noteModal.type === 'approve'
                    ? "E.g. 'Thank you for your submission! Great poem.'"
                    : "E.g. 'Sorry, your poem couldn't be accepted because ...'"}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 font-medium"
                  onClick={() => setNoteModal({ open: false, type: '', req: null })}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={loading || (noteModal.type === 'reject' && note.trim() === '')}
                  className={`
                    px-4 py-2 rounded-lg text-white font-semibold transition
                    ${noteModal.type === 'approve'
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-red-500 hover:bg-red-600'}
                  `}
                  onClick={noteModal.type === 'approve' ? onApprove : onReject}
                >
                  {loading ? 'Processing...' : noteModal.type === 'approve' ? 'Approve & Notify' : 'Reject & Notify'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Simple X icon for modal close
function XIconSVG() {
  return (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}