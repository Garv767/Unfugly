'use client';

import { useState, useEffect } from 'react';
import { Rocket } from 'lucide-react';
import { UnfuglyLog } from '../utils/logger';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function FeedbackFiller({ profileData, courseData, asMenuItem = false }: { profileData: any, courseData: any, asMenuItem?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  
  // New States for Dynamic Extraction
  const [extracting, setExtracting] = useState(false);
  const [formsLoaded, setFormsLoaded] = useState(false);
  const [pendingCourses, setPendingCourses] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [feedbackPreferences, setFeedbackPreferences] = useState<any>({});
  const [submissionStatus, setSubmissionStatus] = useState<any>({});
  
  const [sameCommentForAll, setSameCommentForAll] = useState(true);
  const [globalComment, setGlobalComment] = useState('The course delivery, teaching methodology, and interaction were extremely poor.');

  const [sameRatingForAll, setSameRatingForAll] = useState(true);
  const [globalRating, setGlobalRating] = useState('Poor');

  const [totalFeedbackCount, setTotalFeedbackCount] = useState(0);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchFeedbackCount();
    }
  }, [isOpen]);

  const fetchFeedbackCount = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/feedback/count`, { credentials: 'include', headers: { ...((typeof window !== 'undefined' && localStorage.getItem('unfugly_token')) ? { Authorization: 'Bearer ' + localStorage.getItem('unfugly_token') } : {}) } });
      if (res.status === 401) return;
      const data = await res.json();
      if (data.count !== undefined) setTotalFeedbackCount(data.count);
    } catch (e: any) {
      UnfuglyLog.error('SYS_02', `Failed to fetch feedback count: ${e.message}`);
    }
  };

  const loadPendingForms = async () => {
    setExtracting(true);
    setError('');
    
    try {
      const res = await fetch(`${API_URL}/api/v1/feedback/fields`, { credentials: 'include', headers: { ...((typeof window !== 'undefined' && localStorage.getItem('unfugly_token')) ? { Authorization: 'Bearer ' + localStorage.getItem('unfugly_token') } : {}) } });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch forms');
      }

      setPendingCourses(data.courses || []);
      
      // Initialize preferences (default to Poor)
      const initialPrefs: any = {};
      (data.courses || []).forEach((c: any) => {
        initialPrefs[c.rowIndex] = {
          rating: 'Poor', 
          comment: 'The course delivery, teaching methodology, and interaction were extremely poor.'
        };
      });
      setFeedbackPreferences(initialPrefs);
      setFormsLoaded(true);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setExtracting(false);
    }
  };

  const applyTemplate = (templateName: string) => {
    let ratingValue = 'Excellent';
    let comment = '';
    
    switch (templateName) {
      case 'Excellent':
        ratingValue = 'Excellent';
        comment = 'Excellent course and teaching.';
        break;
      case 'Good':
        ratingValue = 'Good';
        comment = 'Good course, well taught.';
        break;
      case 'Average':
        ratingValue = 'Average';
        comment = 'Average course.';
        break;
    }

    if (sameCommentForAll) {
        setGlobalComment(comment);
    }
    
    if (sameRatingForAll) {
        setGlobalRating(ratingValue);
    }

    const newPrefs = { ...feedbackPreferences };
    pendingCourses.forEach(c => {
      if (!sameRatingForAll) {
         newPrefs[c.rowIndex].rating = ratingValue;
      }
      if (!sameCommentForAll) {
          newPrefs[c.rowIndex].comment = comment;
      }
    });
    setFeedbackPreferences(newPrefs);
  };

  const updateRating = (rowIndex: number, value: string) => {
    const newPrefs = { ...feedbackPreferences };
    if (!newPrefs[rowIndex]) return;
    newPrefs[rowIndex].rating = value;
    setFeedbackPreferences(newPrefs);
  };

  const updateComment = (rowIndex: number, value: string) => {
    const newPrefs = { ...feedbackPreferences };
    if (!newPrefs[rowIndex]) return;
    newPrefs[rowIndex].comment = value;
    setFeedbackPreferences(newPrefs);
  };

  const handleSubmitAll = async () => {
    setLoading(true);
    setError('');
    setSummary(null);

    const submissions = pendingCourses.map(c => ({
      rowIndex: c.rowIndex,
      courseCode: c.courseCode,
      rating: sameRatingForAll ? globalRating : (feedbackPreferences[c.rowIndex]?.rating || globalRating),
      comment: sameCommentForAll ? globalComment : (feedbackPreferences[c.rowIndex]?.comment || globalComment)
    }));

    const newStatus: any = {};
    submissions.forEach(s => newStatus[s.rowIndex] = { status: 'submitting' });
    setSubmissionStatus(newStatus);

    try {
      const res = await fetch(`${API_URL}/api/v1/feedback/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...((typeof window !== 'undefined' && localStorage.getItem('unfugly_token')) ? { Authorization: 'Bearer ' + localStorage.getItem('unfugly_token') } : {}) },
        credentials: 'include',
        body: JSON.stringify({ submissions })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit feedback');
      }

      const finalStatus: any = {};
      data.results.forEach((r: any) => {
        finalStatus[r.rowIndex] = {
          status: r.success ? 'success' : 'error',
          error: r.error
        };
      });
      setSubmissionStatus(finalStatus);
      
      setSummary({
        total: data.total_submitted,
        success: data.success_count,
        failure: data.failure_count
      });
      
      fetchFeedbackCount();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    if (asMenuItem) {
      return (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-200 hover:bg-[#2a2a2a] hover:text-white rounded-lg transition-colors flex items-center gap-3"
        >
          <Rocket className="w-4 h-4 text-purple-400" /> Feedback Fastrack
        </button>
      );
    }
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md shadow flex items-center gap-2 font-medium"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        Auto-Fill Feedback
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 rounded-t-xl shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Feedback Filler
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total feedback forms submitted: {totalFeedbackCount}</p>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800 flex items-start gap-3">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p>{error}</p>
            </div>
          )}

          {!formsLoaded ? (
             <div className="flex flex-col items-center justify-center p-12 text-center">
                 <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md">
                     We will navigate to your Academia feedback page in the background and extract the exact forms that are currently pending.
                 </p>
                 <button
                    onClick={loadPendingForms}
                    disabled={extracting}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 px-8 rounded-lg shadow-lg flex items-center gap-3 transition-transform hover:-translate-y-0.5"
                 >
                    {extracting ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Extracting Pending Forms (~15s)...
                      </>
                    ) : (
                       "Load Pending Feedback Forms"
                    )}
                 </button>
             </div>
          ) : (
            <>
              {summary && (
                <div className="mb-6 p-5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <h3 className="text-lg font-bold text-green-700 dark:text-green-400 mb-2">Submission Complete!</h3>
                  <div className="flex gap-4 text-sm">
                    <span className="bg-green-100 dark:bg-green-800/50 text-green-800 dark:text-green-300 px-3 py-1 rounded-full font-medium">Success: {summary.success}</span>
                    <span className="bg-red-100 dark:bg-red-800/50 text-red-800 dark:text-red-300 px-3 py-1 rounded-full font-medium">Failed: {summary.failure}</span>
                    <span className="bg-blue-100 dark:bg-blue-800/50 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full font-medium">Total: {summary.total}</span>
                  </div>
                </div>
              )}


              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Default Feedback Settings</h3>
                  <div className="flex flex-col gap-2 items-start">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={sameRatingForAll}
                          onChange={(e) => setSameRatingForAll(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Same rating for all subjects</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={sameCommentForAll}
                          onChange={(e) => setSameCommentForAll(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Same comment for all subjects</span>
                      </label>
                  </div>
                </div>

                {sameRatingForAll && (
                  <div className="mb-4">
                     <select 
                        value={globalRating}
                        onChange={e => setGlobalRating(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                     >
                        <option value="Excellent">Excellent</option>
                        <option value="Very Good">Very Good</option>
                        <option value="Good">Good</option>
                        <option value="Average">Average</option>
                        <option value="Poor">Poor (Yes, the default is poor)</option>
                     </select>
                  </div>
                )}

                {sameCommentForAll && (
                  <textarea 
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    rows={2}
                    value={globalComment}
                    onChange={(e) => setGlobalComment(e.target.value)}
                    placeholder="Enter feedback comment here..."
                  />
                )}
              </div>

              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 border-b pb-2 dark:border-gray-700">Extracted Courses ({pendingCourses.length})</h3>
              
              <div className="space-y-4">
                {pendingCourses.map(course => {
                  const status = submissionStatus[course.rowIndex];
                  const prefs = feedbackPreferences[course.rowIndex] || { rating: 'Poor', comment: '' };
                  
                  return (
                    <div key={course.rowIndex} className={`p-4 rounded-xl border ${status?.status === 'success' ? 'border-green-300 bg-green-50 dark:bg-green-900/10' : status?.status === 'error' ? 'border-red-300 bg-red-50 dark:bg-red-900/10' : 'border-gray-200 bg-white dark:bg-gray-800'}`}>
                      
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-gray-800 dark:text-gray-100">{course.courseCode}</h4>
                          <p className="text-xs text-gray-500">
                             Requires {course.requiredFields.length} dropdowns and {course.requiredComments.length} comments to be filled.
                          </p>
                        </div>
                        {status && (
                          <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                            ${status.status === 'success' ? 'bg-green-100 text-green-800' : 
                              status.status === 'error' ? 'bg-red-100 text-red-800' : 
                              'bg-blue-100 text-blue-800 animate-pulse'}`}>
                            {status.status}
                          </div>
                        )}
                      </div>

                      {status?.error && (
                        <div className="text-sm text-red-600 dark:text-red-400 mb-3 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                          Error: {status.error}
                        </div>
                      )}

                      {!sameRatingForAll && (
                      <div className="flex gap-4 items-end">
                          <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">General Rating</label>
                            <select 
                               value={prefs.rating}
                               onChange={e => updateRating(course.rowIndex, e.target.value)}
                               className="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                               <option value="Excellent">Excellent</option>
                               <option value="Very Good">Very Good</option>
                               <option value="Good">Good</option>
                               <option value="Average">Average</option>
                               <option value="Poor">Poor (Yes, the default is poor)</option>
                            </select>
                          </div>
                      </div>
                      )}

                      {!sameCommentForAll && course.requiredComments.length > 0 && (
                        <div className="mt-3">
                          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Specific Comment</label>
                          <textarea
                            className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            rows={1}
                            value={prefs.comment}
                            onChange={(e) => updateComment(course.rowIndex, e.target.value)}
                            placeholder="Comment for this specific course..."
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {pendingCourses.length === 0 && (
                  <div className="text-center p-8 text-gray-500">
                    No pending feedback forms found on Academia!
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {formsLoaded && (
            <div className="p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-xl flex justify-between items-center shrink-0">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Note: Forms are filled sequentially in a headless browser to prevent errors.
              </div>
              <button
                onClick={handleSubmitAll}
                disabled={loading || pendingCourses.length === 0}
                className={`px-6 py-2.5 rounded-lg font-bold text-white shadow-lg transition-all flex items-center gap-2
                  ${loading || pendingCourses.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-xl hover:-translate-y-0.5'}`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    Submit All Feedback
                  </>
                )}
              </button>
            </div>
        )}
      </div>
    </div>
  );
}
