'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronLeft, Rocket, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const RATINGS = ['Excellent', 'Very Good', 'Good', 'Average', 'Poor'];

export default function FeedbackPage() {
  const router = useRouter();

  const [extracting, setExtracting] = useState(false);
  const [formsLoaded, setFormsLoaded] = useState(false);
  const [pendingCourses, setPendingCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedbackPrefs, setFeedbackPrefs] = useState<any>({});
  const [submissionStatus, setSubmissionStatus] = useState<any>({});
  const [sameRatingForAll, setSameRatingForAll] = useState(true);
  const [sameCommentForAll, setSameCommentForAll] = useState(true);
  const [globalRating, setGlobalRating] = useState('Excellent');
  const [globalComment, setGlobalComment] = useState('Excellent course and teaching.');
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/feedback/count`, { credentials: 'include' })
      .then(r => r.json()).then(d => { if (d.count !== undefined) setTotalCount(d.count); }).catch(() => {});
  }, []);

  const loadForms = async () => {
    setExtracting(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/v1/feedback/fields`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch forms');
      setPendingCourses(data.courses || []);
      const prefs: any = {};
      (data.courses || []).forEach((c: any) => {
        prefs[c.rowIndex] = { rating: 'Excellent', comment: 'Excellent course and teaching.' };
      });
      setFeedbackPrefs(prefs);
      setFormsLoaded(true);
    } catch (e: any) { setError(e.message); }
    finally { setExtracting(false); }
  };

  const handleSubmit = async () => {
    setLoading(true); setError(''); setSummary(null);
    const submissions = pendingCourses.map(c => ({
      rowIndex: c.rowIndex, courseCode: c.courseCode,
      rating: sameRatingForAll ? globalRating : (feedbackPrefs[c.rowIndex]?.rating || globalRating),
      comment: sameCommentForAll ? globalComment : (feedbackPrefs[c.rowIndex]?.comment || globalComment),
    }));
    const statusInit: any = {};
    submissions.forEach(s => statusInit[s.rowIndex] = { status: 'submitting' });
    setSubmissionStatus(statusInit);
    try {
      const res = await fetch(`${API_URL}/api/v1/feedback/batch`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ submissions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      const finalStatus: any = {};
      data.results.forEach((r: any) => { finalStatus[r.rowIndex] = { status: r.success ? 'success' : 'error', error: r.error, filledCount: r.filledCount }; });
      setSubmissionStatus(finalStatus);
      setSummary({ total: data.total_submitted, success: data.success_count, failure: data.failure_count, validationWarnings: data.validation_warnings });
      fetch(`${API_URL}/api/v1/feedback/count`, { credentials: 'include' })
        .then(r => r.json()).then(d => { if (d.count !== undefined) setTotalCount(d.count); }).catch(() => {});
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  // ── Shared UI Fragments ────────────────────────────────────────────────────

  const RatingPills = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div className="flex flex-wrap gap-2">
      {RATINGS.map(r => (
        <button key={r} onClick={() => onChange(r)}
          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
            value === r
              ? 'bg-[#1E88E5] border-[#1E88E5] text-white shadow-[0_2px_10px_rgba(30,136,229,0.35)]'
              : 'bg-transparent border-[#333] text-gray-400 hover:border-[#555]'
          }`}>
          {r}
        </button>
      ))}
    </div>
  );

  const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) => (
    <label className="flex items-center justify-between cursor-pointer select-none">
      <span className="text-sm text-gray-300">{label}</span>
      <div onClick={onChange} className={`w-11 h-6 rounded-full transition-colors duration-200 relative flex-shrink-0 ${checked ? 'bg-[#1E88E5]' : 'bg-[#333]'}`}>
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
    </label>
  );

  const SettingsPanel = () => (
    <div className="bg-[#1e1e1e] lg:bg-transparent border border-[#2a2a2a] lg:border-none rounded-2xl lg:rounded-none p-4 lg:p-0 space-y-4">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:block mb-4">Default Settings</h3>
      
      <div className="space-y-3">
        <Toggle checked={sameRatingForAll} onChange={() => setSameRatingForAll(v => !v)} label="Same rating for all" />
        {sameRatingForAll && <RatingPills value={globalRating} onChange={setGlobalRating} />}
      </div>

      <div className="space-y-3">
        <Toggle checked={sameCommentForAll} onChange={() => setSameCommentForAll(v => !v)} label="Same comment for all" />
        {sameCommentForAll && (
          <textarea rows={3} value={globalComment} onChange={e => setGlobalComment(e.target.value)}
            className="w-full bg-[#2a2a2a] border border-[#333] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#1E88E5] resize-none placeholder-gray-600"
            placeholder="Comment for all courses..." />
        )}
      </div>
    </div>
  );

  const CourseCard = ({ course }: { course: any }) => {
    const status = submissionStatus[course.rowIndex];
    const prefs = feedbackPrefs[course.rowIndex] || { rating: 'Excellent', comment: '' };
    const isSuccess = status?.status === 'success';
    const isError = status?.status === 'error';
    const isSubmitting = status?.status === 'submitting';

    return (
      <div className={`rounded-2xl border p-4 transition-all ${
        isSuccess ? 'border-green-500/30 bg-green-900/10'
        : isError ? 'border-red-500/30 bg-red-900/10'
        : 'border-[#2a2a2a] bg-[#1e1e1e]'
      }`}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h4 className="font-bold text-white text-sm">{course.courseCode}</h4>
            <p className="text-xs text-gray-500 mt-0.5">
              {course.requiredFields.length} dropdowns · {course.requiredComments.length} comments
            </p>
          </div>
          {status && (
            <span className={`shrink-0 flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
              isSuccess ? 'bg-green-900/40 text-green-400'
              : isError ? 'bg-red-900/40 text-red-400'
              : 'bg-blue-900/40 text-blue-400 animate-pulse'
            }`}>
              {isSubmitting ? <><Loader2 size={10} className="animate-spin"/>Sending</>
               : isSuccess ? <><CheckCircle2 size={10}/>{status.filledCount !== undefined ? `Filled ${status.filledCount}` : 'Done'}</>
               : <><XCircle size={10}/>Error</>}
            </span>
          )}
        </div>
        {isError && status.error && (
          <p className="text-xs text-red-400 mb-2 bg-red-900/20 px-2 py-1 rounded-lg">{status.error}</p>
        )}
        {!sameRatingForAll && (
          <div className="mt-3">
            <RatingPills value={prefs.rating} onChange={v =>
              setFeedbackPrefs((prev: any) => ({ ...prev, [course.rowIndex]: { ...prev[course.rowIndex], rating: v } }))}
            />
          </div>
        )}
        {!sameCommentForAll && course.requiredComments.length > 0 && (
          <textarea rows={1} value={prefs.comment}
            onChange={e => setFeedbackPrefs((prev: any) => ({ ...prev, [course.rowIndex]: { ...prev[course.rowIndex], comment: e.target.value } }))}
            className="mt-3 w-full bg-[#2a2a2a] border border-[#333] rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-[#1E88E5] resize-none"
            placeholder="Comment for this course..." />
        )}
      </div>
    );
  };

  const SubmitButton = ({ className = '' }: { className?: string }) => (
    <button onClick={handleSubmit}
      disabled={loading || pendingCourses.length === 0}
      className={`py-4 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-3 transition-all ${
        loading || pendingCourses.length === 0
          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
          : 'bg-[#1E88E5] shadow-[0_4px_24px_rgba(30,136,229,0.45)] active:scale-[0.97] hover:bg-[#1565C0]'
      } ${className}`}>
      {loading ? (
        <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
        </svg>Submitting to Academia...</>
      ) : (
        <><Rocket size={20} />Submit All {pendingCourses.length} Forms</>
      )}
    </button>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#121212] text-white font-sans flex flex-col lg:flex-row overflow-hidden">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex w-[280px] xl:w-[320px] bg-[#1a1a1a] m-4 mr-2 rounded-2xl p-6 flex-col flex-shrink-0 h-[calc(100vh-32px)] overflow-y-auto custom-scrollbar border border-[#222]">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-9 h-9 rounded-xl bg-[#1E88E5]/15 flex items-center justify-center">
            <Rocket size={18} className="text-[#1E88E5]" />
          </div>
          <h1 className="text-lg font-bold text-white">Feedback Fastrack</h1>
        </div>
        <p className="text-xs text-gray-500 mb-6 ml-[46px]">{totalCount} forms submitted</p>

        {/* Server disclaimer */}
        <div className="flex items-start gap-2 bg-amber-900/20 border border-amber-500/25 rounded-xl p-3 mb-6">
          <span className="text-amber-400 text-base shrink-0">⚡</span>
          <p className="text-amber-300/70 text-xs leading-relaxed">
            Uses a headless browser. Expect <strong>15–30s per course</strong>. Keep this page open.
          </p>
        </div>

        {formsLoaded && <SettingsPanel />}

        <div className="mt-auto pt-4">
          <button onClick={() => router.push('/dashboard')}
            className="w-full text-center px-4 py-3 bg-[#121212] hover:bg-[#222] border border-[#333] rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 text-white cursor-pointer">
            ← Back to Dashboard
          </button>
        </div>
      </aside>

      {/* ── Mobile Header ── */}
      <header className="lg:hidden sticky top-0 z-30 bg-[#121212]/95 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push('/dashboard')} className="p-2 rounded-full hover:bg-white/10 transition">
          <ChevronLeft size={22} className="text-white" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Rocket size={18} className="text-[#1E88E5]" />
          <h1 className="text-base font-bold">Feedback Fastrack</h1>
        </div>
        <span className="text-xs text-[#64b5f6] bg-[#1E88E5]/10 border border-[#1E88E5]/25 px-2.5 py-1 rounded-full font-medium">
          {totalCount} done
        </span>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto lg:m-4 lg:ml-2 lg:bg-[#1a1a1a] lg:rounded-2xl lg:border lg:border-[#222] custom-scrollbar
                       pb-32 lg:pb-8 px-4 lg:px-8 pt-4 lg:pt-8 h-auto lg:h-[calc(100vh-32px)]">

        {/* Alerts */}
        <div className="lg:hidden flex items-start gap-2.5 bg-amber-900/20 border border-amber-500/25 rounded-xl p-3 mb-4">
          <span className="text-amber-400 shrink-0">⚡</span>
          <p className="text-amber-300/80 text-xs leading-relaxed">
            Uses a headless browser — <strong>15–30s per course</strong>. Keep this page open.
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 bg-red-900/20 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm">
            <XCircle size={16} className="shrink-0 mt-0.5" /><p>{error}</p>
          </div>
        )}

        {summary && (
          <div className="mb-6 bg-green-900/15 border border-green-500/25 rounded-2xl p-5">
            <h3 className="text-green-400 font-bold text-base mb-2 flex items-center gap-2"><CheckCircle2 size={18}/> Submission Complete!</h3>
            <div className="flex flex-col gap-3">
              <div className="flex gap-2 flex-wrap">
                <span className="bg-green-900/40 text-green-300 px-3 py-1 rounded-full text-xs font-bold">✓ {summary.success} succeeded</span>
                {summary.failure > 0 && <span className="bg-red-900/40 text-red-300 px-3 py-1 rounded-full text-xs font-bold">✕ {summary.failure} failed</span>}
              </div>
              {summary.validationWarnings !== undefined && (
                <div className="bg-amber-900/30 border border-amber-500/40 rounded-xl p-3 flex gap-2">
                  <span className="text-amber-500">⚠️</span>
                  <p className="text-xs text-amber-200">
                    Validation Warnings Found: <strong>{summary.validationWarnings}</strong>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {!formsLoaded ? (
          /* ── Load Screen ── */
          <div className="flex flex-col items-center justify-center text-center pt-12 lg:pt-20 px-6">
            <div className="w-20 h-20 rounded-2xl bg-[#1E88E5]/10 border border-[#1E88E5]/20 flex items-center justify-center mb-6">
              <Rocket size={36} className="text-[#1E88E5]" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Auto-Fill Feedback</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-8 max-w-sm">
              We'll navigate to your Academia feedback page in the background and extract all pending forms automatically.
            </p>
            <button onClick={loadForms} disabled={extracting}
              className={`w-full max-w-sm py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-3 transition-all
                ${extracting ? 'bg-[#1E88E5]/50 cursor-not-allowed' : 'bg-[#1E88E5] hover:bg-[#1565C0] shadow-[0_4px_20px_rgba(30,136,229,0.4)] active:scale-[0.97]'}`}>
              {extracting ? (
                <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>Extracting Forms (~15s)...</>
              ) : (
                <><Rocket size={20} />Load Pending Feedback Forms</>
              )}
            </button>
          </div>
        ) : (
          /* ── Forms View ── */
          <>
            {/* Mobile settings panel */}
            <div className="lg:hidden mb-4"><SettingsPanel /></div>

            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-0.5">
              Pending Courses ({pendingCourses.length})
            </h3>

            <div className="space-y-3">
              {pendingCourses.length === 0 && (
                <div className="text-center py-12 text-gray-500 text-sm bg-[#1e1e1e] rounded-2xl border border-[#2a2a2a]">
                  🎉 No pending feedback forms found!
                </div>
              )}
              {pendingCourses.map(course => <CourseCard key={course.rowIndex} course={course} />)}
            </div>

            {/* Desktop submit */}
            <div className="hidden lg:block mt-6">
              <SubmitButton className="w-full" />
            </div>
          </>
        )}
      </main>

      {/* Mobile sticky submit */}
      {formsLoaded && (
        <div className="lg:hidden fixed bottom-[72px] left-0 right-0 z-30 px-4 pb-2">
          <SubmitButton className="w-full" />
        </div>
      )}

      {/* Bottom Nav (mobile only) */}
      <BottomNav />
    </div>
  );
}
