## Pathfinder AI — Copilot Hints

Short, actionable instructions to help an AI coding agent be productive in this repo.

### Quick start (commands)
- Install & run dev server: `npm install` then `npm run dev` (uses Vite)
- Build: `npm run build`; Preview static build: `npm run preview`
- Env: set `VITE_GEMINI_API_KEY` (or `GEMINI_API_KEY`) in `.env.local` for real Gemini calls. Missing key -> SIMULATION MODE.

### Big-picture architecture
- Frontend-only React + Vite SPA (TypeScript + Tailwind). Routes live in `App.tsx` → `pages/QuizPage.tsx`, `pages/ResultsPage.tsx`.
- AI integration and core matching logic in `services/geminiService.ts`. This file:
  - Builds the psychometric vector (deterministic TRAIT_MAP + LLM extraction).
  - Scouts and scores courses parsed from `courses_weights.csv`.
  - Calls Gemini via `@google/genai` when API key present, otherwise falls back to simulation.
- Course data pipeline: CSV parsed into `ALL_COURSES` and split into `COURSE_CATALOG` and `MASTERS_CATALOG`. `VALID_COURSE_NAMES` is used to validate LLM outputs.
- UI flows: `QuizPage` collects answers and writes `localStorage.pathfinder_quiz_state`. Payment redirect (question id 13) sends user off-site; `ResultsPage` expects `?success=true` and reads that localStorage key to run AI analysis.

### Key files to read first
- `services/geminiService.ts` — hybrid engine, schemas (VECTOR_SCHEMA, FINAL_RESPONSE_SCHEMA), scoring, fallback logic.
- `constants.ts` — `SKILL_COLUMNS`, `QUESTIONS_12TH`, `QUESTIONS_UG` and CSV import; canonical question ids (100 = name, 13 = payment step, 9/11 percentages, etc.).
- `components/QuestionCard.tsx` — input types and sanitization (prevents CSV injection); shows accepted `inputType` values like `subject_picker`, `text`, `numeric_score`, `yes_no_text`, etc.
- `pages/QuizPage.tsx` — quiz orchestration and section transitions.
- `pages/ResultsPage.tsx` + `components/ResultsView.tsx` — how results are consumed and test hooks for dev mode.

### Project-specific conventions & patterns
- Answer payload shape: AnswerMap = Record<number, string>. `analyzeCareerPath(answers, level)` expects this shape.
- Question IDs: id 100 is user name; 13 is payment; 1/14/15 are subject-related. The service filters out some IDs before sending to LLM (9,11,13,100).
- Deterministic + LLM hybrid: TRAIT_MAP maps explicit answers -> skill weights (used to compute base vector). LLM output is merged (60/40 style) with deterministic vector.
- Degree preference: intentionally NOT used to bias recommendations (business rule in `scoutCourses` and comments).
- Strict validation: LLM outputs are checked against `VALID_COURSE_NAMES` and replaced with top-scored fallback to avoid hallucinations.

### LLM integration notes (important for changes)
- API key lookup supports both `import.meta.env.VITE_GEMINI_API_KEY` and `process.env.GEMINI_API_KEY` for dev/test contexts.
- The service expects Gemini responses matching provided schemas. The code parses responses robustly using `extractTextFromResponse` and then JSON.parse.
- Final schema enforcement and score overrides occur in `generateFinalReport()` — do not remove the validation layer; it prevents hallucinated course names and enforces score bands.

### Debugging / developer shortcuts
- View sample results without running AI: open `/results?test=true` (ResultsPage injects test data).
- Simulate post-payment analysis: set `localStorage.pathfinder_quiz_state = JSON.stringify({ answers: {...}, level: '12', timestamp: Date.now() })` then visit `/results?success=true`.
- Logs: `analyzeCareerPath` logs startup lines (catalog size, extracted vector). Check browser console for those messages.

### When editing data/CSV or skill mapping
- If you change `SKILL_COLUMNS` or CSV columns, update parsing logic in `services/geminiService.ts` (weights slice mapping) and the `VECTOR_SCHEMA` if new skills are added.
- When adding/removing question ids or changing `inputType` values, update `QuestionCard.tsx`, `constants.ts`, and any sanitization rules.

### Minimal safety rules for AI edits
- Preserve `VALID_COURSE_NAMES` validation and the fallback replacement — removing it will introduce hallucinated recommendations.
- Keep the localStorage keys (`pathfinder_quiz_state`, `pathfinder_analysis_result`) intact — they form the runtime handshake between pages.

If anything in these notes is unclear or you want the file to include different examples (e.g., a short checklist for code reviewers or PR templates), tell me which sections to expand or adjust. 
