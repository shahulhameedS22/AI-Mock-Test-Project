'use server';
/**
 * @fileOverview Evaluates student answers with robust string comparison
 * and generates qualitative AI feedback.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExamQuestionAttemptSchema = z.object({
  questionText: z.string(),
  options: z.array(z.string()).length(4),
  correctAnswer: z.string(),
  studentAnswer: z.string(),
  topic: z.string(),
  marks: z.number().optional(),
});

type ExamQuestionAttempt = z.infer<typeof ExamQuestionAttemptSchema>;

const EvaluateAnswersAndProvideFeedbackInputSchema = z.object({
  examAttempt: z.array(ExamQuestionAttemptSchema),
});

export type EvaluateAnswersAndProvideFeedbackInput = z.infer<typeof EvaluateAnswersAndProvideFeedbackInputSchema>;

const TopicAnalysisSchema = z.object({
  topic: z.string(),
  performancePercentage: z.number(),
  weaknessIdentified: z.boolean(),
  feedback: z.string(),
});

const OptionAnalysisSchema = z.object({
  A: z.string(),
  B: z.string(),
  C: z.string(),
  D: z.string(),
});

const EvaluationResultSchema = z.object({
  question: z.string(),
  userAnswer: z.string(),
  correctAnswer: z.string(),
  isCorrect: z.boolean(),
  explanation: z.string(),
  optionAnalysis: OptionAnalysisSchema,
});

const QuestionEvaluationSchema = z.object({
  questionText: z.string(),
  studentAnswer: z.string(),
  correctAnswer: z.string(),
  isCorrect: z.boolean(),
  score: z.number(),
  detailedFeedback: z.string().describe('Short explanation of why the answer was correct or incorrect.'),
});

const EvaluateAnswersAndProvideFeedbackOutputSchema = z.object({
  score: z.number(),
  total: z.number(),
  results: z.array(EvaluationResultSchema),
  overallScore: z.number(),
  overallFeedback: z.string(),
  topicAnalysis: z.array(TopicAnalysisSchema),
  questionEvaluations: z.array(QuestionEvaluationSchema),
  weakestTopics: z.array(z.string()),
  accuracy: z.number(),
  correctAnswers: z.number(),
  incorrectAnswers: z.number(),
  attemptedQuestions: z.number(),
  totalQuestions: z.number(),
});

export type EvaluateAnswersAndProvideFeedbackOutput = z.infer<typeof EvaluateAnswersAndProvideFeedbackOutputSchema>;

const evaluatePrompt = ai.definePrompt({
  name: 'evaluateAnswersAndProvideFeedbackPrompt',
  model: 'gemini-1.5',
  input: { 
    schema: z.object({
      examAttempt: z.array(ExamQuestionAttemptSchema.extend({
        isCorrect: z.boolean(),
        marks: z.number().optional(),
      })),
      localOverallScore: z.number()
    })
  },
  output: { schema: EvaluateAnswersAndProvideFeedbackOutputSchema },
  prompt: `You are an expert bank exam evaluator and tutor. Evaluate the student's answers carefully.

Output only one valid JSON object matching the schema exactly. Do not include markdown, extra text, or explanations outside the JSON structure.

Required top-level fields:
- score: number (number of correct answers)
- total: number (number of questions)
- results: array of per-question evaluations
- overallScore: number
- overallFeedback: string
- topicAnalysis: array
- questionEvaluations: array
- weakestTopics: array
- accuracy: number (percentage of questions answered correctly)
- correctAnswers: number
- incorrectAnswers: number
- attemptedQuestions: number
- totalQuestions: number

For each question in results:
- question: the question text
- userAnswer: the student's selected answer label
- correctAnswer: the correct answer label
- isCorrect: true or false
- explanation: 4-6 lines of step-by-step solution reasoning in simple language
- optionAnalysis: object with A, B, C, D explaining why each option is correct or wrong

The explanation must clearly state why the correct answer is right and why the other options are wrong.
For Quantitative Aptitude questions, include numerical calculations, formula steps, or arithmetic reasoning.
For Logical Reasoning questions, include the explicit logic chain and why each distractor fails.
Use simple language and full step-by-step reasoning. Do not skip any question. The explanation must be at least 4 lines.

Here is the attempt data:
{{#each examAttempt}}
- Topic: {{{topic}}}
- Question: {{{questionText}}}
- Options:
  A) {{{options.[0]}}}
  B) {{{options.[1]}}}
  C) {{{options.[2]}}}
  D) {{{options.[3]}}}
- Student Answer: {{{studentAnswer}}}
- Correct Answer: {{{correctAnswer}}}
- Result: {{#if isCorrect}}Correct{{else}}Incorrect{{/if}}
{{/each}}`,
});

/**
 * Robustly cleans an answer string for comparison.
 * Handles formats like "Option A", "A.", "A", and variations of case/spacing.
 */
