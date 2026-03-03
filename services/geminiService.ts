import { GoogleGenAI, Type, Schema } from "@google/genai";
import { COURSE_CATALOG, MASTERS_CATALOG, SKILL_COLUMNS, VALID_COURSE_NAMES } from "../constants";
import { AnalysisResult, AnswerMap, Course } from "../types";
import { estimateTokenCountFromText } from "../utils/tokenCount";

// Robust API Key loading for both Vite (Client) and standard Node (Server/Test) contexts
const getApiKey = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) {
    return import.meta.env.VITE_GEMINI_API_KEY;
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.VITE_GEMINI_API_KEY;
  }
  return null;
}

const apiKey = getApiKey();

if (!apiKey) {
  console.warn("⚠️ API_KEY is missing. The app will run in SIMULATION MODE.");
}

// Safely initialize AI only if key exists, otherwise null
const ai = apiKey ? new GoogleGenAI({ apiKey: apiKey }) : null;

// --- SCHEMAS ---

const VECTOR_SCHEMA: Schema = {
  type: Type.OBJECT,
  description: "A mapping of skill traits to relevance scores (0-1) based on user profile.",
  properties: {
    weights: {
      type: Type.OBJECT,
      properties: Object.fromEntries(SKILL_COLUMNS.map(skill => [skill, { type: Type.NUMBER }])),
      required: [], // All optional, but model should fill relevant ones
    }
  },
  required: ["weights"]
};

const FINAL_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    archetype: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "A creative title for the user's professional persona" },
        description: { type: Type.STRING, description: "A paragraph describing who they are based on the answers." },
        drivers: {
          type: Type.OBJECT,
          properties: {
            academic: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING, description: "Short label (e.g., 'Mathematical Thinking')" },
                explanation: { type: Type.STRING, description: "1-2 sentence explanation connecting user's answers to this driver" }
              },
              required: ["label", "explanation"]
            },
            passion: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING, description: "Short label describing their passion" },
                explanation: { type: Type.STRING, description: "1-2 sentence explanation" }
              },
              required: ["label", "explanation"]
            },
            cognitive: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING, description: "Short label describing cognitive style" },
                explanation: { type: Type.STRING, description: "1-2 sentence explanation" }
              },
              required: ["label", "explanation"]
            },
            domain: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING, description: "Short label describing preferred domain" },
                explanation: { type: Type.STRING, description: "1-2 sentence explanation" }
              },
              required: ["label", "explanation"]
            },
            motivation: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING, description: "Short label describing core motivation" },
                explanation: { type: Type.STRING, description: "1-2 sentence explanation" }
              },
              required: ["label", "explanation"]
            },
          },
          required: ["academic", "passion", "cognitive", "domain", "motivation"],
        },
      },
      required: ["title", "description", "drivers"],
    },
    visionBoard: {
      type: Type.OBJECT,
      description: "A visualization of the user's future career life.",
      properties: {
        futureSelf: { type: Type.STRING, description: "A vivid, inspiring paragraph describing a 'Day in the Life' of this person 5 years from now." },
        keyThemes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-4 single words representing their future (e.g., 'Leadership', 'Design', 'Impact')." },
        quote: { type: Type.STRING, description: "A famous or generated inspiring quote that fits their personality." }
      },
      required: ["futureSelf", "keyThemes", "quote"]
    },
    skillSignature: {
      type: Type.ARRAY,
      description: "Numerical representation of skills for a radar chart. Return exactly 6 key dimensions.",
      items: {
        type: Type.OBJECT,
        properties: {
          subject: { type: Type.STRING, description: "Dimension name (e.g. Creativity, Logic, Empathy)" },
          A: { type: Type.INTEGER, description: "Score from 0 to 100" },
          fullMark: { type: Type.INTEGER, description: "Always 100" },
        },
        required: ["subject", "A", "fullMark"],
      },
    },
    recommendations: {
      type: Type.ARRAY,
      description: "Final top 3 selection from the provided candidate list. MUST be EXACT strings from the list.",
      items: {
        type: Type.OBJECT,
        properties: {
          degree: { type: Type.STRING },
          courseName: { type: Type.STRING },
          matchReason: { type: Type.STRING },
          dataInsight: { type: Type.STRING },
          relevanceScore: { type: Type.INTEGER },
        },
        required: ["degree", "courseName", "matchReason", "dataInsight", "relevanceScore"],
      },
    },
    alternativePathways: {
      type: Type.ARRAY,
      description: "2-3 alternative career paths from the provided candidate list.",
      items: {
        type: Type.OBJECT,
        properties: {
          focus: { type: Type.STRING },
          courseName: { type: Type.STRING },
          insight: { type: Type.STRING },
          relevanceScore: { type: Type.INTEGER },
        },
        required: ["focus", "courseName", "insight", "relevanceScore"],
      },
    },
    communityStats: {
      type: Type.OBJECT,
      description: "Simulated statistics for people with this specific archetype.",
      properties: {
        headline: { type: Type.STRING },
        topCareers: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              percentage: { type: Type.INTEGER },
            },
            required: ["name", "percentage"],
          },
        },
        commonInterests: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: ["headline", "topCareers", "commonInterests"],
    },
    audioScript: { type: Type.STRING, description: "A 30-45 second conversational script. Speak like a mentor, not a machine. Use contractions ('You're', 'We've'), warm tone, and short sentences. No 'Based on your inputs'. Just jump in." },
    parentLetterData: {
      type: Type.OBJECT,
      properties: {
        salutation: { type: Type.STRING },
        paragraph1: { type: Type.STRING },
        paragraph2: { type: Type.STRING },
        paragraph3: { type: Type.STRING },
        paragraph4: { type: Type.STRING },
        paragraph5: { type: Type.STRING },
        paragraph6: { type: Type.STRING },
        paragraph7: { type: Type.STRING },
        paragraph8: { type: Type.STRING },
        signOff: { type: Type.STRING },
      },
      required: ["salutation", "paragraph1", "paragraph2", "paragraph3", "paragraph4", "paragraph5", "paragraph6", "paragraph7", "paragraph8", "signOff"],
    },
  },
  required: ["archetype", "visionBoard", "skillSignature", "recommendations", "alternativePathways", "communityStats", "audioScript", "parentLetterData"],
};



