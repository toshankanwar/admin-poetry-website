'use client';
import { useEffect, useState } from 'react';
import { db, auth } from '@/lib/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  getDoc,
  doc,
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [form, setForm] = useState({
    title: '',
    content: '',
    author: '',
    slug: '',
  });
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists() && userDoc.data().role === 'admin') {
        setIsAdmin(true);
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user || !isAdmin) {
      alert('You are not authorized to post poems.');
      return;
    }

    try {
      await addDoc(collection(db, 'poems'), {
        ...form,
        datePosted: serverTimestamp(),
        views: 0,
        likes: 0,
      });
      alert('Poem posted!');
      setForm({ title: '', content: '', author: '', slug: '' });
    } catch (err) {
      console.error('Error posting poem:', err.message);
      alert('Failed to post poem. Check console for details.');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 py-10 px-6">
      <div className="max-w-3xl mx-auto bg-white dark:bg-zinc-800 rounded-2xl shadow-lg p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-semibold text-gray-800 dark:text-white">
            Post a New Poem
          </h1>
          {user && isAdmin && (
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded-lg"
            >
              Logout
            </button>
          )}
        </div>

        {user && isAdmin && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {['title', 'slug', 'author'].map((field) => (
              <div key={field}>
                <label
                  htmlFor={field}
                  className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-200 capitalize"
                >
                  {field}
                </label>
                <input
                  type="text"
                  name={field}
                  value={form[field]}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            ))}

            <div>
              <label
                htmlFor="content"
                className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                Content
              </label>
              <textarea
                name="content"
                value={form.content}
                onChange={handleChange}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Write your poem here..."
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg transition duration-200"
            >
              Post Poem
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