function cleanAnswer(ans: string): string {
  if (!ans) return "";
  return ans
    .replace(/^option\s+/i, "")
    .replace(/^([A-D])[).:\s-]*/i, "$1")
    .trim()
    .toUpperCase()
    .charAt(0);
}

function normalizeFeedbackTopic(topic: string) {
  const normalized = topic.trim().toLowerCase();
  if (normalized.includes('english')) return 'English';
  if (normalized.includes('aptitude') || normalized.includes('quant')) return 'Quantitative Aptitude';
  if (normalized.includes('reasoning') || normalized.includes('puzzle') || normalized.includes('seating') || normalized.includes('syllogism') || normalized.includes('inequality') || normalized.includes('coding') || normalized.includes('direction') || normalized.includes('analogy') || normalized.includes('classification') || normalized.includes('logical sequence')) return 'Logical Reasoning';
  return topic.trim();
}

function buildFeedbackForTopic(topic: string, performancePercentage: number) {
  if (performancePercentage >= 80) {
    return `Strong performance in ${topic}. Keep practicing to maintain this strength.`;
  }
  if (performancePercentage >= 70) {
    return `Good work in ${topic}. Focus on a few more practice questions to improve further.`;
  }
  return `Weak performance in ${topic}. Spend extra time practicing ${topic} questions and revising key concepts.`;
}

function computeLocalTopicAnalysis(attempts: Array<ExamQuestionAttempt & { isCorrect: boolean }>) {
  const stats = new Map<string, { correct: number; total: number }>();

  for (const attempt of attempts) {
    const topic = normalizeFeedbackTopic(attempt.topic);
    const entry = stats.get(topic) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (attempt.isCorrect) {
      entry.correct += 1;
    }
    stats.set(topic, entry);
  }

  return Array.from(stats.entries()).map(([topic, stat]) => {
    const performancePercentage = stat.total > 0 ? (stat.correct / stat.total) * 100 : 0;
    return {
      topic,
      performancePercentage,
      weaknessIdentified: performancePercentage < 70,
      feedback: buildFeedbackForTopic(topic, performancePercentage),
    };
  }).sort((a, b) => a.performancePercentage - b.performancePercentage);
}

function mergeTopicAnalysis(localAnalysis: ReturnType<typeof computeLocalTopicAnalysis>, aiAnalysis: Array<{ topic: string; performancePercentage: number; weaknessIdentified?: boolean; feedback?: string }> | undefined) {
  const merged = new Map<string, { topic: string; performancePercentage: number; weaknessIdentified: boolean; feedback: string }>();

  for (const localEntry of localAnalysis) {
    merged.set(localEntry.topic, localEntry);
  }

  if (Array.isArray(aiAnalysis)) {
    for (const aiEntry of aiAnalysis) {
      const topic = normalizeFeedbackTopic(aiEntry.topic);
      const existing = merged.get(topic);
      const performancePercentage = existing ? existing.performancePercentage : aiEntry.performancePercentage;
      const weaknessIdentified = existing
        ? existing.performancePercentage < 70
        : aiEntry.weaknessIdentified ?? aiEntry.performancePercentage < 70;
      merged.set(topic, {
        topic,
        performancePercentage,
        weaknessIdentified,
        feedback: aiEntry.feedback?.trim() || buildFeedbackForTopic(topic, performancePercentage),
      });
    }
  }

  return Array.from(merged.values()).sort((a, b) => a.performancePercentage - b.performancePercentage);
}

