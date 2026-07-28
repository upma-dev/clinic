/**
 * @file app/api/gemini/route.ts
 * @description Server-side API route that proxies requests to Google's Gemini AI. 
 * Includes system instructions specifically tuned for Dr. Prateek Tiwari's dermatology clinic 
 * and a robust fallback mechanism for offline rule-based responses if API keys are missing.
 */

import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { siteConfig } from "@/config/site";

// Lazy-initialized secure GoogleGenAI client according to SDK best practices
let aiClient: GoogleGenAI | null = null;

/**
 * Retrieves or initializes the GoogleGenAI instance.
 * Ensures the API key is only accessed on the server.
 */
function getAiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
  }
  return aiClient;
}

/**
 * Main POST handler for chat queries
 */
export async function POST(req: NextRequest) {
  let promptValue = "";
  try {
    const body = await req.json();
    promptValue = body.prompt || "";

    if (!promptValue) {
      return NextResponse.json({ error: "Missing prompt or query query string." }, { status: 400 });
    }

    const ai = getAiClient();

    // Define the persona and context for the AI Advisor
    const systemInstruction = `You are the specialized premium clinical AI skin, hair, and cosmetology assistant chatbot representing "Skin Hub Clinic" in Freeganj, Ujjain. 
The clinic is led by senior consulting dermatologist "${siteConfig.doctorName}, ${siteConfig.credentials}".
Outpatient Hours: ${siteConfig.timings}.
Consultation OPD Fee: ${siteConfig.fee} (payable in cash or online secure UPI).
Location: ${siteConfig.location}.
Clinical Core services provided:
${JSON.stringify(siteConfig.services, null, 2)}

Instructions for answers:
1. Be medically confident, professional, empathetic, and culturally warm. Speak from the perspective of Dr. Prateek Tiwari's senior clinical assistant.
2. If patients ask about active acne, severe pimple scars, eczema, or hair thinning, explain the scientific treatment pathways available at Skin Hub Ujjain (such as chemical Yellow Peels, Centrifugal PRP growth factors, Micro-needlings, or customized prescriptive moisturizers).
3. Always include a polite, clear concluding advisory urging them to schedule a priority clinical seat lookup (which costs only ${siteConfig.fee}) to receive precise visual diagnoses, rather than relying solely on AI.
4. Keep treatment explanations scientifically structured, easy to digest, with clear, legible text formatting. Avoid overly technical jargon but remain authoritative.`;

    // Grateful fallback mechanism if GEMINI_API_KEY is not setup yet
    if (!ai) {
      console.warn("GEMINI_API_KEY is missing on server environment. Triggering intelligent offline rule-based response.");
      return NextResponse.json({
        text: getOfflineResponse(promptValue)
      });
    }

    // Call Gemini with specialized system instructions
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptValue,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    const responseText = response.text || "I was unable to compile a reply. Please try again or visit Dr. Prateek's clinic directly in Freeganj.";
    return NextResponse.json({ text: responseText });

  } catch (err: any) {
    console.error("Gemini API server Exception:", err);

    // Detect API key errors to provide helpful fallback behavior
    const errString = err ? (err.message || typeof err === 'object' ? JSON.stringify(err) : String(err)) : "";
    const isApiKeyIssue = 
      errString.includes("API key not valid") || 
      errString.includes("INVALID_ARGUMENT") || 
      errString.includes("API_KEY_INVALID") || 
      errString.includes("unauthorized") ||
      errString.includes("Forbidden") ||
      errString.includes("key");

    if (isApiKeyIssue) {
      console.warn("Detected invalid/expired GEMINI_API_KEY. Gracefully falling back to pre-seeded clinical rule engine.");
      const fallbackResponse = getOfflineResponse(promptValue);
      return NextResponse.json({
        text: `${fallbackResponse}\n\n*(Operational Note: Operating in offline clinical backup mode. Please verify your GEMINI_API_KEY setting to restore dynamic generative capabilities.)*`
      });
    }

    return NextResponse.json({
      text: `I encountered a minor connectivity hurdle. For immediate inquiries, please schedule an OPD lookup at our Freeganj office or contact our clinic clerk at +91 98270 42111!\n\n_Dev status: ${err.message || "Unknown cluster error"}_`
    });
  }
}

/**
 * Fallback response generator used when the AI service is unavailable.
 * Provides accurate clinic info based on keywords.
 */
function getOfflineResponse(prompt: string): string {
  const query = prompt.toLowerCase();
  
  // Handling Acne queries
  if (query.includes('acne') || query.includes('pimple') || query.includes('peel') || query.includes('yellow')) {
    return `Hello! Regarding active acne or scar treatments: At Skin Hub Clinic, Ujjain, senior dermatologist Dr. Prateek Tiwari offers advanced chemical Salicylic peels and Yellow Peels to rapidly dry out active modules and stimulate skin-cell turnover. 

We also conduct microneedling treatments for deeper scars. To proceed safely, we suggest scheduling an OPD consultation with Dr. Prateek Tiwari for Rs. 200 to receive a customized treatment cycle design. Or call us at +91 98270 42111!`;
  }
  
  // Handling Hair queries
  if (query.includes('hair') || query.includes('thinning') || query.includes('fall') || query.includes('prp')) {
    return `Hello! For hair thinning and follicle concerns: We provide advanced Platelet-Rich Plasma (PRP) Hair Therapy at our Freeganj office. This clinical procedure extracts autologous growth factors from your blood sample using standard centrifugation and micro-delivers them to the scalp. 

This nourishes dormant hair follicles and promotes natural regrowth. Consultation is just Rs. 200. Please register a priority slot on our booking page to meet Dr. Prateek Tiwari!`;
  }

  // Handling Timing/Schedule queries
  if (query.includes('time') || query.includes('timing') || query.includes('schedule') || query.includes('sunday')) {
    return `Certainly! Skin Hub Clinic in Freeganj, Ujjain is active during the following outpatient hours:
- Monday to Saturday: 09:00 AM - 02:00 PM | 05:00 PM - 09:00 PM
- Sundays: Closed

OPD consultation fee is Rs. 200. We recommend pre-registering your slot through our online portal to bypass walk-in waiting times. Let us know if you have booking coordinate doubts!`;
  }

  // General fallback
  return `Hello! I am Dr. Prateek Tiwari's AI Assistant. At Skin Hub Clinic in Freeganj, Ujjain, we offer specialized dermatology, cosmetology, and hair transplant consultation schemas. 

To help me answer better, could you please specify if you are querying about active acne, scalp PRP therapies, chemical yellow peels, or timing schedules at our office? You can also schedule an OPD visit for Rs. 200 to meet Dr. Prateek Tiwari physically!`;
}

