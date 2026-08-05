'use server';
/**
 * @fileOverview This file implements a Genkit flow to generate a personalized mock exam
 * tailored to a student's weakest topics and desired difficulty level.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TopicPerformanceSchema = z.object({
  topic: z.string(),
  performancePercentage: z.number(),
});

const GenerateAdaptiveMockExamInputSchema = z.object({
  studentId: z.string(),
  weakestTopics: z.array(z.string()),
  numQuestions: z.number().int().min(1).max(100).default(10),
  difficultyLevel: z.enum(['easy', 'medium', 'hard']).default('medium'),
  topicAnalysis: z.array(TopicPerformanceSchema).optional(),
  previousQuestionContext: z.array(z.string()).optional(),
  mistakenTopics: z.array(z.string()).optional(),
  mistakenQuestions: z.array(z.string()).optional(),
});
export type GenerateAdaptiveMockExamInput = z.infer<typeof GenerateAdaptiveMockExamInputSchema>;

const ExamQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).length(4),
  correctAnswer: z.string().describe('The correct answer option label (e.g., "A", "B", "C", or "D").'),
  topic: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  explanation: z.string(),
});

const TopicDistributionSchema = z.object({
  topic: z.string(),
  percentage: z.number(),
  questionCount: z.number().int(),
});

type LocalAdaptiveQuestionTemplate = {
  question: string;
  options: string[];
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
};

const GenerateAdaptiveMockExamOutputSchema = z.object({
  examQuestions: z.array(ExamQuestionSchema),
  focusAreas: z.array(z.string()),
  distribution: z.array(TopicDistributionSchema),
  explanation: z.string(),
});
export type GenerateAdaptiveMockExamOutput = z.infer<typeof GenerateAdaptiveMockExamOutputSchema>;

const generateAdaptiveMockExamPrompt = ai.definePrompt({
  name: 'generateAdaptiveMockExamPrompt',
  model: 'gemini-2.5',
  input: { schema: GenerateAdaptiveMockExamInputSchema },
  output: { schema: GenerateAdaptiveMockExamOutputSchema },
  prompt: `You are an expert bank exam coach and question writer for exams like IBPS PO, SBI PO, and RRB Clerk.

Generate exactly {{numQuestions}} questions focused on the student's weakest areas.

Weakest Topics to Focus On: {{#each weakestTopics}}"{{this}}" {{/each}}
Difficulty Level: {{difficultyLevel}}
{{#if topicAnalysis}}
Historical Topic Performance:
{{#each topicAnalysis}}
- {{topic}}: {{performancePercentage}}%
{{/each}}
{{/if}}
{{#if previousQuestionContext}}
Avoid reusing or closely paraphrasing these previously attempted questions:
{{#each previousQuestionContext}}
- {{this}}
{{/each}}
{{/if}}
{{#if mistakenTopics}}
Recent mistake topics:
{{#each mistakenTopics}}
- {{this}}
{{/each}}
{{/if}}
{{#if mistakenQuestions}}
Recent incorrect questions:
{{#each mistakenQuestions}}
- {{this}}
{{/each}}
{{/if}}

Use these mistakes to generate the next questions. Reinforce weak areas, increase difficulty to bank exam level, and avoid repeated patterns.

Bank exam style guidance:
- English: reading comprehension, cloze test, fill in the blanks, error detection, sentence correction, sentence improvement, vocabulary, para jumbles, phrase replacement, idioms, and para completion. Use formal banking and financial context where appropriate.
- Quantitative Aptitude: simplification / approximation, number series, quadratic equations, percentage, profit & loss, simple & compound interest, ratio & proportion, average, time & work, time / speed / distance, mixture / alligation, data interpretation, data sufficiency, and quantity comparison. Prefer multi-step problems and real banking numeric context.
- Logical Reasoning: puzzles, seating arrangement, syllogism, inequalities, coding / series / direction, blood relations, analogy, classification, and logical sequence. Use reasoning scenarios similar to previous IBPS, SBI, or RRB papers.

Do not generate General Knowledge questions.
Only use English, Quantitative Aptitude, and Logical Reasoning topics for this adaptive exam.

Do not use very basic or school-level questions. Make questions aligned to previous bank exam papers, with 
  - easy: straightforward bank-style concept checks, 
  - medium: standard bank exam questions with a practical scenario, and 
  - hard: multi-step reasoning or trap-based problems.

Focus the adaptive exam on the weakest topics first. If the student has specific weak topics such as Profit & Loss, DI, Puzzles, or RC, make sure those areas receive significantly more questions.

***** OUTPUT FORMAT REQUIREMENTS *****
Reply with only a valid JSON object (no surrounding markdown or text) matching:

{
  "focusAreas": ["English"],
  "distribution": [
    {
      "topic": "English",
      "percentage": 60,
      "questionCount": 6
    }
  ],
  "explanation": "Based on your last exam, English is your weakest area. This exam has 60% English questions to help you improve.",
  "examQuestions": [
    {
      "question": "string",
      "options": ["A) ...","B) ...","C) ...","D) ..."],
      "correctAnswer": "A|B|C|D",
      "topic": "one of the weakestTopics",
      "difficulty": "{{difficultyLevel}}",
      "explanation": "A short explanation for the correct answer."
    }
  ]
}

Make sure there are exactly {{numQuestions}} entries.

For EACH question, provide:
1. "question": The complete question text.
2. "options": An array with exactly 4 answer options, formatted as:
   - "A) [answer text]"
   - "B) [answer text]"
   - "C) [answer text]"
   - "D) [answer text]"
3. "correctAnswer": Exactly one of A, B, C, D.
4. "topic": One of the listed weakestTopics.
5. "difficulty": "{{difficultyLevel}}"
6. "explanation": A short explanation of the correct answer.
Generate realistic Indian bank exam multiple-choice questions.
Do not use placeholders, generic wording, or templates.
Each question must be complete, solvable, and tied to a weakest topic.
Keep difficulty aligned with {{difficultyLevel}}:
  - easy: direct concept checks
  - medium: standard bank exam-level questions
  - hard: multi-step or trap-based questions
Ensure the exam focuses on the historic weakest topics but keeps a realistic bank exam feel.`,
});

function calculateTopicWeight(performancePercentage?: number, isWeakestTopic?: boolean): number {
  if (typeof performancePercentage !== 'number') {
    return isWeakestTopic ? 5 : 3;
  }

  if (performancePercentage <= 40) return 5;
  if (performancePercentage <= 70) return 3;
  return 2;
}

function normalizeToSection(topic: string) {
  const normalized = topic.trim().toLowerCase();
  if (normalized.includes('english') || normalized.includes('vocabulary') || normalized.includes('grammar') || normalized.includes('error') || normalized.includes('para') || normalized.includes('comprehension') || normalized.includes('sentence')) return 'English';
  if (normalized.includes('profit') || normalized.includes('loss') || normalized.includes('ratio') || normalized.includes('proportion') || normalized.includes('mixture') || normalized.includes('alligation') || normalized.includes('average') || normalized.includes('speed') || normalized.includes('distance') || normalized.includes('time') || normalized.includes('work') || normalized.includes('percentage') || normalized.includes('equation') || normalized.includes('series') || normalized.includes('data')) return 'Quantitative Aptitude';
  if (normalized.includes('puzzle') || normalized.includes('seating') || normalized.includes('syllogism') || normalized.includes('inequality') || normalized.includes('coding') || normalized.includes('direction') || normalized.includes('blood') || normalized.includes('analogy') || normalized.includes('classification') || normalized.includes('logical')) return 'Logical Reasoning';
  if (normalized.includes('aptitude') || normalized.includes('quant')) return 'Quantitative Aptitude';
  if (normalized.includes('reasoning')) return 'Logical Reasoning';
  return 'English';
}

function buildDistribution(
  weakestTopics: string[],
  topicAnalysis: GenerateAdaptiveMockExamInput['topicAnalysis'],
  numQuestions: number,
  mistakenTopics: string[] = []
) {
  const analysisByTopic = new Map(
    (topicAnalysis ?? []).map((entry) => [entry.topic, entry.performancePercentage])
  );

  if (numQuestions === 100) {
    const fixedDistribution = [
      { topic: 'English', questionCount: 30, percentage: 30 },
      { topic: 'Quantitative Aptitude', questionCount: 35, percentage: 35 },
      { topic: 'Logical Reasoning', questionCount: 35, percentage: 35 },
    ];
    const focusAreas = Array.from(
      new Set(weakestTopics.map((topic) => normalizeToSection(topic)))
    ).filter(Boolean);
    const explanation = focusAreas.length > 0
      ? `This 100-question adaptive exam includes 30 English, 35 Quantitative Aptitude, and 35 Logical Reasoning questions while focusing on your weak areas in ${focusAreas.join(', ')}.`
      : 'This 100-question adaptive exam includes 30 English, 35 Quantitative Aptitude, and 35 Logical Reasoning questions to ensure balanced coverage and targeted practice.';

    return {
      focusAreas: focusAreas.length > 0 ? focusAreas : ['English'],
      distribution: fixedDistribution,
      explanation,
    };
  }

  const topics = Array.from(
    new Set([
      ...weakestTopics.filter(Boolean),
      ...mistakenTopics.filter(Boolean),
      ...(topicAnalysis ?? []).map((entry) => entry.topic).filter(Boolean),
    ])
  );

  const normalizedTopics = topics.length > 0 ? topics : ['English'];
  const focusAreas = weakestTopics.length > 0 ? weakestTopics : [normalizedTopics[0]];

  const weightedTopics = normalizedTopics.map((topic) => ({
    topic,
    performancePercentage: analysisByTopic.get(topic),
    weight: calculateTopicWeight(
      analysisByTopic.get(topic),
      focusAreas.includes(topic) || mistakenTopics.includes(topic)
    ),
  }));

  const totalWeight = weightedTopics.reduce((sum, topic) => sum + topic.weight, 0);
  const preliminary = weightedTopics.map((topic) => {
    const exactQuestions = (topic.weight / totalWeight) * numQuestions;
    const questionCount = Math.floor(exactQuestions);
    return {
      ...topic,
      exactQuestions,
      questionCount,
      remainder: exactQuestions - questionCount,
    };
  });

  let assignedQuestions = preliminary.reduce((sum, topic) => sum + topic.questionCount, 0);
  const sortedByRemainder = [...preliminary].sort((a, b) => b.remainder - a.remainder);
  let cursor = 0;
  while (assignedQuestions < numQuestions && sortedByRemainder.length > 0) {
    sortedByRemainder[cursor % sortedByRemainder.length].questionCount += 1;
    assignedQuestions += 1;
    cursor += 1;
  }

  const distribution = preliminary.map((topic) => ({
    topic: topic.topic,
    questionCount: topic.questionCount,
    percentage: Math.round((topic.questionCount / numQuestions) * 100),
    performancePercentage: topic.performancePercentage,
  }));

  const primaryFocus = distribution.find((entry) => focusAreas.includes(entry.topic)) ?? distribution[0];
  const explanation = primaryFocus
    ? `Based on your last exam, ${primaryFocus.topic} is your weakest area. This exam has ${primaryFocus.percentage}% ${primaryFocus.topic} questions to help you improve.`
    : 'This adaptive exam focuses more heavily on your weaker topics to help you improve faster.';

  return {
    focusAreas,
    distribution: distribution.map(({ topic, percentage, questionCount }) => ({
      topic,
      percentage,
      questionCount,
    })),
    explanation,
  };
}

function getTargetTopics(distribution: ReturnType<typeof buildDistribution>['distribution']) {
  return distribution.flatMap((entry) => Array.from({ length: entry.questionCount }, () => entry.topic));
}

function normalizeQuestionText(questionText?: string) {
  return (questionText ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeAdaptiveQuestionText(questionText?: string) {
  return normalizeQuestionText(questionText);
}

const localAdaptiveQuestionBank: Record<string, Record<GenerateAdaptiveMockExamInput['difficultyLevel'], Array<{
  question: string;
  options: string[];
  correctAnswer: 'A' | 'B' | 'C' | 'D';
}>>> = {
  English: {
    easy: [
      {
        question: 'Choose the correct preposition: The sanction letter must reach the borrower ___ the end of the week.',
        options: ['A) in', 'B) by', 'C) on', 'D) at'],
        correctAnswer: 'B',
      },
      {
        question: 'Select the option that best replaces the underlined phrase: The bank has decided to *tighten* its credit appraisal norms.',
        options: ['A) loosen', 'B) strengthen', 'C) ignore', 'D) postpone'],
        correctAnswer: 'B',
      },
      {
        question: 'Choose the correct sentence for a banking memo.',
        options: [
          'A) The customer requested for a loan extension.',
          'B) The customer requested a loan extension.',
          'C) The customer requested to extend loan.',
          'D) The customer requested that loan be extended.',
        ],
        correctAnswer: 'B',
      },
    ],
    medium: [
      {
        question: 'Identify the error in the sentence: "Each of the branches have submitted the quarterly report on time."',
        options: ['A) Each of the branches', 'B) have submitted', 'C) the quarterly report', 'D) on time'],
        correctAnswer: 'B',
      },
      {
        question: 'Which sentence is grammatically correct and appropriate for a bank circular?',
        options: [
          'A) The team members were instructed to complete the audit by Friday.',
          'B) The team members was instructed to complete the audit by Friday.',
          'C) The team members instructed to complete the audit by Friday.',
          'D) The team members have instructed to complete the audit by Friday.',
        ],
        correctAnswer: 'A',
      },
      {
        question: 'Choose the meaning most similar to the word "REMITTANCE".',
        options: ['A) Payment', 'B) Delay', 'C) Estimate', 'D) Loan'],
        correctAnswer: 'A',
      },
    ],
    hard: [
      {
        question: 'Rearrange the sentences to form a coherent paragraph: A. The bank will communicate the revised policy to its retail team. B. The central office has approved the new collateral guidelines. C. The revised policy includes stricter verification for secured loans. D. The guidelines are effective from next month.',
        options: ['A) B-C-D-A', 'B) A-B-C-D', 'C) B-A-C-D', 'D) C-B-A-D'],
        correctAnswer: 'A',
      },
      {
        question: 'Fill in the blank: The auditor recommended that the loan processing time be reduced to ___ days to improve customer satisfaction.',
        options: ['A) forty-five', 'B) thirty', 'C) sixty', 'D) fifty-five'],
        correctAnswer: 'B',
      },
      {
        question: 'Choose the best option to replace the underlined part: The bank has decided to ______ its branches in tier-2 cities.',
        options: ['A) expand', 'B) exile', 'C) exclude', 'D) execute'],
        correctAnswer: 'A',
      },
    ],
  },
  'Quantitative Aptitude': {
    easy: [
      {
        question: 'A bank offers a 10% discount on a processing fee of Rs. 2,500. What is the final fee?',
        options: ['A) Rs. 2,250', 'B) Rs. 2,275', 'C) Rs. 2,300', 'D) Rs. 2,350'],
        correctAnswer: 'A',
      },
      {
        question: 'If a customer repays Rs. 7,920 on a loan of Rs. 7,000 after 1 year at simple interest, what is the annual rate of interest?',
        options: ['A) 12%', 'B) 13%', 'C) 14%', 'D) 15%'],
        correctAnswer: 'B',
      },
      {
        question: 'Find the wrong number in the series: 18, 21, 24, 28, 30.',
        options: ['A) 21', 'B) 24', 'C) 28', 'D) 30'],
        correctAnswer: 'C',
      },
    ],
    medium: [
      {
        question: 'A borrower takes a loan of Rs. 36,000 at 12% per annum simple interest. What is the total interest paid after 2 years?',
        options: ['A) Rs. 8,640', 'B) Rs. 7,200', 'C) Rs. 9,000', 'D) Rs. 8,160'],
        correctAnswer: 'A',
      },
      {
        question: 'If the ratio of deposits in current accounts to savings accounts is 3:5 and total deposits are Rs. 1,60,000, how much is in current accounts?',
        options: ['A) Rs. 45,000', 'B) Rs. 60,000', 'C) Rs. 75,000', 'D) Rs. 96,000'],
        correctAnswer: 'B',
      },
      {
        question: 'A branch manager needs to distribute 240 forms among 8 counters so that each counter gets the same number. After distribution, how many forms does each counter get?',
        options: ['A) 25', 'B) 30', 'C) 35', 'D) 40'],
        correctAnswer: 'D',
      },
    ],
    hard: [
      {
        question: 'A customer deposits Rs. 10,000 at compound interest at 10% per annum compounded annually. What is the amount after 2 years?',
        options: ['A) Rs. 12,100', 'B) Rs. 12,200', 'C) Rs. 12,300', 'D) Rs. 12,400'],
        correctAnswer: 'A',
      },
      {
        question: 'A loan is repaid by equal annual installments of Rs. 25,000 for 4 years at 8% interest on the outstanding balance. What is the total amount repaid?',
        options: ['A) Rs. 1,00,000', 'B) Rs. 1,05,000', 'C) Rs. 1,10,000', 'D) Rs. 1,15,000'],
        correctAnswer: 'C',
      },
      {
        question: 'A bank officer needs to arrange 5 reports in a stack. If report A must be above report B and report C must not be at the bottom, how many valid orders are possible?',
        options: ['A) 48', 'B) 60', 'C) 72', 'D) 96'],
        correctAnswer: 'B',
      },
    ],
  },
  'Logical Reasoning': {
    easy: [
      {
        question: 'In a row of five officers, A sits immediately left of B. C sits at the extreme right and D is between B and E. Who sits immediately to the left of C?',
        options: ['A) A', 'B) B', 'C) D', 'D) E'],
        correctAnswer: 'C',
      },
      {
        question: 'Find the odd one out from the following: Loan, Deposit, Withdrawal, Balance.',
        options: ['A) Loan', 'B) Deposit', 'C) Withdrawal', 'D) Balance'],
        correctAnswer: 'D',
      },
      {
        question: 'If all managers are executives and some executives are auditors, which of the following is definitely true?',
        options: ['A) Some managers are auditors', 'B) All auditors are managers', 'C) No manager is an auditor', 'D) All executives are managers'],
        correctAnswer: 'A',
      },
    ],
    medium: [
      {
        question: 'Pointing to a woman, Ravi said, "She is the daughter of my mother\'s only son." How is the woman related to Ravi?',
        options: ['A) Sister', 'B) Daughter', 'C) Niece', 'D) Mother'],
        correctAnswer: 'B',
      },
      {
        question: 'If SOUTH is coded as 12345 and NORTH is coded as 67845, how is THORN coded?',
        options: ['A) 45867', 'B) 54867', 'C) 48576', 'D) 47856'],
        correctAnswer: 'A',
      },
      {
        question: 'A bank officer walks 4 km north, then 3 km east, and then 4 km south. In which direction is he from the starting point?',
        options: ['A) North', 'B) South', 'C) East', 'D) West'],
        correctAnswer: 'C',
      },
    ],
    hard: [
      {
        question: 'Statements: Some files are folders. All folders are records. Conclusions: I. Some files are records. II. All records are folders. Which conclusion follows?',
        options: ['A) Only I follows', 'B) Only II follows', 'C) Both I and II follow', 'D) Neither I nor II follows'],
        correctAnswer: 'A',
      },
      {
        question: 'In a row of 40 people, P is 12th from the left end and Q is 9th from the right end. If they interchange positions, what is P’s new position from the left end?',
        options: ['A) 29th', 'B) 30th', 'C) 31st', 'D) 32nd'],
        correctAnswer: 'D',
      },
      {
        question: 'Select the option that completes the sequence: 17, 20, 25, 32, 41, ?',
        options: ['A) 50', 'B) 52', 'C) 53', 'D) 55'],
        correctAnswer: 'C',
      },
    ],
  },
};

function normalizeTopicForLocalBank(topic: string) {
  if (topic === 'Computer Knowledge') {
    return 'English';
  }
  return topic in localAdaptiveQuestionBank ? topic : 'English';
}

function buildLocalQuestion(
  topic: string,
  difficultyLevel: GenerateAdaptiveMockExamInput['difficultyLevel'],
  index: number
) {
  const normalizedTopic = normalizeTopicForLocalBank(topic);
  const topicBank = localAdaptiveQuestionBank[normalizedTopic] ?? localAdaptiveQuestionBank['English'];
  const difficultyBank = topicBank[difficultyLevel] ?? topicBank.medium;
  const template = difficultyBank[(index - 1) % difficultyBank.length];

  return {
    question: template.question,
    options: template.options,
    correctAnswer: template.correctAnswer,
    topic,
    difficulty: difficultyLevel,
    explanation: `Solve this ${difficultyLevel} ${topic} question by applying bank exam reasoning and checking each step carefully.`,
  };
}

function buildGeneratedLocalQuestion(
  topic: string,
  difficultyLevel: GenerateAdaptiveMockExamInput['difficultyLevel'],
  index: number
) {
  const normalizedTopic = normalizeTopicForLocalBank(topic);
  const seed = index;
  const entity = ['branch manager', 'loan officer', 'customer', 'credit analyst', 'regional office'][(seed - 1) % 5];
  const deadline = 5 + ((seed - 1) % 5) * 2;
  const amount = 1200 + ((seed - 1) * 275) % 9800;
  const rate = 5 + ((seed - 1) % 8);
  const time = 1 + ((seed - 1) % 4);
  const principal = 1000 + ((seed - 1) * 325) % 9000;
  const discount = 5 + ((seed - 1) % 16);
  const markedPrice = 800 + ((seed - 1) * 175) % 8200;
  const ratioA = 3 + ((seed - 1) % 7);
  const ratioB = 4 + ((seed - 1) % 6);
  const totalValue = 100 + ((seed - 1) * 11) % 200;
  const seriesBase = 4 + ((seed - 1) % 6);
  const finalDirection = ['North', 'South', 'East', 'West'][(seed + 1) % 4];

  if (normalizedTopic === 'English') {
    const variants = [
      {
        question: `Choose the correct preposition: The ${entity} must submit the report ___ the end of ${deadline} days.`,
        options: ['A) on', 'B) by', 'C) in', 'D) at'],
        correctAnswer: 'B' as const,
      },
      {
        question: `Identify the error in the sentence: "The ${entity} have completed the quarterly review on time."`,
        options: [`A) The ${entity}`, `B) have completed`, `C) the quarterly review`, `D) on time`],
        correctAnswer: 'B' as const,
        difficulty: difficultyLevel,
        explanation: 'Subject-verb agreement error: The subject is singular, so the verb must be has completed.',
      },
      {
        question: `Choose the correct meaning of the word "DISBURSEMENT" in a banking context.`,
        options: ['A) Delay', 'B) Payment', 'C) Loan', 'D) Interest'],
        correctAnswer: 'B' as const,
        difficulty: difficultyLevel,
        explanation: 'Disbursement refers to the payment or release of funds, especially in banking.',
      },
      {
        question: `Fill in the blank: The ${entity} was asked to ___ the pending loan applications by the deadline.`,
        options: ['A) expedite', 'B) expanding', 'C) expel', 'D) explain'],
        correctAnswer: 'A' as const,
      },
      {
        question: `Choose the most appropriate sentence for a bank notice: The ${entity} ___ the customer clearly about the revised charges.`,
        options: ['A) informed', 'B) inform', 'C) will informed', 'D) informing'],
        correctAnswer: 'A' as const,
      },
      {
        question: `Replace the underlined phrase: The bank has decided to ______ its credit appraisal process for the next quarter.`,
        options: ['A) strengthen', 'B) neglect', 'C) reduce', 'D) postpone'],
        correctAnswer: 'A' as const,
      },
    ];
    const selected = variants[(seed - 1) % variants.length];
    return {
      ...selected,
      difficulty: difficultyLevel,
      explanation: selected.explanation ?? `Solve this ${difficultyLevel} ${topic} question carefully using bank exam reasoning.`,
    };
  }

  if (normalizedTopic === 'Quantitative Aptitude') {
    const simpleInterest = Math.round((principal * rate * time) / 100);
    const discountedPrice = Math.round(markedPrice * (100 - discount) / 100);
    const ratioValue = Math.round((ratioB / (ratioA + ratioB)) * totalValue);
    const seriesAnswer = seriesBase * 2 + seriesBase + ((seed - 1) % 5);

    const variants: LocalAdaptiveQuestionTemplate[] = [
      {
        question: `A loan of Rs. ${principal} carries simple interest at ${rate}% per annum for ${time} year(s). What is the interest amount?`,
        options: [`A) Rs. ${simpleInterest}`, `B) Rs. ${simpleInterest + 25}`, `C) Rs. ${simpleInterest - 15}`, `D) Rs. ${simpleInterest + 50}`],
        correctAnswer: 'A' as const,
      },
      {
        question: `A product marked at Rs. ${markedPrice} is sold after ${discount}% discount. What is the selling price?`,
        options: [`A) Rs. ${discountedPrice}`, `B) Rs. ${discountedPrice + 20}`, `C) Rs. ${discountedPrice - 10}`, `D) Rs. ${discountedPrice + 30}`],
        correctAnswer: 'A' as const,
      },
      {
        question: `If two amounts are in the ratio ${ratioA}:${ratioB} and their total is Rs. ${totalValue}, what is the larger share?`,
        options: [`A) Rs. ${ratioValue}`, `B) Rs. ${ratioValue + 5}`, `C) Rs. ${ratioValue - 5}`, `D) Rs. ${ratioValue + 10}`],
        correctAnswer: 'A' as const,
      },
      {
        question: `A branch has ${totalValue} forms to distribute equally among ${ratioA + ratioB} counters. How many forms does each counter receive?`,
        options: [`A) ${Math.floor(totalValue / (ratioA + ratioB))}`, `B) ${Math.ceil(totalValue / (ratioA + ratioB))}`, `C) ${Math.floor(totalValue / (ratioA + ratioB)) + 1}`, `D) ${Math.floor(totalValue / (ratioA + ratioB)) - 1}`],
        correctAnswer: 'A' as const,
      },
      {
        question: `A person walks 6 km north, then ${rate} km east, and then 6 km south. In which direction is he from the starting point?`,
        options: ['A) North', 'B) South', 'C) East', 'D) West'],
        correctAnswer: 'C' as const,
      },
      {
        question: `Find the next number in the pattern: ${seriesBase}, ${seriesBase + 1}, ${seriesBase + 3}, ${seriesBase + 6}, ?`,
        options: [`A) ${seriesBase + 10}`, `B) ${seriesBase + 11}`, `C) ${seriesBase + 12}`, `D) ${seriesBase + 13}`],
        correctAnswer: 'C' as const,
      },
    ];
    const selected = variants[(seed - 1) % variants.length];
    return {
      ...selected,
      difficulty: difficultyLevel,
      explanation: selected.explanation ?? `Solve this ${difficultyLevel} ${topic} question carefully using bank exam reasoning.`,
    };
  }

  const variants: LocalAdaptiveQuestionTemplate[] = [
    {
      question: `A bank officer walks 3 km north, then 4 km east, and then 3 km south. In which direction is he from the starting point?`,
      options: ['A) North', 'B) South', 'C) East', 'D) West'],
      correctAnswer: 'C' as const,
    },
    {
      question: `If all branch staff are officers and some officers are auditors, which statement is definitely true?`,
      options: ['A) Some branch staff are auditors', 'B) All auditors are branch staff', 'C) No officer is an auditor', 'D) All officers are branch staff'],
      correctAnswer: 'A' as const,
    },
    {
      question: `If SOUTH is coded as 12345 and NORTH is coded as 67845, how is THORN coded?`,
      options: ['A) 45867', 'B) 54867', 'C) 48576', 'D) 47856'],
      correctAnswer: 'A' as const,
    },
    {
      question: `Statements: Some files are folders. All folders are records. Which conclusion is definitely true?`,
      options: ['A) Some files are records', 'B) All records are files', 'C) No file is a record', 'D) All folders are files'],
      correctAnswer: 'A' as const,
    },
    {
      question: `A person walks 5 km north, then 2 km east, then 5 km south. Where is the person relative to the starting point?`,
      options: ['A) North', 'B) South', 'C) East', 'D) West'],
      correctAnswer: 'C' as const,
    },
    {
      question: `Select the next number: 17, 20, 25, 32, 41, ?`,
      options: ['A) 50', 'B) 52', 'C) 53', 'D) 55'],
      correctAnswer: 'C' as const,
    },
  ];

  const selected = variants[(seed - 1) % variants.length];
  return {
    ...selected,
    difficulty: difficultyLevel,
    explanation: selected.explanation ?? `Solve this ${difficultyLevel} ${topic} question carefully using bank exam reasoning.`,
  };
}

function buildUniqueLocalQuestion(
  topic: string,
  difficultyLevel: GenerateAdaptiveMockExamInput['difficultyLevel'],
  seenQuestions: Set<string>,
  fallbackIndex = 1
) {
  const normalizedTopic = normalizeTopicForLocalBank(topic);
  const topicBank = localAdaptiveQuestionBank[normalizedTopic] ?? localAdaptiveQuestionBank['English'];
  const orderedBanks = [
    topicBank[difficultyLevel] ?? [],
    ...(['easy', 'medium', 'hard'] as const)
      .filter((level) => level !== difficultyLevel)
      .map((level) => topicBank[level] ?? []),
  ];

  for (const bank of orderedBanks) {
    for (const template of bank) {
      const normalized = normalizeQuestionText(template.question);
      if (normalized && !seenQuestions.has(normalized)) {
        seenQuestions.add(normalized);
        return {
          question: template.question,
          options: template.options,
          correctAnswer: template.correctAnswer,
          topic,
          difficulty: difficultyLevel,
          explanation: `Solve this ${difficultyLevel} ${topic} question using bank exam logic and careful reasoning.`,
        };
      }
    }
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const generated = buildGeneratedLocalQuestion(topic, difficultyLevel, fallbackIndex + attempt);
    const normalized = normalizeQuestionText(generated.question);
    if (normalized && !seenQuestions.has(normalized)) {
      seenQuestions.add(normalized);
      return {
        question: generated.question,
        options: generated.options,
        correctAnswer: generated.correctAnswer,
        topic,
        difficulty: generated.difficulty ?? difficultyLevel,
        explanation: generated.explanation ?? `Solve this ${difficultyLevel} ${topic} question using bank exam reasoning.`,
      };
    }
  }

  return null;
}

function dedupeAdaptiveQuestions(
  questions: GenerateAdaptiveMockExamOutput['examQuestions'],
  previousQuestionContext: string[] = [],
  mistakenQuestions: string[] = []
) {
  const seen = new Set(
    [
      ...previousQuestionContext,
      ...mistakenQuestions,
    ].map((entry) => normalizeAdaptiveQuestionText(entry.split(':').slice(1).join(':') || entry))
  );

  return questions.filter((question) => {
    const normalized = normalizeQuestionText(question.question);
    if (!normalized || seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

function buildLocalAdaptiveExam(input: GenerateAdaptiveMockExamInput): GenerateAdaptiveMockExamOutput {
  const adaptivePlan = buildDistribution(
    input.weakestTopics,
    input.topicAnalysis,
    input.numQuestions,
    input.mistakenTopics ?? []
  );
  const previousQuestionContext = input.previousQuestionContext ?? [];
  const mistakenQuestions = input.mistakenQuestions ?? [];
  const seenQuestions = new Set<string>([
    ...previousQuestionContext.map((entry) => normalizeAdaptiveQuestionText(entry.split(':').slice(1).join(':') || entry)),
    ...mistakenQuestions.map((entry) => normalizeAdaptiveQuestionText(entry)),
  ]);
  const examQuestions = adaptivePlan.distribution.flatMap((distributionEntry) =>
    Array.from({ length: distributionEntry.questionCount }, (_, index) =>
      buildUniqueLocalQuestion(
        distributionEntry.topic,
        input.difficultyLevel,
        seenQuestions,
        index + 1
      ) ?? buildLocalQuestion(distributionEntry.topic, input.difficultyLevel, index + 1)
    )
  );

  return {
    examQuestions,
    focusAreas: adaptivePlan.focusAreas,
    distribution: adaptivePlan.distribution,
    explanation: adaptivePlan.explanation,
  };
}

function normalizeGeneratedQuestion(
  question: Partial<GenerateAdaptiveMockExamOutput['examQuestions'][number]>,
  fallbackTopic: string,
  fallbackIndex: number
) {
  const safeTopic = fallbackTopic || question.topic?.trim() || 'English';
  const optionLetters = ['A', 'B', 'C', 'D'];
  const rawOptions = Array.isArray(question.options) ? question.options.slice(0, 4) : [];
  const options = optionLetters.map((letter, index) => {
    const provided = rawOptions[index]?.trim();
    if (!provided) {
      return `${letter}) Option ${letter}`;
    }
    return provided.match(/^[A-D]\)/) ? provided : `${letter}) ${provided.replace(/^[A-D][).:\s-]*/, '')}`;
  });
  const correctAnswer = optionLetters.includes(question.correctAnswer ?? '')
    ? (question.correctAnswer as 'A' | 'B' | 'C' | 'D')
    : 'A';

  return {
    question: question.question?.trim() || `Adaptive question ${fallbackIndex} on ${safeTopic}`,
    options,
    correctAnswer,
    topic: safeTopic,
    difficulty: question.difficulty ?? 'hard',
    explanation: question.explanation ?? `Solve this ${question.difficulty ?? 'hard'} ${safeTopic} question carefully.`,
  };
}

function looksLikeTemplateQuestion(question: GenerateAdaptiveMockExamOutput['examQuestions'][number]) {
  const normalizedQuestion = question.question.trim().toLowerCase();
  const placeholderOptions = question.options.filter((option) => /\.\.\.|option [a-d]|^a\)\s*\.\.\./i.test(option));
  return (
    normalizedQuestion === 'string' ||
    normalizedQuestion.includes('sample question') ||
    placeholderOptions.length > 0
  );
}

function ensureQuestionCount(
  generatedQuestions: GenerateAdaptiveMockExamOutput['examQuestions'],
  adaptivePlan: ReturnType<typeof buildDistribution>,
  difficultyLevel: GenerateAdaptiveMockExamInput['difficultyLevel'],
  previousQuestionContext: string[] = [],
  mistakenQuestions: string[] = []
) {
  const targetTopics = getTargetTopics(adaptivePlan.distribution);
  const targetCount = adaptivePlan.distribution.reduce((sum, entry) => sum + entry.questionCount, 0);
  const dedupedGeneratedQuestions = dedupeAdaptiveQuestions(generatedQuestions, previousQuestionContext, mistakenQuestions);
  const normalized = dedupedGeneratedQuestions
    .slice(0, targetTopics.length)
    .map((question, index) => ({
      ...question,
      topic: targetTopics[index] ?? question.topic,
    }));
  const completed = [...normalized];
  const seenQuestions = new Set<string>([
    ...previousQuestionContext.map((entry) => normalizeQuestionText(entry.split(':').slice(1).join(':') || entry)),
    ...mistakenQuestions.map((entry) => normalizeQuestionText(entry.split(':').slice(1).join(':') || entry)),
    ...completed.map((question) => normalizeQuestionText(question.question)),
  ]);

  for (const distributionEntry of adaptivePlan.distribution) {
    const currentCount = completed.filter((question) => question.topic === distributionEntry.topic).length;
    const missingCount = distributionEntry.questionCount - currentCount;

    for (let i = 0; i < missingCount; i++) {
      const fallbackQuestion = buildUniqueLocalQuestion(
        distributionEntry.topic,
        difficultyLevel,
        seenQuestions,
        completed.length + i + 1
      );

      if (fallbackQuestion) {
        completed.push(fallbackQuestion);
      } else {
        completed.push(buildLocalQuestion(distributionEntry.topic, difficultyLevel, i + 1));
      }
    }
  }

  let cursor = 0;
  while (completed.length < targetCount) {
    const nextTopic = targetTopics[cursor % targetTopics.length] || 'English';
    const fallbackQuestion = buildUniqueLocalQuestion(
      nextTopic,
      difficultyLevel,
      seenQuestions,
      completed.length + cursor + 1
    );
    completed.push(
      fallbackQuestion ?? buildLocalQuestion(nextTopic, difficultyLevel, cursor + 1)
    );
    cursor += 1;
  }

  return completed.slice(0, targetCount);
}

const generateAdaptiveMockExamFlow = ai.defineFlow(
  {
    name: 'generateAdaptiveMockExamFlow',
    inputSchema: GenerateAdaptiveMockExamInputSchema,
    outputSchema: GenerateAdaptiveMockExamOutputSchema,
  },
  async (input) => {
    const adaptivePlan = buildDistribution(input.weakestTopics, input.topicAnalysis, input.numQuestions, input.mistakenTopics ?? []);
    let output: GenerateAdaptiveMockExamOutput | undefined;
    let attempt = 0;

    while (attempt < 3 && !output) {
      try {
        const response = await generateAdaptiveMockExamPrompt(input);
        if (response.output) {
          output = response.output;
          break;
        }
      } catch (error: any) {
        const isNetworkError =
          error?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
          (typeof error?.message === 'string' && error.message.includes('fetch failed'));
        console.error('generateAdaptiveMockExam prompt failed', error, { attempt: attempt + 1 });
        if (!isNetworkError) {
          break;
        }
      }
      attempt += 1;
    }

    if (!output) {
      return buildLocalAdaptiveExam(input);
    }

    const targetTopics = getTargetTopics(adaptivePlan.distribution);
    const normalizedQuestions = output.examQuestions.map((question, index) => {
      const fallbackTopic = targetTopics[index] ?? adaptivePlan.focusAreas[0] ?? 'English';
      return normalizeGeneratedQuestion(question, fallbackTopic, index + 1);
    });

    if (normalizedQuestions.length === 0 || normalizedQuestions.every(looksLikeTemplateQuestion)) {
      return buildLocalAdaptiveExam(input);
    }

    const examQuestions = ensureQuestionCount(
      normalizedQuestions,
      adaptivePlan,
      input.difficultyLevel,
      input.previousQuestionContext,
      input.mistakenQuestions ?? []
    );

    return {
      examQuestions,
      focusAreas: adaptivePlan.focusAreas,
      distribution: adaptivePlan.distribution,
      explanation: adaptivePlan.explanation,
    };
  }
);

export async function generateAdaptiveMockExam(input: GenerateAdaptiveMockExamInput): Promise<GenerateAdaptiveMockExamOutput> {
  return generateAdaptiveMockExamFlow(input);
}
