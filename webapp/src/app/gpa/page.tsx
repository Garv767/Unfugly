'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, Award, TrendingUp, Calculator, ChevronDown, ChevronUp, Plus, Trash2, RotateCcw, CheckCircle2 } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { authFetch } from '@/utils/apiClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const GRADE_POINTS: Record<string, number> = {
  'O': 10,
  'A+': 9,
  'A': 8,
  'B+': 7,
  'B': 6,
  'C': 5,
  'P': 4,
  'F': 0,
};

interface CourseItem {
  id: string;
  code: string;
  title: string;
  credit: number;
  grade: string;
}

interface PastSemester {
  semester: number;
  sgpa: string;
  credits: string;
}

export default function GpaPage() {
  const router = useRouter();
  const [netId, setNetId] = useState<string>('');
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [prevCgpa, setPrevCgpa] = useState<string>('');
  const [prevCredits, setPrevCredits] = useState<string>('');
  const [isAccordionOpen, setIsAccordionOpen] = useState(false); // By-default closed accordion
  const [pastSemesters, setPastSemesters] = useState<PastSemester[]>([
    { semester: 1, sgpa: '', credits: '' },
    { semester: 2, sgpa: '', credits: '' },
    { semester: 3, sgpa: '', credits: '' },
    { semester: 4, sgpa: '', credits: '' },
    { semester: 5, sgpa: '', credits: '' },
    { semester: 6, sgpa: '', credits: '' },
    { semester: 7, sgpa: '', credits: '' },
    { semester: 8, sgpa: '', credits: '' },
  ]);

  useEffect(() => {
    // 1. Load user data from localStorage
    const netIdKey = Object.keys(localStorage).find(key => key.startsWith('unfuglyData_') && key !== 'unfuglyData_calendar');
    let loadedCourses: CourseItem[] = [];
    let currentNetId = '';

    if (netIdKey) {
      const cachedStr = localStorage.getItem(netIdKey);
      if (cachedStr) {
        try {
          const parsed = JSON.parse(cachedStr);
          currentNetId = parsed?.netId || '';
          setNetId(currentNetId);

          const rawList = parsed?.attendanceData || parsed?.marksData || [];
          if (Array.isArray(rawList) && rawList.length > 0) {
            const seen = new Set<string>();
            rawList.forEach((c: any, idx: number) => {
              const code = c.courseCode || c.course_code || `COURSE_${idx + 1}`;
              if (!seen.has(code)) {
                seen.add(code);
                loadedCourses.push({
                  id: `course-${idx}`,
                  code: code,
                  title: c.courseTitle || c.course_title || code,
                  credit: Number(c.credit) || 3,
                  grade: 'A+'
                });
              }
            });
          }
        } catch (e) {}
      }
    }

    if (loadedCourses.length > 0) {
      setCourses(loadedCourses);
    } else {
      // Default courses placeholder if none loaded
      setCourses([
        { id: 'c1', code: '21CS301J', title: 'Operating Systems', credit: 4, grade: 'A+' },
        { id: 'c2', code: '21CS302J', title: 'Database Management Systems', credit: 4, grade: 'A+' },
        { id: 'c3', code: '21CS303J', title: 'Design & Analysis of Algorithms', credit: 4, grade: 'A' },
        { id: 'c4', code: '21MA301T', title: 'Discrete Mathematics', credit: 4, grade: 'A' },
        { id: 'c5', code: '21GN301L', title: 'Community Connect', credit: 2, grade: 'O' }
      ]);
    }

    // 2. Load stored GPA records
    if (typeof window !== 'undefined') {
      const savedGpa = localStorage.getItem(`unfugly_gpa_${currentNetId || 'default'}`);
      if (savedGpa) {
        try {
          const parsedGpa = JSON.parse(savedGpa);
          if (parsedGpa.prevCgpa) setPrevCgpa(parsedGpa.prevCgpa);
          if (parsedGpa.prevCredits) setPrevCredits(parsedGpa.prevCredits);
          if (parsedGpa.pastSemesters) setPastSemesters(parsedGpa.pastSemesters);
        } catch (e) {}
      }
    }

    // 3. Fresh bundle fetch
    authFetch(`${API_URL}/api/v2/user/data`)
      .then(res => res.json())
      .then(d => {
        if (d.success && Array.isArray(d.attendanceData) && d.attendanceData.length > 0 && loadedCourses.length === 0) {
          const freshList: CourseItem[] = [];
          const seen = new Set<string>();
          d.attendanceData.forEach((c: any, idx: number) => {
            const code = c.courseCode || c.course_code || `COURSE_${idx + 1}`;
            if (!seen.has(code)) {
              seen.add(code);
              freshList.push({
                id: `course-${idx}`,
                code: code,
                title: c.courseTitle || c.course_title || code,
                credit: Number(c.credit) || 3,
                grade: 'A+'
              });
            }
          });
          if (freshList.length > 0) setCourses(freshList);
        }
      })
      .catch(() => {});
  }, []);

  // Save GPA records to localStorage on change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const payload = {
        prevCgpa,
        prevCredits,
        pastSemesters
      };
      localStorage.setItem(`unfugly_gpa_${netId || 'default'}`, JSON.stringify(payload));
    }
  }, [prevCgpa, prevCredits, pastSemesters, netId]);

  // Current semester SGPA calculation
  const { currentSgpa, currentCredits, totalGradePoints } = useMemo(() => {
    let credSum = 0;
    let gpSum = 0;
    courses.forEach(c => {
      const cred = Number(c.credit) || 0;
      const gp = GRADE_POINTS[c.grade] ?? 0;
      credSum += cred;
      gpSum += cred * gp;
    });
    const sgpa = credSum > 0 ? (gpSum / credSum) : 0;
    return {
      currentSgpa: Number(sgpa.toFixed(2)),
      currentCredits: credSum,
      totalGradePoints: gpSum
    };
  }, [courses]);

  // Cumulative CGPA calculation
  const predictedCgpa = useMemo(() => {
    const pCgpa = parseFloat(prevCgpa);
    const pCreds = parseFloat(prevCredits);

    if (isNaN(pCgpa) || isNaN(pCreds) || pCreds <= 0) {
      return null;
    }

    const prevPoints = pCgpa * pCreds;
    const totalPoints = prevPoints + totalGradePoints;
    const totalCreditsSum = pCreds + currentCredits;

    if (totalCreditsSum <= 0) return null;
    const result = totalPoints / totalCreditsSum;
    return Number(result.toFixed(2));
  }, [prevCgpa, prevCredits, totalGradePoints, currentCredits]);

  // Handle grade change
  const handleGradeChange = (id: string, newGrade: string) => {
    setCourses(prev => prev.map(c => c.id === id ? { ...c, grade: newGrade } : c));
  };

  // Handle credit change
  const handleCreditChange = (id: string, newCredit: number) => {
    setCourses(prev => prev.map(c => c.id === id ? { ...c, credit: newCredit } : c));
  };

  // Add course
  const addCourse = () => {
    const newId = `custom-${Date.now()}`;
    setCourses(prev => [
      ...prev,
      { id: newId, code: 'NEW_COURSE', title: 'Custom Elective / Course', credit: 3, grade: 'A+' }
    ]);
  };

  // Remove course
  const removeCourse = (id: string) => {
    setCourses(prev => prev.filter(c => c.id !== id));
  };

  // Past semester input change
  const handlePastSemChange = (index: number, field: 'sgpa' | 'credits', value: string) => {
    setPastSemesters(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Calculate past cumulative from accordion table
  const computedPastSummary = useMemo(() => {
    let totCreds = 0;
    let totPoints = 0;
    let filledCount = 0;
    pastSemesters.forEach(s => {
      const sg = parseFloat(s.sgpa);
      const cr = parseFloat(s.credits);
      if (!isNaN(sg) && !isNaN(cr) && cr > 0) {
        totCreds += cr;
        totPoints += sg * cr;
        filledCount++;
      }
    });
    const cg = totCreds > 0 ? (totPoints / totCreds).toFixed(2) : '0.00';
    return { totCreds, cg, filledCount };
  }, [pastSemesters]);

  const applyPastToCumulative = () => {
    if (computedPastSummary.filledCount > 0) {
      setPrevCgpa(computedPastSummary.cg);
      setPrevCredits(String(computedPastSummary.totCreds));
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col font-sans pb-24 lg:pb-12">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-[#1e1e1e]/80 backdrop-blur-xl border-b border-[#333] px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors bg-[#2a2a2a] px-3 py-1.5 rounded-lg border border-[#444] cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </button>
        <h1 className="text-base font-bold text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" /> SGPA & CGPA Simulator
        </h1>
        <div className="w-20"></div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl w-full mx-auto px-4 mt-6 space-y-6">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Current Predicted SGPA */}
          <div className="bg-gradient-to-br from-[#1e1e1e] to-[#252525] border border-[#333] rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Semester SGPA</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#1E88E5]/20 text-[#64B5F6] border border-[#1E88E5]/30">
                {currentCredits} Credits
              </span>
            </div>
            <div className="flex items-baseline gap-3 mt-3">
              <span className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200">
                {currentSgpa.toFixed(2)}
              </span>
              <span className="text-sm text-gray-400 font-medium">/ 10.00</span>
            </div>
            <div className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Based on {courses.length} enrolled subjects</span>
            </div>
          </div>

          {/* Cumulative CGPA Simulator */}
          <div className="bg-gradient-to-br from-[#1e1e1e] to-[#252525] border border-[#333] rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Projected Cumulative CGPA</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Overall
              </span>
            </div>
            <div className="flex items-baseline gap-3 mt-3">
              <span className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
                {predictedCgpa !== null ? predictedCgpa.toFixed(2) : (prevCgpa ? parseFloat(prevCgpa).toFixed(2) : currentSgpa.toFixed(2))}
              </span>
              <span className="text-sm text-gray-400 font-medium">/ 10.00</span>
            </div>
            <div className="text-xs text-gray-400 mt-2">
              {predictedCgpa !== null && prevCgpa ? (
                <span className="text-emerald-400 font-semibold">
                  Shift: {prevCgpa} → {predictedCgpa.toFixed(2)} ({predictedCgpa >= parseFloat(prevCgpa) ? `+${(predictedCgpa - parseFloat(prevCgpa)).toFixed(2)}` : (predictedCgpa - parseFloat(prevCgpa)).toFixed(2)})
                </span>
              ) : (
                <span>Enter previous CGPA below to simulate shift</span>
              )}
            </div>
          </div>
        </div>

        {/* Previous CGPA Inputs Card */}
        <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="w-4 h-4 text-[#1E88E5]" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Previous Cumulative Record</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 font-medium mb-1">Previous CGPA (e.g. 8.75)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={prevCgpa}
                onChange={(e) => setPrevCgpa(e.target.value)}
                placeholder="e.g. 8.50"
                className="w-full bg-[#121212] border border-[#444] rounded-lg px-3.5 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-[#1E88E5]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 font-medium mb-1">Total Previous Credits Earned (e.g. 60)</label>
              <input
                type="number"
                min="0"
                value={prevCredits}
                onChange={(e) => setPrevCredits(e.target.value)}
                placeholder="e.g. 60"
                className="w-full bg-[#121212] border border-[#444] rounded-lg px-3.5 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-[#1E88E5]"
              />
            </div>
          </div>
        </div>

        {/* By-Default CLOSED Accordion: Previous Semesters (SGPA & CGPA Record) */}
        <div className="bg-[#1e1e1e] border border-[#333] rounded-xl shadow-lg overflow-hidden">
          <button
            onClick={() => setIsAccordionOpen(!isAccordionOpen)}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-[#252525] transition-colors cursor-pointer select-none"
          >
            <div className="flex items-center gap-2.5">
              <Award className="w-4 h-4 text-purple-400" />
              <div>
                <span className="text-sm font-bold text-white block">Previous Semesters Record (Semester 1–8)</span>
                <span className="text-xs text-gray-400">Expandable history & cumulative auto-calculation</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <span className="text-xs font-semibold">{isAccordionOpen ? 'Hide' : 'Show Details'}</span>
              {isAccordionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {isAccordionOpen && (
            <div className="px-5 pb-5 pt-2 border-t border-[#333] space-y-4">
              <p className="text-xs text-gray-400">
                Log each past semester's SGPA and credits earned. They persist in your browser so you don't have to re-enter them.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {pastSemesters.map((sem, idx) => (
                  <div key={sem.semester} className="p-3 rounded-lg bg-[#252525] border border-[#3a3a3a]">
                    <div className="text-xs font-bold text-white mb-2">Semester {sem.semester}</div>
                    <div className="space-y-1.5">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        placeholder="SGPA"
                        value={sem.sgpa}
                        onChange={(e) => handlePastSemChange(idx, 'sgpa', e.target.value)}
                        className="w-full bg-[#121212] border border-[#444] rounded px-2.5 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-[#1E88E5]"
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder="Credits"
                        value={sem.credits}
                        onChange={(e) => handlePastSemChange(idx, 'credits', e.target.value)}
                        className="w-full bg-[#121212] border border-[#444] rounded px-2.5 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-[#1E88E5]"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {computedPastSummary.filledCount > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 bg-[#252525] border border-purple-500/30 rounded-xl gap-3">
                  <div>
                    <span className="text-xs text-gray-400 block">Computed Cumulative from Above Semesters:</span>
                    <span className="text-lg font-bold text-purple-300">
                      CGPA: {computedPastSummary.cg} ({computedPastSummary.totCreds} credits)
                    </span>
                  </div>
                  <button
                    onClick={applyPastToCumulative}
                    className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Apply as Previous CGPA
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Current Semester Course List & Grade Selectors */}
        <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Current Semester Courses</h2>
              <p className="text-xs text-gray-400 mt-0.5">Select your expected or target grade for each subject</p>
            </div>
            <button
              onClick={addCourse}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#333] border border-[#444] rounded-lg text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#1E88E5]" /> Add Subject
            </button>
          </div>

          <div className="space-y-2.5">
            {courses.map((c) => (
              <div
                key={c.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-xl bg-[#252525] border border-[#3a3a3a] gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#64B5F6]">{c.code}</span>
                    <span className="text-[11px] text-gray-400 px-2 py-0.5 rounded bg-[#1e1e1e] border border-[#444]">
                      {c.credit} Credits
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-white truncate mt-0.5">{c.title}</div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {/* Credit Selector */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400 hidden sm:inline">Cr:</span>
                    <select
                      value={c.credit}
                      onChange={(e) => handleCreditChange(c.id, Number(e.target.value))}
                      className="bg-[#121212] border border-[#444] text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#1E88E5]"
                    >
                      {[1, 2, 3, 4, 5].map(cr => (
                        <option key={cr} value={cr}>{cr}</option>
                      ))}
                    </select>
                  </div>

                  {/* Grade Selector */}
                  <select
                    value={c.grade}
                    onChange={(e) => handleGradeChange(c.id, e.target.value)}
                    className="bg-[#121212] border border-[#444] text-amber-400 font-bold text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-400"
                  >
                    {Object.keys(GRADE_POINTS).map(g => (
                      <option key={g} value={g}>
                        {g} ({GRADE_POINTS[g]} pts)
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => removeCourse(c.id)}
                    className="p-1.5 text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                    title="Remove subject"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
