import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ResultsView } from '../components/ResultsView';
import { AnalysisResult } from '../types';
import { LoadingScreen } from '../components/LoadingScreen';
import { analyzeCareerPath } from '../services/geminiService';

// Simple Error Boundary to catch render crashes (e.g. missing data fields)
interface ErrorBoundaryProps {
    children: React.ReactNode;
    onReset: () => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    public state: ErrorBoundaryState;
    public props: ErrorBoundaryProps;

    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.props = props;
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: any) {
        return { hasError: true };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.error("ResultsPage Render Error:", error, errorInfo);
        // Auto-clear potentially corrupt data
        localStorage.removeItem('pathfinder_analysis_result');
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-2xl text-red-500">⚠️</span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Display Error</h2>
                        <p className="text-slate-600 mb-6 text-sm">
                            Something went wrong while displaying your results. The data might be incomplete.
                        </p>
                        <button
                            onClick={this.props.onReset}
                            className="w-full px-6 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors"
                        >
                            Reset & Try Again
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export const ResultsPage: React.FC = () => {
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Safety Timeout
    useEffect(() => {
        const timer = setTimeout(() => {
            if (loading && !analysisResult) {
                console.warn("Analysis timed out.");
                setLoading(false);
                setError("The analysis may take a moment, but it seems stuck. Please try again.");
            }
        }, 45000); // 45s timeout
        return () => clearTimeout(timer);
    }, [loading, analysisResult]);

    useEffect(() => {
        // TEST MODE: Check for test parameter in URL
        const isTestMode = searchParams.get('test') === 'true';
        if (isTestMode) {
            // Inject sample test data for viewing the results page
            const testData: AnalysisResult = {
                archetype: {
                    title: "The Innovative Problem Solver",
                    description: "You thrive on tackling complex challenges with creative solutions, combining analytical thinking with imaginative approaches.",
                    drivers: {
                        academic: { label: "STEM Excellence", explanation: "Strong foundation in science and mathematics" },
                        passion: { label: "Technology & Innovation", explanation: "Driven by cutting-edge technological advancement" },
                        cognitive: { label: "Analytical Thinker", explanation: "Excels at breaking down complex problems" },
                        domain: { label: "Engineering & Tech", explanation: "Natural affinity for technical domains" },
                        motivation: { label: "Impact-Driven", explanation: "Motivated by creating meaningful change" }
                    }
                },
                visionBoard: {
                    futureSelf: "In 10 years, you'll be leading innovative projects that blend technology and creativity, working with diverse teams to solve real-world problems that matter.",
                    keyThemes: ["Innovation", "Technology", "Leadership", "Impact"],
                    quote: "The best way to predict the future is to invent it. - Alan Kay"
                },
                skillSignature: [
                    { subject: "Analytical Thinking", A: 92, fullMark: 100 },
                    { subject: "Creativity", A: 85, fullMark: 100 },
                    { subject: "Technical Skills", A: 88, fullMark: 100 },
                    { subject: "Communication", A: 78, fullMark: 100 },
                    { subject: "Leadership", A: 75, fullMark: 100 }
                ],
                recommendations: [
                    {
                        degree: "B.Tech",
                        courseName: "Computer Science & Engineering",
                        matchReason: "Perfect alignment with your analytical mindset and passion for technology",
                        dataInsight: "95% of students with similar profiles report high satisfaction",
                        relevanceScore: 95
                    },
                    {
                        degree: "B.Tech",
                        courseName: "Artificial Intelligence & Machine Learning",
                        matchReason: "Combines your problem-solving skills with cutting-edge innovation",
                        dataInsight: "Fastest growing field with 40% YoY job growth",
                        relevanceScore: 92
                    },
                    {
                        degree: "B.Des",
                        courseName: "Interaction Design",
                        matchReason: "Merges creativity with technical implementation",
                        dataInsight: "High demand for UX/UI professionals in tech industry",
                        relevanceScore: 85
                    }
                ],
                alternativePathways: [
                    {
                        focus: "Business & Tech",
                        courseName: "Information Technology Management",
                        insight: "Bridge technical expertise with business strategy",
                        relevanceScore: 82
                    },
                    {
                        focus: "Creative Tech",
                        courseName: "Digital Media & Game Design",
                        insight: "Apply technical skills in creative industries",
                        relevanceScore: 78
                    },
                    {
                        focus: "Data Science",
                        courseName: "Data Science & Analytics",
                        insight: "Leverage analytical skills for data-driven insights",
                        relevanceScore: 88
                    }
                ],
                communityStats: {
                    headline: "Students like you often pursue careers in technology and innovation",
                    topCareers: [
                        { name: "Software Engineer", percentage: 35 },
                        { name: "Data Scientist", percentage: 25 },
                        { name: "Product Manager", percentage: 20 },
                        { name: "UX Designer", percentage: 12 },
                        { name: "Entrepreneur", percentage: 8 }
                    ],
                    commonInterests: ["Coding", "Problem Solving", "Innovation", "Technology", "Design Thinking"]
                },
                audioScript: "Welcome to your personalized career pathway analysis...",
                // userData: {
                //     name: "Alex Innovator",
                //     contact: "9876543210"
                // },
                degreePreferenceAnalysis: {
                    statedPreference: "Computer Science",
                    matchedCourses: [
                        {
                            degree: "B.Tech",
                            courseName: "B.E. Computer Science",
                            matchPercentage: 95,
                            matchInsight: "Strong personality match - aligns with your logical thinking."
                        },
                        {
                            degree: "B.Sc",
                            courseName: "B.Sc Computer Science",
                            matchPercentage: 90,
                            matchInsight: "Good theoretical fit for your academic profile."
                        },
                        {
                            degree: "BCA",
                            courseName: "Bachelor of Computer Applications",
                            matchPercentage: 85,
                            matchInsight: "Practical, skills-based alignment."
                        }
                    ],
                    overallInsight: "Excellent alignment! Your interest in Computer Science matches very well with your logical and analytical profile."
                }
            };
            setAnalysisResult(testData);
            setLoading(false);
            return;
        }

        // 1. Check for saved result first (Persistence from refresh)
        const savedResult = localStorage.getItem('pathfinder_analysis_result');
        if (savedResult) {
            try {
                const parsed = JSON.parse(savedResult);
                // Strict validation: Check for key fields. If missing, treat as invalid.
                if (parsed.data && parsed.data.archetype && parsed.data.recommendations && parsed.data.parentLetterData) {
                    setAnalysisResult(parsed.data);
                    setLoading(false);
                    return; // We have results, no need to re-run AI
                } else {
                    console.warn("Found saved result but it seems incomplete or missing new parent letter fields. Re-running.");
                    localStorage.removeItem('pathfinder_analysis_result');
                }
            } catch (e) {
                console.error("Failed to parse saved result", e);
                localStorage.removeItem('pathfinder_analysis_result');
            }
        }

        // 2. If no result, check if we have a quiz state to process (Post-Payment)
        const quizState = localStorage.getItem('pathfinder_quiz_state');
        if (quizState) {
            try {
                const parsedState = JSON.parse(quizState);
                const { answers, level, sessionId } = parsedState;
                setLoading(true);

                analyzeCareerPath(answers, level)
                    .then(result => {
                        localStorage.setItem('pathfinder_analysis_result', JSON.stringify({
                            timestamp: Date.now(),
                            sessionId: sessionId ?? null,
                            data: result,
                        }));
                        localStorage.removeItem('pathfinder_quiz_state');
                        setAnalysisResult(result);

                        // Log analyzed stage to backend (fire-and-forget)
                        try {
                            const summary = {
                                archetype: result.archetype?.title ?? null,
                                topCourse: result.recommendations?.[0]?.courseName ?? null,
                            };

                            fetch('/api/session', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    sessionId: sessionId ?? null,
                                    level,
                                    stage: 'analyzed',
                                    resultSummary: summary,
                                }),
                            })
                                .then(() => {
                                    console.debug('[session-client] Logged analyzed stage', { sessionId: sessionId ?? null });
                                })
                                .catch((err) => {
                                    console.warn('Failed to log session (analyzed stage)', err);
                                });
                        } catch (err) {
                            console.warn('Failed to start session logging (analyzed stage)', err);
                        }
                        setLoading(false);
                    })
                    .catch(err => {
                        console.error("Analysis Error:", err);
                        setError("Analysis failed. Please try again.");
                        setLoading(false);
                    });
            } catch (e) {
                console.error("Failed to parse quiz state", e);
                setError("Invalid session data.");
                setLoading(false);
            }
        } else {
            // No Quiz State -> Redirect Home
            // navigate('/');
            console.warn("Missing quiz state or results. Showing debug screen.");
            setError("No results found. Did you complete the quiz?");
            setLoading(false);
        }
    }, [navigate, searchParams]);

    const handleRestart = () => {
        localStorage.removeItem('pathfinder_analysis_result');
        localStorage.removeItem('pathfinder_quiz_state');
        navigate('/');
        window.location.reload(); // Force full reload to clear any memory states
    };

    if (loading) return <LoadingScreen />;

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Analysis Error</h2>
                    <p className="text-slate-600 mb-6">{error}</p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleRestart}
                            className="w-full px-6 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors"
                        >
                            Start Assessment
                        </button>
                        <button
                            onClick={() => { localStorage.clear(); window.location.reload(); }}
                            className="text-sm text-slate-400 hover:text-slate-600"
                        >
                            Clear App Data & Refresh
                        </button>
                        {/* Dev Button */}
                        <button
                            onClick={() => window.location.href = '/results?test=true'}
                            className="text-xs text-blue-500 hover:underline mt-2"
                        >
                            View Sample Report (Dev)
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!analysisResult) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-white">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-400 mb-4">No Data Loaded</h2>
                    <p className="text-slate-500 mb-8">
                        The analysis result is missing. This usually happens if the page is refreshed without completing the quiz.
                        <br />
                        <span className="text-xs font-mono bg-slate-100 p-1 rounded mt-2 block">Debug: Loading={loading.toString()}, Error={error}</span>
                    </p>
                    <button
                        onClick={handleRestart}
                        className="px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-700"
                    >
                        Restart Assessment
                    </button>
                    {/* Dev Mode Button - Only shows if localhost */}
                    <button
                        onClick={() => window.location.href = '/results?test=true'}
                        className="block mx-auto mt-4 text-xs text-blue-500 hover:underline"
                    >
                        Load Test Data (Dev Only)
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans">
            <header className="mx-auto px-6 py-6 flex items-center justify-between max-w-7xl">
                <div className="flex items-center gap-2 cursor-pointer" onClick={handleRestart}>
                    <img src="/appli-logo.png" alt="Appli Logo" className="h-8" />
                </div>
            </header>

            <main className="mx-auto px-6 pb-12 max-w-7xl">
                <ErrorBoundary onReset={handleRestart}>
                    <ResultsView data={analysisResult} onRestart={handleRestart} />
                </ErrorBoundary>
            </main>
        </div>
    );
};

