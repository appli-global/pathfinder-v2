import React, { useState, useEffect } from 'react';
import { Question } from '../types';

interface QuestionCardProps {
  question: Question;
  onAnswer: (value: string) => void;
  currentStep: number;
  totalSteps: number;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ question, onAnswer, currentStep, totalSteps }) => {
  const [textAnswer, setTextAnswer] = useState('');

  useEffect(() => {
    setTextAnswer('');
  }, [question.id]);

  const handleTextSubmit = () => {
    if (textAnswer.trim()) {
      onAnswer(textAnswer);
    }
  };

  // State for Contact Details
  const [contactName, setContactName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [contactError, setContactError] = useState('');

  const handleContactSubmit = () => {
    // Strict 10-digit validation
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(contactNumber)) {
      setContactError("Please enter a valid 10-digit phone number.");
      return;
    }
    setContactError("");
    onAnswer(JSON.stringify({ name: contactName, contact: contactNumber }));
  };

  const isTextInput = question.inputType === 'text';
  const isContactInput = question.inputType === 'contact_details';

  return (
    <div className="w-full max-w-3xl mx-auto animate-fade-in-up">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-end mb-2">
          <span className="text-[#ED1164] font-bold text-xs tracking-wider uppercase">Question {currentStep}</span>
          <span className="text-slate-400 font-mono text-xs">of {totalSteps}</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-[#ED1164] h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-300/50 border border-slate-100 relative overflow-hidden animate-fade-in-up">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-50/50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <div className="p-8 md:p-12 relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 leading-tight">{question.text}</h2>
          {question.subtext && (
            <p className="text-lg text-slate-500 mb-10 font-normal">{question.subtext}</p>
          )}

          {isTextInput ? (
            <div className="mt-8">
              <textarea
                className="w-full p-6 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-[#ED1164] focus:bg-white focus:ring-4 focus:ring-[#ED1164]/20 transition-all text-xl text-slate-900 placeholder-slate-400 resize-none font-medium shadow-inner outline-none"
                rows={4}
                placeholder={question.placeholder || "Type your answer here..."}
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleTextSubmit();
                  }
                }}
              />
              <button
                onClick={handleTextSubmit}
                disabled={!textAnswer.trim()}
                className="mt-6 w-full bg-[#ED1164] hover:bg-[#C40E53] text-white font-bold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl hover:shadow-pink-500/20 hover:-translate-y-0.5 flex items-center justify-center gap-2 group"
              >
                <span>Continue</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
              <p className="text-xs text-slate-400 mt-4 text-center">Press <span className="font-mono bg-slate-100 px-1 rounded text-slate-500 border border-slate-200">Enter</span> to continue</p>
            </div>
          ) : isContactInput ? (
            <div className="mt-8 space-y-6">
              <div>
                <label className="block text-slate-500 text-sm font-bold mb-2 uppercase tracking-wider">Your Name</label>
                <input
                  type="text"
                  className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-[#ED1164] focus:bg-white focus:ring-4 focus:ring-[#ED1164]/20 transition-all text-lg text-slate-900 placeholder-slate-400 outline-none"
                  placeholder="e.g. Alex Johnson"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-500 text-sm font-bold mb-2 uppercase tracking-wider">Contact Number</label>
                <input
                  type="tel"
                  className={`w-full p-4 bg-slate-50 border-2 rounded-xl focus:bg-white focus:ring-4 transition-all text-lg text-slate-900 placeholder-slate-400 outline-none ${contactError ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-[#ED1164] focus:ring-[#ED1164]/20'
                    }`}
                  placeholder="e.g. 9876543210"
                  value={contactNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, ''); // Only allow numbers
                    if (val.length <= 10) setContactNumber(val);
                    if (contactError && val.length === 10) setContactError('');
                  }}
                />
                {contactError && <p className="mt-2 text-red-500 text-sm font-medium">{contactError}</p>}
              </div>

              <button
                onClick={handleContactSubmit}
                disabled={!contactName.trim() || contactNumber.length !== 10}
                className="mt-6 w-full bg-[#ED1164] hover:bg-[#C40E53] text-white font-bold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl hover:shadow-pink-500/20 hover:-translate-y-0.5 flex items-center justify-center gap-2 group"
              >
                <span>Submit Details</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            </div>
          ) : (
            <div className="grid gap-4 mt-8">
              {question.options?.map((option, idx) => (
                <button
                  key={option.value}
                  onClick={() => onAnswer(option.value)}
                  className="group relative flex items-center w-full p-6 text-left bg-white border-2 border-slate-100 rounded-2xl hover:border-[#ED1164] hover:bg-slate-50 hover:shadow-lg hover:shadow-pink-500/5 transition-all duration-200 ease-out active:scale-[0.99]"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-slate-100 group-hover:bg-[#ED1164] text-slate-500 group-hover:text-white mr-5 flex items-center justify-center transition-colors duration-200 font-bold text-sm">
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className="text-lg text-slate-700 group-hover:text-slate-900 font-semibold flex-1">
                    {option.label}
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0 -translate-x-2 text-[#ED1164]">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};