'use client';
import { useState } from 'react';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-purple-100 to-purple-200 px-2">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ duration: 0.5, type: "spring", bounce: 0.18 }}
          className="relative w-full max-w-md"
        >
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-purple-200 via-purple-100 to-white shadow-2xl blur-[2px] z-0"></div>
          <div className="relative z-10 bg-white/90 rounded-3xl shadow-xl border border-purple-100 px-8 py-10 flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.5 }}
              className="flex flex-col items-center mb-8"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center mb-2 shadow-lg">
                <svg width={34} height={34} fill="none" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="22" fill="#fff" opacity="0.12" />
                  <path fill="#8B5CF6" d="M24 32a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"/>
                  <path fill="#a78bfa" d="M24 35c-7.18 0-13 2.24-13 5v2h26v-2c0-2.76-5.82-5-13-5Z"/>
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold text-purple-700 mb-1">Admin Login</h2>
              <div className="text-purple-400 text-sm font-medium">Sign in to your dashboard</div>
            </motion.div>

            {/* Admin Credentials - Demo */}
            <div className="w-full mb-6">
              <div className="bg-gradient-to-r from-purple-100 via-purple-200 to-purple-100 border border-purple-200 rounded-lg px-4 py-3 text-purple-700 shadow text-sm font-medium flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m2-4h.01M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span>
                    <span className="font-semibold">Demo Admin Login:</span>
                  </span>
                </div>
                <div>
                  <span className="font-semibold">Email:</span> <span className="select-all">toshan22102@iiitnr.edu.in</span>
                </div>
                <div>
                  <span className="font-semibold">Password:</span> <span className="select-all">Hellohii@12345</span>
                </div>
                <div className="text-xs text-purple-400 mt-1">Use the above credentials to login as admin and explore the dashboard.</div>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4 w-full">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.13 }}>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 text-purple-800 placeholder-purple-300 bg-white transition"
                  autoComplete="email"
                  disabled={loading}
                />
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18 }}>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 text-purple-800 placeholder-purple-300 bg-white transition"
                  autoComplete="current-password"
                  disabled={loading}
                />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 rounded-lg font-semibold bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg hover:from-purple-600 hover:to-purple-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="loader border-t-2 border-b-2 border-white rounded-full w-5 h-5 animate-spin"></span>
                      Logging in...
                    </span>
                  ) : (
                    "Login with Email"
                  )}
                </button>
              </motion.div>
            </form>
            <div className="my-4 text-center text-purple-300 font-medium relative">
              <span className="bg-white px-3 z-10 relative">or</span>
              <span className="absolute left-0 top-1/2 w-full border-t border-purple-100 z-0"></span>
            </div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-2 flex items-center justify-center gap-2 border border-purple-200 rounded-lg bg-white text-purple-800 font-semibold hover:bg-purple-50 transition disabled:opacity-60 disabled:cursor-not-allowed shadow"
              >
                <svg className="w-5 h-5" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.3 0 6.3 1.1 8.6 3.2l6.4-6.4C34.9 2.3 29.7 0 24 0 14.6 0 6.5 5.8 2.5 14.2l7.5 5.8C12 14.2 17.6 9.5 24 9.5z" />
                  <path fill="#34A853" d="M46.5 24.5c0-1.5-.1-3-.4-4.5H24v9h12.6c-.5 2.6-2 4.9-4.2 6.4l6.6 5.1c3.9-3.6 6.5-8.9 6.5-15z" />
                  <path fill="#FBBC05" d="M10 28.3c-1-3-1-6.3 0-9.3l-7.5-5.8C.6 18.6 0 21.3 0 24s.6 5.4 2.5 7.8L10 28.3z" />
                  <path fill="#4285F4" d="M24 48c5.7 0 10.9-1.9 14.6-5.1l-6.6-5.1c-2 1.3-4.6 2.1-8 2.1-6.4 0-11.8-4.3-13.8-10.1l-7.5 5.8C6.5 42.2 14.6 48 24 48z" />
                </svg>
                {loading ? 'Processing...' : 'Login with Google'}
              </button>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>
      {/* Animated "loader" for login button */}
      <style>
        {`
        .loader {
          border: 2px solid rgba(255,255,255,.2);
          border-top: 2px solid #fff;
          border-bottom: 2px solid #fff;
        }
        `}
      </style>
    </div>
  );
}