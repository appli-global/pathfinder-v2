import React, { useState, useEffect } from 'react';
import { Question } from '../types';

interface QuestionCardProps {
  question: Question;
  onAnswer: (value: string) => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
  allQuestions: Question[];
  subjectPool?: string[]; // Pre-filtered list for single-pick favourite subject question
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ question, onAnswer, onBack, currentStep, totalSteps, allQuestions, subjectPool }) => {
  // Sanitization utility to prevent XSS and CSV injection
  function sanitizeInput(input: string): string {
    // Remove leading =, +, -, @ (CSV injection)
    let sanitized = input.replace(/^([=+\-@]+)/, '');
    // Escape HTML special chars
    sanitized = sanitized.replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
    return sanitized;
  }
  const [textAnswer, setTextAnswer] = useState('');
  const [yesNoState, setYesNoState] = useState<'idle' | 'yes' | 'no'>('idle');
  const [yesNoText, setYesNoText] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [otherInputValue, setOtherInputValue] = useState('');

  useEffect(() => {
    setTextAnswer('');
    setNumericScore('');
    setNumericError('');
    setContactError('');
    setYesNoState('idle');
    setYesNoText('');
    setSelectedSubjects([]);
    setOtherInputValue('');
  }, [question.id]);

  const handleTextSubmit = () => {
    if (textAnswer.trim()) {
      onAnswer(sanitizeInput(textAnswer));
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
    // Sanitize name and contact
    const safeName = sanitizeInput(contactName);
    const safeContact = sanitizeInput(contactNumber);
    onAnswer(JSON.stringify({ name: safeName, contact: safeContact }));
  };

  // State for Numeric Score (0-100)
  const [numericScore, setNumericScore] = useState('');
  const [numericError, setNumericError] = useState('');

  const handleNumericSubmit = () => {
    const val = parseFloat(numericScore);
    if (isNaN(val) || val < 0 || val > 100) {
      setNumericError("Please enter a valid percentage between 0 and 100.");
      return;
    }
    setNumericError("");
    onAnswer(numericScore);
  };

  const isTextInput = question.inputType === 'text';
  const isContactInput = question.inputType === 'contact_details';
  const isNumericScoreInput = question.inputType === 'numeric_score';
  const isPhoneNumberInput = question.inputType === 'phone_number';
  const isYesNoText = question.inputType === 'yes_no_text';
  const isSubjectPicker = question.inputType === 'subject_picker';
  const isSubjectPickerSingle = question.inputType === 'subject_picker_single';

  // Class 10: Core CBSE subjects everyone takes + popular electives
  const SUBJECT_GROUPS_10 = [
    {
      label: 'Core Subjects',
      subjects: ['Mathematics', 'Science', 'Social Science', 'English', 'Hindi'],
    },
    {
      label: 'Languages',
      subjects: ['Kannada', 'Sanskrit', 'French', 'German'],
    },
  ];

  // Class 12: Stream-based subjects
  const SUBJECT_GROUPS_12 = [
    {
      label: 'Science Stream',
      subjects: ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Computer Science', 'Biotechnology', 'Physical Education'],
    },
    {
      label: 'Commerce Stream',
      subjects: ['Accountancy', 'Business Studies', 'Economics', 'Applied Mathematics', 'Entrepreneurship', 'Legal Studies'],
    },
    {
      label: 'Humanities Stream',
      subjects: ['History', 'Geography', 'Political Science', 'Psychology', 'Sociology', 'Fine Arts', 'Music', 'Home Science'],
    },
  ];

  // Full predefined set for custom-chip detection (union of both lists)
  const ALL_PREDEFINED = new Set([
    'Mathematics', 'Science', 'Social Science', 'English', 'Hindi',
    'Sanskrit', 'French', 'German', 'Regional Language',
    'Computer Applications', 'Information Technology', 'Physical Education', 'Fine Arts', 'Music', 'Home Science',
    'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Biotechnology',
    'Accountancy', 'Business Studies', 'Economics', 'Applied Mathematics', 'Entrepreneurship', 'Legal Studies',
    'History', 'Geography', 'Political Science', 'Psychology', 'Sociology',
    'Informatics Practices',
  ]);

  // Pick the right subject groups for this question
  const SUBJECT_GROUPS = question.id === 14 ? SUBJECT_GROUPS_12 : SUBJECT_GROUPS_10;

  return (
    <div className="w-full max-w-3xl mx-auto animate-fade-in-up pt-6">
      <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-300/50 border border-slate-100 relative overflow-hidden animate-fade-in-up">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-50/50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <div className="p-8 md:p-12 relative z-10">


          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 leading-tight">{question.text}</h2>
          {question.subtext && (
            <p className="text-lg text-slate-500 mb-10 font-normal">{question.subtext}</p>
          )}

          {(isSubjectPicker || isSubjectPickerSingle) ? (
            <div className="mt-6">
              {isSubjectPickerSingle && subjectPool && subjectPool.length > 0 ? (
                // Single-pick from the subjects user already chose in Q15 + Q14
                <>
                  <div className="flex flex-wrap gap-2">
                    {subjectPool.map((subject) => {
                      const isSelected = selectedSubjects.includes(subject);
                      return (
                        <button
                          key={subject}
                          onClick={() => {
                            setSelectedSubjects([subject]);
                            setTimeout(() => onAnswer(subject), 150);
                          }}
                          className={`px-4 py-2.5 rounded-full text-sm font-semibold border-2 transition-all duration-150 ${isSelected
                            ? 'bg-[#ED1164] border-[#ED1164] text-white shadow-md shadow-pink-200'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-[#ED1164] hover:text-[#ED1164] hover:bg-pink-50'
                            }`}
                        >
                          {subject}
                        </button>
                      );
                    })}
                  </div>
                  {/* Other input for Q1 single-select */}
                  <div className="mt-5">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Enter your choice</p>
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={otherInputValue}
                        onChange={(e) => setOtherInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && otherInputValue.trim()) {
                            onAnswer(otherInputValue.trim());
                          }
                        }}
                        placeholder="Type a subject and press Enter…"
                        className="flex-1 px-4 py-2.5 rounded-full text-sm border-2 border-slate-200 bg-white text-slate-700 placeholder-slate-400 focus:border-[#ED1164] focus:outline-none focus:ring-2 focus:ring-[#ED1164]/20 transition-all"
                      />
                      <button
                        onClick={() => {
                          if (otherInputValue.trim()) onAnswer(otherInputValue.trim());
                        }}
                        disabled={!otherInputValue.trim()}
                        className="w-10 h-10 rounded-full border-2 border-slate-200 bg-white text-slate-500 hover:border-[#ED1164] hover:text-[#ED1164] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all text-xl font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                // Multi-select or fallback full grouped list
                <div className="space-y-5">
                  {(question.id === 14 ? SUBJECT_GROUPS_12 : SUBJECT_GROUPS_10).map((group) => (
                    <div key={group.label}>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">{group.label}</p>
                      <div className="flex flex-wrap gap-2">
                        {group.subjects.map((subject) => {
                          const isSelected = selectedSubjects.includes(subject);
                          return (
                            <button
                              key={subject}
                              onClick={() => {
                                if (isSubjectPickerSingle) {
                                  setSelectedSubjects([subject]);
                                  setTimeout(() => onAnswer(subject), 150);
                                } else {
                                  setSelectedSubjects((prev) =>
                                    isSelected ? prev.filter((s) => s !== subject) : [...prev, subject]
                                  );
                                }
                              }}
                              className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all duration-150 ${isSelected
                                ? 'bg-[#ED1164] border-[#ED1164] text-white shadow-md shadow-pink-200'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-[#ED1164] hover:text-[#ED1164] hover:bg-pink-50'
                                }`}
                            >
                              {subject}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}


              {isSubjectPicker && (
                <>
                  {/* "Other" custom subject input */}
                  <div className="mt-5">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Enter your choice</p>
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={otherInputValue}
                        onChange={(e) => setOtherInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && otherInputValue.trim()) {
                            const val = otherInputValue.trim();
                            if (!selectedSubjects.includes(val)) {
                              setSelectedSubjects((prev) => [...prev, val]);
                            }
                            setOtherInputValue('');
                          }
                        }}
                        placeholder="Type a subject and press Enter…"
                        className="flex-1 px-4 py-2.5 rounded-full text-sm border-2 border-slate-200 bg-white text-slate-700 placeholder-slate-400 focus:border-[#ED1164] focus:outline-none focus:ring-2 focus:ring-[#ED1164]/20 transition-all"
                      />
                      <button
                        onClick={() => {
                          const val = otherInputValue.trim();
                          if (val && !selectedSubjects.includes(val)) {
                            setSelectedSubjects((prev) => [...prev, val]);
                          }
                          setOtherInputValue('');
                        }}
                        disabled={!otherInputValue.trim()}
                        className="w-10 h-10 rounded-full border-2 border-slate-200 bg-white text-slate-500 hover:border-[#ED1164] hover:text-[#ED1164] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all text-xl font-bold"
                      >
                        +
                      </button>
                    </div>
                    {/* Show custom subjects (ones not in any predefined group) as removable chips */}
                    {(() => {
                      const customChips = selectedSubjects.filter((s) => !ALL_PREDEFINED.has(s));
                      if (customChips.length === 0) return null;
                      return (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {customChips.map((subject) => (
                            <span
                              key={subject}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-[#ED1164] border-2 border-[#ED1164] text-white"
                            >
                              {subject}
                              <button
                                onClick={() => setSelectedSubjects((prev) => prev.filter((s) => s !== subject))}
                                className="hover:opacity-70 transition-opacity leading-none"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Continue button */}
                  <button
                    onClick={() => {
                      if (selectedSubjects.length > 0) onAnswer(selectedSubjects.join(', '));
                    }}
                    disabled={selectedSubjects.length === 0}
                    className="mt-6 w-full bg-[#ED1164] hover:bg-[#C40E53] text-white font-bold py-4 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xl hover:shadow-pink-500/20 hover:-translate-y-0.5 flex items-center justify-center gap-2 group"
                  >
                    <span>Continue</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </>
              )}

            </div>
          ) : isYesNoText ? (
            <div className="mt-8">
              {yesNoState === 'idle' && (
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setYesNoState('yes')}
                    className="flex-1 py-5 rounded-2xl border-2 border-slate-200 bg-white text-slate-700 font-bold text-lg hover:border-[#ED1164] hover:text-[#ED1164] hover:bg-pink-50 transition-all"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => onAnswer('Not sure yet')}
                    className="flex-1 py-5 rounded-2xl border-2 border-slate-200 bg-white text-slate-700 font-bold text-lg hover:border-slate-900 hover:text-slate-900 hover:bg-slate-50 transition-all"
                  >
                    No, I'm open
                  </button>
                </div>
              )}

              {yesNoState === 'yes' && (
                <div>
                  <textarea
                    className="w-full p-6 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-[#ED1164] focus:bg-white focus:ring-4 focus:ring-[#ED1164]/20 transition-all text-xl text-slate-900 placeholder-slate-400 resize-none font-medium shadow-inner outline-none"
                    rows={3}
                    placeholder={question.placeholder || "e.g. B.Tech CS, BBA, MBBS..."}
                    value={yesNoText}
                    onChange={(e) => setYesNoText(e.target.value)}
                    autoFocus
                  />
                  <button
                    onClick={() => { if (yesNoText.trim()) onAnswer(sanitizeInput(yesNoText)); }}
                    disabled={!yesNoText.trim()}
                    className="mt-4 w-full bg-[#ED1164] hover:bg-[#C40E53] text-white font-bold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl hover:shadow-pink-500/20 hover:-translate-y-0.5 flex items-center justify-center gap-2 group"
                  >
                    <span>Continue</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </button>
                </div>
              )}
            </div>
          ) : isTextInput ? (
            <div className="mt-8">
              <textarea
                className="w-full p-6 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-[#ED1164] focus:bg-white focus:ring-4 focus:ring-[#ED1164]/20 transition-all text-xl text-slate-900 placeholder-slate-400 resize-none font-medium shadow-inner outline-none"
                rows={4}
                placeholder={question.placeholder || "Type your answer here..."}
                value={textAnswer}
                onChange={(e) => {
                  const val = e.target.value;
                  const capitalized = val.replace(/(?:^|\s)\S/g, (c) => c.toUpperCase());
                  setTextAnswer(capitalized);
                }}
                autoCapitalize="words"
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
                <span>{question.paymentLink ? "Proceed to Payment" : "Submit Details"}</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            </div>
          ) : isNumericScoreInput ? (
            <div className="mt-8">
              {/* Centered live percentage */}
              <div className="text-center mb-10">
                <span className="text-6xl font-extrabold text-slate-900 tabular-nums">
                  {numericScore === '' ? '75%' : `${numericScore}%`}
                </span>
              </div>

              {/* Slider wrapper */}
              <div className="relative py-5">

                {/* Range input with fill gradient */}
                <input
                  type="range"
                  min="30"
                  max="100"
                  step="1"
                  value={numericScore === '' ? 75 : numericScore}
                  onChange={(e) => {
                    setNumericScore(e.target.value);
                    if (numericError) setNumericError('');
                  }}
                  className="relative z-20 w-full appearance-none cursor-pointer outline-none slider-black"
                  style={{
                    height: '3px',
                    borderRadius: '9999px',
                    background: `linear-gradient(to right, #1D1D1F 0%, #1D1D1F ${((parseFloat(numericScore || '75') - 30) / 70) * 100}%, #e5e7eb ${((parseFloat(numericScore || '75') - 30) / 70) * 100}%, #e5e7eb 100%)`
                  }}
                />
              </div>

              {numericError && <p className="mt-3 text-red-500 text-sm font-medium">{numericError}</p>}

              <button
                onClick={handleNumericSubmit}
                disabled={numericScore === ''}
                className="mt-8 w-full bg-[#ED1164] hover:bg-[#C40E53] text-white font-bold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl hover:shadow-pink-500/20 hover:-translate-y-0.5 flex items-center justify-center gap-2 group"
              >
                <span>Continue</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            </div>
          ) : question.inputType === 'phone_number' ? (
            <div className="mt-8">
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

              <button
                onClick={() => {
                  const phoneRegex = /^\d{10}$/;
                  if (!phoneRegex.test(contactNumber)) {
                    setContactError("Please enter a valid 10-digit phone number.");
                    return;
                  }
                  setContactError("");
                  onAnswer(contactNumber);
                }}
                disabled={contactNumber.length !== 10}
                className="mt-6 w-full bg-[#ED1164] hover:bg-[#C40E53] text-white font-bold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl hover:shadow-pink-500/20 hover:-translate-y-0.5 flex items-center justify-center gap-2 group"
              >
                <span>{question.paymentLink ? "Proceed to Payment" : "Submit Details"}</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            </div>
          ) : question.inputType === 'payment' ? (
            <div className="mt-8">
              <div className="bg-pink-50 border border-pink-100 rounded-xl p-6 mb-8 text-center">
                <p className="text-slate-600 mb-2">You are one step away from your detailed analysis.</p>
                <p className="text-sm text-slate-500">Secure payment via Razorpay</p>
              </div>

              <button
                onClick={() => onAnswer("payment_initiated")}
                className="w-full bg-[#ED1164] hover:bg-[#C40E53] text-white font-bold py-4 rounded-xl shadow-lg shadow-pink-500/30 hover:shadow-pink-500/40 hover:-translate-y-0.5 transition-all text-lg flex items-center justify-center gap-2 group"
              >
                <span>Generate Report</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
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

          {/* BACK BUTTON */}
          {currentStep > 1 && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={onBack}
                className="text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                <span>Back to previous question</span>
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};