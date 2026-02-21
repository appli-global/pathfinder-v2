import React from 'react';
import { AnalysisResult } from '../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

interface PDFReportTemplateProps {
    data: AnalysisResult;
}

export const PDFReportTemplate: React.FC<PDFReportTemplateProps> = ({ data }) => {
    const cleanText = (text: string) => text.replace(/[*_#]/g, '').trim();

    // Colors from the design
    const THEME = {
        darkBlue: '#0F0F25',
        pink: '#ED1164',
        green: '#22c55e',
        textDark: '#1e293b',
        textLight: '#64748b'
    };

    return (
        <div id="pdf-report-target" className="w-[794px] bg-white text-slate-900 font-sans hidden-on-screen">

            {/* --- PAGE 1: COVER --- */}
            <div className="w-full h-[1123px] relative bg-[#1a0b2e] overflow-hidden flex flex-col justify-between p-12 text-white page-break">
                {/* Background Image from User */}
                <div className="absolute inset-0 z-0">
                    <img src="/report-cover-bg.png" className="w-full h-full object-cover" alt="Cover Background" />
                </div>

                {/* Top Right Header */}
                <div className="flex justify-end pt-8 relative z-10">
                    <div className="text-right">
                        <h3 className="text-[12px] font-bold tracking-[0.2em] uppercase text-white/80 mb-1">Assessment Report</h3>
                        <p className="text-lg font-bold text-white tracking-widest">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).toUpperCase()}</p>
                    </div>
                </div>

                {/* Spacer to push footer down (Logo is in the background image now) */}
                <div className="flex-1"></div>

                {/* Bottom Footer Area */}
                <div className="flex justify-between items-end pb-8 z-10 relative">
                    <div>
                        <h1 className="text-7xl font-extrabold leading-none tracking-tight text-white">
                            {data.userData?.name || "Future Leader"}<br />
                            <span className="text-4xl opacity-50 block mt-2"> </span>
                        </h1>
                    </div>
                    <div className="text-right opacity-60 text-sm font-medium tracking-wide">
                        pathfinder.appli.global
                    </div>
                </div>
            </div>

            {/* --- PAGE 2: ARCHETYPE & MATCH --- */}
            <div className="w-full h-[1123px] relative bg-white p-16 flex flex-col page-break">
                {/* Match Score Hero Section */}
                <div className="relative h-[350px] bg-white rounded-3xl overflow-hidden mb-12 border border-slate-100">
                    {/* Background Graph - Subtle */}
                    <div className="absolute inset-0 opacity-10">
                        <img
                            src="/match-graph.png"
                            alt="Match Graph"
                            className="w-full h-full object-cover"
                            style={{ imageRendering: 'crisp-edges' }}
                        />
                    </div>

                    {/* Background Graph - Behind Percentage (More Visible) */}
                    <div className="absolute top-0 right-0 w-1/3 h-full opacity-20">
                        <img
                            src="/match-graph.png"
                            alt="Match Graph"
                            className="w-full h-full object-cover"
                            style={{ imageRendering: 'crisp-edges' }}
                        />
                    </div>

                    {/* Green Dot Indicator */}
                    <div className="absolute top-8 right-8 w-4 h-4 bg-[#22c55e] rounded-full shadow-lg"></div>

                    {/* Content */}
                    <div className="relative z-10 h-full flex items-center justify-start px-16">
                        {/* Large Score Numbers */}
                        <div className="flex items-center gap-6">
                            <span className="text-[200px] leading-none font-extrabold text-[#22c55e] tracking-tighter">
                                98
                            </span>
                            <div className="flex flex-col items-start justify-center">
                                <span className="text-5xl font-extrabold text-[#0F0F25] leading-none">Match</span>
                                <span className="text-5xl font-extrabold text-[#0F0F25] leading-none">Score</span>
                                <span className="text-7xl font-extrabold text-[#0F0F25] leading-none mt-2">%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Archetype Info */}
                <div className="mt-12">
                    <div className="text-sm font-bold tracking-[0.2em] text-slate-400 uppercase mb-4">Archetype Identified</div>
                    <h2 className="text-6xl font-extrabold text-[#0F0F25] mb-8">{cleanText(data.archetype.title)}</h2>
                    <p className="text-2xl leading-relaxed text-slate-600 font-light text-justify">
                        {cleanText(data.archetype.description)}
                    </p>
                </div>
            </div>

            {/* --- PAGE 3: DRIVERS --- */}
            <div className="w-full h-[1123px] bg-white p-16 flex flex-col justify-center page-break">
                <h2 className="text-xl font-bold tracking-[0.2em] text-slate-500 uppercase mb-12">What Drives You</h2>

                <div className="space-y-8">
                    {[
                        { title: "Academic Driver", icon: "/icon-academic.png", data: data.archetype.drivers.academic },
                        { title: "Passion Driver", icon: "/icon-passion.png", data: data.archetype.drivers.passion },
                        { title: "Cognitive Style", icon: "/icon-cognitive.png", data: data.archetype.drivers.cognitive },
                        { title: "Preferred Domain", icon: "/icon-domain.png", data: data.archetype.drivers.domain },
                        { title: "Core Motivation", icon: "/icon-motivation.png", data: data.archetype.drivers.motivation },
                    ].map((driver, i) => (
                        <div key={i} className="flex gap-6 items-start pb-8 border-b border-slate-200 last:border-0">
                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center shrink-0 p-3 shadow-sm border border-slate-100">
                                <img src={driver.icon} alt={driver.title} className="w-full h-full object-contain" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-2xl font-bold text-[#0F0F25] mb-2">{driver.title}</h3>
                                <p className="text-lg text-slate-600 leading-relaxed">
                                    {cleanText(driver.data.explanation)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- PAGE 4: VISION BOARD --- */}
            <div className="w-full h-[1123px] max-h-[1123px] bg-white flex flex-col page-break overflow-hidden">
                {/* Top Half: Day in Life */}
                <div className="p-12 flex-1 flex flex-col justify-center">
                    <h4 className="text-sm font-bold tracking-[0.2em] text-slate-400 uppercase mb-2">Your Career Vision Board</h4>
                    <h2 className="text-5xl font-extrabold text-[#ED1164] mb-6 leading-tight">A Day in Your<br />Future Life</h2>
                    <p className="text-xl leading-relaxed text-slate-700">
                        {cleanText(data.visionBoard.futureSelf)}
                    </p>
                </div>

                {/* Bottom Half: Dark Themes (Split Layout) */}
                <div className="h-[45%] flex min-h-0">
                    {/* Left: Core Themes Visual (Image Implementation) */}
                    <div className="w-[65%] relative bg-[#090020] flex items-center justify-center overflow-hidden">
                        {/* Static Background Image */}
                        <img
                            src="/core-themes-bg.png"
                            className="w-full h-full object-contain opacity-90"
                            alt="Core Themes Diagram"
                            style={{
                                printColorAdjust: 'exact',
                                WebkitPrintColorAdjust: 'exact'
                            }}
                        />

                        {/* Overlay Text - Positioned to match the 4 circles in the image */}
                        {/* Top Left circle center: ~29% from left, ~29% from top */}
                        {data.visionBoard.keyThemes[0] && (
                            <div className="absolute flex items-center justify-center text-center w-28"
                                style={{ top: '29%', left: '29%', transform: 'translate(-50%, -50%)' }}>
                                <span className="text-white text-base font-bold font-sans leading-tight drop-shadow-md">
                                    {data.visionBoard.keyThemes[0]}
                                </span>
                            </div>
                        )}

                        {/* Top Right circle center: ~71% from left, ~29% from top */}
                        {data.visionBoard.keyThemes[1] && (
                            <div className="absolute flex items-center justify-center text-center w-28"
                                style={{ top: '29%', left: '71%', transform: 'translate(-50%, -50%)' }}>
                                <span className="text-white text-base font-bold font-sans leading-tight drop-shadow-md">
                                    {data.visionBoard.keyThemes[1]}
                                </span>
                            </div>
                        )}

                        {/* Bottom Left circle center: ~29% from left, ~71% from top */}
                        {data.visionBoard.keyThemes[2] && (
                            <div className="absolute flex items-center justify-center text-center w-28"
                                style={{ top: '71%', left: '29%', transform: 'translate(-50%, -50%)' }}>
                                <span className="text-white text-base font-bold font-sans leading-tight drop-shadow-md">
                                    {data.visionBoard.keyThemes[2]}
                                </span>
                            </div>
                        )}

                        {/* Bottom Right circle center: ~71% from left, ~71% from top */}
                        {data.visionBoard.keyThemes[3] && (
                            <div className="absolute flex items-center justify-center text-center w-28"
                                style={{ top: '71%', left: '71%', transform: 'translate(-50%, -50%)' }}>
                                <span className="text-white text-base font-bold font-sans leading-tight drop-shadow-md">
                                    {data.visionBoard.keyThemes[3]}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Right: Quote Area */}
                    <div className="w-[35%] bg-[#ED1164] p-12 flex flex-col justify-between relative ]">
                        <div className="flex-1 flex items-center">
                            <p className="text-white font-serif text-3xl leading-snug font-medium italic">
                                "{cleanText(data.visionBoard.quote)}"
                            </p>
                        </div>
                        <div className="text-white text-lg font-medium text-right mt-4">
                            Steve Jobs
                        </div>
                    </div>
                </div>
            </div>

            {/* --- PAGE 5: SKILL SIGNATURE --- */}
            <div className="w-full h-[1123px] bg-white relative flex flex-col page-break overflow-hidden">
                {/* Background Image */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="/skill-signature-bg.svg"
                        className="w-full h-full object-cover"
                        alt="Skill Signature Background"
                    />
                </div>

                <div className="relative z-10 p-16 flex flex-col h-full">
                    <div className="text-center mb-12">
                        <h2 className="text-5xl font-extrabold text-[#0F0F25] mb-2">Skill Signature</h2>
                        <p className="text-slate-500 text-lg">A Visual map of your core capabilities</p>
                    </div>

                    {/* Radar Chart */}
                    <div className="flex-1 flex items-center justify-center relative">
                        {/* Background Hexagon SVG for style matching */}
                        <div className="absolute inset-0 flex items-center justify-center -z-10 opacity-5">
                            <svg viewBox="0 0 400 400" className="w-[600px] h-[600px]">
                                <polygon points="200,20 373,120 373,320 200,420 27,320 27,120" fill="#f472b6" />
                            </svg>
                        </div>

                        <div className="w-[600px] h-[500px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data.skillSignature}>
                                    <PolarGrid stroke="#cbd5e1" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 14, fontWeight: 500 }} />
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

                    {/* Progress Bars */}
                    <div className="grid grid-cols-2 gap-x-16 gap-y-8 mt-12">
                        {data.skillSignature.map((skill, i) => (
                            <div key={i}>
                                <div className="flex justify-between text-sm font-bold text-slate-700 mb-2">
                                    <span>{skill.subject}</span>
                                    <span className="text-slate-400">{skill.A}%</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div className="h-full bg-[#ED1164]" style={{ width: `${skill.A}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- PAGE 6: TOP RECOMMENDATIONS --- */}
            <div className="w-full h-[1123px] bg-white p-16 flex flex-col page-break">
                <h2 className="text-xl font-bold tracking-[0.2em] text-slate-500 uppercase mb-16">Top Course Recommendations</h2>

                <div className="space-y-10">
                    {data.recommendations.map((rec, i) => (
                        <div key={i} className="flex gap-8 items-start pb-8 border-b border-slate-200 last:border-0">
                            {/* Blue Document Icon */}
                            {/* Blue Document Icon with Image */}
                            <div className="w-32 h-40 relative shrink-0">
                                <img src="/icon-doc-blue.png" alt="Degree Icon" className="w-full h-full object-contain drop-shadow-xl" />

                                {/* Overlay Degree Text - Center Top part of the icon */}
                                <div className="absolute top-8 left-0 w-full text-center text-white font-serif text-2xl font-bold px-2">
                                    {rec.degree ? rec.degree.split(' ')[0].replace('.', '') : 'DEG'}
                                </div>

                                {/* Overlay Match Score - Bottom Green Pill Area */}
                                <div className="absolute bottom-[10px] left-0 w-full text-center text-white text-[10px] font-bold">
                                    {rec.relevanceScore}% Match
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 pt-2">
                                <h3 className="text-xl font-bold text-slate-900 mb-2 leading-snug">{cleanText(rec.courseName)}</h3>
                                <p className="text-sm text-slate-600 leading-relaxed mb-3 text-justify">{cleanText(rec.matchReason)}</p>

                                {/* Insight Box */}
                                <div className="bg-slate-50 rounded-xl p-3 flex gap-3 border border-slate-100">
                                    <div className="text-[#1d4ed8]">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        <strong className="text-slate-700">AI Insight:</strong> {cleanText(rec.dataInsight)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- PAGE 7: STATED PREFERENCE (NEW) --- */}
            {data.degreePreferenceAnalysis && (
                <div className="w-full h-[1123px] bg-white p-16 flex flex-col page-break relative overflow-hidden">
                    {/* Background blob for style */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-50 rounded-full blur-[100px] pointer-events-none -z-10 translate-x-1/3 -translate-y-1/3"></div>

                    {/* Header */}
                    <div className="mb-12">
                        <h2 className="text-4xl font-extrabold text-[#1a1a2e] mb-4">Your Stated Preference</h2>
                        <p className="text-slate-500 text-lg leading-relaxed">
                            You mentioned interest in <span className="font-bold text-[#ED1164]">{data.degreePreferenceAnalysis.statedPreference}</span>.
                            Here’s how well it aligns with your personality profile:
                        </p>
                    </div>

                    {/* Overall Assessment Box - Green Style */}
                    <div className="mb-16 p-8 bg-[#f0fdf4] rounded-2xl border border-green-100 flex gap-6 items-start">
                        <div className="w-12 h-12 rounded-full bg-white border border-green-200 flex items-center justify-center shrink-0 shadow-sm">
                            <svg className="w-6 h-6 text-[#22c55e]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        <div>
                            <h4 className="font-bold text-[#15803d] text-base mb-1">Overall Assessment</h4>
                            <p className="text-[#166534] text-sm leading-relaxed">{data.degreePreferenceAnalysis.overallInsight}</p>
                        </div>
                    </div>

                    {/* Matching Programs Title */}
                    <h2 className="text-xl font-bold tracking-[0.2em] text-slate-500 uppercase mb-12">Matching Programs & Fit Analysis</h2>

                    {/* Cards */}
                    <div className="space-y-12">
                        {data.degreePreferenceAnalysis.matchedCourses.map((course, i) => (
                            <div key={i} className="flex gap-8 items-start relative">
                                {/* Purple Document Icon Image */}
                                <div className="w-28 h-36 relative shrink-0">
                                    <img
                                        src="/icon-doc-purple.svg"
                                        alt="Degree Preference"
                                        className="w-full h-full object-contain drop-shadow-xl"
                                        style={{
                                            printColorAdjust: 'exact',
                                            WebkitPrintColorAdjust: 'exact'
                                        }}
                                    />

                                    {/* Degree Text - centered in upper body of SVG (above teal pill) */}
                                    <div className="absolute top-0 left-0 w-full text-center text-white font-serif text-2xl font-bold px-2 pointer-events-none flex items-center justify-center" style={{ height: '82%' }}>
                                        {course.degree.split(' ')[0].replace('.', '')}
                                    </div>

                                    {/* Match Score - centered in the teal pill (starts at ~82% of SVG height) */}
                                    <div
                                        className="absolute bottom-0 left-0 right-0 h-[18%] flex items-center justify-center z-10 pointer-events-none"
                                    >
                                        <span className="text-white text-[11px] font-bold tracking-wide drop-shadow-sm">
                                            {course.matchPercentage}% Match
                                        </span>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 pt-2">
                                    <h3 className="text-2xl font-bold text-slate-900 mb-2">{course.courseName}</h3>
                                    <p className="text-slate-600 leading-relaxed text-sm text-justify">{course.matchInsight}</p>
                                </div>

                                {/* Divider Line (except last) */}
                                {i < data.degreePreferenceAnalysis!.matchedCourses.length - 1 && (
                                    <div className="absolute -bottom-6 left-36 right-0 h-px bg-slate-100"></div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Spacer */}
                    <div className="flex-1"></div>

                    {/* Footer Note */}
                    <div className="bg-slate-50 p-4 rounded-xl text-center">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                            NOTE: These match percentages reflect how well your stated preference aligns with your personality profile based on your quiz responses.
                        </p>
                    </div>
                </div>
            )}

            {/* --- PAGE 8: ALTERNATIVES & COMMUNITY --- */}
            <div className="w-full h-[1123px] bg-white p-16 flex flex-col page-break">

                {/* Alternatives Section */}
                <div className="mb-16">
                    <h2 className="text-xl font-bold tracking-[0.2em] text-slate-500 uppercase mb-12">Alternative Pathways</h2>
                    <div className="grid grid-cols-3 gap-6">
                        {data.alternativePathways.map((alt, i) => (
                            <div key={i} className="flex flex-col gap-4 border-r border-slate-200 last:border-0 pr-6 last:pr-0">
                                {/* Pink Document Icon */}
                                {/* Pink Document Icon with Image */}
                                <div className="w-24 h-32 relative shrink-0 mx-auto">
                                    <img src="/icon-doc-pink.png" alt="Course Icon" className="w-full h-full object-contain drop-shadow-lg" />

                                    {/* Overlay Course Abbr */}
                                    <div className="absolute top-6 left-0 w-full text-center text-white font-serif text-lg font-bold px-1">
                                        {(() => {
                                            const name = alt.courseName.toLowerCase();
                                            if (name.includes('bachelor of business administration') || name.includes('bba')) return 'BBA';
                                            if (name.includes('bachelor of computer applications') || name.includes('bca')) return 'BCA';
                                            if (name.includes('bachelor of commerce') || name.includes('b.com')) return 'B.Com';
                                            if (name.includes('bachelor of science') || name.includes('b.sc')) return 'B.Sc';
                                            if (name.includes('bachelor of arts') || name.includes('b.a')) return 'B.A.';
                                            if (name.includes('bachelor of technology') || name.includes('b.tech')) return 'B.Tech';
                                            if (name.includes('bachelor of engineering') || name.includes('b.e')) return 'B.E.';
                                            if (name.includes('bachelor of design') || name.includes('b.des')) return 'B.Des';
                                            if (name.includes('bachelor of architecture') || name.includes('b.arch')) return 'B.Arch';
                                            if (name.includes('mbbs') || name.includes('medicine')) return 'MBBS';
                                            if (name.includes('master of business administration') || name.includes('mba')) return 'MBA';
                                            if (name.includes('master of science') || name.includes('m.sc')) return 'M.Sc';
                                            if (name.includes('master of arts') || name.includes('m.a')) return 'M.A.';
                                            if (name.includes('master of technology') || name.includes('m.tech')) return 'M.Tech';

                                            // Fallback smart abbreviation
                                            const parts = alt.courseName.split(' ');
                                            if (parts[0] === 'Bachelor') return 'Deg.';
                                            if (parts[0] === 'Master') return 'Mast.';
                                            return parts[0].substring(0, 4);
                                        })()}
                                    </div>

                                    {/* Overlay Match Score */}
                                    <div className="absolute bottom-[8px] left-0 w-full text-center text-white text-[9px] font-bold">
                                        {alt.relevanceScore || 85}% Match
                                    </div>
                                </div>

                                <div className="text-center">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{cleanText(alt.focus)}</div>
                                    <h4 className="font-bold text-slate-900 mb-2 leading-tight h-10 overflow-hidden text-sm">{cleanText(alt.courseName)}</h4>
                                    <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-4">{cleanText(alt.insight)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Divider */}
                <div className="w-full h-px bg-slate-100 mb-12"></div>

                {/* Community Insights Section */}
                <div className="flex-1 bg-[#F5F3F0] min-h-0 rounded-3xl p-12 relative overflow-hidden">
                    {/* Header with Title and Avatars */}
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="flex-1">
                            <h2 className="text-4xl font-extrabold text-[#1a1a2e] leading-tight">Community Insights</h2>
                        </div>
                        <div className="flex-shrink-0 ml-8">
                            <img
                                src="/community-avatars.png"
                                alt="Community Members"
                                className="h-16 w-auto object-contain"
                                style={{
                                    imageRendering: 'crisp-edges', // Try to keep it sharp
                                    printColorAdjust: 'exact',
                                    WebkitPrintColorAdjust: 'exact'
                                }}
                            />
                        </div>
                    </div>
                    <p className="text-slate-600 text-base mb-10 relative z-10">{cleanText(data.communityStats.headline)}</p>

                    <div className="grid grid-cols-2 gap-12 relative z-10">
                        {/* Common Career Paths */}
                        <div>
                            <h4 className="font-bold text-slate-400 uppercase text-xs tracking-wider mb-6">Common Career Paths</h4>
                            <div className="space-y-6">
                                {data.communityStats.topCareers.map((career, i) => (
                                    <div key={i}>
                                        <div className="flex justify-between text-sm mb-1 font-bold text-slate-700">
                                            <span>{cleanText(career.name)}</span>
                                            <span>{career.percentage}%</span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-2">
                                            <div className="bg-[#ED1164] h-2 rounded-full" style={{ width: `${career.percentage}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Shared Interests */}
                        <div>
                            <h4 className="font-bold text-slate-400 uppercase text-xs tracking-wider mb-6">Shared Interests</h4>
                            <div className="flex flex-wrap gap-3">
                                {data.communityStats.commonInterests.map((interest, i) => (
                                    <span key={i} className="px-4 py-2 bg-slate-200/50 rounded-lg text-xs font-bold text-slate-700">
                                        {cleanText(interest)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* --- PAGE 9 (Formerly 10): LETTER FOR PARENTS --- */}
            <div className="w-full h-[1123px] bg-white flex flex-col page-break relative overflow-hidden">
                {/* Background SVG vector graphics matching the design */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <img
                        src="/letter-for-parents-bg.svg"
                        alt=""
                        className="w-full h-full object-cover"
                        style={{
                            imageRendering: 'high-quality',
                            WebkitPrintColorAdjust: 'exact',
                            printColorAdjust: 'exact'
                        }}
                    />
                </div>

                {data.parentLetterData ? (
                    <div className="relative z-10 px-[4.5rem] pt-24 pb-16 flex flex-col h-full">
                        {/* Title Section (Designed to match the SVG's embedded title roughly just in case background is clean, though SVG likely includes the title graphics) */}
                        <div className="mt-24 text-slate-700 text-[13.5px] leading-[1.65] font-normal w-full max-w-[95%] space-y-4 whitespace-pre-line tracking-tight">
                            <p>{cleanText(data.parentLetterData.salutation)}</p>
                            <p>{cleanText(data.parentLetterData.paragraph1)}</p>
                            <p>{cleanText(data.parentLetterData.paragraph2)}</p>
                            <p>{cleanText(data.parentLetterData.paragraph3)}</p>
                            <p>{cleanText(data.parentLetterData.paragraph4)}</p>
                            <p>{cleanText(data.parentLetterData.paragraph5)}</p>
                            <p>{cleanText(data.parentLetterData.paragraph6)}</p>
                            <p>{cleanText(data.parentLetterData.paragraph7)}</p>
                            <p>{cleanText(data.parentLetterData.paragraph8)}</p>

                            <div className="text-[13.5px] pt-2 whitespace-nowrap text-slate-700 font-normal leading-[1.5]">
                                <div>Warm regards,</div>
                                <div>Appli</div>
                                <a href="https://www.appli.global" target="_blank" rel="noopener noreferrer" className="text-[#ED1164] hover:underline">
                                    www.appli.global
                                </a>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="relative z-10 p-16 flex items-center justify-center h-full">
                        <p className="text-slate-400">Personalized letter generating...</p>
                    </div>
                )}
            </div>

            {/* --- PAGE 10: THANK YOU & ABOUT (NATIVELY RENDERED) --- */}
            <div className="w-full h-[1123px] bg-white flex flex-col page-break relative overflow-hidden">

                {/* TOP SECTION: Pink Header */}
                <div className="w-full bg-[#ED1164] text-white px-16 pt-24 pb-16 flex-shrink-0">
                    <h1 className="text-[42px] leading-[1.1] font-normal mb-8 tracking-tight">
                        Thank You for<br />Choosing Clarity
                    </h1>
                    <p className="text-[15px] leading-relaxed max-w-[90%] font-light mb-12 opacity-95">
                        Choosing to seek clarity before making important academic decisions is a thoughtful and responsible step. By understanding strengths and alignment early, you have already made a wise decision for the future.
                    </p>
                    <p className="text-[15px] font-light opacity-95 mt-auto">
                        Wishing you the best,<br />
                        Team Appli
                    </p>
                </div>

                {/* BOTTOM SECTION: About & Features */}
                <div className="flex-1 px-16 pt-12 flex flex-col relative z-10 bg-white">

                    <h2 className="text-[32px] font-bold text-[#1a1a2e] mb-4 tracking-tight">About Appli</h2>
                    <p className="text-[#333] text-[15px] leading-relaxed max-w-[85%] mb-10">
                        Appli is India's first common application and guidance platform created to simplify the college journey for students and families.
                    </p>

                    <div className="flex flex-col gap-8 max-w-[85%]">
                        {/* Feature 1 */}
                        <div className="flex items-start gap-4">
                            <div className="text-[#ED1164] mt-1">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
                            </div>
                            <div>
                                <h3 className="text-[18px] font-bold text-[#1a1a2e] mb-1">Career Pathfinder</h3>
                                <p className="text-[#555] text-[13px] leading-relaxed">
                                    Get clarity on the right course that matches your interests and also has strong future demand.
                                </p>
                            </div>
                        </div>
                        <hr className="border-slate-100" />

                        {/* Feature 2 */}
                        <div className="flex items-start gap-4">
                            <div className="text-[#ED1164] mt-1">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                            </div>
                            <div>
                                <h3 className="text-[18px] font-bold text-[#1a1a2e] mb-1">Discover Courses</h3>
                                <p className="text-[#555] text-[13px] leading-relaxed">
                                    Find a course that matches your interests and goals. Discover the skills you'll gain, potential careers, and colleges offering it.
                                </p>
                            </div>
                        </div>
                        <hr className="border-slate-100" />

                        {/* Feature 3 */}
                        <div className="flex items-start gap-4">
                            <div className="text-[#ED1164] mt-1">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" /></svg>
                            </div>
                            <div>
                                <h3 className="text-[18px] font-bold text-[#1a1a2e] mb-1">Find colleges</h3>
                                <p className="text-[#555] text-[13px] leading-relaxed">
                                    Find colleges offering it. Get info on fees, curriculum, alumni, placements, and admissions. Interested? Apply via Appli.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Footer Box */}
                    <div className="mt-auto border-t border-slate-200 pt-6 pb-6 w-full flex justify-between items-center relative z-10 bg-white">
                        <p className="font-bold text-[#1a1a2e] text-[12.5px] max-w-[60%]">
                            If this platform has helped your family, please share Appli with other students and parents who could benefit.
                        </p>
                        <div className="flex gap-3">
                            <div className="bg-black text-white px-3 py-1.5 rounded-md flex items-center gap-2">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" /></svg>
                                <div className="flex flex-col">
                                    <span className="text-[8px] uppercase tracking-wide leading-none">Get it on</span>
                                    <span className="text-[13px] font-semibold leading-none">Google Play</span>
                                </div>
                            </div>
                            <div className="bg-black text-white px-3 py-1.5 rounded-md flex items-center gap-2">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13.03 4.8C13.73 3.96 14.2 2.73 14.07 1.5c-1.06.04-2.35.71-3.09 1.58-.66.75-1.18 2.01-1.01 3.2 1.18.09 2.36-.63 3.06-1.48z" /></svg>
                                <div className="flex flex-col">
                                    <span className="text-[8px] uppercase tracking-wide leading-none">Download on the</span>
                                    <span className="text-[13px] font-semibold leading-none">App Store</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