// --- DETERMINISTIC CALIBRATION LAYER ---
// Map explicit answers to specific CSV columns to ensure "Scientific" accuracy.
const TRAIT_MAP: Record<string, string[]> = {
  // Q3: Work Day Preference
  "Data Puzzle": ["Problem Solving", "Analytical Reasoning", "Logical Reasoning", "Quantitative Analysis"],
  "Creative Design": ["Creativity & Innovation", "Digital Literacy", "Presentation Skills", "Design Thinking"], // 'Design Thinking' if available, else mapped to closest
  "Team Vision": ["Leadership", "Strategic Thinking", "Teamwork", "Public Speaking"],
  "Helping One-on-One": ["Interpersonal Skills", "Emotional Intelligence", "Social Responsibility", "Psychology"],

  // Q4: Comfort Zone
  "Numbers & Data": ["Quantitative Analysis", "Data Interpretation", "Statistics", "Finance & Accounting", "Mathematics"],
  "People & Teams": ["Teamwork", "Human Resource Management", "Conflict Resolution", "Cross-Cultural Communication"],
  "Words & Ideas": ["Written Communication", "Verbal Communication", "Research Skills", "Critical Thinking"],
  "Tools & Objects": ["Computer Literacy", "Project Management", "Digital Literacy"],

  // Q5: Motivation
  "Innovation": ["Creativity & Innovation", "Self-Learning", "Curiosity", "Entrepreneurship"],
  "Impact": ["Social Responsibility", "Ethical Reasoning", "Sustainability Awareness", "Environmental Studies"],
  "Expertise": ["Research Skills", "Attention to Detail", "Self-Motivation"],
  "Leadership": ["Leadership", "Decision Making", "Business Management", "Negotiation"]
};

const calculateBaseVector = (answers: AnswerMap): Record<string, number> => {
  const vector: Record<string, number> = {};

  Object.values(answers).forEach(ans => {
    // Check if the answer (or part of it) matches our keys
    const traits = TRAIT_MAP[ans] || [];
    traits.forEach(trait => {
      // 1.0 is a strong signal for an explicit choice
      vector[trait] = (vector[trait] || 0) + 1.0;
    });
  });

  return vector;
};

// --- HYBRID ENGINE STEPS ---

// Helper: Robustly extract text from Gemini response
const extractTextFromResponse = (response: any): string => {
  try {
    // 1. Try candidates array (Google GenAI SDK standard structure) — Priority
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        return candidate.content.parts[0].text || "{}";
      }
    }
    // 2. Try standard helper method (if it exists)
    if (typeof response.text === 'function') {
      return response.text();
    }
    // 3. Fallback to raw text property if it exists
    if (typeof response.text === 'string') {
      return response.text;
    }
    console.warn("Gemini Response contained no text:", JSON.stringify(response));
    return "{}";
  } catch (e) {
    console.error("Error extracting text from Gemini response:", e);
    return "{}";
  }
};

