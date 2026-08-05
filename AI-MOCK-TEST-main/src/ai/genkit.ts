import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Accept a few common environment variable names that projects sometimes use
// for Google generative AI API keys. This makes the server-side config more
// resilient and provides clearer startup logs when keys are missing or wrong.
const possibleEnvNames = [
  'GOOGLE_API_KEY',
  'GOOGLE_GENAI_API_KEY',
  'GOOGLE_AI_API_KEY',
];

let apiKey: string | undefined = undefined;
let usedEnvName: string | undefined = undefined;
for (const name of possibleEnvNames) {
  if (process.env[name]) {
    apiKey = process.env[name];
    usedEnvName = name;
    break;
  }
}

if (!apiKey) {
  console.warn(
    'Google Generative AI API key not found. Looked for: ' +
      possibleEnvNames.join(', ') +
      '. Server-side AI generation will use mock fallback behavior.'
  );
}

// Helpful startup log so we can verify the server-side process picked up the key.
// Don't log the key itself — only the env variable used.
if (apiKey) {
  console.info(`Genkit: using Google API key from env var: ${usedEnvName}`);
} else {
  console.info('Genkit: no API key found; running in mock fallback mode.');
}

export const ai = genkit({
  plugins: apiKey ? [googleAI({ apiKey })] : [],
  model: 'gemini-2.5',
});
