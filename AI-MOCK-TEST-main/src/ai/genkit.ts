import 'server-only'
import { genkit } from 'genkit'
import { googleAI } from '@genkit-ai/google-genai'

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY

/** Model id WITHOUT provider prefix, e.g. "gemini-2.5-flash". */
export const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

export const aiConfigured = Boolean(apiKey)

// Plugin is only registered when a key exists, so importing this file never crashes the build.
export const ai = genkit({ plugins: apiKey ? [googleAI({ apiKey })] : [] })

export const model = googleAI.model(MODEL_NAME)