export async function evaluateAnswersAndProvideFeedback(
  input: EvaluateAnswersAndProvideFeedbackInput
): Promise<EvaluateAnswersAndProvideFeedbackOutput> {
  // 1. Calculate accuracy deterministically with robust cleaning
  const processedAttempts = input.examAttempt.map(attempt => {
    const studentAnsClean = cleanAnswer(attempt.studentAnswer);
    const correctAnsClean = cleanAnswer(attempt.correctAnswer);
    
    return {
      ...attempt,
      isCorrect: studentAnsClean !== "" && studentAnsClean === correctAnsClean,
    };
  });

  // compute total marks and earned marks (default 1 mark per question if not provided)
  const totalMarks = processedAttempts.reduce((acc, p) => acc + (p.marks ?? 1), 0);
  const earnedMarks = processedAttempts.reduce((acc, p) => acc + ((p.isCorrect ? (p.marks ?? 1) : 0)), 0);
  const localOverallScore = totalMarks > 0 ? (earnedMarks / totalMarks) * 100 : 0;

  const localTopicAnalysis = computeLocalTopicAnalysis(processedAttempts);

  const totalQuestions = processedAttempts.length;
  const correctAnswers = processedAttempts.filter((attempt) => attempt.isCorrect).length;
  const attemptedQuestions = processedAttempts.filter((attempt) => {
    const normalizedAnswer = String(attempt.studentAnswer || '').trim().toLowerCase();
    return normalizedAnswer.length > 0 && normalizedAnswer !== 'no answer provided';
  }).length;
  const incorrectAnswers = totalQuestions - correctAnswers;
  const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
  
  // 2. AI generates qualitative feedback with retry
  let attempt = 0;
  let output: any;
  while (true) {
    try {
      const res = await evaluatePrompt({
        examAttempt: processedAttempts,
        localOverallScore
      });
      output = res.output;
      break;
    } catch (err: any) {
      attempt++;
      const isNetworkError =
        err?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
        typeof err?.message === 'string' && err.message.includes('fetch failed');
      console.error('evaluateAnswersAndProvideFeedback error', err, { attempt });
      if (isNetworkError && attempt < 5) {
        console.warn(`network issue contacting AI, retry #${attempt}`);
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
        continue;
      }
      if (isNetworkError) {
        throw new Error(
          'Network error: unable to reach AI service. ' +
            'Check your internet connection or any firewall/proxy settings.'
        );
      }
      throw new Error('Feedback generation failed');
    }
  }

  if (!output) throw new Error('Feedback generation failed');

  const mergedTopicAnalysis = mergeTopicAnalysis(localTopicAnalysis, output.topicAnalysis);
  const weakestTopics = mergedTopicAnalysis
    .filter((topic) => topic.weaknessIdentified)
    .sort((a, b) => a.performancePercentage - b.performancePercentage)
    .map((topic) => topic.topic)
    .slice(0, 3);

  const overallFeedback = typeof output.overallFeedback === 'string' && output.overallFeedback.trim().length > 0
    ? output.overallFeedback
    : localTopicAnalysis.length === 0
      ? 'Keep practicing to improve your exam performance.'
      : `Your overall score is ${Math.round(localOverallScore)}%. Focus on ${weakestTopics.join(', ')} to improve faster.`;

  // 3. Merge local accuracy with AI feedback to ensure data integrity
  return {
    ...output,
    overallScore: localOverallScore,
    overallFeedback,
    topicAnalysis: mergedTopicAnalysis,
    weakestTopics: weakestTopics.length > 0 ? weakestTopics : [mergedTopicAnalysis[0]?.topic ?? 'English'],
    accuracy,
    correctAnswers,
    incorrectAnswers,
    attemptedQuestions,
    totalQuestions,
    questionEvaluations: output.questionEvaluations.map((evalItem: EvaluateAnswersAndProvideFeedbackOutput["questionEvaluations"][number], i: number) => {
      const original = processedAttempts[i];
      return {
        ...evalItem,
        questionText: original.questionText,
        studentAnswer: original.studentAnswer,
        correctAnswer: original.correctAnswer,
        isCorrect: original.isCorrect,
        score: original.isCorrect ? (original.marks ?? 1) : 0
      };
    })
  };
}
