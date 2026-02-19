import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

console.log("Testing API Key:", apiKey ? "Found" : "Missing");

if (!apiKey) {
    console.error("No API key found in .env");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function test() {
    try {
        console.log("Sending request to Gemini...");
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "Say 'Hello from Gemini!' if you can hear me.",
        });
        console.log("Response Object Keys:", Object.keys(response));
        console.log("Response:", JSON.stringify(response, null, 2));
        console.log("✅ API is responding.");
    } catch (e) {
        console.error("❌ API Failed:", e);
    }
}

test();
