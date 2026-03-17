import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QUESTIONS_12TH, QUESTIONS_UG } from '../constants';
import { QuestionCard } from '../components/QuestionCard';
import { AnswerMap } from '../types';

const createSessionId = () =>
    `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

type Level = '12' | 'UG';
type AppStep = 'WELCOME' | 'SECTION_TRANSITION' | 'QUIZ';

export const QuizPage: React.FC = () => {
    const [appStep, setAppStep] = useState<AppStep>('WELCOME');
    const [selectedLevel, setSelectedLevel] = useState<Level>('12');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
    const [answers, setAnswers] = useState<AnswerMap>({});
    const [error, setError] = useState<string | null>(null);
    const [pendingNextIndex, setPendingNextIndex] = useState<number>(0);
    const [transitionSection, setTransitionSection] = useState<{ num: string; title: string; intro: string } | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const navigate = useNavigate();

    const activeQuestions = selectedLevel === '12' ? QUESTIONS_12TH : QUESTIONS_UG;

    const startRazorpayPayment = () => {
        const key = import.meta.env.VITE_RAZORPAY_KEY_ID;
        if (!key) {
            alert('Payment configuration is missing. Please contact support.');
            return;
        }

        const amountInPaise = 49900; // ₹499.00. //49900

        const options: any = {
            key,
            amount: amountInPaise,
            currency: 'INR',
            name: 'Appli Pathfinder Report',
            description: 'Personalized career report and analysis',
            handler: (response: any) => {
                console.debug('[payment-client] Razorpay handler response', response);
                try {
                    const saved = localStorage.getItem('pathfinder_quiz_state');
                    const state = saved ? JSON.parse(saved) : {};

                    // Razorpay may return contact/email depending on your
                    // Checkout configuration. We prefer Razorpay's contact
                    // for WhatsApp billing phone when available.
                    const razorpayContact = (response && (response.contact || response.razorpay_contact)) ||
                        state.billing?.phone ||
                        '';

                    const updated = {
                        ...state,
                        payment: {
                            provider: 'razorpay',
                            paymentId: response.razorpay_payment_id,
                            orderId: response.razorpay_order_id,
                            signature: response.razorpay_signature,
                            timestamp: Date.now(),
                        },
                        billing: {
                            ...(state.billing || {}),
                            name: state.answers?.[100] || state.billing?.name || '',
                            phone: razorpayContact,
                        },
                    };

                    localStorage.setItem('pathfinder_quiz_state', JSON.stringify(updated));
                    console.debug('[payment-client] Stored Razorpay payment info', updated.payment);

                    // Fire-and-forget invoice generation
                    try {
                        fetch('/api/invoice', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                sessionId: updated.sessionId,
                                level: updated.level,
                                payment: updated.payment,
                                billing: updated.billing || {
                                    name: updated.answers?.[100] || '',
                                    phone: razorpayContact,
                                },
                                amount: amountInPaise,
                                currency: 'INR',
                            }),
                        })
                            .then(() => {
                                console.debug('[invoice-client] Triggered invoice generation', { sessionId: updated.sessionId });
                            })
                            .catch((err) => {
                                console.warn('[invoice-client] Failed to trigger invoice generation', err);
                            });
                    } catch (err) {
                        console.warn('[invoice-client] Error while calling invoice API', err);
                    }
                } catch (e) {
                    console.error('[payment-client] Failed to attach payment info to quiz state', e);
                }

                navigate('/results?success=true');
            },
            prefill: {
                name: answers[100] || '',
            },
            theme: {
                color: '#ED1164',
            },
        };

        // @ts-ignore
        const rzp = new window.Razorpay(options);
        rzp.open();
    };

    const handleStart = () => {
        const newSessionId = createSessionId();
        setSessionId(newSessionId);
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
            const finalSessionId = sessionId ?? createSessionId();
            const payload = {
                answers: nextAnswers,
                level: selectedLevel,
                timestamp: Date.now(),
                sessionId: finalSessionId,
            };

            localStorage.setItem('pathfinder_quiz_state', JSON.stringify(payload));

            // Fire-and-forget session log to backend (non-blocking)
            try {
                fetch('/api/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId: finalSessionId,
                        level: selectedLevel,
                        answers: nextAnswers,
                        stage: 'completed',
                    }),
                })
                    .then(() => {
                        console.debug('[session-client] Logged completed stage', { sessionId: finalSessionId });
                    })
                    .catch((err) => {
                        console.warn('Failed to log session (completed stage)', err);
                    });
            } catch (err) {
                console.warn('Failed to start session logging (completed stage)', err);
            }
            // After quiz completion, trigger Razorpay payment for the report
            startRazorpayPayment();
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

    // WELCOME / INTRO SCREEN — Pathway Design
    if (appStep === 'WELCOME') {
        const checkpoints = [
            {
                num: '01',
                icon: '🧠',
                title: 'How You Think',
                desc: 'Problem-solving style & the environments you thrive in.',
                color: '#7C3AED',
                side: 'right' as const,
            },
            {
                num: '02',
                icon: '🎯',
                title: 'Where You\'re Headed',
                desc: 'Ambitions, dream careers & degree preferences.',
                color: '#0EA5E9',
                side: 'left' as const,
            },
            {
                num: '03',
                icon: '📚',
                title: 'Academic Background',
                desc: 'Subjects, scores & what lit you up in school.',
                color: '#ED1164',
                side: 'right' as const,
            },
        ];

        return (
            <div className="min-h-screen font-sans overflow-x-hidden" style={{ background: 'linear-gradient(170deg, #ffffff 0%, #fdf2f7 45%, #fce7f3 100%)' }}>
                {/* Background blobs */}
                <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
                    <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.15] blur-3xl" style={{ background: '#ED1164' }} />
                    <div className="absolute top-1/2 -left-40 w-[400px] h-[400px] rounded-full opacity-[0.08] blur-3xl" style={{ background: '#7C3AED' }} />
                    <div className="absolute -bottom-40 right-0 w-[400px] h-[400px] rounded-full opacity-[0.1] blur-3xl" style={{ background: '#FF6B9D' }} />
                </div>

                <div className="relative z-10 max-w-3xl mx-auto px-6 py-14">

                    {/* ── Logo ── */}
                    <div className="flex justify-center mb-4 animate-fade-in-down delay-0">
                        <img src="/appli-logo.svg" alt="Appli" className="h-12" style={{ mixBlendMode: 'darken' }} />
                    </div>

                    {/* ── Hero text ── */}
                    <div className="text-center mb-8 animate-fade-in-up delay-100">
                        <div className="inline-flex items-center gap-2 bg-pink-50 border border-pink-100 text-[#ED1164] text-[11px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ED1164] animate-pulse-dot inline-block" />
                            <span>COURSE DISCOVERY ASSESSMENT <span className="mx-1 opacity-50">|</span> <span className="normal-case tracking-normal text-[13px]">at ₹499 only</span></span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-3">
                            Still Figuring Out What to Study? <br />
                            <span className="shimmer-text">You're in the Right Place</span>
                        </h1>
                        <p className="text-slate-500 text-base max-w-sm mx-auto leading-relaxed mb-8">
                            Answer 3 sets of questions. Get a personalised course report built on 850+ courses and real industry data.
                        </p>

                        {/* ── CTA ── */}
                        <div className="flex flex-col items-center gap-3 animate-fade-in-up delay-200">
                            <button
                                onClick={handleStart}
                                className="w-full max-w-xs bg-[#ED1164] hover:bg-[#C40E53] text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 shadow-xl shadow-pink-300/40 hover:-translate-y-1 hover:shadow-pink-400/60 flex items-center justify-center gap-3 text-lg group animate-float-scale"
                            >
                                <span>Get Your Report</span>
                                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </button>
                            {error && <p className="text-red-600 text-xs bg-red-50 px-3 py-2 rounded border border-red-100">{error}</p>}
                            <p className="text-xs text-slate-400">No sign-up · 10-minute assessment · Instant report</p>
                        </div>
                    </div>

                    {/* ── Pathway ── */}
                    {/* Fixed-height container: SVG and all nodes/cards are absolutely positioned
                        using the SAME percentage coordinates so they always align. */}
                    <div className="relative w-full mb-16" style={{ height: 750 }}>

                        {/* SVG path — viewBox 0 0 100 100 so % coords match DOM % positions */}
                        <svg
                            className="absolute inset-0 w-full h-full pointer-events-none z-0"
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                            aria-hidden
                        >
                            <defs>
                                <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#ED1164" stopOpacity="0.6" />
                                    <stop offset="50%" stopColor="#7C3AED" stopOpacity="0.5" />
                                    <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.4" />
                                </linearGradient>
                                <filter id="glow">
                                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                                </filter>
                            </defs>
                            {/*
                                Path connects:
                                  Start  (50, 4)
                                  Node01 (83, 24)  — right side
                                  Node02 (17, 50)  — left side
                                  Node03 (83, 76)  — right side
                                  Finish (50, 96)
                            */}
                            <path
                                d="M 50 4
                                   C 50 12 83 12 83 24
                                   C 83 37 17 37 17 50
                                   C 17 63 83 63 83 76
                                   C 83 88 50 90 50 96"
                                fill="none"
                                stroke="url(#pg)"
                                strokeWidth="0.8"
                                strokeDasharray="2.5 1.8"
                                strokeLinecap="round"
                                filter="url(#glow)"
                            />
                        </svg>

                        {/* ── START node — top centre (50%, 4%) ── */}
                        <div
                            className="absolute z-10"
                            style={{ left: '50%', top: '4%', transform: 'translate(-50%, -18px)' }}
                        >
                            <div className="flex flex-col items-center gap-1 animate-scale-in delay-200">
                                <div className="w-9 h-9 rounded-full bg-white border-2 border-[#ED1164] shadow-lg shadow-pink-200/60 flex items-center justify-center text-[#ED1164] font-bold">
                                    ★
                                </div>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-[#ED1164]">Start</span>
                            </div>
                        </div>

                        {/* ── Checkpoint 01 ── */}
                        <div
                            className="absolute z-10"
                            style={{ left: '83%', top: '24%', transform: 'translate(-50%, -50%)' }}
                        >
                            <div
                                className="absolute top-1/2 left-1/2 w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center text-white text-sm font-extrabold shadow-lg hover:scale-110 transition-transform -translate-x-1/2 -translate-y-1/2 z-20"
                                style={{ background: 'linear-gradient(135deg,#7C3AED,#7C3AEDaa)', boxShadow: '0 4px 18px #7C3AED40' }}
                            >01</div>
                            <div className="absolute right-6 md:right-10 top-1/2 -translate-y-1/2 flex flex-col items-center w-[160px] md:w-[220px] pointer-events-none animate-fade-in-up delay-300">
                                <img src="/Shrug-rafiki.svg" alt="Clueless" className="w-32 h-32 md:w-44 md:h-44 object-contain drop-shadow-md pointer-events-auto mix-blend-multiply animate-float delay-100" />
                                <span className="font-bold text-slate-800 text-sm md:text-lg leading-tight bg-white/80 backdrop-blur-md px-4 py-1.5 rounded-full shadow-sm border border-slate-100 pointer-events-auto text-center mt-[-15px] z-30">Clueless</span>
                            </div>
                        </div>

                        {/* ── Checkpoint 02 ── */}
                        <div
                            className="absolute z-10"
                            style={{ left: '17%', top: '50%', transform: 'translate(-50%, -50%)' }}
                        >
                            <div
                                className="absolute top-1/2 left-1/2 w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center text-white text-sm font-extrabold shadow-lg hover:scale-110 transition-transform -translate-x-1/2 -translate-y-1/2 z-20"
                                style={{ background: 'linear-gradient(135deg,#0EA5E9,#0EA5E9aa)', boxShadow: '0 4px 18px #0EA5E940' }}
                            >02</div>
                            <div className="absolute left-6 md:left-10 top-1/2 -translate-y-1/2 flex flex-col items-center w-[160px] md:w-[220px] pointer-events-none animate-fade-in-up delay-500">
                                <img src="/Choose-rafiki.svg" alt="Customizing" className="w-32 h-32 md:w-44 md:h-44 object-contain drop-shadow-md pointer-events-auto mix-blend-multiply animate-float delay-300" />
                                <span className="font-bold text-slate-800 text-sm md:text-lg leading-tight bg-white/80 backdrop-blur-md px-4 py-1.5 rounded-full shadow-sm border border-slate-100 pointer-events-auto text-center mt-[-15px] z-30">Customizing</span>
                            </div>
                        </div>

                        {/* ── Checkpoint 03 ── */}
                        <div
                            className="absolute z-10"
                            style={{ left: '83%', top: '76%', transform: 'translate(-50%, -50%)' }}
                        >
                            <div
                                className="absolute top-1/2 left-1/2 w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center text-white text-sm font-extrabold shadow-lg hover:scale-110 transition-transform -translate-x-1/2 -translate-y-1/2 z-20"
                                style={{ background: 'linear-gradient(135deg,#ED1164,#ED1164aa)', boxShadow: '0 4px 18px #ED116440' }}
                            >03</div>
                            <div className="absolute right-6 md:right-10 top-1/2 -translate-y-1/2 flex flex-col items-center w-[160px] md:w-[220px] pointer-events-none animate-fade-in-up delay-700">
                                <img src="/Statistics-rafiki.svg" alt="Clarity" className="w-32 h-32 md:w-44 md:h-44 object-contain drop-shadow-md pointer-events-auto mix-blend-multiply animate-float delay-500" />
                                <span className="font-bold text-slate-800 text-sm md:text-lg leading-tight bg-white/80 backdrop-blur-md px-4 py-1.5 rounded-full shadow-sm border border-slate-100 pointer-events-auto text-center mt-[-15px] z-30">Clarity</span>
                            </div>
                        </div>

                        {/* ── FINISH node — bottom centre (50%, 96%) ── */}
                        <div
                            className="absolute z-10"
                            style={{ left: '50%', top: '96%', transform: 'translate(-50%, -28px)' }}
                        >
                            <div className="flex flex-col items-center gap-2 animate-scale-in delay-800">
                                <div className="relative">
                                    <div className="absolute inset-0 rounded-full blur-md opacity-50 animate-pulse" style={{ background: '#ED1164' }} />
                                    <div className="relative w-14 h-14 rounded-full bg-[#ED1164] flex items-center justify-center shadow-2xl shadow-pink-400/50 text-white text-xl">✦</div>
                                </div>
                                <p className="text-[9px] font-extrabold uppercase tracking-widest text-[#ED1164]">Your Results</p>
                            </div>
                        </div>
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
            1: ['How you solve problems', 'Your natural working style', 'What environments you thrive in'],
            2: ['What drives your career ambitions', 'Real-world problems you care about', 'Degrees & paths you\'re considering'],
            3: ['Your strongest subjects', 'Class 10 & 12 performance', 'What subjects click naturally for you'],
        };
        const bullets = sectionPreviews[sectionNum] || [];

        // 3 section names for progress dots (matching the new order)
        const sectionNames = ['How You Think', 'Where You\'re Headed', 'Academic Background'];

        return (
            <div className="min-h-screen bg-white flex flex-col font-sans">
                {/* Header — same as quiz */}
                <header className="mx-auto px-6 py-6 flex items-center justify-between max-w-5xl w-full">
                    <img src="/appli-logo.svg" alt="Appli Logo" className="h-8" />

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
                            <img src="/appli-logo.svg" alt="Appli Logo" className="h-8" />
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
                    answers={answers}
                    subjectPool={(() => {
                        const q = activeQuestions[currentQuestionIndex];
                        if (q.id !== 1) return undefined;
                        // Get subjects chosen from the consolidated Q15
                        const s15 = answers[15] ? answers[15].split(', ').map(s => s.trim()).filter(Boolean) : [];
                        return s15.length > 0 ? s15 : undefined;
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


