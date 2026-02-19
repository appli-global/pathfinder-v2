import React, { useState } from 'react';
import { AnalysisResult } from '../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
// html2pdf imported dynamically

interface ResultsViewProps {
  data: AnalysisResult;
  onRestart: () => void;
}

// Helper to strip Markdown and clean text
const cleanText = (text: string | undefined) => {
  if (!text) return "";
  return text
    .replace(/[*_`#]/g, '') // Remove Markdown characters
    .replace(/\s+/g, ' ')   // Normalize whitespace
    .trim();
};

export const ResultsView: React.FC<ResultsViewProps> = ({ data, onRestart }) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); // Audio State

  // Gated Results State
  const [isLocked, setIsLocked] = useState(true);
  const [userName, setUserName] = useState('');
  const [userContact, setUserContact] = useState('');
  const [contactError, setContactError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const shareUrl = window.location.href;
  const archetypeTitle = cleanText(data.archetype.title);
  const shareText = `I just discovered my professional archetype is "${archetypeTitle}" on Pathfinder AI! 🚀`;

  // Update data.userData when unlocked so it shows in the header
  const displayData = {
    ...data,
    userData: !isLocked ? { name: userName, contact: userContact } : undefined
  };

  const handleUnlock = async () => {
    // Validation
    const phoneRegex = /^\d{10}$/;
    if (!userName.trim()) {
      setContactError("Please enter your name.");
      return;
    }
    if (!phoneRegex.test(userContact)) {
      setContactError("Please enter a valid 10-digit phone number.");
      return;
    }

    setContactError("");
    setIsSubmitting(true);

    try {
      const payload = { name: userName, contact: userContact };

      // Persist Data via Backend
      await fetch('/api/save-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Unlock
      setIsLocked(false);
    } catch (e) {
      console.error("Save failed", e);
      // Even if save fails, we might want to unlock or show error? 
      // For now, let's unlock anyway to not block user, but log error.
      setIsLocked(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAudio = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);

    } else {
      // Use the AI-generated script, or a safe fallback if missing
      const script = data.audioScript || `You are identified as ${data.archetype.title}. Your top recommendation is ${data.recommendations[0]?.courseName}.`;

      const utterance = new SpeechSynthesisUtterance(script);

      // Select the best available voice (Prioritize Google, Premium, or Natural)
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v =>
        (v.name.includes('Google') && v.lang.includes('en-US')) ||
        v.name.includes('Premium') ||
        v.name.includes('Enhanced') ||
        v.name.includes('Natural')
      ) || voices.find(v => v.lang.includes('en-US'));

      if (preferredVoice) utterance.voice = preferredVoice;

      // Human-like tuning
      utterance.rate = 0.95; // Slightly slower for better enunciation
      utterance.pitch = 1.0; // Neutral pitch

      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.cancel(); // Clear any pending
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    // Stop audio if playing when downloading starts
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    setIsGeneratingPdf(true);

    try {
      // 1. Dynamic Import for Robustness
      // @ts-ignore
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = (html2pdfModule.default || html2pdfModule) as any;

      // 2. Target Element
      const element = document.getElementById('results-container');
      if (!element) throw new Error("Results container not found");

      const originalScrollPos = window.scrollY;
      window.scrollTo(0, 0);
      element.classList.add('pdf-export-mode');

      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `Pathfinder_Report_${archetypeTitle.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg' as 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false, // Turn off logging for prod
          scrollY: 0,
          windowWidth: 794,
          x: 0, y: 0
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      };

      // Wait for layout shift
      await new Promise(resolve => setTimeout(resolve, 800));

      // Execute
      await html2pdf().set(opt).from(element).save();

      // Cleanup
      element.classList.remove('pdf-export-mode');
      window.scrollTo(0, originalScrollPos);
      setIsGeneratingPdf(false);

    } catch (err) {
      console.error("Advanced PDF generation failed:", err);
      // FALLBACK TO NATIVE PRINT
      setIsGeneratingPdf(false);

      const element = document.getElementById('results-container');
      if (element) element.classList.remove('pdf-export-mode'); // Ensure clean state

      alert("Advanced PDF Generator failed. Switching to Native Print Mode...");
      window.print();
    }
  };

  const handleInstagramShare = () => {
    const caption = `${shareText}\n\nCheck it out here: ${shareUrl}`;
    navigator.clipboard.writeText(caption).then(() => {
      alert("Caption copied to clipboard! Open Instagram to paste it in your Story or Post.");
    });
  };

  return (
    <>
      {/* OVERLAY: Hides the UI shift during PDF generation */}
      {isGeneratingPdf && (
        <div className="fixed inset-0 z-[10000] bg-white flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-pink-200 border-t-[#ED1164] rounded-full animate-spin mb-4"></div>
          <h2 className="text-xl font-bold text-slate-800">Generating Report...</h2>
          <p className="text-slate-500">Please wait while we format your PDF.</p>
        </div>
      )}

      {/* GATED MODAL OVERLAY */}
      {isLocked && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4">
          {/* Dark Backdrop */}
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>

          {/* Modal Content */}
          <div className="bg-white rounded-[2.5rem] p-8 md:p-12 w-full max-w-lg relative z-10 shadow-2xl animate-fade-in-up border border-white/50">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔒</span>
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Your Analysis is Ready!</h2>
              <p className="text-slate-500">Enter your details to unlock your personalized career report.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Full Name</label>
                <input
                  type="text"
                  className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-[#ED1164] focus:bg-white focus:ring-4 focus:ring-[#ED1164]/10 outline-none transition-all font-medium text-slate-900"
                  placeholder="e.g. Alex Johnson"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Contact Number</label>
                <input
                  type="tel"
                  className={`w-full p-4 bg-slate-50 border-2 rounded-xl focus:bg-white focus:ring-4 outline-none transition-all font-medium text-slate-900 ${contactError && !/^\d{10}$/.test(userContact) ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-[#ED1164] focus:ring-[#ED1164]/10'}`}
                  placeholder="e.g. 9876543210"
                  value={userContact}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 10) setUserContact(val);
                    if (contactError) setContactError('');
                  }}
                />
                {contactError && <p className="text-red-500 text-sm mt-2 ml-1 font-medium">{contactError}</p>}
              </div>

              <button
                onClick={handleUnlock}
                disabled={isSubmitting}
                className="w-full bg-[#ED1164] hover:bg-[#C40E53] text-white font-bold py-4 rounded-xl shadow-lg shadow-pink-500/30 hover:shadow-pink-500/40 hover:-translate-y-0.5 transition-all mt-4 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {isSubmitting ? 'Unlocking...' : 'Unlock My Results'}
              </button>

              <p className="text-xs text-center text-slate-400 mt-4">
                We value your privacy. Your details are safe with us.
              </p>
            </div>
          </div>
        </div>
      )}

      <div
        id="results-container"
        className={`max-w-6xl mx-auto space-y-8 animate-fade-in pb-12 print:space-y-4 print:pb-0 transition-all duration-700 ${isLocked ? 'blur-xl pointer-events-none select-none opacity-50 overflow-hidden h-screen' : ''}`}
      >

        {/* User Profile Header (Visible mostly in PDF) */}
        {displayData.userData && (
          <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{displayData.userData.name}</h2>
              <p className="text-slate-500">{displayData.userData.contact}</p>
            </div>
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Assessment Report</p>
              <p className="text-sm text-slate-500">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        )}

        {/* Header Section - Archetype */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl shadow-slate-200/50 overflow-hidden border border-white relative">
          <div className="absolute top-0 right-0 w-96 h-96 bg-pink-100/50 rounded-full blur-[80px] pointer-events-none"></div>

          <div className="p-8 md:p-12 relative z-10">
            <div className="header-flex flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
              <div className="header-content flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 bg-pink-50 text-[#C40E53] text-xs font-bold uppercase tracking-widest rounded-full border border-pink-100">Archetype Identified</span>

                  {/* Audio Button */}
                  <button
                    onClick={toggleAudio}
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all border ${isSpeaking
                      ? "bg-[#C40E53] text-white border-[#C40E53] animate-pulse"
                      : "bg-white text-slate-500 border-slate-200 hover:border-pink-300 hover:text-pink-600"
                      }`}
                  >
                    {isSpeaking ? (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
                        <span>Stop Audio</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                        <span>Listen to Overview</span>
                      </>
                    )}
                  </button>
                </div>
                <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 mb-6 tracking-tight break-words hyphens-auto">{archetypeTitle}</h1>
                <p className="text-lg md:text-xl text-slate-600 max-w-3xl leading-relaxed font-light">
                  {cleanText(displayData.archetype.description)}
                </p>
              </div>
              {/* Score Card */}
              <div className="hidden md:flex flex-col items-center justify-center bg-white rounded-2xl p-6 border border-slate-100 shadow-xl shadow-slate-200 w-32 h-32">
                <span className="text-4xl font-bold text-[#ED1164]">98%</span>
                <span className="text-xs text-slate-400 uppercase text-center mt-1 font-semibold">Match Score</span>
              </div>
            </div>
          </div>

          {/* Drivers Grid */}
          <div className="drivers-grid grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/50">
            {[
              { label: "Academic Driver", value: displayData.archetype.drivers.academic, icon: "📚" },
              { label: "Passion Driver", value: displayData.archetype.drivers.passion, icon: "🔥" },
              { label: "Cognitive Style", value: displayData.archetype.drivers.cognitive, icon: "🧠" },
              { label: "Preferred Domain", value: displayData.archetype.drivers.domain, icon: "🌍" },
              { label: "Core Motivation", value: displayData.archetype.drivers.motivation, icon: "⭐" },
            ].map((item, idx) => (
              <div key={idx} className="p-6 hover:bg-white transition-colors">
                <div className="text-2xl mb-3">{item.icon}</div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{item.label}</h4>
                <p className="text-slate-800 font-semibold text-sm leading-snug">{cleanText(item.value)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Vision Board Section */}
        <div className="bg-gradient-to-br from-pink-50 to-white backdrop-blur-xl rounded-[2rem] shadow-xl shadow-pink-100/50 p-8 md:p-10 border border-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-[#ED1164] rounded-lg shadow-lg shadow-pink-200">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Your Career Vision Board</h3>
            </div>

            <div className="vision-grid grid md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm h-full">
                  <h4 className="text-[#ED1164] text-xs font-bold uppercase mb-4 tracking-widest">A Day in Your Future Life</h4>
                  <p className="text-xl leading-relaxed text-slate-700 font-light italic">
                    "{cleanText(displayData.visionBoard.futureSelf)}"
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex-1 flex flex-col justify-center">
                  <h4 className="text-[#ED1164] text-xs font-bold uppercase mb-4 text-center tracking-widest">Core Themes</h4>
                  <div className="flex flex-wrap justify-center gap-2">
                    {displayData.visionBoard.keyThemes.map((theme, i) => (
                      <span key={i} className="px-4 py-2 bg-slate-50 rounded-lg text-sm font-semibold border border-slate-100 text-slate-600">
                        {cleanText(theme)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bg-[#ED1164] rounded-2xl p-6 shadow-lg shadow-pink-200 flex items-center justify-center text-center">
                  <p className="text-lg font-serif italic text-white/90">"{cleanText(displayData.visionBoard.quote)}"</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="content-grid grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Col: Skill Signature Chart */}
          <div className="skill-section lg:col-span-1 bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 p-8 flex flex-col border border-white">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Skill Signature</h3>
            <p className="text-slate-500 text-sm mb-8">A visual map of your core aptitudes.</p>

            <div className="chart-container flex-grow h-72 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={displayData.skillSignature}>
                  <PolarGrid stroke="#cbd5e1" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="Aptitude"
                    dataKey="A"
                    stroke="#ED1164"
                    strokeWidth={3}
                    fill="#ED1164"
                    fillOpacity={0.3}
                    isAnimationActive={false}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right Col: Recommendations */}
          <div className="rec-section lg:col-span-2 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-emerald-100 text-emerald-600 p-2 rounded-lg border border-emerald-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </span>
              <h3 className="text-2xl font-bold text-slate-900">Top Recommendations</h3>
            </div>

            <div className="space-y-4">
              {displayData.recommendations.map((course, idx) => (
                <div key={idx} className="rec-card bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6 border-l-4 border-pink-500 border-y border-r border-slate-100 hover:border-pink-300 transition-all duration-300 group shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      {course.degree && (
                        <span className="text-xs font-bold text-[#ED1164] uppercase tracking-widest mb-1 block">
                          {cleanText(course.degree)}
                        </span>
                      )}
                      <h4 className="text-xl font-bold text-slate-900">{cleanText(course.courseName)}</h4>
                    </div>
                    <span className="bg-pink-50 text-[#C40E53] border border-pink-100 text-xs font-bold px-3 py-1 rounded-full">
                      {course.relevanceScore}% Match
                    </span>
                  </div>
                  <p className="text-slate-600 mb-5 leading-relaxed">{cleanText(course.matchReason)}</p>
                  <div className="bg-slate-50 rounded-xl p-4 flex items-start gap-3 border border-slate-100">
                    <svg className="w-5 h-5 text-pink-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">AI Insight</p>
                      <p className="text-sm text-slate-500 italic">{cleanText(course.dataInsight)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Alternative Pathways */}
            <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-md shadow-slate-200/30 mt-8">
              <h4 className="text-lg font-bold text-slate-900 mb-6">Alternative Pathways</h4>
              <div className="pathways-grid grid md:grid-cols-2 gap-4">
                {displayData.alternativePathways.map((path, idx) => (
                  <div key={idx} className="bg-slate-50 p-5 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors">
                    <span className="text-xs font-bold text-[#ED1164] uppercase tracking-wide mb-2 block">{cleanText(path.focus)}</span>
                    <h5 className="font-bold text-slate-800 mb-1">{cleanText(path.courseName)}</h5>
                    <p className="text-xs text-slate-500">{cleanText(path.insight)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Community Insights */}
        <div className="stats-grid bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 p-10 border border-slate-100">
          <div className="flex items-center gap-3 mb-8">
            <span className="text-2xl">👥</span>
            <h3 className="text-2xl font-bold text-slate-900">Community Insights</h3>
          </div>
          <p className="text-slate-500 mb-10 border-l-2 border-pink-500 pl-4">{cleanText(displayData.communityStats.headline)}</p>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Careers */}
            <div>
              <h4 className="font-bold text-slate-400 uppercase text-xs tracking-wider mb-6">Common Career Paths</h4>
              <div className="space-y-5">
                {displayData.communityStats.topCareers.map((career, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium text-slate-700">{cleanText(career.name)}</span>
                      <span className="font-bold text-[#ED1164]">{career.percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-pink-500 h-2 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${career.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interests */}
            <div>
              <h4 className="font-bold text-slate-400 uppercase text-xs tracking-wider mb-6">Shared Interests</h4>
              <div className="flex flex-wrap gap-2 mb-8">
                {displayData.communityStats.commonInterests.map((interest, i) => (
                  <span key={i} className="px-3 py-1.5 bg-slate-50 rounded-lg text-sm border border-slate-200 text-slate-600">
                    {cleanText(interest)}
                  </span>
                ))}
              </div>
              <div className="p-4 bg-pink-50 rounded-xl border border-pink-100">
                <div className="flex gap-3">
                  <span className="text-xl">💡</span>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    <strong>Did you know?</strong> This data compares you with thousands of other successful professionals who started with a similar profile.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col items-center justify-center pt-8 gap-4 no-print print:hidden">
          <div className="flex gap-4">
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="bg-[#ED1164] hover:bg-[#C40E53] text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-pink-200 flex items-center gap-2 disabled:opacity-50"
            >
              {isGeneratingPdf ? 'Generating PDF...' : 'Download Report'}
            </button>
            <button
              onClick={onRestart}
              className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold py-3 px-8 rounded-xl transition-all flex items-center gap-2 shadow-sm"
            >
              Start New Assessment
            </button>
          </div>
          <p className="text-slate-400 text-xs">Pathfinder AI v2.5 </p>
        </div>

      </div>
    </>
  );
};