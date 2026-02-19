
export interface Option {
  label: string;
  value: string;
}

export interface Question {
  id: number;
  text: string;
  subtext?: string;
  inputType?: 'choice' | 'text' | 'contact_details' | 'numeric_score' | 'phone_number' | 'payment' | 'yes_no_text' | 'subject_picker' | 'subject_picker_single';
  options?: Option[];
  placeholder?: string;
  paymentLink?: string;
  sectionTitle?: string; // New: Section Header
  sectionIntro?: string; // New: Introductory text for the section

}

export interface Course {
  id: string;
  name: string;
  category: string;
  description: string;
  tags?: string[]; // New: Keywords for better matching
  weights?: Record<string, number>; // New: Skill weights associated with the course
}

// The structure expected from the Gemini API response
export interface AnalysisResult {
  userData?: {
    name: string;
    contact: string;
  };
  archetype: {
    title: string;
    description: string;
    drivers: {
      academic: { label: string; explanation: string };
      passion: { label: string; explanation: string };
      cognitive: { label: string; explanation: string };
      domain: { label: string; explanation: string };
      motivation: { label: string; explanation: string };
    };
  };
  visionBoard: {
    futureSelf: string; // A vivid description of their future professional life
    keyThemes: string[]; // 3-4 words like "Innovation", "Global", "Creation"
    quote: string; // An inspiring quote matching their archetype
  };
  skillSignature: {
    subject: string; // e.g., "Creativity", "Logic", "Social"
    A: number; // Value 0-100
    fullMark: number;
  }[];
  recommendations: {
    degree: string; // NEW: The degree type (e.g. B.Tech, MBA)
    courseName: string;
    matchReason: string;
    dataInsight: string;
    relevanceScore: number; // 0-100
  }[];
  alternativePathways: {
    focus: string;
    courseName: string;
    insight: string;
    relevanceScore: number; // NEW: 0-100
  }[];
  communityStats: {
    headline: string;
    topCareers: {
      name: string;
      percentage: number;
    }[];
    commonInterests: string[];
  };
  degreePreferenceAnalysis?: {
    statedPreference: string;
    matchedCourses: {
      degree: string;
      courseName: string;
      matchPercentage: number;
      matchInsight: string;
    }[];
    overallInsight: string;
  };
  audioScript: string;
}

export type AnswerMap = Record<number, string>;
