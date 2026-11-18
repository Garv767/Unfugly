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
  const [showSpPassword, setShowSpPassword] = useState(false);
  const [showDiagPassword, setShowDiagPassword] = useState(false);

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

  // Manual Captcha Diagnostics State
  const [manualCaptchaMode, setManualCaptchaMode] = useState(false);
  const [manualCaptchaImg, setManualCaptchaImg] = useState('');
  const [manualChallengeId, setManualChallengeId] = useState('');
  const [manualCaptchaCode, setManualCaptchaCode] = useState('');
  const [manualCaptchaLoading, setManualCaptchaLoading] = useState(false);
  const [diagInfo, setDiagInfo] = useState<{ egressIp?: string; statusCode?: number; error?: string; success?: boolean } | null>(null);
  const [showStandaloneDiag, setShowStandaloneDiag] = useState(false);
  const [showInlineFrame, setShowInlineFrame] = useState(false);
  const [diagNetId, setDiagNetId] = useState('');
  const [diagSpPassword, setDiagSpPassword] = useState('');
  const [diagLoading, setDiagLoading] = useState(false);

  // Resend OTP Countdown State
  const [resendTimer, setResendTimer] = useState(0);

  // Reset Password Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request');
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    // 1. Direct URL Magic Link / OTP Token Check from Search Params or Hash Fragment
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const hashStr = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : window.location.hash;
      const hashParams = new URLSearchParams(hashStr);

      const token = searchParams.get('token') || searchParams.get('access_token') || hashParams.get('access_token') || hashParams.get('token');
      const code = searchParams.get('code') || hashParams.get('code');
      const type = searchParams.get('type') || hashParams.get('type');

      if (token) {
        localStorage.setItem('unfugly_token', token);
        setCurrentSessionToken(token);
        fetch(`${API_URL}/api/v2/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => {
            if (data && data.user) {
              handlePostLoginCheck(data.profile, token);
            }
          })
          .catch(() => {});
        return;
      }

      if (code) {
        setLoading(true);
        fetch(`${API_URL}/api/v2/auth/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanNetIdOrEmail(username || ''), otp: code, type: type || 'magiclink' }),
        })
          .then(res => res.json())
          .then(data => {
            const tok = data.session?.access_token || data.token;
            if (tok) {
              localStorage.setItem('unfugly_token', tok);
              setCurrentSessionToken(tok);
              handlePostLoginCheck(data.profile, tok);
            }
          })
          .catch(() => {})
          .finally(() => setLoading(false));
        return;
      }
    }

    // 2. Check if already authenticated by testing /api/v2/auth/me
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
        body: JSON.stringify({
          email,
          method: 'otp',
          service: 'webapp',
          redirect_to: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined
        }),
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
        body: JSON.stringify({
          email,
          password,
          service: 'webapp',
          redirect_to: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined
        }),
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

  const handleResendRegisterOtp = async () => {
    if (resendTimer > 0) return;
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const email = registerEmail || cleanNetIdOrEmail(username);
      const res = await fetch(`${API_URL}/api/v2/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          type: 'signup',
          service: 'webapp',
          redirect_to: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend confirmation code');
      setResendTimer(60);
      setSuccessMsg(data.message || `Fresh confirmation code sent to ${email}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendLoginOtp = async () => {
    if (resendTimer > 0) return;
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const email = cleanNetIdOrEmail(username);
      const res = await fetch(`${API_URL}/api/v2/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          type: 'login',
          service: 'webapp',
          redirect_to: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend login code');
      setResendTimer(60);
      setSuccessMsg(data.message || `Fresh login code sent to ${email}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetLoading(true);
    try {
      const email = cleanNetIdOrEmail(resetEmail || username);
      const res = await fetch(`${API_URL}/api/v2/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          service: 'webapp',
          redirect_to: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reset code');
      setResetEmail(email);
      setResetStep('verify');
    } catch (err: any) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (newResetPassword !== confirmResetPassword) {
      setResetError('Passwords do not match');
      return;
    }
    if (newResetPassword.length < 6) {
      setResetError('Password must be at least 6 characters long');
      return;
    }
    setResetLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v2/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail,
          otp: resetOtp,
          new_password: newResetPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      setShowResetModal(false);
      setSuccessMsg('Master password reset successfully! Please sign in with your new password.');
      setActiveTab('login');
      setLoginMethod('password');
      setPassword('');
      setResetOtp('');
      setNewResetPassword('');
      setConfirmResetPassword('');
    } catch (err: any) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
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

  const fetchManualCaptcha = async (options?: { keepError?: boolean }) => {
    const keepError = Boolean(options?.keepError);
    setManualCaptchaLoading(true);
    if (!keepError) setPortalError('');
    setDiagInfo(null);
    try {
      const res = await fetch(`${API_URL}/api/v2/auth/sp-challenge`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load captcha challenge');
      setManualCaptchaImg(data.captchaImage);
      setManualChallengeId(data.challengeId);
      setManualCaptchaCode('');
    } catch (err: any) {
      setPortalError(err.message);
    } finally {
      setManualCaptchaLoading(false);
    }
  };

  const handleManualCaptchaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCaptchaCode || manualCaptchaCode.trim().length !== 6) {
      setPortalError('Please enter the complete 6-character captcha');
      return;
    }
    setPortalLoading(true);
    setPortalError('');
    setDiagInfo(null);
    try {
      const token = currentSessionToken || (typeof window !== 'undefined' ? localStorage.getItem('unfugly_token') : '');
      const netId = (activeProfile?.user_net_id || username.split('@')[0] || '').toLowerCase().trim();
      const res = await fetch(`${API_URL}/api/v2/auth/sp-verify-challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          net_id: netId,
          sp_password: spPassword,
          captcha_code: manualCaptchaCode.trim(),
          challenge_id: manualChallengeId,
        }),
      });

      const data = await res.json();
      setDiagInfo({
        egressIp: data.egressIp,
        statusCode: data.statusCode || res.status,
        error: data.error,
        success: data.success,
      });

      if (!res.ok) {
        throw new Error(data.error || 'Student Portal rejected credentials or blocked request');
      }

      if (data.requires_academia && !activeProfile?.has_academia_connected) {
        setPortalStep('academia');
      } else {
        triggerMasterSyncAndRedirect(token);
      }
    } catch (err: any) {
      setPortalError(err.message);
      fetchManualCaptcha({ keepError: true });
    } finally {
      setPortalLoading(false);
    }
  };

  const handleStandaloneDiagVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const netId = (diagNetId || username || '').trim().split('@')[0];
    const password = diagSpPassword || spPassword;
    if (!netId) {
      setError('Please enter your SRM NetID or Registration Number for diagnosis');
      return;
    }
    if (!password) {
      setError('Please enter your Student Portal password for diagnosis');
      return;
    }
    if (!manualCaptchaCode || manualCaptchaCode.trim().length !== 6) {
      setError('Please enter the 6-character captcha challenge');
      return;
    }
    setDiagLoading(true);
    setError('');
    setDiagInfo(null);
    try {
      const token = currentSessionToken || (typeof window !== 'undefined' ? localStorage.getItem('unfugly_token') : null);
      const res = await fetch(`${API_URL}/api/v2/auth/sp-verify-challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          net_id: netId,
          sp_password: password,
          captcha_code: manualCaptchaCode.trim(),
          challenge_id: manualChallengeId,
        }),
      });

      const data = await res.json();
      setDiagInfo({
        egressIp: data.egressIp,
        statusCode: data.statusCode || res.status,
        error: data.error,
        success: data.success,
      });
      if (!res.ok) {
        throw new Error(data.error || 'Student Portal rejected challenge or blocked connection');
      }
      setSuccessMsg('Portal login verified successfully! Server IP is not blocked.');
    } catch (err: any) {
      setError(err.message);
      fetchManualCaptcha();
    } finally {
      setDiagLoading(false);
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
                      placeholder="e.g. ab1234 or ab1234@srmist.edu.in"
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
                    <button
                      type="button"
                      className="text-xs text-accent hover:underline"
                      onClick={() => {
                        setShowResetModal(true);
                        setResetEmail(cleanNetIdOrEmail(username || ''));
                        setResetStep('request');
                        setResetError('');
                      }}
                    >
                      Forgot Password?
                    </button>
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
                          placeholder="e.g. ab1234 or ab1234@srmist.edu.in"
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
                        <button
                          type="button"
                          className="text-accent hover:underline disabled:text-muted/50 disabled:no-underline font-medium"
                          onClick={handleResendLoginOtp}
                          disabled={resendTimer > 0 || loading}
                        >
                          {resendTimer > 0 ? `Resend Code (${resendTimer}s)` : 'Resend Code'}
                        </button>
                        <button
                          type="button"
                          className="text-muted hover:underline"
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
                      placeholder="e.g. ab1234 or ab1234@srmist.edu.in"
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
                    <button
                      type="button"
                      className="text-accent hover:underline disabled:text-muted/50 disabled:no-underline font-medium"
                      onClick={handleResendRegisterOtp}
                      disabled={resendTimer > 0 || loading}
                    >
                      {resendTimer > 0 ? `Resend Code (${resendTimer}s)` : 'Resend Code'}
                    </button>
                    <button
                      type="button"
                      className="text-muted hover:underline"
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

        {/* Standalone Student Portal Captcha Diagnostics */}
        <div className="mt-6 pt-4 border-t border-border/50">
          <button
            type="button"
            onClick={() => {
              const next = !showStandaloneDiag;
              setShowStandaloneDiag(next);
              if (next && !manualCaptchaImg) {
                fetchManualCaptcha();
              }
            }}
            className="w-full text-center text-xs text-muted hover:text-accent font-medium flex items-center justify-center gap-1.5 transition-colors py-1 cursor-pointer"
          >
            <span>🧪</span>
            <span>{showStandaloneDiag ? 'Hide Portal Diagnostics' : 'Test Student Portal Captcha (Diagnostics Mode)'}</span>
          </button>

          {showStandaloneDiag && (
            <div className="mt-3 p-4 rounded-xl bg-surface2/70 border border-accent/30 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-1 border-b border-border/40">
                <span className="text-xs font-semibold text-text">SRM Student Portal Test</span>
                <span className="text-[10px] text-muted">Direct Firewall & IP Check</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1">
                  SRM NetID or Register No.
                </label>
                <input
                  type="text"
                  className="input-field w-full text-xs font-mono"
                  placeholder="e.g. gr2383 or RA2411003010718"
                  value={diagNetId || username}
                  onChange={(e) => setDiagNetId(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1">
                  Student Portal Password
                </label>
                <div className="relative">
                  <input
                    type={showDiagPassword ? 'text' : 'password'}
                    className="input-field w-full pr-9 text-xs"
                    placeholder="Portal Password"
                    value={diagSpPassword || spPassword}
                    onChange={(e) => setDiagSpPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-muted hover:text-text cursor-pointer"
                    onClick={() => setShowDiagPassword(!showDiagPassword)}
                    tabIndex={-1}
                  >
                    {showDiagPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-surface1 border border-border/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted">Live Captcha from SRM:</span>
                  <button
                    type="button"
                    onClick={() => fetchManualCaptcha()}
                    disabled={manualCaptchaLoading}
                    className="text-[11px] text-accent hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${manualCaptchaLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="flex items-center justify-center p-2 rounded bg-black/40 border border-border/40 min-h-[50px]">
                  {manualCaptchaLoading ? (
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-accent" />
                      <span>Fetching captcha from SRM server...</span>
                    </div>
                  ) : manualCaptchaImg ? (
                    <img
                      src={manualCaptchaImg}
                      alt="SRM Captcha Challenge"
                      className="h-10 rounded border border-border/80 object-contain"
                    />
                  ) : (
                    <span className="text-xs text-muted">No challenge loaded</span>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-semibold text-muted mb-1">
                    Enter Captcha (6 Chars)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 5x8yb2"
                    value={manualCaptchaCode}
                    onChange={(e) => setManualCaptchaCode(e.target.value.trim())}
                    className="input-field w-full text-center text-sm tracking-[0.3em] font-mono font-bold"
                  />
                </div>
              </div>

              {diagInfo && (
                <div className="p-3 rounded-lg bg-surface1 border border-border text-[11px] space-y-1.5 font-mono">
                  <div className="flex justify-between text-muted">
                    <span>Server Outbound IP:</span>
                    <span className="text-text font-bold">{diagInfo.egressIp || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>SRM Portal Status:</span>
                    <span className={diagInfo.statusCode === 200 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                      HTTP {diagInfo.statusCode}
                    </span>
                  </div>
                  {diagInfo.success ? (
                    <div className="text-emerald-400 font-bold text-xs pt-1">
                      ✅ Authenticated successfully! Server IP is not blocked.
                    </div>
                  ) : diagInfo.error ? (
                    <div className="text-red-400 pt-0.5 text-[10px] break-words">
                      ❌ {diagInfo.error}
                    </div>
                  ) : null}
                </div>
              )}

              <button
                type="button"
                onClick={handleStandaloneDiagVerify}
                disabled={manualCaptchaLoading || diagLoading}
                className="btn-primary w-full flex justify-center items-center h-9 text-xs font-semibold cursor-pointer"
              >
                {diagLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" />
                ) : (
                  'Test Login & Verify Captcha'
                )}
              </button>

              <div className="pt-2 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setShowInlineFrame(!showInlineFrame)}
                  className="w-full text-center text-[11px] text-muted hover:text-accent font-medium py-1 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>🌐</span>
                  <span>{showInlineFrame ? 'Hide Inline SP Live Frame' : 'Load SP in Inline Frame (Same Tab)'}</span>
                </button>

                {showInlineFrame && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-border/80 bg-black/50">
                    <div className="p-2 bg-surface1 text-[10px] text-muted flex items-center justify-between border-b border-border/60">
                      <span>Render Server View</span>
                      <a
                        href={`${API_URL}/api/v2/auth/sp-live-embed`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent hover:underline"
                      >
                        Open Full Inspector ↗
                      </a>
                    </div>
                    <iframe
                      src={`${API_URL}/api/v2/auth/sp-proxy-view`}
                      className="w-full h-80 border-0"
                      title="SRM Student Portal Inline Proxy"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
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
              <form onSubmit={manualCaptchaMode ? handleManualCaptchaVerify : handleConnectSp} className="space-y-4">
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
                  <div className="relative">
                    <input
                      type={showSpPassword ? 'text' : 'password'}
                      className="input-field w-full pr-10 text-sm"
                      placeholder="Enter Student Portal password"
                      value={spPassword}
                      onChange={(e) => setSpPassword(e.target.value)}
                      required
                      disabled={portalLoading}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-text cursor-pointer"
                      onClick={() => setShowSpPassword(!showSpPassword)}
                      tabIndex={-1}
                      disabled={portalLoading}
                    >
                      {showSpPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Mode Selector Toggle */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !manualCaptchaMode;
                      setManualCaptchaMode(next);
                      if (next && !manualCaptchaImg) {
                        fetchManualCaptcha();
                      }
                    }}
                    className="text-primary hover:underline font-medium flex items-center gap-1"
                  >
                    {manualCaptchaMode ? '← Use Automatic OCR Solver' : '🧪 Solve Captcha Manually (Diagnostics Mode)'}
                  </button>
                </div>

                {/* Manual Captcha Container */}
                {manualCaptchaMode && (
                  <div className="p-3.5 rounded-xl bg-surface2/60 border border-primary/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-text">Portal Captcha Challenge</span>
                      <button
                        type="button"
                        onClick={() => fetchManualCaptcha()}
                        disabled={manualCaptchaLoading}
                        className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${manualCaptchaLoading ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-center p-2 rounded-lg bg-surface1 border border-border/60 min-h-[50px]">
                      {manualCaptchaLoading ? (
                        <div className="flex items-center gap-2 text-xs text-muted">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                          <span>Fetching challenge from SRM server...</span>
                        </div>
                      ) : manualCaptchaImg ? (
                        <img
                          src={manualCaptchaImg}
                          alt="SRM Captcha"
                          className="h-10 rounded border border-border/80 object-contain"
                        />
                      ) : (
                        <span className="text-xs text-muted">No challenge loaded</span>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-muted mb-1">
                        Enter Captcha (6 characters, case-sensitive)
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="e.g. 5x8yb2"
                        value={manualCaptchaCode}
                        onChange={(e) => setManualCaptchaCode(e.target.value.trim())}
                        required={manualCaptchaMode}
                        className="input-field w-full text-center text-base tracking-[0.3em] font-mono font-bold"
                        disabled={portalLoading}
                      />
                    </div>

                    {diagInfo && (
                      <div className="p-2.5 rounded-lg bg-surface1 border border-border text-[11px] space-y-1 font-mono">
                        <div className="flex justify-between text-muted">
                          <span>Server Egress IP:</span>
                          <span className="text-text font-bold">{diagInfo.egressIp || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-muted">
                          <span>Portal Response:</span>
                          <span className={diagInfo.statusCode === 200 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                            HTTP {diagInfo.statusCode}
                          </span>
                        </div>
                        {diagInfo.error && (
                          <div className="text-red-400 pt-0.5 text-[10px] break-words">
                            {diagInfo.error}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-primary w-full flex justify-center items-center h-10 text-sm font-semibold"
                  disabled={portalLoading}
                >
                  {portalLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : manualCaptchaMode ? (
                    'Verify Manual Captcha & Connect'
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

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. RESET MASTER PASSWORD MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="card w-full max-w-md bg-surface border-border/80 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10 text-accent">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text">Reset Master Password</h3>
                  <p className="text-muted text-xs">
                    {resetStep === 'request' ? 'Step 1: Get verification code' : 'Step 2: Enter code & new password'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="text-muted hover:text-text p-1 text-sm font-bold"
                onClick={() => setShowResetModal(false)}
              >
                ✕
              </button>
            </div>

            {resetError && (
              <div className="mb-4 p-3 rounded-lg bg-red/10 border border-red/30 text-red text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{resetError}</span>
              </div>
            )}

            {resetStep === 'request' ? (
              <form onSubmit={handleRequestPasswordReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                    SRM NetID or Email
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className="input-field w-full pl-9 text-sm"
                      placeholder="e.g. ab1234 or ab1234@srmist.edu.in"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      disabled={resetLoading}
                    />
                    <Mail className="w-4 h-4 text-muted absolute left-3 top-3" />
                  </div>
                  <p className="text-[11px] text-muted/80 mt-1.5">
                    We will send a password reset code directly to your SRM inbox.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-secondary w-1/3 text-xs"
                    onClick={() => setShowResetModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary w-2/3 flex justify-center items-center h-10 text-sm font-semibold"
                    disabled={resetLoading}
                  >
                    {resetLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : 'Send Reset Code'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleConfirmPasswordReset} className="space-y-4">
                <div className="p-3 rounded-lg bg-surface2/60 border border-border/50 text-[11px] text-muted space-y-1">
                  <span>Enter the 6-digit code sent to <strong className="text-text">{resetEmail}</strong> and your new password.</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                    6-Digit Code
                  </label>
                  <input
                    type="text"
                    className="input-field w-full pl-3 text-sm tracking-widest font-mono text-center text-lg"
                    placeholder="••••••"
                    maxLength={6}
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value)}
                    required
                    disabled={resetLoading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                    New Master Password
                  </label>
                  <input
                    type="password"
                    className="input-field w-full pl-3 text-sm"
                    placeholder="At least 6 characters"
                    value={newResetPassword}
                    onChange={(e) => setNewResetPassword(e.target.value)}
                    required
                    disabled={resetLoading}
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    className="input-field w-full pl-3 text-sm"
                    placeholder="Re-enter password"
                    value={confirmResetPassword}
                    onChange={(e) => setConfirmResetPassword(e.target.value)}
                    required
                    disabled={resetLoading}
                    minLength={6}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-secondary w-1/3 text-xs"
                    onClick={() => setResetStep('request')}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="btn-primary w-2/3 flex justify-center items-center h-10 text-sm font-semibold"
                    disabled={resetLoading}
                  >
                    {resetLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : 'Set New Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
