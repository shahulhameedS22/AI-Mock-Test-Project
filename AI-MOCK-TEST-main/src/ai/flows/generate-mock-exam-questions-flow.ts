'use server';
/**
 * @fileOverview This file implements a Genkit flow for generating unique and relevant bank exam questions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TopicPerformanceSchema = z.object({
  topic: z.string(),
  performancePercentage: z.number(),
});

const GenerateMockExamQuestionsInputSchema = z.object({
  studentId: z.string(),
  examType: z.string(),
  categories: z.object({
    english: z.number().int().min(0).max(100),
    aptitude: z.number().int().min(0).max(100),
    reasoning: z.number().int().min(0).max(100),
  }),
  difficultyLevel: z.enum(['easy', 'medium', 'hard']),
  weakTopics: z.array(z.string()).optional(),
  strongTopics: z.array(z.string()).optional(),
  topicAnalysis: z.array(TopicPerformanceSchema).optional(),
  previousQuestionContext: z.array(z.string()).optional(),
});
export type GenerateMockExamQuestionsInput = z.infer<typeof GenerateMockExamQuestionsInputSchema>;

const QuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).min(4).max(4),
  correctAnswer: z.string().describe('The correct answer option label (MUST BE one of: "A", "B", "C", or "D").'),
  explanation: z.string(),
  topic: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

const GenerateMockExamQuestionsOutputSchema = z.array(QuestionSchema);
export type GenerateMockExamQuestionsOutput = z.infer<typeof GenerateMockExamQuestionsOutputSchema>;

const generateQuestionsPrompt = ai.definePrompt({
  name: 'generateBankExamQuestionsPrompt',
  model: 'gemini-2.5',
  input: { schema: GenerateMockExamQuestionsInputSchema },
  output: { schema: GenerateMockExamQuestionsOutputSchema },
  prompt: `You are an expert bank exam paper setter for Indian competitive exams like IBPS PO, SBI PO, and RBI Grade B.

Generate a personalized mock test based on the student's previous performance.

Weak Topics: {{#if weakTopics}}{{#each weakTopics}}"{{this}}" {{/each}}{{else}}None{{/if}}
Strong Topics: {{#if strongTopics}}{{#each strongTopics}}"{{this}}" {{/each}}{{else}}None{{/if}}
{{#if topicAnalysis}}Topic Accuracy:
{{#each topicAnalysis}}- {{topic}}: {{performancePercentage}}%
{{/each}}{{/if}}

Follow these rules:
- Focus 60–70% of the questions on weak topics.
- Include 30–40% of the questions from strong topics for balance.
- Very weak topics should be medium difficulty to build confidence.
- Weak topics should be medium to hard difficulty.
- Strong topics should be hard difficulty.

Generate a realistic mock exam using the following section counts:
- Logical Reasoning: {{categories.reasoning}} questions
- Quantitative Aptitude: {{categories.aptitude}} questions
- English: {{categories.english}} questions

Bank exam style guidance:
- English: reading comprehension, cloze test, fill in the blanks, error detection, sentence correction, sentence improvement, vocabulary, para jumbles, phrase replacement, idioms, and para completion.
- Quantitative Aptitude: data interpretation, time & work, profit & loss, simplification / approximation, number series, quadratic equations, percentage, simple & compound interest, ratio & proportion, average, time / speed / distance, mixture / alligation, data sufficiency, and quantity comparison.
- Logical Reasoning: puzzles, seating arrangement, syllogism, inequalities, coding / series / direction, blood relations, analogy, classification, and logical sequence.

Use the topic weightage typical for bank exams when allocating questions.
Do not generate General Knowledge or Computer Knowledge questions.
For hard difficulty, use tricky, time-consuming, multi-step questions with close options and logical traps.
At least 30% of the paper should include very high-difficulty questions with multi-step reasoning, multi-part calculations, or complex inference.
Avoid direct formula-only questions and very easy or school-level problems.
If the section is Quantitative Aptitude, focus especially on Data Interpretation, Time & Work, and Profit & Loss.
If the section is Logical Reasoning, prioritize Puzzles, Seating Arrangement, and Syllogism.
If the section is English, prioritize Reading Comprehension, Error Detection, and Cloze Test.
All questions must be {{difficultyLevel}} difficulty.
For hard difficulty, include exam-level reasoning, data interpretation setup or multi-step calculation, and distractors that look plausible to candidates.
For all sections, ensure each question reads like it belongs in an SBI PO / IBPS Clerk / RBI Grade B practice set.
{{#if weakTopics}}Prioritize these weak topics: {{#each weakTopics}}"{{this}}" {{/each}}{{/if}}
{{#if strongTopics}}Use these strong topics as lower priority: {{#each strongTopics}}"{{this}}" {{/each}}{{/if}}

Output only valid JSON with exactly the requested number of questions. Do not include any markdown, commentary, or extra fields.

Example format:
[
  {
    "question": "Sample question?",
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    "correctAnswer": "A",
    "explanation": "Explanation here",
    "topic": "English",
    "difficulty": "{{difficultyLevel}}"
  }
]

Rules:
- Use exactly 4 answer options for each question.
- Format correctAnswer as one of: A, B, C, D.
- Output a JSON array directly; do not wrap the result in an object.
- Do not return questionId or extra metadata fields.
- Provide real bank-exam-style questions, not generic placeholders.
- Ensure topics are specific and relevant to the section.
  `,
});

const generateMockExamQuestionsFlow = ai.defineFlow(
  {
    name: 'generateMockExamQuestionsFlow',
    inputSchema: GenerateMockExamQuestionsInputSchema,
    outputSchema: GenerateMockExamQuestionsOutputSchema,
  },
  async (input) => {
    console.log('[generateMockExamQuestionsFlow] Input:', JSON.stringify(input, null, 2));
    // Generate questions using AI
    const response = await generateQuestionsPrompt(input);
    console.log('[generateMockExamQuestionsFlow] Response received');
    if (!response.output) {
      throw new Error('Question generation returned no output');
    }
    return response.output;
  }
);

export async function generateMockExamQuestions(
  input: GenerateMockExamQuestionsInput
): Promise<GenerateMockExamQuestionsOutput> {
  return generateMockExamQuestionsFlow(input);
}