// Step 1: Extract User Vector AND Search Keywords using LLM
const extractUserVector = async (formattedAnswers: string): Promise<{ weights: Record<string, number>, keywords: string[] }> => {
  const prompt = `
      TASK: Analyze the user's career profile to build a comprehensive "Psychometric Application Vector".
      
      USER PROFILE:
      ${formattedAnswers}

      TRAIT LIST:
      ${SKILL_COLUMNS.join(', ')}

      INSTRUCTIONS:
      1. **Explicit Subject Priority**: Q1 ("Most Enjoyable Subject") and Q2 ("Activity that makes time fly") are critical. Map these to relevant skills/keywords.
      2. **Problem Solving Focus**: Q8 ("Real-world problems to solve") is a massive indicator of Domain Interest (e.g., "Climate" -> Environmental Studies, "AI" -> Tech/Math).
      3. **Psychometric Scoring**:
         - **High Weight (0.85 - 1.0)**: Traits demanded by their answers.
         - **Medium Weight**: Inferred traits (e.g., "Helping people" -> Social Responsibility).
      4. **Goal**: Deep, nuanced understanding.
      5. **Output**: JSON with 'weights' object and 'searchKeywords' array.
    `;

  if (!ai) throw new Error("API Key missing - Simulation Mode");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      systemInstruction: "You are an expert career psychologist. Output strictly valid JSON.",
      responseMimeType: "application/json",
      responseSchema: VECTOR_SCHEMA,
      temperature: 0.2, // Slightly higher temp for inference
    },
  });

  // Safe text extraction
  const jsonText = extractTextFromResponse(response);
  const data = JSON.parse(jsonText);
  return { weights: data.weights, keywords: data.searchKeywords || [] };
};

// Step 2: Scout/Score Courses (Client-Side Math + Keyword Search + DEGREE PREF)
const scoutCourses = (
  userVector: Record<string, number>,
  keywords: string[],
  catalog: Course[],
  degreePreference?: string,
  subjectPreference?: string
): Course[] => {
  const scored = catalog.map(course => {
    // SCORING WEIGHTS
    let score = 0;
    let peakMatch = 0;
    let matchedKeywords = 0;

    const cName = course.name.toLowerCase();
    const cCat = course.category.toLowerCase();

    // 1. DEGREE PREFERENCE BOOST - DISABLED
    // NOTE: Question 10 ("Are there any specific degrees already in mind?") is NOT used for recommendations
    // This ensures recommendations are based purely on personality, skills, and interests

    // 2. SUBJECT PREFERENCE BOOST (Tier 2 Priority: +2500)
    // If user said "Biology", we boost "Biology", "Zoology", "Life Sciences"
    if (subjectPreference && subjectPreference.length > 2) {
      const subj = subjectPreference.toLowerCase().trim();

      // Simple direct check + common subject aliases if needed
      // For now, direct substring matching is quite powerful for subjects like "Physics", "Math"
      if (cName.includes(subj) || cCat.includes(subj) || (course.tags && course.tags.some(t => t.toLowerCase().includes(subj)))) {
        score += 2500.0;
      }
    }

    // 3. KEYWORD SEARCH BONUS
    const normalizedName = course.name.toLowerCase();
    keywords.forEach(kw => {
      const cleanKw = kw.toLowerCase().trim();
      if (cleanKw.length > 2 && normalizedName.includes(cleanKw)) {
        score += 50.0;
        matchedKeywords++;
      }
    });

    // 4. DOT PRODUCT (Personality Match)
    // Max Score per trait ~ 1.5 * 1.0 * 2000 = 3000. 
    // Typical strong course has 2-3 dominant traits. Total ~ 6000-8000.
    // This makes Personality the biggest factor overall, but Degree/Subject boosts (4500/4000) 
    // ensure those preferences definitely mix into the top set.
    if (course.weights) {
      for (const [skill, weight] of Object.entries(course.weights)) {
        const userW = userVector[skill] || 0;
        if (userW > 0.1 && weight > 0) {
          const matchVal = (userW * weight);
          score += (matchVal * 2000.0);
          if (matchVal > peakMatch) peakMatch = matchVal;
        }
      }
    }

    // 5. SPIKE BONUS
    score += (peakMatch * 1000.0); // Reduced spike bonus to flatten distribution slightly

    return { ...course, tempScore: score };
  });

  return scored.sort((a, b) => (b as any).tempScore - (a as any).tempScore);
};

