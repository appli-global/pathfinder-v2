import * as fs from 'fs';
import * as path from 'path';

// --- COPIED CONSTANTS ---
const SKILL_COLUMNS = [
    "Critical Thinking", "Analytical Reasoning", "Problem Solving", "Logical Reasoning",
    "Research Skills", "Data Interpretation", "Quantitative Analysis", "Decision Making",
    "Creativity & Innovation", "Strategic Thinking", "Written Communication", "Verbal Communication",
    "Presentation Skills", "Public Speaking", "Negotiation", "Teamwork",
    "Cross-Cultural Communication", "Interpersonal Skills", "Conflict Resolution", "Emotional Intelligence",
    "Self-Learning", "Adaptability", "Curiosity", "Growth Mindset", "Time Management",
    "Attention to Detail", "Organization Skills", "Resilience", "Self-Motivation",
    "Business Management", "Economics", "Psychology", "Sociology", "Political Science",
    "Environmental Studies", "Biology", "Chemistry", "Physics", "Mathematics",
    "Computer Literacy", "Statistics", "Finance & Accounting", "Marketing & Branding",
    "Human Resource Management", "Digital Literacy", "Sustainability Awareness",
    "Global Awareness", "Leadership", "Project Management", "Ethical Reasoning",
    "Social Responsibility", "Cultural Awareness"
];

interface Course {
    id: string;
    name: string;
    category: string;
    description: string;
    tags: string[];
    weights?: Record<string, number>;
    tempScore?: number;
}


// --- PARSING LOGIC ---
const csvPath = path.join(process.cwd(), 'courses_weights.csv');
const csvData = fs.readFileSync(csvPath, 'utf-8');

const parseCoursesFromCSV = (csvData: string): Course[] => {
    const lines = csvData.trim().split('\n');
    const courses: Course[] = [];
    const startIndex = lines[0].startsWith('Sheet') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Robust CSV parser (copied from constants.ts)
        const values: string[] = [];
        let currentVal = '';
        let insideQuotes = false;

        for (let c = 0; c < line.length; c++) {
            const char = line[c];
            if (char === '"') {
                if (insideQuotes && line[c + 1] === '"') { currentVal += '"'; c++; }
                else { insideQuotes = !insideQuotes; }
            } else if (char === ',' && !insideQuotes) {
                values.push(currentVal.trim());
                currentVal = '';
            } else { currentVal += char; }
        }
        values.push(currentVal.trim());

        if (values.length < 4) continue;

        const degreeName = values[1];
        const specialization = values[2];
        const weightValues = values.slice(3);
        const weights: Record<string, number> = {};

        SKILL_COLUMNS.forEach((skill, index) => {
            if (index < weightValues.length) {
                const val = parseFloat(weightValues[index]);
                if (!isNaN(val) && val > 0) weights[skill] = val;
            }
        });

        courses.push({
            id: `${values[0]}-${i}`,
            name: specialization === 'General' ? degreeName : `${degreeName} - ${specialization}`,
            category: values[0],
            description: "Debug Desc",
            tags: [],
            weights: weights
        });
    }
    return courses;
};

const COURSE_CATALOG = parseCoursesFromCSV(csvData);

// --- DEBUG MOCK & LOGIC ---

// Mock: User wants "Gardening" (Botany/Bio) and "Math"
const mockUserVector: Record<string, number> = {
    "Biology": 0.9,
    "Sustainability Awareness": 0.8,
    "Mathematics": 0.9, // Explicit High Interest
    "Environmental Studies": 0.7,
    "Critical Thinking": 0.4
};

const scoutCourses = (userVector: Record<string, number>, catalog: Course[]) => {
    const scored = catalog.map(course => {
        let score = 0;

        // 2. SPIKE BONUS (The "Niche" Fix)
        // We track the single highest matches trait.
        // Niche courses usually have fewer matching columns but HIGHER weights in them.
        // General courses have many matching columns with LOWER weights.
        // We want to reward the "Peak".
        let peakMatch = 0;

        if (course.weights) {
            for (const [skill, weight] of Object.entries(course.weights)) {
                const userW = userVector[skill] || 0;
                if (userW > 0 && weight > 0) {
                    const matchVal = (userW * weight);
                    score += matchVal;
                    if (matchVal > peakMatch) peakMatch = matchVal;
                }
            }
        }

        // Bonus: Add 50% of the peak match again (or even 100%)
        // This helps shorter, punchier courses compete with "long" generic ones.
        const spikeBonus = peakMatch * 10.0; // Significant boost for "Perfect Fit" traits
        score += spikeBonus;

        return { ...course, tempScore: score };
    });

    return scored.sort((a, b) => (b.tempScore || 0) - (a.tempScore || 0));
};

console.log("--- DEBUGGING SCOUT LOGIC (Standalone) ---");
console.log("Testing: User likes Biology (0.9), Math (0.9), Sustainability (0.8)");

const results = scoutCourses(mockUserVector, COURSE_CATALOG);

console.log("\n--- TOP 20 RESULTS ---");
results.slice(0, 20).forEach((c, i) => {
    console.log(`#${i + 1} [${c.tempScore?.toFixed(4)}] ${c.name} (${c.category}) | Matches: ${Object.entries(c.weights || {}).filter(([k]) => mockUserVector[k] > 0.6).map(([k]) => k).join(', ')
        }`);
});
