'use client'
import { useEffect, useState } from 'react';

export default function UnsubscribePage() {
  const [status, setStatus] = useState('loading'); // loading, success, error, invalid
  const [email, setEmail] = useState('');

  useEffect(() => {
    // Read email from query string
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (!emailParam) {
      setStatus('invalid');
      return;
    }
    setEmail(emailParam);

    // Call backend API to unsubscribe
    fetch('http://localhost:5001/api/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailParam }),
    })
      .then(async res => {
        if (!res.ok) throw new Error();
        setStatus('success');
      })
      .catch(() => setStatus('error'));
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-purple-50 px-4">
      <div className="max-w-lg w-full bg-white shadow-lg rounded-xl p-8 text-center border border-purple-100">
        <h1 className="text-2xl font-bold text-purple-700 mb-4">Unsubscribe from Poem Notifications</h1>
        {status === 'loading' && (
          <div>
            <div className="animate-spin mx-auto mb-4 h-8 w-8 border-4 border-purple-300 border-t-transparent rounded-full"></div>
            <p className="text-purple-500">Processing your request…</p>
          </div>
        )}
        {status === 'invalid' && (
          <div>
            <p className="text-red-500">Invalid unsubscribe link.</p>
          </div>
        )}
        {status === 'success' && (
          <div>
            <p className="text-green-700 font-medium mb-2">You have been unsubscribed.</p>
            <p className="text-sm text-gray-500">You will no longer receive new poem notifications at <b>{email}</b>.</p>
          </div>
        )}
        {status === 'error' && (
          <div>
            <p className="text-red-500 font-medium mb-2">Something went wrong.</p>
            <p className="text-sm text-gray-500">Please try again later or contact support.</p>
          </div>
        )}
      </div>
    </div>
  );
}