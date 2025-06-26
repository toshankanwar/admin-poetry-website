"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect to /dashboard after 2.5 seconds
    const timer = setTimeout(() => {
      router.push("/dashboard");
    }, 2500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-white px-4">
      <div className="w-full max-w-md rounded-xl border border-red-200 bg-red-50 px-6 py-6 flex flex-col items-center text-center shadow">
        <span className="text-xl font-bold text-red-700 mb-1">
          Note
        </span>
        <span className="text-red-600 mb-1">
          This page is the main entry point.
        </span>
        <span className="text-red-600">
          To see the Poem Dashboard, please&nbsp;
          <Link
            href="/dashboard"
            className="text-red-800 underline underline-offset-4 font-semibold hover:text-red-600 focus:text-red-600 transition-colors"
          >
            visit /dashboard
          </Link>
          . You will be redirected automatically.
        </span>
      </div>
    </div>
  );
}