// Step 3: Final Narrative and Selection
const generateFinalReport = async (
  topCourses: Course[],
  formattedAnswers: string,
  isUG: boolean,
  degreePreference?: string,
  subjectPreference?: string,
  userName?: string
): Promise<AnalysisResult> => {
  // Pass top 150 candidates to LLM to ensure broad consideration
  const coursesContext = topCourses.slice(0, 150).map(c =>
    `ID:${c.id}|Name:"${c.name}"|Score:${(c as any).tempScore?.toFixed(1)}|Category:${c.category}`
  ).join("\n");

  // NOTE: Degree preference is NOT used for recommendations
  const degreePrefPrompt = "";

  const subjectPrefPrompt = subjectPreference ? `
        NOTE: The user's favorite subject is "${subjectPreference}".
        CRITICAL CONSTRAINT:
        1. You MUST select exactly 1 recommendation that is directly related to "${subjectPreference}".` : "";

  const studentName = userName && userName.trim() !== "" ? userName : "the student";

  const prompt = `
        TASK: Select the final 3 Recommendations and 3 Alternative Pathways from the provided CANDIDATE LIST below.
        
        USER PROFILE:
        ${formattedAnswers}
    
        ${degreePrefPrompt}
        
        ${subjectPrefPrompt}
    
        CANDIDATE LIST (Ranked by Math Score):
        ${coursesContext}

    INSTRUCTIONS:
    1. **Strict Selection**: You MUST pick courses *only* from the provided list. Use exact names. Do NOT invent or Hallucinate new course names.
    2. **Selection Logic**:
       - Pick the top scoring ones for 'recommendations'.
       - Pick diverse/niche ones for 'alternativePathways'.
       - Select courses that best match the user's personality, skills, and interests.
    3. **Archetype**: Assign a **High-Impact, "Insta-Worthy" Title**. 
       - **Rule**: It must be a unique, 2-3 word poetic persona.
       - **Banned**: Do NOT use "Innovator", "Analyst", "Strategist", "Leader" on their own. They are boring.
       - **Good Examples**: "The Silicon Alchemist", "The Quantum Storyteller", "The Bio-Digital Architect", "The Entropy Tamer".
       - **Goal**: Make it sound like a Marvel hero or a futuristic profession. Rare, evocative, and cool enough to share on social media.
    4. **Drivers**: For each of the 5 drivers (academic, passion, cognitive, domain, motivation), provide:
       - **Label**: A concise 2-4 word phrase (e.g., "Mathematical Thinking", "Strategic Problem-Solving")
       - **Explanation**: A 1-2 sentence explanation that DIRECTLY references the user's specific quiz answers
       - **Example**: 
         * Label: "Mathematical Thinking"
         * Explanation: "You excel in mathematical thinking, which forms a strong base for quantitative analysis."
    5. **Narrative**: Explain *why* these specific courses fit the user's answers.
    6. **Audio Script**: Write a script for the text-to-speech engine. 
       - **Tone**: Warm, conversational, human. Use contractions (You're, It's, Let's). Avoid robotic phrases.
       - **Structure**:
         1. **Hook**: Direct, personal opening.
         2. **The Why**: Connect 2 specific drivers to the course.
         3. **The Vision**: End with their future self.
       - **Example**: "Hey there, [Archetype]. valid. It's clear you love [Driver A] and [Driver B], which is exactly why [Course Name] is such a strong fit. Imagine yourself [Vision Highlight]. That's the future waiting for you. Let's make it happen."
    7. **Parent Letter**: Write a powerful 8-paragraph letter directed to the student's parents. Use the EXACT structure and wording below, replacing the bracketed information with the user's specific personalized details (name, archetype, recommendations, etc.). Use appropriate pronouns (he/she/they) and terms (son/daughter/child) based on the user's name if obvious, otherwise default to 'they/child'.
       - **Salutation**: "Dear ${studentName}'s parents,"
       - **Paragraph 1**: "We hope you are doing well."
       - **Paragraph 2**: "After carefully reviewing ${studentName}'s assessment, we wanted to personally share what [his/her/their] results truly mean, not just in numbers, but in possibility."
       - **Paragraph 3**: "Your [son/daughter/child] has been identified as a "[Archetype]," a rare profile marked by [2-3 strengths like 'deep analytical thinking, pattern recognition...']. With a remarkable [90-99] percent alignment score, [his/her/their] strengths clearly point toward a future shaped by [3 descriptive keywords]."
       - **Paragraph 4**: "What stands out most is not only [his/her/their] natural ability with [specific driver from answers], but [his/her/their] genuine curiosity for [another specific driver]. Students like ${studentName} are often the ones who [Vision impact]."
       - **Paragraph 5**: "They do not simply adapt to the future. They help shape it."
       - **Paragraph 6**: "[His/Her/Their] profile strongly aligns with forward looking fields such as [Top 3 Recommendations]. These domains are not temporary trends. They form the foundation of tomorrow's global economy and offer strong career stability along with intellectual growth."
       - **Paragraph 7**: "At Appli, we work closely with students and families to turn this clarity into action. Beyond assessments, Appli supports students through the entire college application journey, helping them identify the right programs, evaluate the right institutions, and submit applications with confidence and structure. Our goal is to ensure that talent like ${studentName}'s finds the right academic environment to thrive."
       - **Paragraph 8**: "Most importantly, this path builds on who [he/she/they] already [is/are]. With your continued encouragement and the right academic guidance, [he/she/they] [is/are] well positioned for a future that is both meaningful and secure.\n\nThe future ahead of [him/her/them] is not uncertain. It is full of promise."
       - **SignOff**: "Warm regards,\nAppli\nwww.appli.global"
  `;

  // Log approximate token usage for the Gemini prompt
  const approxTokens = estimateTokenCountFromText(prompt);
  console.debug('[gemini] Prompt length (chars):', prompt.length, 'approx tokens:', approxTokens);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      systemInstruction: "You are a career counselor. Output strictly valid JSON matching the provided schema. You must ONLY select course names from the provided list.",
      responseMimeType: "application/json",
      responseSchema: FINAL_RESPONSE_SCHEMA,
    },
  });

  const text = extractTextFromResponse(response);
  const result = JSON.parse(text) as AnalysisResult;

  // --- STRICT VALIDATION LAYER ---
  // Ensure every recommended course actually exists in our CSV data.
  // If the LLM hallucinates a name, we replace it with the highest-ranked valid course.

  const validateAndFixCourse = (cName: string, fallback: Course): string => {
    if (VALID_COURSE_NAMES.has(cName)) return cName;
    console.warn(`⚠️ LLM Hallucinated Course: "${cName}".Replacing with: "${fallback.name}"`);
    return fallback.name;
  };

  // Fix Recommendations and Override Match Scores for Confidence
  result.recommendations = result.recommendations.map((rec, i) => {
    // Fallback logic: Use the top ranked courses from our mathematical scout as safety nets
    const fallback = topCourses[i] || topCourses[0] || { name: rec.courseName, id: 'unknown', category: 'General' } as Course;

    // Force High Confidence Scores:
    // Top 1: 96-99%
    // Top 2: 92-95%
    // Top 3: 88-91%
    const baseScore = 98 - (i * 4); // 98, 94, 90
    const randomVariation = Math.floor(Math.random() * 2); // 0 or 1
    const finalScore = baseScore + randomVariation;

    return {
      ...rec,
      courseName: validateAndFixCourse(rec.courseName, fallback),
      relevanceScore: Math.min(finalScore, 100)
    };
  });

  // Fix Alternatives
  result.alternativePathways = result.alternativePathways.map((alt, i) => {
    // Use slightly lower ranked courses checking for diversity
    const fallback = topCourses[i + 3] || topCourses[topCourses.length - 1];

    // Alts: 75-85%
    const altScore = 85 - (i * 3);

    return {
      ...alt,
      courseName: validateAndFixCourse(alt.courseName, fallback),
      relevanceScore: Math.min(altScore, 100)
    };
  });

  return result;
};

