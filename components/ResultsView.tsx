import React, { useState, useEffect, useRef } from 'react';
import { AnalysisResult } from '../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { PDFReportTemplate } from './PDFReportTemplate'; // NEW IMPORT
import { useNavigate } from 'react-router-dom';
import { toPng } from 'html-to-image';
import { SocialShareCard } from './SocialShareCard';
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
  const [isSharing, setIsSharing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isInternalScroll = useRef(false);
  const [isSpeaking, setIsSpeaking] = useState(false); // Audio State

  const shareUrl = window.location.href;
  const archetypeTitle = cleanText(data.archetype.title);
  const shareText = `I just discovered my professional archetype is "${archetypeTitle}" on Appli pathfinder! 🚀`;

  const displayData = {
    ...data
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
  const navigate = useNavigate();
  // NATIVE PRINT HANDLER (Bypasses html2pdf / oklch issues)
  const handleDownloadPDF = () => {

    // Stop audio
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    // Trigger browser print dialog
    // The CSS @media print rule will ensure only the PDF template is visible and formatted correctly
    setTimeout(() => {
      window.print();
    }, 100);

    // Fire-and-forget: trigger backend PDF generation, Blob upload & WATI notification
    try {
      let sessionId: string | null = null;
      let level: string | null = null;
      let analysis: any = null;

      // Try to read from saved analysis result first
      const savedResult = localStorage.getItem('pathfinder_analysis_result');
      if (savedResult) {
        const parsed = JSON.parse(savedResult);
        sessionId = parsed.sessionId || null;
        analysis = parsed;
      }

      // Fall back to quiz state for sessionId/level
      const quizState = localStorage.getItem('pathfinder_quiz_state');
      if (quizState) {
        const parsedState = JSON.parse(quizState);
        if (!sessionId) sessionId = parsedState.sessionId || null;
        if (!level) level = parsedState.level || null;
      }

      if (sessionId && level && analysis) {
        fetch('/api/pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, level, analysis }),
        })
          .then(() => {
            console.debug('[pdf-client] Triggered PDF Blob upload & WATI notification', { sessionId });
          })
          .catch((err) => {
            console.warn('[pdf-client] Failed to trigger PDF Blob upload', err);
          });
      } else {
        console.debug('[pdf-client] Skipping backend PDF trigger — missing sessionId/level/analysis');
      }
    } catch (err) {
      console.warn('[pdf-client] Error reading localStorage for PDF trigger', err);
    }
  };

  const handleInstagramShare = () => {
    const caption = `${shareText}\n\nCheck it out here: ${shareUrl}`;
    navigator.clipboard.writeText(caption).then(() => {
      alert("Caption copied to clipboard! Open Instagram to paste it in your Story or Post.");
    });
  };

  const handleOpenShareModal = () => {
    setShowShareModal(true);
  };

  // Sync slider when selectedTheme changes from buttons
  useEffect(() => {
    if (sliderRef.current && !isInternalScroll.current) {
      const container = sliderRef.current;
      const cardWidth = 320; // Match the card width in preview
      const gap = 24; // Match the gap
      container.scrollTo({
        left: selectedTheme * (cardWidth + gap),
        behavior: 'smooth'
      });
    }
    isInternalScroll.current = false;
  }, [selectedTheme]);

  const handleSliderScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const cardWidth = 320;
    const gap = 24;
    const index = Math.round(container.scrollLeft / (cardWidth + gap));
    if (index !== selectedTheme && index >= 0 && index < 3) {
      isInternalScroll.current = true;
      setSelectedTheme(index);
    }
  };

  const handleShareResult = async () => {
    const wrapper = document.getElementById('social-share-capture')?.parentElement;
    const element = document.getElementById('social-share-capture');
    if (!element || !wrapper) return;

    try {
      setIsSharing(true);
      // Wait for fonts
      await document.fonts.ready;

      // Temporarily move the hidden wrapper on-screen so the browser fully
      // renders it (off-screen elements at -9999px may not render pixe data).
      // Keep it invisible to the user via opacity 0.
      const origStyles = wrapper.style.cssText;
      wrapper.style.cssText =
        'position:fixed;left:0;top:0;z-index:-1;opacity:0;pointer-events:none;width:400px;height:711px;';

      // Give the browser time to paint
      await new Promise(resolve => setTimeout(resolve, 500));

      // Retry toPng up to 3 times — html-to-image sometimes fails on the
      // first attempt when lazy-loaded resources haven't resolved yet.
      let dataUrl = '';
      let lastErr: any;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          dataUrl = await toPng(element, {
            quality: 1,
            pixelRatio: 2,
            cacheBust: true,
            filter: (node: any) => {
              if (node.tagName === 'IFRAME') return false;
              return true;
            },
          });
          break; // success
        } catch (e) {
          lastErr = e;
          console.warn(`[share] toPng attempt ${attempt + 1} failed`, e);
          await new Promise(r => setTimeout(r, 300));
        }
      }

      // Restore hidden position
      wrapper.style.cssText = origStyles;

      if (!dataUrl) {
        throw lastErr || new Error('toPng returned empty');
      }

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `pathfinder-${archetypeTitle.toLowerCase().replace(/\s+/g, '-')}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My Professional Archetype',
          text: shareText,
        });
      } else {
        const link = document.createElement('a');
        link.download = `pathfinder-archetype.png`;
        link.href = dataUrl;
        link.click();
        alert("Sharing not supported on this browser. The archetype image has been downloaded instead!");
      }
    } catch (err) {
      console.error('Error sharing:', err);
      alert("Failed to generate share image. Please try again.");
    } finally {
      setIsSharing(false);
    }
  };

  // --- SECTIONS ---

  const ArchetypeSection = (
    <div className={`bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl shadow-slate-200/50 overflow-hidden border border-white relative transition-all duration-700`}>
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
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 mb-6">
              <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight break-words hyphens-auto">{archetypeTitle}</h1>
              <button
                onClick={handleOpenShareModal}
                className="group flex flex-shrink-0 items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-[#ED1164] hover:border-pink-200 hover:shadow-xl hover:shadow-pink-100 transition-all duration-300"
                title="Share your archetype"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6 transform group-hover:scale-110 animate-rotate transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100-2.684 3 3 0 000 2.684zm0 12.684a3 3 0 100-2.684 3 3 0 000 2.684z" />
                </svg>
              </button>
            </div>
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
            <p className="text-slate-800 font-semibold text-sm leading-snug">{cleanText(item.value.label)}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const VisionBoardSection = (
    <div className={`bg-gradient-to-br from-pink-50 to-white backdrop-blur-xl rounded-[2rem] shadow-xl shadow-pink-100/50 p-8 md:p-10 border border-white relative overflow-hidden transition-all duration-700`}>
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-[#ED1164] rounded-lg shadow-lg shadow-pink-200">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Your Career Vision Board</h3>
        </div>

        <div className="vision-grid grid md:grid-cols-3 gap-8">
          {/* Future Self */}
          <div className="md:col-span-2 flex flex-col gap-8">
            <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm ring-4 ring-pink-50/50 flex-1">
              <h4 className="text-[#ED1164] text-xs font-bold uppercase mb-4 tracking-widest">A Day in Your Future Life</h4>
              <p className="text-xl leading-relaxed text-slate-700 font-light italic">
                "{cleanText(displayData.visionBoard.futureSelf)}"
              </p>
            </div>

            {/* Quote moved here for better layout balance on web if needed, or kept on right. 
                 Let's keep Quote on the right to match standard layout, but maybe below diagram? 
                 Actually, let's put the Quote below the Future Self to balance the height against the tall diagram?
                 No, let's stick to the grid. 
             */}
          </div>

          {/* Core Themes Diagram (Replaces simple list) */}
          <div className="md:col-span-1 flex flex-col gap-4">
            {/* The Diagram Container - Dark styling to match Image 2 */}
            <div className="bg-[#090020] rounded-2xl p-4 shadow-xl shadow-slate-300 relative overflow-hidden aspect-square flex items-center justify-center">
              {/* SVG Ported from PDFReportTemplate with 'web-' ID prefixes */}
              <svg viewBox="0 0 800 800" className="w-full h-full">
                <defs>
                  <radialGradient id="web-grad1" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                    <stop offset="0%" style={{ stopColor: '#1a0b2e', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#090020', stopOpacity: 1 }} />
                  </radialGradient>
                  <path id="web-curveTop" d="M 310,400 A 90,90 0 0,1 490,400" />
                  <path id="web-curveBottom" d="M 310,400 A 90,90 0 0,0 490,400" />
                </defs>

                {/* Background Gradient Rect */}
                <rect width="800" height="800" fill="url(#web-grad1)" />

                {/* Concentric Circles Background */}
                {[100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650].map(r => (
                  <circle key={r} cx="400" cy="400" r={r} fill="none" stroke="#3b82f6" strokeWidth="0.5" opacity="0.15" />
                ))}

                {/* Center Hub */}
                <circle cx="400" cy="400" r="100" fill="#090020" stroke="#3b82f6" strokeWidth="1" opacity="0.3" />
                <circle cx="400" cy="400" r="60" fill="#2563eb" />
                <path d="M400 370 C 400 385, 400 385, 415 400 C 400 415, 400 415, 400 430 C 400 415, 400 415, 385 400 C 400 385, 400 385, 400 370" fill="white" />

                {/* Center Text Labels */}
                <text fontSize="11" fontWeight="bold" fill="white" letterSpacing="3" textAnchor="middle" style={{ textTransform: 'uppercase' }}>
                  <textPath href="#web-curveTop" startOffset="50%" side="right">Core Themes</textPath>
                </text>
                <text fontSize="11" fontWeight="bold" fill="white" letterSpacing="3" textAnchor="middle" style={{ textTransform: 'uppercase' }}>
                  <textPath href="#web-curveBottom" startOffset="50%" side="left">Core Themes</textPath>
                </text>

                {/* Separator Stars */}
                <text x="390" y="405" fill="white" fontSize="10" opacity="0.8">
                  <tspan x="302" dy="0">*</tspan>
                  <tspan x="492" dy="0">*</tspan>
                </text>

                {/* Satellite Nodes */}
                {displayData.visionBoard.keyThemes[0] && (() => {
                  const words = displayData.visionBoard.keyThemes[0].split('-');
                  const isMultiWord = words.length > 1;
                  return (
                    <g transform="translate(235, 235)">
                      <circle cx="0" cy="0" r="115" fill="#0B0B1E" stroke="#10b981" strokeWidth="2" />
                      <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={isMultiWord ? "22" : "26"} fontWeight="600" style={{ fontFamily: 'sans-serif' }}>
                        {isMultiWord ? words.map((w, i) => <tspan key={i} x="0" dy={i === 0 ? `-${(words.length - 1) * 14}` : "28"}>{w}</tspan>) : <tspan>{displayData.visionBoard.keyThemes[0]}</tspan>}
                      </text>
                    </g>
                  );
                })()}
                {displayData.visionBoard.keyThemes[1] && (() => {
                  const words = displayData.visionBoard.keyThemes[1].split('-');
                  const isMultiWord = words.length > 1;
                  return (
                    <g transform="translate(565, 235)">
                      <circle cx="0" cy="0" r="115" fill="#0B0B1E" stroke="#10b981" strokeWidth="2" />
                      <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={isMultiWord ? "22" : "26"} fontWeight="600" style={{ fontFamily: 'sans-serif' }}>
                        {isMultiWord ? words.map((w, i) => <tspan key={i} x="0" dy={i === 0 ? `-${(words.length - 1) * 14}` : "28"}>{w}</tspan>) : <tspan>{displayData.visionBoard.keyThemes[1]}</tspan>}
                      </text>
                    </g>
                  );
                })()}
                {displayData.visionBoard.keyThemes[2] && (() => {
                  const words = displayData.visionBoard.keyThemes[2].split('-');
                  const isMultiWord = words.length > 1;
                  return (
                    <g transform="translate(235, 565)">
                      <circle cx="0" cy="0" r="115" fill="#0B0B1E" stroke="#10b981" strokeWidth="2" />
                      <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={isMultiWord ? "22" : "26"} fontWeight="600" style={{ fontFamily: 'sans-serif' }}>
                        {isMultiWord ? words.map((w, i) => <tspan key={i} x="0" dy={i === 0 ? `-${(words.length - 1) * 14}` : "28"}>{w}</tspan>) : <tspan>{displayData.visionBoard.keyThemes[2]}</tspan>}
                      </text>
                    </g>
                  );
                })()}
                {displayData.visionBoard.keyThemes[3] && (() => {
                  const words = displayData.visionBoard.keyThemes[3].split('-');
                  const isMultiWord = words.length > 1;
                  return (
                    <g transform="translate(565, 565)">
                      <circle cx="0" cy="0" r="115" fill="#0B0B1E" stroke="#10b981" strokeWidth="2" />
                      <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={isMultiWord ? "22" : "26"} fontWeight="600" style={{ fontFamily: 'sans-serif' }}>
                        {isMultiWord ? words.map((w, i) => <tspan key={i} x="0" dy={i === 0 ? `-${(words.length - 1) * 14}` : "28"}>{w}</tspan>) : <tspan>{displayData.visionBoard.keyThemes[3]}</tspan>}
                      </text>
                    </g>
                  );
                })()}
              </svg>
            </div>

            {/* Quote Box */}
            <div className="bg-[#ED1164] rounded-2xl p-6 shadow-lg shadow-pink-200 flex items-center justify-center text-center">
              <p className="text-lg font-serif italic text-white/90">"{cleanText(displayData.visionBoard.quote)}"</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const DegreePreferenceSection = displayData.degreePreferenceAnalysis ? (
    <div className="bg-gradient-to-br from-pink-50 to-white rounded-2xl shadow-lg shadow-pink-100/50 p-6 border border-white transition-all duration-700 relative overflow-hidden mt-8 mb-8">
      <div className="absolute top-0 right-0 w-64 h-64 bg-pink-100/50 rounded-full blur-[80px] pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="w-10 h-10 rounded-lg bg-[#ED1164] flex items-center justify-center text-white shadow-lg shadow-pink-200">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-slate-900">Your Stated Preference</h3>
      </div>

      <p className="text-slate-600 mb-8 max-w-2xl relative z-10 text-sm">
        You mentioned interest in <span className="font-bold text-[#ED1164]">{displayData.degreePreferenceAnalysis.statedPreference}</span>.
        Here's how well it aligns with your personality profile:
      </p>

      {/* Overall Insight Box */}
      <div className="mb-6 p-4 bg-white rounded-xl border border-pink-100 shadow-sm relative z-10">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 bg-pink-50 rounded-full flex items-center justify-center border border-pink-100">
            <span className="text-xl">💡</span>
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-slate-800 text-sm mb-1">Overall Assessment</h4>
            <p className="text-slate-700 text-xs leading-relaxed">{displayData.degreePreferenceAnalysis.overallInsight}</p>
          </div>
        </div>
      </div>

      {/* Matched Courses */}
      <div className="relative z-10">
        <h4 className="font-bold text-slate-400 uppercase text-xs tracking-wider mb-4">Matching Programs & Fit Analysis</h4>
        <div className="grid md:grid-cols-2 gap-3">
          {displayData.degreePreferenceAnalysis.matchedCourses.map((course, i) => (
            <div key={i} className="bg-white rounded-lg p-4 border border-slate-100 shadow-sm hover:shadow-md hover:border-pink-200 transition-all duration-300">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="px-2 py-0.5 bg-slate-50 text-slate-600 rounded-full text-[9px] font-bold uppercase tracking-wide border border-slate-100">
                    {course.degree}
                  </span>
                  <h5 className="font-bold text-slate-800 text-sm mt-1 leading-tight">{cleanText(course.courseName)}</h5>
                </div>
                <div className="flex flex-col items-center justify-center w-10 h-10 rounded-full border-2 border-pink-50 bg-white shadow-sm flex-shrink-0 ml-2">
                  <span className="text-xs font-bold text-[#ED1164]">{course.matchPercentage}%</span>
                </div>
              </div>

              <div className="w-full bg-slate-100 rounded-full h-1 mb-2">
                <div
                  className="bg-[#ED1164] h-1 rounded-full transition-all duration-1000"
                  style={{ width: `${course.matchPercentage}%` }}
                ></div>
              </div>
              <p className="text-slate-500 text-[10px] italic leading-snug">{cleanText(course.matchInsight)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Note */}
      <div className="mt-6 p-3 bg-pink-50/50 rounded-lg border border-pink-100 relative z-10">
        <p className="text-[10px] text-slate-500 leading-relaxed flex gap-2">
          <svg className="w-3 h-3 text-pink-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>
            <span className="font-bold text-slate-700">Note:</span> These match percentages reflect how well your stated preference aligns with your
            personality profile based on your quiz responses.
          </span>
        </p>
      </div>
    </div>
  ) : null;

  const MainContentSection = (
    <div className={`content-grid grid grid-cols-1 lg:grid-cols-3 gap-8 transition-all duration-700`}>

      {/* Left Col: Skill Signature Chart */}
      <div className="skill-section lg:col-span-1 bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 p-8 flex flex-col border border-white">

        <h3 className="text-[26px] font-extrabold text-[#0F0F25] tracking-tight mb-2">Skill Signature</h3>
        <p className="text-slate-500 text-[15px] mb-8">A visual map of your core aptitudes.</p>

        <div className="space-y-6 mb-8">
          {displayData.skillSignature.map((skill, i) => {
            // Cycle through 4 distinct colors to match the visual style requested
            const colors = ['#3b82f6', '#f59e0b', '#ec4899', '#22c55e'];
            const color = colors[i % colors.length];

            return (
              <div key={i}>
                <div className="flex justify-between text-[14px] font-bold mb-2 text-[#334155]">
                  <span className="truncate pr-2" title={skill.subject}>{skill.subject}</span>
                  <span className="text-slate-400 whitespace-nowrap">{skill.A}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${skill.A}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="chart-container w-full h-80 relative">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={displayData.skillSignature} margin={{ top: 20, right: 60, bottom: 20, left: 60 }}>
              <PolarGrid stroke="#cbd5e1" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} />
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

        {DegreePreferenceSection}

        {/* Alternative Pathways */}
        <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-md shadow-slate-200/30 mt-8">
          <h4 className="text-lg font-bold text-slate-900 mb-6">Alternative Pathways</h4>
          <div className="pathways-grid grid md:grid-cols-2 gap-4">
            {displayData.alternativePathways.map((path, idx) => (
              <div key={idx} className="bg-slate-50 p-5 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors relative">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-[#ED1164] uppercase tracking-wide block">{cleanText(path.focus)}</span>
                  {path.relevanceScore && (
                    <span className="bg-white text-slate-500 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {path.relevanceScore}% Match
                    </span>
                  )}
                </div>
                <h5 className="font-bold text-slate-800 mb-1">{cleanText(path.courseName)}</h5>
                <p className="text-xs text-slate-500">{cleanText(path.insight)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const CommunityInsightsSection = (
    <div className={`stats-grid bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 p-10 border border-slate-100 transition-all duration-700`}>
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
  );



  const FooterSection = (
    <div className={`flex flex-col items-center justify-center pt-8 gap-4 no-print print:hidden transition-all duration-700`}>
      <div className="flex gap-4">
        <button
          onClick={handleDownloadPDF}
          disabled={isGeneratingPdf}
          className="bg-[#ED1164] hover:bg-[#C40E53] text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-pink-200 flex items-center gap-2 disabled:opacity-50"
        >
          {isGeneratingPdf ? 'Generating...' : 'Print / Save as PDF'}
        </button>
        <button
          onClick={onRestart}
          className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold py-3 px-8 rounded-xl transition-all flex items-center gap-2 shadow-sm"
        >
          Start New Assessment
        </button>
      </div>
      <p className="text-slate-400 text-xs">Appli pathfinder v2.5 </p>
    </div>
  );

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

      {/* Share Preview Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl overflow-hidden max-w-[900px] w-full flex flex-col md:flex-row h-full max-h-[800px] shadow-2xl">
            {/* Left: Preview Slider */}
            <div className="flex-1 bg-slate-50/50 p-8 flex items-center justify-center overflow-hidden min-h-[500px] border-r border-slate-100 relative group">
              {/* Navigation Arrows */}
              {selectedTheme > 0 && (
                <button
                  onClick={() => setSelectedTheme(prev => Math.max(0, prev - 1))}
                  className="absolute left-4 z-20 p-3 bg-white/80 backdrop-blur-md rounded-full shadow-lg border border-slate-100 text-slate-600 hover:text-pink-500 hover:scale-110 transition-all duration-300 opacity-0 group-hover:opacity-100 hidden md:flex"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}

              {selectedTheme < 2 && (
                <button
                  onClick={() => setSelectedTheme(prev => Math.min(2, prev + 1))}
                  className="absolute right-4 z-20 p-3 bg-white/80 backdrop-blur-md rounded-full shadow-lg border border-slate-100 text-slate-600 hover:text-pink-500 hover:scale-110 transition-all duration-300 opacity-0 group-hover:opacity-100 hidden md:flex"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}

              <div
                ref={sliderRef}
                onScroll={handleSliderScroll}
                className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-[12%] py-4 no-scrollbar scroll-smooth w-full"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {[0, 1, 2].map((idx) => (
                  <div key={idx} className="snap-center shrink-0 transition-all duration-500 flex items-center justify-center w-[280px] sm:w-[400px]" style={{ opacity: selectedTheme === idx ? 1 : 0.5 }}>
                    <div
                      className="origin-center shadow-2xl rounded-[32px] overflow-hidden"
                      style={{
                        transform: selectedTheme === idx ? 'scale(0.8)' : 'scale(0.7) translateY(10px)',
                        width: '400px',
                        height: '711px',
                        backgroundColor: '#000',
                        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    >
                      <SocialShareCard data={displayData} id={`social-preview-${idx}`} themeIndex={idx} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Controls */}
            <div className="w-full md:w-[350px] p-8 flex flex-col gap-8 bg-white overflow-y-auto">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Select Theme</h3>
                  <p className="text-slate-500 text-sm mt-1">Perfect for your social vibe.</p>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Theme Selection List */}
              <div className="space-y-3">
                {[
                  { name: 'Appli Pink' },
                  { name: 'Emerald Forest' },
                  { name: 'Midnight Blue' },
                ].map((t, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedTheme(idx)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 ${selectedTheme === idx
                      ? 'border-pink-500 bg-pink-50/30'
                      : 'border-slate-100 bg-white hover:border-slate-200'
                      }`}
                  >
                    {/* Mini card preview */}
                    <div className="w-12 h-12 rounded-xl bg-slate-900 shadow-inner shrink-0 overflow-hidden relative">
                      <div className="absolute top-0 left-0 origin-top-left pointer-events-none" style={{ transform: 'scale(0.12)', width: '400px', height: '711px' }}>
                        <SocialShareCard data={displayData} id={`sidebar-thumb-${idx}`} themeIndex={idx} />
                      </div>
                    </div>

                    <div className="flex flex-col items-start translate-y-[1px]">
                      <span className={`text-[15px] font-bold ${selectedTheme === idx ? 'text-slate-900' : 'text-slate-600'}`}>
                        {t.name}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium tracking-tight">Apply Style</span>
                    </div>
                    {selectedTheme === idx && (
                      <div className="ml-auto w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="mt-auto pt-8 border-t border-slate-100 space-y-3">
                <button
                  onClick={handleShareResult}
                  disabled={isSharing}
                  className="w-full bg-[#ED1164] hover:bg-[#C40E53] text-white font-bold py-4 rounded-2xl transition-all shadow-lg hover:shadow-pink-200 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isSharing ? (
                    <>
                      <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Generating Image...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100-2.684 3 3 0 000 2.684zm0 12.684a3 3 0 100-2.684 3 3 0 000 2.684z" />
                      </svg>
                      <span>Share Now</span>
                    </>
                  )}
                </button>
                <p className="text-[10px] text-slate-400 text-center px-4 leading-relaxed">
                  Manifest your career lore. Ready for the feed. ✨
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden element for sharing capture - prevents alignment issues from scale/zoom */}
      <div
        className="fixed -left-[9999px] top-0 pointer-events-none"
        style={{ width: '400px', height: '711px' }}
      >
        <SocialShareCard
          data={displayData}
          id="social-share-capture"
          themeIndex={selectedTheme}
        />
      </div>

      {/* OFF-SCREEN PDF TEMPLATE - Render it always but hide it. FOR PRINT: We reveal this and hide others. */}
      <div id="print-wrapper" className="absolute top-0 -left-[10000px] pointer-events-none print:static print:left-0 print:top-0 print:pointer-events-auto">
        <PDFReportTemplate data={displayData} />
      </div>

      <div
        id="results-container"
        className={`max-w-6xl mx-auto space-y-8 animate-fade-in pb-12 print:space-y-4 print:pb-0 transition-all duration-700`}
      >
        {ArchetypeSection}
        {/* VisionBoardSection removed as per user request */}
        {MainContentSection}
        {CommunityInsightsSection}
        {FooterSection}
      </div>
    </>
  );
};