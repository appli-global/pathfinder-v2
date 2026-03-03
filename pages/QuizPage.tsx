
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QUESTIONS_12TH, QUESTIONS_UG } from '../constants';
import { QuestionCard } from '../components/QuestionCard';
import { AnswerMap } from '../types';

type Level = '12' | 'UG';
type AppStep = 'WELCOME' | 'SECTION_TRANSITION' | 'QUIZ';

export const QuizPage: React.FC = () => {
    const [appStep, setAppStep] = useState<AppStep>('QUIZ');
    const [selectedLevel, setSelectedLevel] = useState<Level>('12');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
    const [answers, setAnswers] = useState<AnswerMap>({});
    const [error, setError] = useState<string | null>(null);
    const [pendingNextIndex, setPendingNextIndex] = useState<number>(0);
    const [transitionSection, setTransitionSection] = useState<{ num: string; title: string; intro: string } | null>(null);
    const navigate = useNavigate();

    const activeQuestions = selectedLevel === '12' ? QUESTIONS_12TH : QUESTIONS_UG;

    const handleStart = () => {
        setAppStep('QUIZ');
        setAnswers({});
        setError(null);
        setCurrentQuestionIndex(0);
    };

    const handleAnswer = async (value: string) => {
        const questionId = activeQuestions[currentQuestionIndex].id;
        const currentQuestion = activeQuestions[currentQuestionIndex];
        const nextAnswers = { ...answers, [questionId]: value };
        setAnswers(nextAnswers);

        const nextIndex = currentQuestionIndex + 1;

        if (nextIndex < activeQuestions.length) {
            const nextQuestion = activeQuestions[nextIndex];
            // Detect section boundary
            if (nextQuestion.sectionTitle) {
                const match = nextQuestion.sectionTitle.match(/Section (\d+):\s*(.*)/i);
                const name = nextAnswers[100] || 'there';
                const intro = nextQuestion.sectionIntro
                    ? nextQuestion.sectionIntro.replace(/{{name}}/gi, name)
                    : '';
                setTransitionSection({
                    num: match ? match[1] : '',
                    title: match ? match[2] : nextQuestion.sectionTitle,
                    intro,
                });
                setPendingNextIndex(nextIndex);
                setAppStep('SECTION_TRANSITION');
            } else {
                setCurrentQuestionIndex(nextIndex);
            }
        } else {
            // Save and redirect
            localStorage.setItem('pathfinder_quiz_state', JSON.stringify({
                answers: nextAnswers,
                level: selectedLevel,
                timestamp: Date.now()
            }));
            if (currentQuestion.paymentLink) {
                window.location.href = currentQuestion.paymentLink;
            } else {
                navigate('/results?success=true');
            }
        }
    };

    const handleBack = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleTransitionContinue = () => {
        setCurrentQuestionIndex(pendingNextIndex);
        setAppStep('QUIZ');
        setTransitionSection(null);
    };

    // WELCOME SCREEN
    if (appStep === 'WELCOME') {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-pink-50 relative overflow-hidden">
                <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative animate-fade-in-up">
                    {/* Left Brand Side */}
                    <div className="md:w-1/2 bg-white p-12 text-[#1D1D1F] flex flex-col justify-center relative overflow-hidden border-r border-slate-100">
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-8">
                                <img src="/appli-logo.png" alt="Appli Logo" className="h-14" />
                            </div>
                            <h1 className="text-5xl font-bold mb-6 leading-tight font-sans">
                                Design Your <span className="text-[#ED1164]">Future Career.</span>
                            </h1>
                            <p className="text-slate-600 text-lg mb-8 leading-relaxed font-light max-w-sm">
                                Advanced AI analysis of your skills, passions, and psychological drivers to recommend the perfect academic path.
                            </p>
                        </div>
                    </div>

                    {/* Right Action Side */}
                    <div className="md:w-1/2 p-12 flex flex-col justify-center items-center text-center bg-white relative">
                        <div className="mb-10 max-w-xs">
                            <h2 className="text-2xl font-bold text-slate-900 mb-3">Begin Assessment</h2>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                Discover your professional archetype and ideal degree matches in under 3 minutes.
                            </p>
                        </div>
                        <button
                            onClick={handleStart}
                            className="w-full bg-[#1D1D1F] hover:bg-[#333] text-white font-bold py-4 px-8 rounded-xl transition-all duration-200 shadow-xl hover:-translate-y-0.5"
                        >
                            Start Your Journey
                        </button>
                        {error && <p className="mt-4 text-red-600 text-xs bg-red-50 px-3 py-2 rounded border border-red-100">{error}</p>}
                    </div>
                </div>
            </div>
        );
    }

    // SECTION TRANSITION SCREEN
    if (appStep === 'SECTION_TRANSITION' && transitionSection) {
        const sectionNum = parseInt(transitionSection.num);

        // Preview bullets per section
        const sectionPreviews: Record<number, string[]> = {
            2: ['How you solve problems', 'Your natural working style', 'What environments you thrive in'],
            3: ['What drives your career ambitions', 'Real-world problems you care about', 'Degrees & paths you\'re considering'],
        };
        const bullets = sectionPreviews[sectionNum] || [];

        // 3 section names for progress dots
        const sectionNames = ['Academic Background', 'How You Think', 'Where You\'re Headed'];

        return (
            <div className="min-h-screen bg-white flex flex-col font-sans">
                {/* Header — same as quiz */}
                <header className="mx-auto px-6 py-6 flex items-center justify-between max-w-5xl w-full">
                    <img src="/appli-logo.png" alt="Appli Logo" className="h-8" />
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-slate-200 shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs font-semibold text-slate-600">Undergrad Track</span>
                    </div>
                </header>

                {/* Main content */}
                <main className="flex-1 flex items-center justify-center px-6 pb-12">
                    <div className="w-full max-w-2xl animate-fade-in-up">

                        {/* Section progress dots */}
                        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-10 w-full">
                            {sectionNames.map((name, i) => {
                                const idx = i + 1;
                                const isDone = idx < sectionNum;
                                const isActive = idx === sectionNum;
                                return (
                                    <React.Fragment key={i}>
                                        <div className="flex flex-col items-center gap-1 shrink-0">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isDone ? 'bg-[#ED1164] text-white' :
                                                isActive ? 'bg-[#ED1164] text-white ring-4 ring-[#ED1164]/20' :
                                                    'bg-slate-100 text-slate-400'
                                                }`}>
                                                {isDone ? (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                ) : idx}
                                            </div>
                                            <span className={`text-[9px] md:text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap ${isActive ? 'text-[#ED1164]' : isDone ? 'text-slate-400' : 'text-slate-300'}`}>
                                                {name}
                                            </span>
                                        </div>
                                        {i < sectionNames.length - 1 && (
                                            <div className={`hidden md:block w-8 lg:w-16 h-0.5 rounded-full ${isDone ? 'bg-[#ED1164]' : 'bg-slate-200'} shrink-0 mb-4`} />
                                        )}
                                        {i < sectionNames.length - 1 && (
                                            <div className={`md:hidden flex-1 max-w-[2rem] h-0.5 rounded-full ${isDone ? 'bg-[#ED1164]' : 'bg-slate-200'} shrink-0 mb-4`} />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>

                        {/* Card */}
                        <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-300/50 border border-slate-100 overflow-hidden">
                            {/* Pink top strip */}
                            <div className="h-2 bg-gradient-to-r from-[#ED1164] to-[#FF6B9D]" />

                            <div className="p-10 md:p-14">
                                {/* Label */}
                                <div className="inline-flex items-center gap-2 bg-pink-50 text-[#ED1164] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#ED1164] inline-block" />
                                    Section {transitionSection.num} of 3
                                </div>

                                {/* Title */}
                                <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 leading-tight">
                                    {transitionSection.title}
                                </h2>

                                {/* Intro */}
                                {transitionSection.intro && (
                                    <p className="text-slate-500 text-lg leading-relaxed mb-8">
                                        {transitionSection.intro}
                                    </p>
                                )}

                                {/* Bullet preview */}
                                {bullets.length > 0 && (
                                    <div className="mb-10">
                                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">In this section</p>
                                        <div className="flex flex-col gap-3">
                                            {bullets.map((b, i) => (
                                                <div key={i} className="flex items-center gap-3">
                                                    <div className="w-7 h-7 rounded-full bg-pink-50 flex items-center justify-center flex-shrink-0">
                                                        <svg className="w-3.5 h-3.5 text-[#ED1164]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                    </div>
                                                    <span className="text-slate-700 font-medium">{b}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* CTA */}
                                <button
                                    onClick={handleTransitionContinue}
                                    className="w-full bg-[#ED1164] hover:bg-[#C40E53] text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-pink-200 hover:-translate-y-0.5 flex items-center justify-center gap-3 text-lg group"
                                >
                                    <span>Continue</span>
                                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                </button>
                            </div>
                        </div>

                    </div>
                </main>
            </div>
        );
    }

    // QUIZ LAYOUT
    return (
        <div id="app-root" className="min-h-screen bg-white text-slate-900 font-sans flex flex-col">
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-100 w-full">
                <div className="mx-auto px-6 max-w-5xl">
                    {/* Row 1: Logo + badge */}
                    <div className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setAppStep('WELCOME')}>
                            <img src="/appli-logo.png" alt="Appli Logo" className="h-8" />
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-slate-200 shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-xs font-semibold text-slate-600">
                                {selectedLevel === '12' ? 'Undergrad Track' : 'Postgrad Track'}
                            </span>
                        </div>
                    </div>

                    {/* Row 2: Progress bar */}
                    {(() => {
                        const currentStep = currentQuestionIndex + 1;
                        const totalSteps = activeQuestions.length;
                        const sections: { short: string; start: number; end: number }[] = [];
                        let sectionIdx = -1;
                        activeQuestions.forEach((q, i) => {
                            if (q.sectionTitle) {
                                const short = q.sectionTitle.replace(/^Section \d+:\s*/i, '');
                                sections.push({ short, start: i + 1, end: i + 1 });
                                sectionIdx++;
                            } else if (sectionIdx >= 0) {
                                sections[sectionIdx].end = i + 1;
                            }
                        });

                        const beforeSections = sections.length === 0 || currentStep < sections[0].start;
                        return (
                            <div className="pb-3">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-[#ED1164] font-bold text-xs tracking-wider uppercase">Question {currentStep}</span>
                                    <span className="text-slate-400 font-mono text-xs">of {totalSteps}</span>
                                </div>
                                {beforeSections ? (
                                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                        <div className="bg-[#ED1164] h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${(currentStep / totalSteps) * 100}%` }} />
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        {sections.map((sec, idx) => {
                                            const sectionTotal = sec.end - sec.start + 1;
                                            const stepsIntoSection = Math.max(0, Math.min(currentStep - sec.start + 1, sectionTotal));
                                            const isActive = currentStep >= sec.start && currentStep <= sec.end;
                                            const isDone = currentStep > sec.end;
                                            const fillPct = isDone ? 100 : isActive ? (stepsIntoSection / sectionTotal) * 100 : 0;
                                            return (
                                                <div key={idx} className="flex-1">
                                                    <div className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 transition-colors ${isActive ? 'text-[#ED1164]' : isDone ? 'text-slate-400' : 'text-slate-300'}`}>
                                                        {sec.short}
                                                    </div>
                                                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                                        <div className="bg-[#ED1164] h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${fillPct}%` }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            </header>


            <main className="mx-auto px-6 pb-12 max-w-5xl flex-1 w-full">
                <QuestionCard
                    question={(() => {
                        const q = activeQuestions[currentQuestionIndex];
                        const name = answers[100] || 'there';
                        const processed = { ...q };
                        if (processed.text) processed.text = processed.text.replace(/{{name}}/gi, name);
                        if (processed.sectionIntro) processed.sectionIntro = processed.sectionIntro.replace(/{{name}}/gi, name);
                        return processed;
                    })()}
                    onAnswer={handleAnswer}
                    onBack={handleBack}
                    currentStep={currentQuestionIndex + 1}
                    totalSteps={activeQuestions.length}
                    allQuestions={activeQuestions}
                    subjectPool={(() => {
                        const q = activeQuestions[currentQuestionIndex];
                        if (q.id !== 1) return undefined;
                        // Union of subjects chosen in Q15 (Class 10) and Q14 (Class 12)
                        const s15 = answers[15] ? answers[15].split(', ').map(s => s.trim()).filter(Boolean) : [];
                        const s14 = answers[14] ? answers[14].split(', ').map(s => s.trim()).filter(Boolean) : [];
                        const pool = [...new Set([...s15, ...s14])];
                        return pool.length > 0 ? pool : undefined;
                    })()}
                />
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-100 mt-4 py-5 px-6">
                <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-slate-400">
                        © {new Date().getFullYear()} Appli. All rights reserved.
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <a
                            href="https://www.appli.global/privacy-policy"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-[#ED1164] transition-colors"
                        >
                            Privacy Policy
                        </a>
                        <span className="text-slate-300">·</span>
                        <a
                            href="https://www.appli.global/terms-conditions"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-[#ED1164] transition-colors"
                        >
                            Terms &amp; Conditions
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
};