// Step 4: Analyze Stated Degree Preference
const analyzeDegreePreference = (
  degreePreference: string,
  userVector: Record<string, number>,
  catalog: Course[]
): { statedPreference: string; matchedCourses: any[]; overallInsight: string } | null => {
  // Enhanced filtering for non-specific answers
  const negativeTerms = ['not sure', 'no', 'none', 'unsure', 'undecided', 'idk', "don't know", 'any'];
  if (!degreePreference || degreePreference.length < 3 || negativeTerms.some(term => degreePreference.toLowerCase().includes(term))) {
    return null; // User didn't provide a specific preference
  }

  const pref = degreePreference.toLowerCase().trim();

  // Normalize common aliases (same as before)
  const aliases: Record<string, string[]> = {
    "engineering": ["b.e", "b.tech", "technology"],
    "b.tech": ["b.e", "technology"],
    "tech": ["b.e", "technology", "b.ca"],
    "medicine": ["mbbs", "bds"],
    "doctor": ["mbbs", "bds"],
    "mbbs": ["medicine", "surgery"],
    "medical": ["mbbs", "bds", "nursing", "pharm"],
    "architecture": ["b.arch"],
    "arch": ["b.arch"],
    "science": ["b.sc", "bs"],
    "b.sc": ["science"],
    "commerce": ["b.com", "finance"],
    "business": ["bba", "management"],
    "management": ["bba", "mba"],
    "computer": ["bca", "b.tech", "b.e"],
    "coding": ["bca", "b.tech", "b.e"],
    "law": ["llb", "legal"],
    "arts": ["ba", "b.a"],
    "design": ["b.des", "design"]
  };

  // Find matching courses
  const matchingCourses = catalog.filter(course => {
    const cName = course.name.toLowerCase();
    const cCat = course.category.toLowerCase();

    // Direct Match
    if (cName.includes(pref) || cCat.includes(pref)) return true;

    // Alias Match
    for (const [key, variants] of Object.entries(aliases)) {
      if (pref.includes(key)) {
        if (variants.some(v => cName.includes(v) || cCat.includes(v))) {
          return true;
        }
      }
    }

    return false;
  });

  if (matchingCourses.length === 0) {
    return null; // No courses match the stated preference
  }

  // Calculate match percentages based on personality fit
  const scoredMatches = matchingCourses.map(course => {
    let score = 0;
    let maxPossibleScore = 0;

    if (course.weights) {
      for (const [skill, weight] of Object.entries(course.weights)) {
        const userW = userVector[skill] || 0;
        if (weight > 0) {
          score += (userW * weight);
          maxPossibleScore += weight; // Assuming max user weight is 1.0
        }
      }
    }

    // Convert to percentage (0-100)
    const matchPercentage = maxPossibleScore > 0
      ? Math.min(Math.round((score / maxPossibleScore) * 100), 99)
      : 75; // Default if no weights

    return {
      ...course,
      matchPercentage
    };
  });

  // Sort by match percentage and take top 3
  const topMatches = scoredMatches
    .sort((a, b) => b.matchPercentage - a.matchPercentage)
    .slice(0, 3);

  // Calculate average match
  const avgMatch = Math.round(
    topMatches.reduce((sum, c) => sum + c.matchPercentage, 0) / topMatches.length
  );

  // Generate overall insight
  let overallInsight = "";
  if (avgMatch >= 85) {
    overallInsight = `Excellent alignment! Your stated preference for "${degreePreference}" matches very well with your personality profile. This is a strong choice that aligns with your natural strengths and interests.`;
  } else if (avgMatch >= 70) {
    overallInsight = `Good fit! Your interest in "${degreePreference}" aligns reasonably well with your profile. With focused effort, you can excel in this field.`;
  } else if (avgMatch >= 55) {
    overallInsight = `Moderate alignment. While "${degreePreference}" is achievable, you might want to explore our AI-recommended paths which show stronger alignment with your natural strengths.`;
  } else {
    overallInsight = `Lower alignment detected. "${degreePreference}" may require significant adaptation. We strongly recommend reviewing our AI-recommended paths which better match your personality and skills.`;
  }

  return {
    statedPreference: degreePreference,
    matchedCourses: topMatches.map(c => ({
      degree: c.id.split('_')[0] || 'Degree',
      courseName: c.name,
      matchPercentage: c.matchPercentage,
      matchInsight: c.matchPercentage >= 80
        ? "Strong personality match - your natural strengths align well with this path"
        : c.matchPercentage >= 65
          ? "Moderate match - achievable with dedicated effort"
          : "Lower match - may require developing new skill sets"
    })),
    overallInsight
  };
};


