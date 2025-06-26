'use client';
import Sidebar from '@/components/Sidebar';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';

export default function DashboardLayout({ children }) {
  const [userLoaded, setUserLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Protect all dashboard pages
    const unsub = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login');
      } else {
        setUserLoaded(true);
      }
    });
    return () => unsub();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (!userLoaded) {
    return (
     <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 via-purple-100 to-purple-200">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screenbg-gradient-to-br from-purple-50 via-purple-100 to-purple-200">
      <Sidebar onLogout={handleLogout} />
      <main className="flex-1 p-6 md:p-10">{children}</main>
    </div>
  );
}