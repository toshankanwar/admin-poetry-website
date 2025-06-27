"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  where,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";

// Sidebar width for desktop
const SIDEBAR_WIDTH = 256;

// Helper to normalize Firestore Timestamps to JS Date
function toDate(val) {
  if (val && typeof val.toDate === "function") return val.toDate();
  if (typeof val === "string" || typeof val === "number") {
    const date = new Date(val);
    if (!isNaN(date.getTime())) return date;
  }
  return null;
}

// Helper to format as dd/mm/yyyy HH:MM:SS
function formatDate(date) {
  if (!date || isNaN(date.getTime())) return "";
  const d = date;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function AdminCommentsPage() {
  const [poems, setPoems] = useState([]);
  const [poemSearch, setPoemSearch] = useState("");
  const [poemSort, setPoemSort] = useState("newest");
  const [selectedPoemId, setSelectedPoemId] = useState("");
  const [comments, setComments] = useState([]);
  const [allComments, setAllComments] = useState([]);
  const [commentSearch, setCommentSearch] = useState("");
  const [commentSort, setCommentSort] = useState("newest");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editText, setEditText] = useState("");
  const [toast, setToast] = useState(null);
  const toastTimeout = useRef();
  const [loadingPoems, setLoadingPoems] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);

  // Mobile meta viewport to prevent unwanted zoom
  useEffect(() => {
    let viewportTag = document.querySelector('meta[name=viewport]');
    if (!viewportTag) {
      viewportTag = document.createElement('meta');
      viewportTag.name = 'viewport';
      document.head.appendChild(viewportTag);
    }
    viewportTag.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
    return () => {};
  }, []);

  // Fetch all poems and all comments on mount for accurate comment counts
  useEffect(() => {
    async function fetchAllPoemsAndComments() {
      setLoadingPoems(true);
      const poemSnap = await getDocs(query(collection(db, "poems")));
      const poemsArr = poemSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          _date: toDate(data.datePosted),
        };
      });
      setPoems(poemsArr);
      setSelectedPoemId((cur) => cur || poemsArr[0]?.id || "");

      // Fetch all comments for counting
      const commentSnap = await getDocs(query(collection(db, "comments")));
      const allCommentsArr = commentSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          _timestamp: toDate(data.timestamp),
          _replied: !!data.adminReply && data.adminReply.trim().length > 0,
        };
      });
      setAllComments(allCommentsArr);
      setLoadingPoems(false);
    }
    fetchAllPoemsAndComments();
  }, []);

  // Fetch comments for selected poem
  useEffect(() => {
    if (!selectedPoemId) {
      setComments([]);
      return;
    }
    async function fetchComments() {
      setLoadingComments(true);
      const selectedPoem = poems.find((p) => p.id === selectedPoemId);
      const poemSlug = selectedPoem?.slug || "";
      if (!poemSlug) {
        setComments([]);
        setLoadingComments(false);
        return;
      }
      const q = query(
        collection(db, "comments"),
        where("poemSlug", "==", poemSlug),
        orderBy("timestamp", "desc")
      );
      const snap = await getDocs(q);
      setComments(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            _timestamp: toDate(data.timestamp),
            _replied: !!data.adminReply && data.adminReply.trim().length > 0,
          };
        })
      );
      setLoadingComments(false);
    }
    fetchComments();
    // eslint-disable-next-line
  }, [selectedPoemId, poems]);

  // Memoized comment count by poem id
  const allCommentsCountForPoem = useMemo(() => {
    const counts = {};
    poems.forEach((poem) => (counts[poem.id] = 0));
    allComments.forEach((comment) => {
      const poem = poems.find((p) => p.slug === comment.poemSlug);
      if (poem) {
        counts[poem.id] = (counts[poem.id] || 0) + 1;
      }
    });
    return counts;
  }, [poems, allComments]);

  // Sorting helpers
  const poemSorters = {
    newest: (a, b) => (b._date?.getTime?.() || 0) - (a._date?.getTime?.() || 0),
    oldest: (a, b) => (a._date?.getTime?.() || 0) - (b._date?.getTime?.() || 0),
    "a-z": (a, b) => (a.title || "").localeCompare(b.title || ""),
    "z-a": (a, b) => (b.title || "").localeCompare(a.title || ""),
    "most-comments": (a, b) => (allCommentsCountForPoem[b.id] || 0) - (allCommentsCountForPoem[a.id] || 0),
    "least-comments": (a, b) => (allCommentsCountForPoem[a.id] || 0) - (allCommentsCountForPoem[b.id] || 0),
  };
  const commentSorters = {
    newest: (a, b) => (b._timestamp?.getTime?.() || 0) - (a._timestamp?.getTime?.() || 0),
    oldest: (a, b) => (a._timestamp?.getTime?.() || 0) - (b._timestamp?.getTime?.() || 0),
    "a-z": (a, b) => (a.author || "").localeCompare(b.author || ""),
    "z-a": (a, b) => (b.author || "").localeCompare(a.author || ""),
    "replied": (a, b) => (b._replied ? 1 : 0) - (a._replied ? 1 : 0),
    "not-replied": (a, b) => (a._replied ? 1 : 0) - (b._replied ? 1 : 0),
  };

  // Filter and sort poems
  const filteredSortedPoems = useMemo(() => {
    let arr = poems;
    if (poemSearch.trim()) {
      const s = poemSearch.trim().toLowerCase();
      arr = arr.filter(
        (p) =>
          p.title?.toLowerCase().includes(s) ||
          p.author?.toLowerCase().includes(s)
      );
    }
    return arr.slice().sort(poemSorters[poemSort] || poemSorters["newest"]);
  }, [poems, poemSearch, poemSort, allCommentsCountForPoem]);

  // Filter and sort comments
  const filteredSortedComments = useMemo(() => {
    let arr = comments;
    if (commentSearch.trim()) {
      const s = commentSearch.trim().toLowerCase();
      arr = arr.filter(
        (c) =>
          c.content?.toLowerCase().includes(s) ||
          (c.author?.toLowerCase() || "").includes(s)
      );
    }
    return arr.slice().sort(commentSorters[commentSort] || commentSorters["newest"]);
  }, [comments, commentSearch, commentSort]);

  // Toast
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), 2500);
  };

  const handleEditOrReply = async (comment) => {
    if (!editText.trim()) return;
    try {
      await updateDoc(doc(db, "comments", comment.id), { content: editText });
      setComments((prev) =>
        prev.map((c) =>
          c.id === comment.id ? { ...c, content: editText } : c
        )
      );
      setEditingCommentId(null);
      setEditText("");
      showToast("Comment updated!");
    } catch (e) {
      showToast("Failed to update.", "error");
    }
  };

  const handleAdminReply = async (comment) => {
    if (!editText.trim()) return;
    try {
      await updateDoc(doc(db, "comments", comment.id), { adminReply: editText });
      setComments((prev) =>
        prev.map((c) =>
          c.id === comment.id ? { ...c, adminReply: editText, _replied: !!editText.trim() } : c
        )
      );
      setEditingCommentId(null);
      setEditText("");
      showToast("Reply sent!");
    } catch (e) {
      showToast("Failed to reply.", "error");
    }
  };

  const handleDelete = async (comment) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await deleteDoc(doc(db, "comments", comment.id));
      setComments((prev) => prev.filter((c) => c.id !== comment.id));
      setAllComments((prev) => prev.filter((c) => c.id !== comment.id));
      showToast("Comment deleted!");
    } catch (e) {
      showToast("Failed to delete.", "error");
    }
  };

  // Font family for dashboard (modern, clean, readable)
  const dashboardFont = "font-sans font-inter antialiased";

  // Input class for mobile: font-size at least 16px to prevent mobile zoom
  const inputClass = "w-full px-4 py-2 rounded-lg border border-purple-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none text-gray-800 bg-purple-50 text-base";

  return (
    <div className={`w-full min-h-screen bg-gradient-to-br from-purple-100 via-gray-50 to-gray-200 flex flex-col ${dashboardFont}`}>
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg border
              ${toast.type === "success"
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-red-50 border-red-200 text-red-700"}`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
      <div
        className={`
        flex flex-1 flex-col lg:flex-row gap-8 p-3 sm:p-4 md:p-8 xl:px-20
        pt-16 lg:pt-10 transition-all
      `}
        style={{
          minHeight: "100vh",
        }}
      >
        {/* Spacer for fixed sidebar (only visible on desktop) */}
        <div className="hidden  lg:block" style={{ width: "180px", minWidth: "180px" }} />
        {/* Main Content */}
        <div className="flex-1 flex flex-col gap-8">
          <div className="flex flex-col md:flex-row gap-8 h-full">
            {/* Poems List */}
            <div
              className="w-full md:w-[350px] flex-shrink-0 bg-gradient-to-br from-purple-100 via-white to-gray-50 rounded-2xl shadow-xl border border-purple-100 overflow-y-auto max-h-[80vh] min-h-[260px] transition"
              style={{
                minWidth: 240,
                maxWidth: 440,
              }}
            >
              <div className="p-4 sm:p-5 border-b border-purple-50 sticky top-0 bg-white/90 z-10 rounded-t-2xl">
                <div className="flex gap-2">
                  <input
                    className={inputClass}
                    placeholder="Search poems..."
                    value={poemSearch}
                    onChange={(e) => setPoemSearch(e.target.value)}
                    style={{ fontSize: '1rem' }}
                    inputMode="text"
                  />
                  <select
                    className="rounded-lg border border-purple-200 bg-white px-2 py-2 text-gray-700 text-base"
                    value={poemSort}
                    onChange={(e) => setPoemSort(e.target.value)}
                    style={{ fontSize: '1rem' }}
                  >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="a-z">A-Z</option>
                    <option value="z-a">Z-A</option>
                    <option value="most-comments">Most Comments</option>
                    <option value="least-comments">Least Comments</option>
                  </select>
                </div>
              </div>
              <ul className="divide-y divide-purple-50">
                {loadingPoems ? (
                  <li className="p-5 text-purple-300 text-center text-base">Loading poems...</li>
                ) : filteredSortedPoems.length === 0 ? (
                  <li className="p-5 text-purple-300 text-center text-base">No poems found.</li>
                ) : (
                  filteredSortedPoems.map((poem) => (
                    <li
                      key={poem.id}
                      className={`cursor-pointer px-5 py-5 hover:bg-purple-50/70 transition-all group rounded-xl my-2
                        ${selectedPoemId === poem.id ? "bg-gradient-to-r from-purple-100 via-purple-50 to-white border-l-8 border-purple-400 shadow-lg" : ""}`}
                      onClick={() => setSelectedPoemId(poem.id)}
                    >
                      <div className="font-extrabold text-gray-800 text-lg truncate group-hover:text-purple-700 transition">{poem.title}</div>
                      <div className="text-xs text-purple-700 truncate font-medium">by {poem.author}</div>
                      <div className="text-xs text-gray-500 mt-1 truncate font-mono">
                        {poem._date ? formatDate(poem._date) : ""}
                      </div>
                      <div className="text-xs mt-1 font-semibold text-gray-800">
                        Comments: <span className="text-purple-700">{allCommentsCountForPoem[poem.id] || 0}</span>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
            {/* Comments Panel */}
            <div className="flex-1 flex flex-col bg-gradient-to-br from-white via-purple-50 to-gray-50 rounded-2xl shadow-xl border border-purple-100 overflow-hidden min-h-[260px]">
              <div className="p-4 sm:p-5 border-b border-purple-50 flex flex-col sm:flex-row sm:items-center gap-4 bg-purple-50/70 sticky top-0 z-10 rounded-t-2xl">
                <div>
                  <div className="text-xl sm:text-2xl font-extrabold text-gray-800 truncate max-w-[220px] sm:max-w-[320px] md:max-w-[520px]">
                    {filteredSortedPoems.find((p) => p.id === selectedPoemId)?.title || "No poem selected"}
                  </div>
                  <div className="text-sm text-purple-700 truncate max-w-[220px] sm:max-w-[320px] md:max-w-[520px] font-medium">
                    by {filteredSortedPoems.find((p) => p.id === selectedPoemId)?.author || "-"}
                  </div>
                </div>
                <div className="flex-1"></div>
                <div className="flex gap-2 mt-2 sm:mt-0">
                  <input
                    className={inputClass}
                    placeholder="Search comments..."
                    value={commentSearch}
                    onChange={(e) => setCommentSearch(e.target.value)}
                    style={{ fontSize: '1rem' }}
                    inputMode="text"
                  />
                  <select
                    className="rounded-lg border border-purple-200 bg-white px-2 py-2 text-gray-700 text-base"
                    value={commentSort}
                    onChange={(e) => setCommentSort(e.target.value)}
                    style={{ fontSize: '1rem' }}
                  >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="a-z">A-Z (Author)</option>
                    <option value="z-a">Z-A (Author)</option>
                    <option value="replied">Replied</option>
                    <option value="not-replied">Not Replied</option>
                  </select>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-7 bg-white/95">
                {loadingComments ? (
                  <div className="text-center text-purple-300 py-10 text-base">Loading...</div>
                ) : filteredSortedComments.length === 0 ? (
                  <div className="text-center text-purple-300 py-10 text-base">No comments found.</div>
                ) : (
                  filteredSortedComments.map((c) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, type: "spring" }}
                      className="rounded-2xl border border-purple-50 bg-gradient-to-br from-purple-50/60 via-white to-gray-100/70 shadow hover:shadow-lg transition-shadow p-4 sm:p-5"
                    >
                      <div className="flex items-start gap-4 sm:gap-5">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 flex-shrink-0 rounded-full bg-purple-200/60 flex items-center justify-center font-bold text-purple-800 text-lg sm:text-xl shadow-inner border border-purple-100">
                          {c.author?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap gap-3 items-baseline">
                            <span className="font-bold text-gray-800 text-base truncate">{c.author}</span>
                            <span className="text-xs text-gray-500 truncate">
                              {c._timestamp ? formatDate(c._timestamp) : ""}
                            </span>
                            {c._replied && (
                              <span className="text-xs rounded-full bg-green-100 px-2 py-0.5 text-green-700 border border-green-200 ml-2">Replied</span>
                            )}
                          </div>
                          <div className="mt-2 text-base text-gray-800 whitespace-pre-line break-words">{c.content}</div>
                          {c.adminReply && (
                            <div className="mt-3 bg-green-50 border-l-4 border-green-400 pl-3 py-2 rounded text-green-800 text-sm font-mono">
                              <span className="font-semibold text-green-700">Admin Reply:</span> {c.adminReply}
                            </div>
                          )}
                          {/* Actions */}
                          <div className="mt-3 flex gap-4 flex-wrap">
                            <button
                              className="text-purple-800 font-semibold hover:underline text-sm"
                              onClick={() => {
                                setEditingCommentId(c.id + "-edit");
                                setEditText(c.content);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="text-purple-600 font-semibold hover:underline text-sm"
                              onClick={() => {
                                setEditingCommentId(c.id + "-reply");
                                setEditText(c.adminReply || "");
                              }}
                            >
                              {c.adminReply ? "Edit Reply" : "Reply"}
                            </button>
                            <button
                              className="text-red-700 font-semibold hover:underline text-sm"
                              onClick={() => handleDelete(c)}
                            >
                              Delete
                            </button>
                          </div>
                          {/* Edit/Reply Area */}
                          {(editingCommentId === c.id + "-edit" || editingCommentId === c.id + "-reply") && (
                            <div className="mt-3 flex flex-col gap-2">
                              <textarea
                                rows={2}
                                className="w-full rounded border border-purple-200 focus:border-purple-400 focus:ring-1 focus:ring-purple-100 px-2 py-1 text-base transition text-gray-900"
                                placeholder={editingCommentId === c.id + "-edit" ? "Edit comment..." : "Write your reply..."}
                                value={editText}
                                onChange={e => setEditText(e.target.value)}
                                style={{ fontSize: '1rem' }}
                              />
                              <div className="flex gap-2">
                                <button
                                  className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white px-5 py-2 rounded font-semibold text-base transition"
                                  onClick={() =>
                                    editingCommentId === c.id + "-edit"
                                      ? handleEditOrReply(c)
                                      : handleAdminReply(c)
                                  }
                                >
                                  Save
                                </button>
                                <button
                                  className="bg-purple-100 text-purple-700 px-5 py-2 rounded font-semibold hover:bg-purple-200 text-base transition"
                                  onClick={() => {
                                    setEditingCommentId(null);
                                    setEditText("");
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Font loader for Inter/modern font, if not already loaded globally */}
      <style jsx global>{`
        html {
          font-family: 'Inter', 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
        }
      `}</style>
    </div>
  );
}