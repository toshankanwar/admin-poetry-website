'use client';
import { useState } from 'react';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const checkAdminAccess = async uid => {
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists() || userDoc.data().role !== 'admin') {
      alert('Access denied. ');
      return false;
    }

    // Set cookie securely
    document.cookie = `token=${uid}; path=/; secure; samesite=strict`;
    return true;
  };

  const handleLogin = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const isAdmin = await checkAdminAccess(userCred.user.uid);
      if (isAdmin) router.push('/dashboard');
    } catch (err) {
      alert('Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const uid = result.user.uid;
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
  
      if (!userDoc.exists()) {
        alert('Access denied.');
        return;
      }
  
      const role = userDoc.data()?.role;
      if (role !== 'admin') {
        alert('Access denied.');
        return;
      }
  
      // Set secure cookie
      document.cookie = `token=${uid}; path=/; secure; samesite=strict`;
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      alert('Google login failed.');
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 shadow-xl rounded-lg w-full max-w-md">
        <h2 className="text-2xl font-semibold text-center mb-6">Admin Login</h2>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-400"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-400"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            {loading ? 'Logging in...' : 'Login with Email'}
          </button>
        </form>

        <div className="my-4 text-center text-gray-400">or</div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-2 flex items-center justify-center gap-2 border rounded-md bg-white text-black hover:bg-gray-100 transition"
        >
          <svg className="w-5 h-5" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.3 0 6.3 1.1 8.6 3.2l6.4-6.4C34.9 2.3 29.7 0 24 0 14.6 0 6.5 5.8 2.5 14.2l7.5 5.8C12 14.2 17.6 9.5 24 9.5z" />
            <path fill="#34A853" d="M46.5 24.5c0-1.5-.1-3-.4-4.5H24v9h12.6c-.5 2.6-2 4.9-4.2 6.4l6.6 5.1c3.9-3.6 6.5-8.9 6.5-15z" />
            <path fill="#FBBC05" d="M10 28.3c-1-3-1-6.3 0-9.3l-7.5-5.8C.6 18.6 0 21.3 0 24s.6 5.4 2.5 7.8L10 28.3z" />
            <path fill="#4285F4" d="M24 48c5.7 0 10.9-1.9 14.6-5.1l-6.6-5.1c-2 1.3-4.6 2.1-8 2.1-6.4 0-11.8-4.3-13.8-10.1l-7.5 5.8C6.5 42.2 14.6 48 24 48z" />
          </svg>
          {loading ? 'Processing...' : 'Login with Google'}
        </button>
      </div>
    </div>
  );
}
