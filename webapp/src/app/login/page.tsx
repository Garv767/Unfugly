'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ShieldCheck, Lock, Mail, ArrowRight, KeyRound, Sparkles, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface UserProfile {
  user_net_id: string;
  name?: string | null;
  gender?: string | null;
  registration_no?: string | null;
  batch_year?: number | null;
  has_academia_access?: boolean;
  has_sp_connected?: boolean;
  has_academia_connected?: boolean;
}

export default function LoginPage() {
  const router = useRouter();

  // Tab State: 'login' | 'register'
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Login Method: 'password' | 'otp'
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');

  // Registration Step: 'form' | 'verify'
  const [registerStep, setRegisterStep] = useState<'form' | 'verify'>('form');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerOtp, setRegisterOtp] = useState('');

  // Form Fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Status & Error
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Portal Onboarding Modal State
  const [showPortalModal, setShowPortalModal] = useState(false);
  const [portalStep, setPortalStep] = useState<'sp' | 'academia' | 'syncing'>('sp');
  const [spPassword, setSpPassword] = useState('');
  const [academiaPassword, setAcademiaPassword] = useState('');
  const [portalError, setPortalError] = useState('');
  const [portalLoading, setPortalLoading] = useState(false);
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(null);
  const [currentSessionToken, setCurrentSessionToken] = useState<string>('');

  useEffect(() => {
    // Check if already authenticated by testing /api/v2/auth/me
    const token = typeof window !== 'undefined' ? localStorage.getItem('unfugly_token') : null;
    if (token) {
      fetch(`${API_URL}/api/v2/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.user) {
            router.push('/dashboard');
          }
        })
        .catch(() => {});
    }
  }, [router]);

  // Normalize NetID or Email
  const cleanNetIdOrEmail = (val: string) => {
    const trimmed = val.trim().toLowerCase();
    return trimmed.includes('@') ? trimmed : `${trimmed}@srmist.edu.in`;
  };

  // ─────────────────────────────────────────────────────────────
  // 1. Password Login
  // ─────────────────────────────────────────────────────────────
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const email = cleanNetIdOrEmail(username);
      const res = await fetch(`${API_URL}/api/v2/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, method: 'password' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      const token = data.session?.access_token || data.token;
      if (token) {
        localStorage.setItem('unfugly_token', token);
        setCurrentSessionToken(token);
      }

      handlePostLoginCheck(data.profile, token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 2. Email OTP Flow
  // ─────────────────────────────────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const email = cleanNetIdOrEmail(username);
      const res = await fetch(`${API_URL}/api/v2/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, method: 'otp', service: 'webapp' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');

      setOtpSent(true);
      setSuccessMsg(data.message || `Verification code sent to ${email}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const email = cleanNetIdOrEmail(username);
      const res = await fetch(`${API_URL}/api/v2/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpCode }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid OTP code');

      const token = data.session?.access_token || data.token;
      if (token) {
        localStorage.setItem('unfugly_token', token);
        setCurrentSessionToken(token);
      }

      handlePostLoginCheck(data.profile, token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 3. Ecosystem Registration
  // ─────────────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const email = cleanNetIdOrEmail(username);
      const res = await fetch(`${API_URL}/api/v2/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, service: 'webapp' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      setRegisterEmail(email);
      setRegisterStep('verify');
      setSuccessMsg(data.message || `Verification code sent to ${email}. Check your inbox or spam folder.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRegisterOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const email = registerEmail || cleanNetIdOrEmail(username);
      const res = await fetch(`${API_URL}/api/v2/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: registerOtp, type: 'signup' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid OTP code');

      const token = data.session?.access_token || data.token;
      if (token) {
        localStorage.setItem('unfugly_token', token);
        setCurrentSessionToken(token);
      }

      setSuccessMsg('Email verified successfully! Connecting portals...');
      handlePostLoginCheck(data.profile, token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 4. Post-Login Routing & Portal Check
  // ─────────────────────────────────────────────────────────────
  const handlePostLoginCheck = (profile: UserProfile | null, token: string) => {
    setActiveProfile(profile);

    // If Student Portal is not connected yet, trigger onboarding modal
    if (!profile?.has_sp_connected) {
      setPortalStep('sp');
      setShowPortalModal(true);
    } else if (profile?.has_academia_access && !profile?.has_academia_connected) {
      setPortalStep('academia');
      setShowPortalModal(true);
    } else {
      router.push('/dashboard');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 5. Connect Student Portal (AES-256-GCM Vaulting)
  // ─────────────────────────────────────────────────────────────
  const handleConnectSp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPortalError('');
    setPortalLoading(true);

    try {
      const token = currentSessionToken || localStorage.getItem('unfugly_token');
      const res = await fetch(`${API_URL}/api/v2/auth/connect-sp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sp_password: spPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Student Portal authentication failed');

      // Check if senior batch requires Academia
      if (data.requires_academia && !activeProfile?.has_academia_connected) {
        setPortalStep('academia');
      } else {
        // Trigger initial background sync
        triggerMasterSyncAndRedirect(token);
      }
    } catch (err: any) {
      setPortalError(err.message);
    } finally {
      setPortalLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 6. Connect Academia (Senior Batches)
  // ─────────────────────────────────────────────────────────────
  const handleConnectAcademia = async (e: React.FormEvent) => {
    e.preventDefault();
    setPortalError('');
    setPortalLoading(true);

    try {
      const token = currentSessionToken || localStorage.getItem('unfugly_token');
      const res = await fetch(`${API_URL}/api/v2/auth/connect-academia`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ academia_password: academiaPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Academia authentication failed');

      triggerMasterSyncAndRedirect(token);
    } catch (err: any) {
      setPortalError(err.message);
    } finally {
      setPortalLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 7. Initial Master Sync Trigger
  // ─────────────────────────────────────────────────────────────
  const triggerMasterSyncAndRedirect = async (token: string | null) => {
    setPortalStep('syncing');
    try {
      await fetch(`${API_URL}/api/v2/sync/all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      // Non-blocking for UI redirect
    }
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Background ambient lighting */}
      <div className="absolute top-[-15%] left-[-15%] w-[50%] h-[50%] bg-accent/20 blur-[140px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-15%] right-[-15%] w-[50%] h-[50%] bg-accent2/20 blur-[140px] rounded-full pointer-events-none"></div>

      <div className="card w-full max-w-md relative z-10 border-border/70 bg-surface/90 backdrop-blur-xl shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-accent to-accent2 mb-3 shadow-lg shadow-accent/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-accent to-accent2">
            Unfugly
          </h1>
          <p className="text-muted text-xs mt-1">
            Integrated University Ecosystem for SRMIST
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 mb-6 rounded-lg bg-surface2 border border-border/60">
          <button
            type="button"
            className={`py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'login'
                ? 'bg-accent text-white shadow-sm'
                : 'text-muted hover:text-text'
            }`}
            onClick={() => {
              setActiveTab('login');
              setError('');
              setSuccessMsg('');
            }}
          >
            Log In
          </button>
          <button
            type="button"
            className={`py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'register'
                ? 'bg-accent text-white shadow-sm'
                : 'text-muted hover:text-text'
            }`}
            onClick={() => {
              setActiveTab('register');
              setError('');
              setSuccessMsg('');
            }}
          >
            Create Account
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-5 p-3.5 rounded-lg bg-red/10 border border-red/30 text-red text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 rounded-lg bg-green/10 border border-green/30 text-green text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 1: LOG IN */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === 'login' && (
          <div>
            {/* Login Method Sub-Toggle */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/50 text-xs">
              <span className="text-muted font-medium">Authentication Method:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`px-2.5 py-1 rounded transition-colors ${
                    loginMethod === 'password'
                      ? 'bg-accent/20 text-accent font-semibold'
                      : 'text-muted hover:text-text'
                  }`}
                  onClick={() => {
                    setLoginMethod('password');
                    setError('');
                  }}
                >
                  Password
                </button>
                <button
                  type="button"
                  className={`px-2.5 py-1 rounded transition-colors ${
                    loginMethod === 'otp'
                      ? 'bg-accent/20 text-accent font-semibold'
                      : 'text-muted hover:text-text'
                  }`}
                  onClick={() => {
                    setLoginMethod('otp');
                    setError('');
                  }}
                >
                  Email OTP
                </button>
              </div>
            </div>

            {/* PASSWORD LOGIN FORM */}
            {loginMethod === 'password' && (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                    SRM NetID or Email
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className="input-field w-full pl-9 text-sm"
                      placeholder="e.g. gr2383 or gr2383@srmist.edu.in"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      disabled={loading}
                      autoComplete="username"
                    />
                    <Mail className="w-4 h-4 text-muted absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                      Unfugly Password
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input-field w-full pl-9 pr-10 text-sm"
                      placeholder="Enter Unfugly Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      autoComplete="current-password"
                    />
                    <Lock className="w-4 h-4 text-muted absolute left-3 top-3" />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-text cursor-pointer"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted/80 mt-1.5">
                    💡 Your Unfugly master password (separate from SRM portal credentials).
                  </p>
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full flex justify-center items-center h-10 text-sm font-semibold mt-5"
                  disabled={loading}
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* EMAIL OTP LOGIN FORM */}
            {loginMethod === 'otp' && (
              <div>
                {!otpSent ? (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                        SRM NetID or Email
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          className="input-field w-full pl-9 text-sm"
                          placeholder="e.g. gr2383 or gr2383@srmist.edu.in"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                          disabled={loading}
                          autoComplete="email"
                        />
                        <Mail className="w-4 h-4 text-muted absolute left-3 top-3" />
                      </div>
                      <p className="text-[11px] text-muted/80 mt-1.5">
                        We will send a 6-digit access code directly to your SRM inbox.
                      </p>
                    </div>

                    <button
                      type="submit"
                      className="btn-primary w-full flex justify-center items-center h-10 text-sm font-semibold mt-4"
                      disabled={loading}
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        'Send OTP Code'
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                        Enter 6-Digit Code
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          className="input-field w-full pl-9 text-sm tracking-widest font-mono text-center text-lg"
                          placeholder="••••••"
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          required
                          disabled={loading}
                          autoFocus
                        />
                        <KeyRound className="w-4 h-4 text-muted absolute left-3 top-3.5" />
                      </div>
                      <div className="flex items-center justify-between text-xs mt-2 text-muted">
                        <span>Check inbox/spam folder</span>
                        <button
                          type="button"
                          className="text-accent hover:underline"
                          onClick={() => {
                            setOtpSent(false);
                            setOtpCode('');
                          }}
                        >
                          Change NetID
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn-primary w-full flex justify-center items-center h-10 text-sm font-semibold mt-4"
                      disabled={loading}
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        'Verify & Log In'
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 2: REGISTER */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === 'register' && (
          <div>
            {registerStep === 'form' ? (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="p-3 rounded-lg bg-surface2/60 border border-border/50 text-[11px] text-muted space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-text text-xs">
                    <ShieldCheck className="w-4 h-4 text-accent" />
                    <span>One Master Account for Unfugly Ecosystem</span>
                  </div>
                  <p>
                    This password secures your access to <strong>Unfugly Webapp</strong>, <strong>Convoy Carpooling</strong>, and <strong>Campus Marketplace</strong>. It can be completely separate from your SRM passwords.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                    SRMIST NetID or Email
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className="input-field w-full pl-9 text-sm"
                      placeholder="e.g. gr2383 or gr2383@srmist.edu.in"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      disabled={loading}
                      autoComplete="username"
                    />
                    <Mail className="w-4 h-4 text-muted absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                    Create Master Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input-field w-full pl-9 pr-10 text-sm"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      minLength={6}
                    />
                    <Lock className="w-4 h-4 text-muted absolute left-3 top-3" />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-text cursor-pointer"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input-field w-full pl-9 text-sm"
                      placeholder="Re-enter master password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                      minLength={6}
                    />
                    <Lock className="w-4 h-4 text-muted absolute left-3 top-3" />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full flex justify-center items-center h-10 text-sm font-semibold mt-4"
                  disabled={loading}
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    'Create Account & Send Verification Code'
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyRegisterOtp} className="space-y-4">
                <div className="p-3 rounded-lg bg-surface2/60 border border-border/50 text-[11px] text-muted space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-text text-xs">
                    <CheckCircle2 className="w-4 h-4 text-green" />
                    <span>Verify Your SRMIST Email</span>
                  </div>
                  <p>
                    We sent a 6-digit confirmation code to <strong className="text-text">{registerEmail}</strong>. Enter it below to activate your account.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                    Enter 6-Digit Code
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className="input-field w-full pl-9 text-sm tracking-widest font-mono text-center text-lg"
                      placeholder="••••••"
                      maxLength={6}
                      value={registerOtp}
                      onChange={(e) => setRegisterOtp(e.target.value)}
                      required
                      disabled={loading}
                      autoFocus
                    />
                    <KeyRound className="w-4 h-4 text-muted absolute left-3 top-3.5" />
                  </div>
                  <div className="flex items-center justify-between text-xs mt-2 text-muted">
                    <span>Check inbox/spam folder</span>
                    <button
                      type="button"
                      className="text-accent hover:underline"
                      onClick={() => {
                        setRegisterStep('form');
                        setRegisterOtp('');
                        setError('');
                        setSuccessMsg('');
                      }}
                    >
                      Change Details / Re-enter
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full flex justify-center items-center h-10 text-sm font-semibold mt-4"
                  disabled={loading}
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    'Verify Email & Connect Portals'
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. PORTAL CREDENTIAL VAULT ONBOARDING MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showPortalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="card w-full max-w-md bg-surface border-border/80 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border/60">
              <div className="p-2 rounded-lg bg-accent/10 text-accent">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text">
                  {portalStep === 'sp' && 'Connect Student Portal'}
                  {portalStep === 'academia' && 'Connect Academia Portal'}
                  {portalStep === 'syncing' && 'Syncing Academic Records'}
                </h3>
                <p className="text-muted text-xs">
                  {portalStep === 'sp' && 'Step 1 of 2: Attendance & Exam Timetable'}
                  {portalStep === 'academia' && 'Step 2 of 2: Senior Class Timetable'}
                  {portalStep === 'syncing' && 'Running high-speed parallel sync...'}
                </p>
              </div>
            </div>

            {portalError && (
              <div className="mb-4 p-3 rounded-lg bg-red/10 border border-red/30 text-red text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{portalError}</span>
              </div>
            )}

            {/* STEP 1: STUDENT PORTAL PASSWORD */}
            {portalStep === 'sp' && (
              <form onSubmit={handleConnectSp} className="space-y-4">
                <div className="p-3 rounded-lg bg-surface2/50 border border-border/40 text-xs text-muted space-y-1">
                  <p className="text-text font-medium">🔒 Bank-Grade AES-256-GCM Encryption</p>
                  <p>
                    Your Student Portal password is encrypted in-memory and bound to your NetID. We never store or log plaintext passwords.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">SRM NetID</label>
                  <input
                    type="text"
                    className="input-field w-full text-sm bg-surface2/80 opacity-70"
                    value={activeProfile?.user_net_id || username.split('@')[0]}
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">
                    Student Portal Password (sp.srmist.edu.in)
                  </label>
                  <input
                    type="password"
                    className="input-field w-full text-sm"
                    placeholder="Enter Student Portal password"
                    value={spPassword}
                    onChange={(e) => setSpPassword(e.target.value)}
                    required
                    disabled={portalLoading}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full flex justify-center items-center h-10 text-sm font-semibold"
                  disabled={portalLoading}
                >
                  {portalLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    'Verify & Save SP Password'
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: ACADEMIA PASSWORD (FOR BATCHES < 2030) */}
            {portalStep === 'academia' && (
              <form onSubmit={handleConnectAcademia} className="space-y-4">
                <div className="p-3 rounded-lg bg-surface2/50 border border-border/40 text-xs text-muted space-y-1">
                  <p className="text-text font-medium">🎓 Senior Batch Timetable Access</p>
                  <p>
                    Your batch (2026–2029) relies on Academia Zoho SSO for enrolled slots, advisors, and unified 12-hour timetable matrices.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">SRM NetID</label>
                  <input
                    type="text"
                    className="input-field w-full text-sm bg-surface2/80 opacity-70"
                    value={activeProfile?.user_net_id || username.split('@')[0]}
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">
                    Academia Password (academia.srmist.edu.in)
                  </label>
                  <input
                    type="password"
                    className="input-field w-full text-sm"
                    placeholder="Enter Academia password"
                    value={academiaPassword}
                    onChange={(e) => setAcademiaPassword(e.target.value)}
                    required
                    disabled={portalLoading}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full flex justify-center items-center h-10 text-sm font-semibold"
                  disabled={portalLoading}
                >
                  {portalLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    'Verify & Save Academia Password'
                  )}
                </button>
              </form>
            )}

            {/* SYNCING ANIMATION */}
            {portalStep === 'syncing' && (
              <div className="py-8 text-center space-y-3">
                <RefreshCw className="w-10 h-10 text-accent animate-spin mx-auto" />
                <h4 className="text-sm font-semibold text-text">Loading Academic Records...</h4>
                <p className="text-xs text-muted max-w-xs mx-auto">
                  Pulling attendance, marks, personal timetable grid, and calendar. Redirecting to dashboard...
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
