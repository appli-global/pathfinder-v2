import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PDFReportTemplate } from '../components/PDFReportTemplate';
import { AnalysisResult } from '../types';

export const PDFReportPage: React.FC = () => {
    const [data, setData] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const saved = localStorage.getItem('pathfinder_analysis_result');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.data && parsed.data.archetype) {
                    setData(parsed.data);
                } else {
                    setError('Report data is incomplete.');
                }
            } catch {
                setError('Failed to load report data.');
            }
        } else {
            setError('No report data found. Please complete the quiz first.');
        }
    }, []);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center max-w-md p-8 bg-white rounded-2xl shadow-xl border border-slate-100">
                    <p className="text-slate-600 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-10 h-10 border-4 border-pink-200 border-t-[#ED1164] rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-white min-h-screen">
            {/* Toolbar */}
            <div className="no-print fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
                <button
                    onClick={() => navigate('/results')}
                    className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium text-sm transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Results
                </button>
                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Report Preview</span>
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-[#ED1164] hover:bg-[#C40E53] text-white font-bold py-2 px-5 rounded-xl text-sm transition-all shadow-lg hover:shadow-pink-200"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print / Save as PDF
                </button>
            </div>

            {/* Report Content */}
            <div className="pt-14">
                <PDFReportTemplate data={data} preview={true} />
            </div>
        </div>
    );
};
