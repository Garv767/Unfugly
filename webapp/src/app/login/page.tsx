'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formattedUsername = username.split('@')[0].toLowerCase();
      const res = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: formattedUsername, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store JWT in localStorage
      localStorage.setItem('unfugly_token', data.token);
      localStorage.setItem('unfugly_net_id', data.net_id);
      
      // Clear password 
      setPassword('');

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent2/20 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="card w-full max-w-md relative z-10 border-border/60 bg-surface/80 backdrop-blur-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-accent to-accent2 mb-2">
            Unfugly
          </h1>
          <p className="text-muted text-sm">
            Sign in with your SRM Academia portal credentials.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-md bg-red/10 border-l-4 border-red text-red text-sm flex items-start">
            <svg className="w-5 h-5 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-text mb-1">Registration Number</label>
            <input 
              type="text" 
              className="input-field w-full transition-all" 
              placeholder="e.g. RA2411003010718" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Password</label>
            <input 
              type="password" 
              className="input-field w-full transition-all" 
              placeholder="Enter Academia Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              disabled={loading}
            />
          </div>
          
          <button 
            type="submit" 
            className="btn-primary w-full flex justify-center items-center h-11"
            disabled={loading}
          >
            {loading ? (
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : 'Secure Login'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-border text-center text-xs text-muted">
          <p>Your password is sent securely and is <strong>never stored</strong>.</p>
          <p>It is used once to scrape Academia and instantly discarded.</p>
        </div>
      </div>
    </div>
  );
}
