
import { GoogleGenAI } from "@google/genai";
import path from 'path';
import fs from 'fs';

// Manually load .env.local because we are running with tsx/node directly
const envPath = path.resolve(process.cwd(), '.env.local');
let apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

if (fs.existsSync(envPath) && !apiKey) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/GEMINI_API_KEY=["']?([^"'\n]+)["']?/);
    if (match) {
        apiKey = match[1];
    }
}

if (!apiKey) {
    console.error("No API KEY found in .env.local or environment");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function listModels() {
    try {
        console.log("Fetching available models...");
        // @ts-ignore
        const response = await ai.models.list();

        // Attempt to iterate if it's an iterable or has a models property
        const models = response.models || response;

        if (Array.isArray(models)) {
            models.forEach((m: any) => {
                console.log(`- ${m.name} (${m.version}) [Methods: ${m.supportedGenerationMethods?.join(', ')}]`);
            });
        } else {
            console.log("Raw models response:", JSON.stringify(models, null, 2));
        }

    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