// --- MAIN FUNCTION ---

export const analyzeCareerPath = async (
  answers: AnswerMap,
  level: '12' | 'UG'
): Promise<AnalysisResult> => {
  const isUG = level === 'UG';
  const catalog = isUG ? MASTERS_CATALOG : COURSE_CATALOG;

  const qContext = isUG ? {
    1: "Reason for Change (Drive)",
    2: "Desired Hard Skills (Technical Gap)",
    3: "Vision of Future Role",
    4: "Ideal Work Environment",
    5: "Thesis/Capstone Topic (Latent Interest)"
  } : {
    1: "Subject You Excel In (Academic Strength)",
    2: "Free Time Activity (Interest/Flow)",
    3: "Exciting Future Work (Career Motivation)",
    4: "Work Comfort Zone (Modality)",
    5: "Most Important Career Factor (Values)",
    6: "Typical Approach (Cognitive Style)",
    7: "Thriving Environment (Setting)",
    8: "Real-World Problems to Solve (Purpose/Mission)",
    14: "Top 3 Subjects in 12th (Academic Strength)",
    15: "Top 3 Subjects in 10th (Academic Foundation)",
    10: "Specific Degree Preference (Stated Goal)"
  };

  // 1. Extract Name (ID 100)
  const contactName = answers[100] || "Anonymous";
  const contactPhone = ""; // No longer collecting phone number

  // 2. Filter out Contact/Name Questions (ID 13, 100) and Percentage Questions (ID 9, 11) from AI Payload
  const formattedAnswers = Object.entries(answers)
    .filter(([key]) => {
      const k = parseInt(key);
      return k !== 13 && k !== 100 && k !== 9 && k !== 11;
    })
    .map(([key, value]) => {
      const qText = qContext[key as any] || `Question ${key}`;
      return `- ${qText}: "${value}"`;
    })
    .join('\n');


  try {
    console.log("🚀 STARTING HYBRID ENGINE ANALYSIS");
    console.log("API Key present:", !!ai);
    console.log("Catalog Size:", catalog.length);


    // 1. Extract User Vector + Keywords (Hybrid Logic)
    // A. AI Extraction (Semantic)
    const { weights: aiWeights, keywords } = await extractUserVector(formattedAnswers);

    // B. Deterministic Extraction (Scientific)
    const baseWeights = calculateBaseVector(answers);

    // C. Merge (Weighted Average: 60% Explicit Choice, 40% AI Nuance)
    const finalVector: Record<string, number> = {};
    const allSkills = new Set([...Object.keys(aiWeights), ...Object.keys(baseWeights)]);

    allSkills.forEach(skill => {
      const aiVal = aiWeights[skill] || 0;
      const baseVal = baseWeights[skill] || 0;
      // Formula: Explicit choices get a 1.5x multiplier to ensure they dominate
      finalVector[skill] = (aiVal * 0.4) + (baseVal * 1.5);
    });

    console.log("✅ User Vector Extracted:", Object.entries(finalVector).filter(([, v]) => v > 0.5).map(([k, v]) => `${k}:${v.toFixed(2)} `).join(", "));

    // 2. Scout & Score specific Catalog (Client-Side)
    // NOTE: Degree preference (Q10) is NOT used for recommendations
    const subjectPreference = answers[1] || ""; // User's favorite subject from Q1 (CRITICAL FIX)

    const scoredCourses = scoutCourses(finalVector, keywords, catalog, undefined, subjectPreference);
    console.log("✅ Top 5 Mathematical Matches:", scoredCourses.slice(0, 5).map(c => c.name).join(", "));

    // 3. Final Report
    console.log("...Step 3: Generating Narrative");
    const finalResult = await generateFinalReport(scoredCourses, formattedAnswers, isUG, undefined, subjectPreference, contactName) as any;
    console.log("✅ Analysis Complete.");

    // 4. Analyze Stated Degree Preference (if provided)
    const degreePreference = answers[10] || "";
    const degreeAnalysis = analyzeDegreePreference(degreePreference, finalVector, catalog);
    console.log(degreeAnalysis ? "✅ Degree Preference Analysis Complete." : "ℹ️ No specific degree preference provided.");

    return {
      ...finalResult,
      degreePreferenceAnalysis: degreeAnalysis,
      userData: {
        name: contactName,
        contact: contactPhone
      }
    };

  } catch (error) {
    console.error("Hybrid Engine Failed:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return getMockAnalysisResult(level, errorMessage);
  }
};

const getMockAnalysisResult = (level: '12' | 'UG', errorMessage?: string): AnalysisResult => {
  const isUG = level === 'UG';

  const title = "⚠️ SIMULATION MODE (API FAILED)";

  return {
    archetype: {
      title: title,
      description: `[DIAGNOSTIC]: READ THIS.The app failed to connect to Gemini.\nError Details: ${errorMessage || "Unknown Error"}.\n\nFalling back to simulation data.`,
      drivers: {
        academic: {
          label: "Computer Science & Design",
          explanation: "You excel in mathematical thinking and logical problem-solving, which forms a strong base for quantitative analysis and technical work."
        },
        passion: {
          label: "Building & Creating",
          explanation: "Your enjoyment of hands-on creation and problem-solving translates into a natural aptitude for strategic thinking and complex system design."
        },
        cognitive: {
          label: "Structural Logic",
          explanation: "You are inherently drawn to solving data puzzles and working with structured systems, indicating a strong analytical and quantitative mind."
        },
        domain: {
          label: "Technology",
          explanation: "Your preference for tech-driven environments highlights a desire to work at the forefront of technological innovation and digital transformation."
        },
        motivation: {
          label: "Innovation",
          explanation: "You are driven by innovation and an analytical approach, eager to develop novel solutions through rigorous examination and creative thinking."
        }
      }
    },
    visionBoard: {
      futureSelf: "Five years from now, you are leading a product team or running your own venture. Your workspace is a blend of code and canvas—whiteboards filled with diagrams and screens running complex simulations. You are the bridge between raw engineering and human experience.",
      keyThemes: ["Builder", "Innovator", "Tech-Artist"],
      quote: "The best way to predict the future is to invent it. – Alan Kay"
    },
    skillSignature: [
      { subject: "Logic & Algo", A: 85, fullMark: 100 },
      { subject: "Creativity", A: 90, fullMark: 100 },
      { subject: "Empathy", A: 75, fullMark: 100 },
      { subject: "Tech Fluency", A: 80, fullMark: 100 },
      { subject: "Leadership", A: 60, fullMark: 100 },
      { subject: "Entrepreneurship", A: 70, fullMark: 100 }
    ],
    recommendations: isUG ? [
      {
        degree: "M.Tech",
        courseName: "M.Tech in Computer Science",
        matchReason: "Matches your strong foundation in code and desire to build complex systems.",
        dataInsight: "Keyword overlap: Technology, Coding, Architecture",
        relevanceScore: 95
      },
      {
        degree: "MBA",
        courseName: "MBA (General Management)",
        matchReason: "To help you scale your ideas and lead teams effectively.",
        dataInsight: "Keyword overlap: Leadership, Strategy, Business",
        relevanceScore: 88
      },
      {
        degree: "M.Des",
        courseName: "Masters in Design (M.Des)",
        matchReason: "Perfect for ensuring your technical solutions are user-centric and beautiful.",
        dataInsight: "Keyword overlap: Design, Creativity, UX",
        relevanceScore: 85
      }
    ] : [
      {
        degree: "B.Tech",
        courseName: "B.E. / B.Tech Computer Science",
        matchReason: "The gold standard for builders. Gives you the raw tools to create anything.",
        dataInsight: "Keyword overlap: Technology, Logic, Code",
        relevanceScore: 95
      },
      {
        degree: "B.Des",
        courseName: "B.Des in User Interface/User Experience (UI/UX)",
        matchReason: "Perfect for ensuring your technical solutions are user-centric and beautiful.",
        dataInsight: "Keyword overlap: Design, Creativity, Technology",
        relevanceScore: 90
      },
      {
        degree: "B.Sc",
        courseName: "B.Sc in Data Science / AI",
        matchReason: "For the analytical side of your visionary brain, enabling smart systems.",
        dataInsight: "Keyword overlap: Analysis, Logic, AI",
        relevanceScore: 85
      }
    ],
    alternativePathways: [
      {
        focus: "Creative Tech",
        courseName: isUG ? "M.Des in Animation & VFX" : "B.Des in Game Design",
        insight: "Combines your technical aptitude with visual creativity.",
        relevanceScore: 80
      },
      {
        focus: "Management",
        courseName: isUG ? "Masters in Engineering Management" : "BBA within Tech",
        insight: "For leading technical teams rather than just coding.",
        relevanceScore: 75
      }
    ],
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
    },
    communityStats: {
      headline: "People like you often found startups or lead product teams.",
      topCareers: [
        { name: "Product Manager", percentage: 40 },
        { name: "Software Architect", percentage: 35 },
        { name: "UX Researcher", percentage: 25 }
      ],
      commonInterests: ["Generative Art", "Startup Culture", "Sci-Fi Literature", "Hackathons"]
    },
    audioScript: "Hey, Future Innovator. It's clear you've got a massive drive to build and create. That's why Computer Science is such a perfect match—it gives you the structural logic you need to turn those big ideas into reality. You're not just looking for a degree; you're building a foundation to lead the tech world. Let's see what you can build.",
    parentLetterData: {
      salutation: "Dear Future Leader's parents,",
      paragraph1: "We hope you are doing well.",
      paragraph2: "After carefully reviewing Future Leader's assessment, we wanted to personally share what their results truly mean, not just in numbers, but in possibility.",
      paragraph3: "Your child has been identified as a 'Simulation Mode Archetype,' a rare profile marked by deep analytical thinking and pattern recognition. With a remarkable 95 percent alignment score, their strengths clearly point toward a future shaped by intelligence, innovation, and impact.",
      paragraph4: "What stands out most is not only their natural ability with structural logic but their genuine curiosity for solving complex problems. Students like Future Leader are often the ones who build intelligent systems, design advanced technologies, and uncover insights that guide important decisions. They do not simply adapt to the future. They help shape it.",
      paragraph5: "Their profile strongly aligns with forward-looking fields such as Computer Science, Engineering, and Design. These domains are not temporary trends. They form the foundation of tomorrow's global economy and offer strong career stability along with intellectual growth.",
      paragraph6: "At Appli, we work closely with students and families to turn this clarity into action. Beyond assessments, Appli supports students through the entire college application journey, helping them identify the right programs, evaluate the right institutions, and submit applications with confidence and structure. Our goal is to ensure that talent like Future Leader finds the right academic environment to thrive.",
      paragraph7: "Most importantly, this path builds on who they already are. With your continued encouragement and the right academic guidance, they are well positioned for a future that is both meaningful and secure.",
      paragraph8: "The future ahead of them is not uncertain. It is full of promise.",
      signOff: "Warm regards,\nAppli\nwww.appli.global"
    },
    userData: {
      name: "Future Leader",
      contact: ""
    }
  };
};