import { config } from 'dotenv';
config();

import '@/ai/flows/generate-adaptive-mock-exam.ts';
import '@/ai/flows/evaluate-answers-and-provide-feedback-flow.ts';
import '@/ai/flows/generate-mock-exam-questions-flow.ts';