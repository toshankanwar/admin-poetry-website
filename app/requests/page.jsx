'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import slugify from 'slugify';
import { formatDistanceToNow } from 'date-fns';

export default function PoemRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  const fetchRequests = async () => {
    const querySnapshot = await getDocs(collection(db, 'poemRequests'));
    const data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || null,
    }));
    setRequests(data);
  };

  const handleApprove = async (req) => {
    const poemSlug = slugify(req.title, { lower: true });
    try {
      await addDoc(collection(db, 'poems'), {
        title: req.title,
        content: req.content,
        author: req.userName || 'Anonymous',
        slug: poemSlug,
        datePosted: serverTimestamp(),
      });

      await deleteDoc(doc(db, 'poemRequests', req.id));
      fetchRequests();
    } catch (err) {
      console.error("Failed to approve poem:", err);
      alert("Error approving poem. See console.");
    }
  };

  const handleReject = async (id) => {
    try {
      await deleteDoc(doc(db, 'poemRequests', id));
      fetchRequests();
    } catch (err) {
      console.error("Failed to reject poem:", err);
      alert("Error rejecting poem. See console.");
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Pending Poem Requests</h1>
      {requests.length === 0 ? (
        <p className="text-gray-500">No pending requests.</p>
      ) : (
        requests.map((req) => {
          const isExpanded = expandedId === req.id;
          return (
            <div key={req.id} className="border p-4 mb-4 rounded shadow-md bg-white">
              <div
                className="cursor-pointer flex justify-between items-center"
                onClick={() => setExpandedId(isExpanded ? null : req.id)}
              >
                <div>
                  <h2 className="text-lg font-semibold">{req.title}</h2>
                  <p className="text-sm text-gray-500">
                    By: {req.userName || 'Unknown'} •{' '}
                    {req.timestamp
                      ? formatDistanceToNow(new Date(req.timestamp), { addSuffix: true })
                      : 'unknown time'}
                  </p>
                </div>
                <span className="text-blue-600 hover:underline">
                  {isExpanded ? 'Hide' : 'View'}
                </span>
              </div>

              {isExpanded && (
                <div className="mt-3">
                  <p className="whitespace-pre-wrap border-t pt-3">{req.content}</p>
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => handleApprove(req)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
