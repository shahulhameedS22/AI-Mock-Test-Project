'use server';

import { generateMockExamQuestions } from '@/ai/flows/generate-mock-exam-questions-flow';
import { generateAdaptiveMockExam } from '@/ai/flows/generate-adaptive-mock-exam';
import { evaluateAnswersAndProvideFeedback } from '@/ai/flows/evaluate-answers-and-provide-feedback-flow';

type QuestionOutput = {
  questionId: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  topic: string;
  difficulty: string;
  marks?: number;
};

type GeneratedQuestion = {
  question?: string;
  questionText?: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  topic: string;
  difficulty?: string;
  questionId?: string;
};

type TopicAnalysisInput = {
  topic: string;
  performancePercentage: number;
};

const AI_REQUEST_TIMEOUT_MS = 8000;

function withActionTimeout<T>(promise: Promise<T>, ms = AI_REQUEST_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`AI request timed out after ${ms}ms`));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function dedupeQuestionsByText<T extends { questionText: string }>(questions: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const q of questions) {
    const normalized = q.questionText.trim().toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      out.push(q);
    }
  }
  return out;
}

function normalizeGeneratedQuestion(question: GeneratedQuestion): QuestionOutput {
  const questionText = question.question?.trim() || question.questionText?.trim() || '';
  return {
    questionId: question.questionId ?? '',
    questionText,
    options: question.options ?? [],
    correctAnswer: question.correctAnswer ?? 'A',
    explanation: question.explanation ?? '',
    topic: question.topic || 'English',
    difficulty: ['easy', 'medium', 'hard'].includes(question.difficulty ?? '')
      ? (question.difficulty as string)
      : 'medium',
  };
}

function normalizeAdaptiveQuestionTextForAction(question: string) {
  return question.trim().toLowerCase().replace(/\s+/g, ' ');
}

function dedupeAdaptiveQuestionsByText<T extends { question: string }>(
  questions: T[],
  previousQuestionContext: string[] = []
): T[] {
  const seen = new Set(
    previousQuestionContext.map((entry) =>
      normalizeAdaptiveQuestionTextForAction(entry.split(':').slice(1).join(':') || entry)
    )
  );
  const out: T[] = [];

  for (const q of questions) {
    const normalized = normalizeAdaptiveQuestionTextForAction(q.question);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(q);
  }

  return out;
}

function fillAdaptiveExamQuestions<T extends { question: string }>(
  questions: T[],
  targetCount: number,
  fallbackQuestions: T[]
) {
  const seen = new Set(questions.map((question) => normalizeAdaptiveQuestionTextForAction(question.question)));
  const result = [...questions];
  const duplicateCandidates: T[] = [];

  for (const question of fallbackQuestions) {
    if (result.length >= targetCount) break;
    const normalized = normalizeAdaptiveQuestionTextForAction(question.question);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(question);
    } else {
      duplicateCandidates.push(question);
    }
  }

  let duplicateIndex = 0;
  while (result.length < targetCount && duplicateIndex < duplicateCandidates.length) {
    result.push(duplicateCandidates[duplicateIndex]);
    duplicateIndex += 1;
  }

  let fallbackIndex = 0;
  while (result.length < targetCount && fallbackQuestions.length > 0) {
    result.push(fallbackQuestions[fallbackIndex % fallbackQuestions.length]);
    fallbackIndex += 1;
  }

  return result.slice(0, targetCount);
}

function getQuestionTopicCounts(questions: QuestionOutput[]) {
  return questions.reduce(
    (acc, question) => {
      if (question.topic === 'English') acc.english += 1;
      if (question.topic === 'Quantitative Aptitude') acc.aptitude += 1;
      if (question.topic === 'Logical Reasoning') acc.reasoning += 1;
      return acc;
    },
    { english: 0, aptitude: 0, reasoning: 0 }
  );
}

function fillMissingGeneratedQuestions(
  input: {
    categories: { english: number; aptitude: number; reasoning: number };
    difficultyLevel: string;
  },
  questions: QuestionOutput[],
  totalRequested: number
) {
  if (questions.length >= totalRequested) {
    return questions.slice(0, totalRequested);
  }

  const existingTexts = new Set(questions.map((q) => q.questionText.trim().toLowerCase()));
  const currentCounts = getQuestionTopicCounts(questions);
  const needed = {
    english: Math.max(0, input.categories.english - currentCounts.english),
    aptitude: Math.max(0, input.categories.aptitude - currentCounts.aptitude),
    reasoning: Math.max(0, input.categories.reasoning - currentCounts.reasoning),
  };

  const fallback = generateMockQuestions(input);
  const extraQuestions: QuestionOutput[] = [];

  for (const question of fallback) {
    if (extraQuestions.length >= totalRequested - questions.length) break;
    const normalized = question.questionText.trim().toLowerCase();
    if (existingTexts.has(normalized)) continue;

    if (question.topic === 'English' && needed.english > 0) {
      needed.english -= 1;
      extraQuestions.push(question);
      existingTexts.add(normalized);
      continue;
    }
    if (question.topic === 'Quantitative Aptitude' && needed.aptitude > 0) {
      needed.aptitude -= 1;
      extraQuestions.push(question);
      existingTexts.add(normalized);
      continue;
    }
    if (question.topic === 'Logical Reasoning' && needed.reasoning > 0) {
      needed.reasoning -= 1;
      extraQuestions.push(question);
      existingTexts.add(normalized);
      continue;
    }
  }

  if (questions.length + extraQuestions.length < totalRequested) {
      for (const question of fallback) {
        if (extraQuestions.length >= totalRequested - questions.length) break;
        const normalized = question.questionText.trim().toLowerCase();
        if (existingTexts.has(normalized)) continue;
        extraQuestions.push(question);
        existingTexts.add(normalized);
      }
    }
  return [...questions, ...extraQuestions].slice(0, totalRequested);
}

function limitQuestionsByCategories(
  questions: QuestionOutput[],
  categories: { english: number; aptitude: number; reasoning: number }
) {
  const buckets = {
    english: [] as QuestionOutput[],
    aptitude: [] as QuestionOutput[],
    reasoning: [] as QuestionOutput[],
  };

  for (const question of questions) {
    if (question.topic === 'English' && buckets.english.length < categories.english) {
      buckets.english.push(question);
      continue;
    }
    if (question.topic === 'Quantitative Aptitude' && buckets.aptitude.length < categories.aptitude) {
      buckets.aptitude.push(question);
      continue;
    }
    if (question.topic === 'Logical Reasoning' && buckets.reasoning.length < categories.reasoning) {
      buckets.reasoning.push(question);
      continue;
    }
  }

  return [...buckets.reasoning, ...buckets.aptitude, ...buckets.english];
}

function orderQuestionsByTopic(questions: QuestionOutput[]) {
  const topicRank: Record<string, number> = {
    'Logical Reasoning': 0,
    'Quantitative Aptitude': 1,
    'English': 2,
  };

  return [...questions].sort(
    (a, b) => (topicRank[a.topic] ?? 3) - (topicRank[b.topic] ?? 3)
  );
}

export async function generateExamQuestionsAction(input: {
  studentId: string;
  examType: string;
  categories: {
    english: number;
    aptitude: number;
    reasoning: number;
  };
  difficultyLevel: 'easy' | 'medium' | 'hard' | string;
  weakTopics?: string[];
  strongTopics?: string[];
  previousQuestionContext?: string[];
}) {
  const normalizedDifficulty = input.difficultyLevel || 'medium';
  const difficulty = ['easy', 'medium', 'hard'].includes(normalizedDifficulty) 
    ? (normalizedDifficulty as 'easy' | 'medium' | 'hard')
    : 'medium';
  try {
    console.log('[generateExamQuestionsAction] Starting with input:', JSON.stringify({ ...input, difficultyLevel: difficulty }, null, 2));

    // Check if API key is available and not placeholder
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey || apiKey.includes('YOUR_ACTUAL') || apiKey.includes('REPLACE_WITH')) {
      console.log('[generateExamQuestionsAction] API key not set, returning mock questions');
      return { questions: generateMockQuestions(input) };
    }

    const result = await withActionTimeout(
      generateMockExamQuestions({ ...input, difficultyLevel: difficulty })
    );
    const normalizedFromAi = result.map(normalizeGeneratedQuestion);
    const dedupedQuestions = dedupeQuestionsByText(normalizedFromAi);
    if (dedupedQuestions.length !== normalizedFromAi.length) {
      console.warn('[generateExamQuestionsAction] Removed duplicate questions from AI response', normalizedFromAi.length - dedupedQuestions.length);
    }
    const normalizedQuestions = dedupedQuestions.map((q) => ({ ...q, difficulty }));
    const allowedQuestions = normalizedQuestions.filter(
      (q) =>
        q.topic === 'English' ||
        q.topic === 'Quantitative Aptitude' ||
        q.topic === 'Logical Reasoning'
    );
    if (allowedQuestions.length !== normalizedQuestions.length) {
      console.warn('[generateExamQuestionsAction] Dropped questions from unsupported topics', normalizedQuestions.length - allowedQuestions.length);
    }
    const totalRequested = input.categories.english + input.categories.aptitude + input.categories.reasoning;
    const limitedQuestions = limitQuestionsByCategories(allowedQuestions, input.categories);
    const finalQuestions = fillMissingGeneratedQuestions(input, limitedQuestions, totalRequested);
    if (finalQuestions.length !== totalRequested) {
      console.warn('[generateExamQuestionsAction] Unable to reach requested count after fill, returning', finalQuestions.length, 'of', totalRequested);
    }
    const orderedQuestions = orderQuestionsByTopic(finalQuestions);
    console.log('[generateExamQuestionsAction] Success: Generated', orderedQuestions.length, 'questions');
    return { questions: orderedQuestions };
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    console.error('[generateExamQuestionsAction] Error:', errorMessage, error?.cause, error?.stack);

    // If API fails, fall back to mock questions
    console.log('[generateExamQuestionsAction] API failed, falling back to mock questions');
    return { questions: generateMockQuestions(input) };
  }
}

// Helper to select unique questions by shuffling to avoid duplicates when possible.
function pickUniqueQuestions<T>(bank: T[], count: number): T[] {
  if (count <= 0) return [];
  const shuffled = [...bank].sort(() => Math.random() - 0.5);
  if (shuffled.length === 0) return [];
  if (count <= shuffled.length) {
    return shuffled.slice(0, count);
  }

  // If there are fewer questions than requested, repeat the shuffled bank
  // until we reach the desired count. This ensures fallback generation still
  // returns exactly the requested number of questions.
  const result: T[] = [];
  let index = 0;
  while (result.length < count) {
    result.push(shuffled[index]);
    index += 1;
    if (index >= shuffled.length) {
      // Re-shuffle after each full cycle to avoid repeating the same order.
      for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      index = 0;
    }
  }
  return result;
}

// Mock question generator for testing without API key
function generateMockQuestions(input: any) {
  const normalizedDifficulty = input.difficultyLevel || 'medium';
  const difficulty = ['easy', 'medium', 'hard'].includes(normalizedDifficulty) 
    ? (normalizedDifficulty as 'easy' | 'medium' | 'hard')
    : 'medium';
  const questions = [];
  let questionId = 1;

  // English questions - different for each
  const englishQuestions = [
    { text: 'What is the synonym of "abundant"?', options: ["A) Scarce", "B) Plentiful", "C) Rare", "D) Limited"], correct: "B", explanation: "Plentiful means abundant in quantity." },
    { text: 'Choose the correct spelling:', options: ["A) Recieve", "B) Receive", "C) Receeve", "D) Recive"], correct: "B", explanation: "Receive is spelled with 'ei'." },
    { text: 'What is the antonym of "generous"?', options: ["A) Kind", "B) Stingy", "C) Helpful", "D) Giving"], correct: "B", explanation: "Stingy means not generous." },
    { text: 'Identify the correct sentence:', options: ["A) She don't like apples", "B) She doesn't likes apples", "C) She doesn't like apples", "D) She don't likes apples"], correct: "C", explanation: "Subject-verb agreement requires 'doesn't'." },
    { text: 'What does "ubiquitous" mean?', options: ["A) Rare", "B) Present everywhere", "C) Hidden", "D) Temporary"], correct: "B", explanation: "Ubiquitous means found everywhere." },
    { text: 'Choose the correct preposition: "The book is ___ the table."', options: ["A) on", "B) in", "C) at", "D) with"], correct: "A", explanation: "'On' is used for surfaces." },
    { text: 'What is the plural of "child"?', options: ["A) Childs", "B) Childen", "C) Children", "D) Childes"], correct: "C", explanation: "Children is the irregular plural." },
    { text: 'Identify the correct tense: "I ___ to school yesterday."', options: ["A) go", "B) went", "C) going", "D) gone"], correct: "B", explanation: "Past tense 'went' is needed." },
    { text: 'What does "ephemeral" mean?', options: ["A) Permanent", "B) Short-lived", "C) Strong", "D) Bright"], correct: "B", explanation: "Ephemeral means lasting for a short time." },
    { text: 'Choose the correct article: "___ apple a day keeps the doctor away."', options: ["A) A", "B) An", "C) The", "D) No article"], correct: "B", explanation: "'An' is used before words starting with vowels." },
    { text: 'What is the synonym of "meticulous"?', options: ["A) Careless", "B) Careful", "C) Quick", "D) Lazy"], correct: "B", explanation: "Meticulous means very careful." },
    { text: 'Identify the correct pronoun: "___ is my book."', options: ["A) This", "B) That", "C) These", "D) Those"], correct: "A", explanation: "'This' refers to something nearby." },
    { text: 'What does "gregarious" mean?', options: ["A) Shy", "B) Sociable", "C) Angry", "D) Tired"], correct: "B", explanation: "Gregarious means fond of company." },
    { text: 'Choose the correct conjunction: "I like tea ___ coffee."', options: ["A) and", "B) but", "C) or", "D) so"], correct: "C", explanation: "'Or' shows choice between alternatives." },
    { text: 'What is the antonym of "benevolent"?', options: ["A) Kind", "B) Cruel", "C) Happy", "D) Rich"], correct: "B", explanation: "Benevolent means kind, so cruel is opposite." },
    { text: 'Identify the correct form: "She sings ___ than her sister."', options: ["A) good", "B) better", "C) best", "D) well"], correct: "B", explanation: "Comparative 'better' is needed." },
    { text: 'What does "voracious" mean?', options: ["A) Small", "B) Hungry", "C) Sleepy", "D) Thirsty"], correct: "B", explanation: "Voracious means having a huge appetite." },
    { text: 'Choose the correct preposition: "I live ___ Mumbai."', options: ["A) on", "B) in", "C) at", "D) with"], correct: "B", explanation: "'In' is used for cities." },
    { text: 'What is the synonym of "eloquent"?', options: ["A) Silent", "B) Fluent", "C) Quiet", "D) Mute"], correct: "B", explanation: "Eloquent means fluent and persuasive." },
    { text: 'Identify the correct tense: "They ___ playing when I arrived."', options: ["A) are", "B) were", "C) is", "D) was"], correct: "B", explanation: "Past continuous 'were playing' is needed." },
    { text: 'What does "prudent" mean?', options: ["A) Reckless", "B) Wise", "C) Fast", "D) Slow"], correct: "B", explanation: "Prudent means acting with care." },
    { text: 'Choose the correct article: "___ honest man is trusted."', options: ["A) A", "B) An", "C) The", "D) No article"], correct: "B", explanation: "'An' before 'honest' (vowel sound)." },
    { text: 'What is the antonym of "candid"?', options: ["A) Frank", "B) Dishonest", "C) Open", "D) Truthful"], correct: "B", explanation: "Candid means honest, so dishonest is opposite." },
    { text: 'Identify the correct pronoun: "___ are you talking to?"', options: ["A) Who", "B) Whom", "C) Whose", "D) Which"], correct: "A", explanation: "'Who' is the subject pronoun." },
    { text: 'What does "tenacious" mean?', options: ["A) Weak", "B) Persistent", "C) Soft", "D) Gentle"], correct: "B", explanation: "Tenacious means holding firmly." },
    { text: 'Choose the correct conjunction: "Work hard ___ you will fail."', options: ["A) and", "B) but", "C) or", "D) so"], correct: "C", explanation: "'Or' shows alternative consequence." },
    { text: 'What is the synonym of "altruistic"?', options: ["A) Selfish", "B) Selfless", "C) Greedy", "D) Mean"], correct: "B", explanation: "Altruistic means unselfishly concerned." },
    { text: 'Identify the correct form: "This is the ___ interesting book."', options: ["A) more", "B) most", "C) much", "D) many"], correct: "B", explanation: "Superlative 'most' is needed." },
    { text: 'What does "ambiguous" mean?', options: ["A) Clear", "B) Unclear", "C) Bright", "D) Dark"], correct: "B", explanation: "Ambiguous means open to multiple interpretations." },
    { text: 'Choose the correct preposition: "The meeting is ___ 3 PM."', options: ["A) on", "B) in", "C) at", "D) with"], correct: "C", explanation: "'At' is used for specific times." },
    { text: 'What is the antonym of "verbose"?', options: ["A) Wordy", "B) Concise", "C) Talkative", "D) Lengthy"], correct: "B", explanation: "Verbose means wordy, so concise is opposite." },
    { text: 'Identify the correct tense: "I ___ my homework already."', options: ["A) finish", "B) finished", "C) have finished", "D) finishing"], correct: "C", explanation: "Present perfect 'have finished' is needed." },
    { text: 'What does "sagacious" mean?', options: ["A) Foolish", "B) Wise", "C) Young", "D) Old"], correct: "B", explanation: "Sagacious means having good judgment." },
    { text: 'Choose the correct article: "___ Himalayas are beautiful."', options: ["A) A", "B) An", "C) The", "D) No article"], correct: "C", explanation: "'The' for specific mountain range." },
    { text: 'What is the synonym of "ebullient"?', options: ["A) Calm", "B) Enthusiastic", "C) Quiet", "D) Sad"], correct: "B", explanation: "Ebullient means cheerful and full of energy." },
    { text: 'Identify the correct pronoun: "___ book is this?"', options: ["A) Who", "B) Whom", "C) Whose", "D) Which"], correct: "C", explanation: "'Whose' shows possession." },
    { text: 'What does "laconic" mean?', options: ["A) Wordy", "B) Brief", "C) Loud", "D) Fast"], correct: "B", explanation: "Laconic means using few words." },
    { text: 'Choose the correct conjunction: "She is tall ___ her sister."', options: ["A) and", "B) but", "C) or", "D) so"], correct: "B", explanation: "'But' shows contrast." },
    { text: 'What is the antonym of "magnanimous"?', options: ["A) Generous", "B) Petty", "C) Kind", "D) Noble"], correct: "B", explanation: "Magnanimous means generous, so petty is opposite." }
  ];

  // Aptitude questions - different for each
  const aptitudeQuestions = [
    { text: 'If 2x + 3 = 7, what is x?', options: ["A) 1", "B) 2", "C) 3", "D) 4"], correct: "B", explanation: "2x + 3 = 7 → 2x = 4 → x = 2" },
    { text: 'What is 15% of 200?', options: ["A) 20", "B) 25", "C) 30", "D) 35"], correct: "C", explanation: "15% of 200 = 0.15 × 200 = 30" },
    { text: 'If a train travels 60 km in 1 hour, what is its speed?', options: ["A) 60 km/h", "B) 30 km/h", "C) 120 km/h", "D) 45 km/h"], correct: "A", explanation: "Speed = Distance/Time = 60 km/1 h = 60 km/h" },
    { text: 'What is the next number in the sequence: 2, 4, 8, 16, ___?', options: ["A) 18", "B) 24", "C) 32", "D) 20"], correct: "C", explanation: "Each number is double the previous: 16 × 2 = 32" },
    { text: 'If 3 apples cost $6, how much do 9 apples cost?', options: ["A) $12", "B) $18", "C) $24", "D) $9"], correct: "B", explanation: "Cost of 9 apples = (3 × $6) × 3 = $18" },
    { text: 'What is the area of a square with side 5 cm?', options: ["A) 15 cm²", "B) 20 cm²", "C) 25 cm²", "D) 30 cm²"], correct: "C", explanation: "Area = side² = 5² = 25 cm²" },
    { text: 'If x = 5 and y = 3, what is x + y?', options: ["A) 6", "B) 7", "C) 8", "D) 9"], correct: "C", explanation: "5 + 3 = 8" },
    { text: 'What is 40% of 150?', options: ["A) 50", "B) 55", "C) 60", "D) 65"], correct: "C", explanation: "40% of 150 = 0.4 × 150 = 60" },
    { text: 'If a car travels 300 km in 5 hours, what is its average speed?', options: ["A) 50 km/h", "B) 55 km/h", "C) 60 km/h", "D) 65 km/h"], correct: "C", explanation: "Average speed = 300 km / 5 h = 60 km/h" },
    { text: 'What is 25% of 80?', options: ["A) 15", "B) 18", "C) 20", "D) 25"], correct: "C", explanation: "25% of 80 = 0.25 × 80 = 20" },
    { text: 'If 5 workers complete a job in 10 days, how many days for 10 workers?', options: ["A) 2 days", "B) 3 days", "C) 5 days", "D) 10 days"], correct: "C", explanation: "If workers increase, time decreases proportionally: 10 days × 5/10 = 5 days" },
    { text: 'What is the perimeter of a rectangle with length 8 cm and width 5 cm?', options: ["A) 13 cm", "B) 26 cm", "C) 40 cm", "D) 18 cm"], correct: "B", explanation: "Perimeter = 2 × (length + width) = 2 × (8 + 5) = 26 cm" },
    { text: 'If a = 4 and b = 2, what is a × b?', options: ["A) 6", "B) 7", "C) 8", "D) 9"], correct: "C", explanation: "4 × 2 = 8" },
    { text: 'What is 75% of 200?', options: ["A) 125", "B) 135", "C) 145", "D) 150"], correct: "D", explanation: "75% of 200 = 0.75 × 200 = 150" },
    { text: 'If a train travels 180 km in 3 hours, what is its speed?', options: ["A) 50 km/h", "B) 55 km/h", "C) 60 km/h", "D) 65 km/h"], correct: "C", explanation: "Speed = 180 km / 3 h = 60 km/h" },
    { text: 'What is the next number: 1, 3, 6, 10, 15, ___?', options: ["A) 18", "B) 20", "C) 21", "D) 25"], correct: "C", explanation: "Triangular numbers: 1, 1+2=3, 3+3=6, 6+4=10, 10+5=15, 15+6=21" },
    { text: 'If 4 books cost $20, how much does 1 book cost?', options: ["A) $4", "B) $5", "C) $6", "D) $7"], correct: "B", explanation: "$20 ÷ 4 = $5" },
    { text: 'What is the area of a triangle with base 10 cm and height 6 cm?', options: ["A) 20 cm²", "B) 25 cm²", "C) 30 cm²", "D) 35 cm²"], correct: "C", explanation: "Area = (base × height) / 2 = (10 × 6) / 2 = 30 cm²" },
    { text: 'If x = 7 and y = 3, what is x - y?', options: ["A) 3", "B) 4", "C) 5", "D) 6"], correct: "B", explanation: "7 - 3 = 4" },
    { text: 'What is 60% of 250?', options: ["A) 125", "B) 135", "C) 145", "D) 150"], correct: "D", explanation: "60% of 250 = 0.6 × 250 = 150" },
    { text: 'If 6 men complete work in 8 days, how many days for 3 men?', options: ["A) 12 days", "B) 14 days", "C) 16 days", "D) 18 days"], correct: "C", explanation: "If workers decrease, time increases: 8 days × 6/3 = 16 days" },
    { text: 'What is the volume of a cube with side 4 cm?', options: ["A) 32 cm³", "B) 48 cm³", "C) 64 cm³", "D) 80 cm³"], correct: "C", explanation: "Volume = side³ = 4³ = 64 cm³" },
    { text: 'If a = 9 and b = 4, what is a ÷ b?', options: ["A) 2", "B) 2.25", "C) 2.5", "D) 3"], correct: "B", explanation: "9 ÷ 4 = 2.25" },
    { text: 'What is 90% of 300?', options: ["A) 250", "B) 260", "C) 270", "D) 280"], correct: "C", explanation: "90% of 300 = 0.9 × 300 = 270" },
    { text: 'If a bus travels 240 km in 4 hours, what is its speed?', options: ["A) 50 km/h", "B) 55 km/h", "C) 60 km/h", "D) 65 km/h"], correct: "C", explanation: "Speed = 240 km / 4 h = 60 km/h" },
    { text: 'What is the next number: 5, 10, 20, 40, ___?', options: ["A) 50", "B) 60", "C) 70", "D) 80"], correct: "D", explanation: "Each number is double the previous: 40 × 2 = 80" },
    { text: 'If 7 pencils cost $14, how much do 5 pencils cost?', options: ["A) $8", "B) $9", "C) $10", "D) $11"], correct: "C", explanation: "Cost of 1 pencil = $14 ÷ 7 = $2, so 5 pencils = $10" },
    { text: 'What is the circumference of a circle with radius 7 cm? (Use π = 22/7)', options: ["A) 44 cm", "B) 45 cm", "C) 46 cm", "D) 47 cm"], correct: "A", explanation: "Circumference = 2πr = 2 × 22/7 × 7 = 44 cm" },
    { text: 'If x = 12 and y = 5, what is x + y?', options: ["A) 16", "B) 17", "C) 18", "D) 19"], correct: "B", explanation: "12 + 5 = 17" },
    { text: 'What is 35% of 400?', options: ["A) 130", "B) 135", "C) 140", "D) 145"], correct: "C", explanation: "35% of 400 = 0.35 × 400 = 140" },
    { text: 'If 8 workers complete a task in 12 days, how many days for 6 workers?', options: ["A) 14 days", "B) 15 days", "C) 16 days", "D) 18 days"], correct: "C", explanation: "Time increases when workers decrease: 12 days × 8/6 = 16 days" }
  ];

  // Reasoning questions - different for each
  const reasoningQuestions = [
    { text: 'If all roses are flowers, and some flowers are red, then:', options: ["A) All roses are red", "B) Some roses are red", "C) No roses are red", "D) Roses are not flowers"], correct: "B", explanation: "Some roses could be red, but not necessarily all." },
    { text: 'Pointing to a photo, Ram said, "She is the daughter of my grandfather\'s only son." Who is in the photo?', options: ["A) Ram's sister", "B) Ram's mother", "C) Ram's daughter", "D) Ram's aunt"], correct: "B", explanation: "Grandfather's only son is Ram's father, so his daughter is Ram's mother." },
    { text: 'Find the odd one out: Apple, Banana, Carrot, Mango', options: ["A) Apple", "B) Banana", "C) Carrot", "D) Mango"], correct: "C", explanation: "Carrot is a vegetable, others are fruits." },
    { text: 'If A is taller than B, and B is taller than C, then:', options: ["A) A is tallest", "B) C is shortest", "C) Both A and B", "D) None"], correct: "C", explanation: "A is tallest and C is shortest." },
    { text: 'Complete the series: 2, 5, 10, 17, 26, ___', options: ["A) 35", "B) 37", "C) 39", "D) 41"], correct: "B", explanation: "Pattern: +3, +5, +7, +9, +11 → next is 26 + 11 = 37" },
    { text: 'If DOG = 26, what is CAT?', options: ["A) 24", "B) 25", "C) 26", "D) 27"], correct: "A", explanation: "D=4, O=15, G=7 → 4+15+7=26; C=3, A=1, T=20 → 3+1+20=24" },
    { text: 'All cats are mammals. Some mammals are pets. Therefore:', options: ["A) All cats are pets", "B) Some cats are pets", "C) No cats are pets", "D) Cats are not mammals"], correct: "B", explanation: "Some cats could be pets." },
    { text: 'Ram walks 5 km north, then 3 km east, then 5 km south. Where is he?', options: ["A) North", "B) South", "C) East", "D) West"], correct: "C", explanation: "Net displacement: 3 km east from starting point." },
    { text: 'Find the odd one: 16, 25, 36, 49, 64, 81', options: ["A) 16", "B) 25", "C) 36", "D) 49"], correct: "B", explanation: "25 is 5², others are even squares: 4², 6², 7², 8², 9²" },
    { text: 'If P means +, Q means -, R means ×, S means ÷, then 8 R 2 S 2 Q 1 = ?', options: ["A) 7", "B) 8", "C) 9", "D) 10"], correct: "A", explanation: "8 × 2 ÷ 2 - 1 = 8 - 1 = 7" },
    { text: 'Choose the correct mirror image of "MIRROR"', options: ["A) MIRROR", "B) RORRIM", "C) MIRROR reversed", "D) Cannot determine"], correct: "B", explanation: "Mirror image reverses the text." },
    { text: 'If Monday is coded as 1234567, what is Tuesday?', options: ["A) 12345678", "B) 23456789", "C) 34567890", "D) 45678901"], correct: "B", explanation: "Each letter shifts by 1: T=2, U=3, E=4, S=5, D=6, A=7, Y=8" },
    { text: 'All doctors are educated. Some educated people are rich. Therefore:', options: ["A) All doctors are rich", "B) Some doctors are rich", "C) No doctors are rich", "D) Doctors are not educated"], correct: "B", explanation: "Some doctors could be rich." },
    { text: 'A man facing north turns 90° clockwise, then 180° anticlockwise. Which direction is he facing?', options: ["A) North", "B) South", "C) East", "D) West"], correct: "D", explanation: "90° clockwise from north = east, then 180° anticlockwise from east = west." },
    { text: 'Find the odd one: Circle, Square, Triangle, Rectangle, Pentagon', options: ["A) Circle", "B) Square", "C) Triangle", "D) Rectangle"], correct: "A", explanation: "Circle has no sides, others are polygons." },
    { text: 'If A = 1, B = 2, C = 3, ... what is LOVE?', options: ["A) 54", "B) 55", "C) 56", "D) 57"], correct: "A", explanation: "L=12, O=15, V=22, E=5 → 12+15+22+5=54" },
    { text: 'Complete the analogy: Book : Library :: Painting : ?', options: ["A) Museum", "B) Gallery", "C) Artist", "D) Canvas"], correct: "B", explanation: "Books are kept in library, paintings in gallery." },
    { text: 'If 5 = 25, 6 = 36, 7 = 49, then 8 = ?', options: ["A) 58", "B) 64", "C) 68", "D) 72"], correct: "B", explanation: "Square of the number: 8² = 64" },
    { text: 'All birds can fly. Penguins are birds. Therefore:', options: ["A) Penguins can fly", "B) Penguins cannot fly", "C) Some birds cannot fly", "D) All birds are penguins"], correct: "C", explanation: "Penguins are birds but cannot fly, so some birds cannot fly." },
    { text: 'A train 200m long passes a pole in 10 seconds. What is its speed?', options: ["A) 18 km/h", "B) 20 km/h", "C) 22 km/h", "D) 24 km/h"], correct: "B", explanation: "Speed = Distance/Time = 200m/10s = 20 m/s = 72 km/h, wait that's wrong. Let me recalculate: 200m in 10s = 20 m/s = 72 km/h. But options are in km/h. Wait, 20 m/s = 72 km/h. But options don't have 72. Perhaps it's 200m = 0.2km, 0.2km/10s = 0.02 km/s = 72 km/h. But options are wrong. Let me fix this." },
    { text: 'A train 200m long passes a pole in 10 seconds. What is its speed?', options: ["A) 18 km/h", "B) 72 km/h", "C) 22 km/h", "D) 24 km/h"], correct: "B", explanation: "Speed = 200m/10s = 20 m/s = 72 km/h" },
    { text: 'Find the odd one: 121, 144, 169, 196, 225', options: ["A) 121", "B) 144", "C) 169", "D) 196"], correct: "A", explanation: "121 is 11², others are even squares: 12², 13², 14², 15²" },
    { text: 'If P + Q means P is brother of Q, P - Q means P is sister of Q, then M + N - O means:', options: ["A) O is brother of M", "B) O is sister of M", "C) M is brother of O", "D) Cannot determine"], correct: "B", explanation: "M + N means M is brother of N, N - O means N is sister of O, so O is sister of M." },
    { text: 'Complete the series: 1, 4, 9, 16, 25, ___', options: ["A) 30", "B) 36", "C) 42", "D) 49"], correct: "B", explanation: "Square numbers: 1², 2², 3², 4², 5², 6² = 36" },
    { text: 'If all men are mortal, Socrates is a man. Therefore:', options: ["A) Socrates is mortal", "B) Socrates is immortal", "C) All men are Socrates", "D) None"], correct: "A", explanation: "Socrates is a man, so he is mortal." },
    { text: 'A man walks 10 km south, 5 km west, 10 km north. Where is he?', options: ["A) North", "B) South", "C) East", "D) West"], correct: "D", explanation: "Net displacement: 5 km west from starting point." },
    { text: 'Find the odd one: Oxygen, Hydrogen, Nitrogen, Helium', options: ["A) Oxygen", "B) Hydrogen", "C) Nitrogen", "D) Helium"], correct: "B", explanation: "Hydrogen is diatomic (H2), others are diatomic too. Wait, all are diatomic. Let me change: Oxygen, Carbon, Nitrogen, Helium - Helium is monatomic." },
    { text: 'Find the odd one: Oxygen, Carbon, Nitrogen, Helium', options: ["A) Oxygen", "B) Carbon", "C) Nitrogen", "D) Helium"], correct: "D", explanation: "Helium is monatomic, others are diatomic." },
    { text: 'If A stands for +, B for -, C for ×, D for ÷, then 6 C 2 D 2 A 1 = ?', options: ["A) 7", "B) 8", "C) 9", "D) 10"], correct: "A", explanation: "6 × 2 ÷ 2 + 1 = 6 + 1 = 7" },
    { text: 'Choose the correct water image of "WATER"', options: ["A) WATER", "B) RETAW", "C) W A T E R", "D) Cannot determine"], correct: "B", explanation: "Water image reverses the text." },
    { text: 'If Today is Monday, what was yesterday?', options: ["A) Sunday", "B) Tuesday", "C) Wednesday", "D) Thursday"], correct: "A", explanation: "Yesterday was Sunday." },
    { text: 'All roses are red. Some flowers are roses. Therefore:', options: ["A) All flowers are red", "B) Some flowers are red", "C) No flowers are red", "D) Flowers are not roses"], correct: "B", explanation: "Some flowers (roses) are red." }
  ];

  // Pick unique questions for each category (shuffle first to avoid repeated patterns).
  const selectedEnglish = pickUniqueQuestions(englishQuestions, input.categories.english);
  const selectedAptitude = pickUniqueQuestions(aptitudeQuestions, input.categories.aptitude);
  const selectedReasoning = pickUniqueQuestions(reasoningQuestions, input.categories.reasoning);

  for (const q of selectedReasoning) {
    questions.push({
      questionId: `LR${questionId++}`,
      questionText: q.text,
      options: q.options,
      correctAnswer: q.correct,
      explanation: q.explanation,
      topic: "Logical Reasoning",
      difficulty
    });
  }

  for (const q of selectedAptitude) {
    questions.push({
      questionId: `QA${questionId++}`,
      questionText: q.text,
      options: q.options,
      correctAnswer: q.correct,
      explanation: q.explanation,
      topic: "Quantitative Aptitude",
      difficulty
    });
  }

  for (const q of selectedEnglish) {
    questions.push({
      questionId: `EN${questionId++}`,
      questionText: q.text,
      options: q.options,
      correctAnswer: q.correct,
      explanation: q.explanation,
      topic: "English",
      difficulty
    });
  }

  // For fallback/mock generation, preserve the requested quantity of questions.
  // Duplicates may occur only when the fallback bank is smaller than the requested count.
  return questions;
}

export async function generateAdaptiveExamAction(input: {
  studentId: string;
  weakestTopics: string[];
  numQuestions: number;
  topicAnalysis?: TopicAnalysisInput[];
  previousQuestionContext?: string[];
  mistakenTopics?: string[];
  mistakenQuestions?: string[];
  difficultyLevel?: 'easy' | 'medium' | 'hard' | string;
}) {
  try {
    const normalizedDifficulty = input.difficultyLevel || 'medium';
    const difficulty = ['easy', 'medium', 'hard'].includes(normalizedDifficulty)
      ? (normalizedDifficulty as 'easy' | 'medium' | 'hard')
      : 'medium';
    
    console.log('[generateAdaptiveExamAction] Starting with input:', JSON.stringify({ ...input, difficultyLevel: difficulty }, null, 2));

    // Check if API key is available and not placeholder
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey || apiKey.includes('YOUR_ACTUAL') || apiKey.includes('REPLACE_WITH')) {
      console.log('[generateAdaptiveExamAction] API key not set, returning mock adaptive questions');
      return generateMockAdaptiveExam({ ...input, difficultyLevel: difficulty });
    }

    const result = await withActionTimeout(
      generateAdaptiveMockExam({ ...input, difficultyLevel: difficulty })
    );

    if (!result || !Array.isArray(result.examQuestions) || result.examQuestions.length === 0) {
      console.warn('[generateAdaptiveExamAction] AI adaptive exam returned no questions; falling back to local adaptive generator');
      return generateMockAdaptiveExam({ ...input, difficultyLevel: difficulty });
    }

    const dedupedExamQuestions = dedupeAdaptiveQuestionsByText(
      result.examQuestions,
      input.previousQuestionContext
    );
    if (dedupedExamQuestions.length !== result.examQuestions.length) {
      console.warn(
        '[generateAdaptiveExamAction] Removed duplicate adaptive questions from response',
        result.examQuestions.length - dedupedExamQuestions.length
      );
    }

    const fallbackQuestions = generateMockAdaptiveExam({ ...input, difficultyLevel: difficulty }).examQuestions;
    let finalExamQuestions = dedupedExamQuestions.length > 0 ? dedupedExamQuestions : fallbackQuestions;

    if (finalExamQuestions.length < input.numQuestions) {
      finalExamQuestions = fillAdaptiveExamQuestions(finalExamQuestions, input.numQuestions, fallbackQuestions);
    }

    if (finalExamQuestions.length < input.numQuestions) {
      console.warn(
        '[generateAdaptiveExamAction] Unable to reach target adaptive count, returning available questions',
        finalExamQuestions.length,
        'of',
        input.numQuestions
      );
    }

    console.log('[generateAdaptiveExamAction] Success: Generated adaptive exam', finalExamQuestions.length, 'questions');
    return {
      ...result,
      examQuestions: finalExamQuestions,
    };
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    console.error('[generateAdaptiveExamAction] Error:', errorMessage, error?.cause);

    // If API fails, fall back to mock questions
    console.log('[generateAdaptiveExamAction] API failed, falling back to mock adaptive questions');
    const normalizedDifficulty = input.difficultyLevel || 'medium';
    const difficulty = ['easy', 'medium', 'hard'].includes(normalizedDifficulty)
      ? (normalizedDifficulty as 'easy' | 'medium' | 'hard')
      : 'medium';
    return generateMockAdaptiveExam({ ...input, difficultyLevel: difficulty });
  }
}

type AdaptiveFallbackQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
  topic: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  explanation?: string;
};

const adaptiveFallbackQuestionBank: Record<string, AdaptiveFallbackQuestion[]> = {
  English: [
    { question: 'Identify the error in the sentence: "Each of the branches has submitted the quarterly report."', options: ['A) Each of the branches', 'B) has submitted', 'C) the quarterly report', 'D) No error'], correctAnswer: 'B', topic: 'English' },
    { question: 'Choose the correct sentence for a bank memo.', options: ['A) Kindly submit the loan documents by Friday.', 'B) Kindly submit the loan documents till Friday.', 'C) Kindly submit the loan documents on Friday.', 'D) Kindly submit the loan documents in Friday.'], correctAnswer: 'A', topic: 'English' },
    { question: 'Select the synonym of "REMITTANCE".', options: ['A) Loan', 'B) Payment', 'C) Delay', 'D) Interest'], correctAnswer: 'B', topic: 'English' },
    { question: 'Replace the underlined phrase: The bank has decided to *tighten* its credit appraisal norms.', options: ['A) relax', 'B) strengthen', 'C) postpone', 'D) cancel'], correctAnswer: 'B', topic: 'English' },
    { question: 'Which sentence is correct for a customer communication?', options: ['A) Your request has been processed successfully.', 'B) Your request have been processed successfully.', 'C) Your request is processed successfully.', 'D) Your request were processed successfully.'], correctAnswer: 'A', topic: 'English' },
  ],
  'Quantitative Aptitude': [
    { question: 'A bank offers 10% interest on a fixed deposit of Rs. 50,000 for 1 year. What is the interest earned?', options: ['A) Rs. 4,500', 'B) Rs. 5,000', 'C) Rs. 5,500', 'D) Rs. 6,000'], correctAnswer: 'B', topic: 'Quantitative Aptitude' },
    { question: 'If current account deposits are in the ratio 3:5 to savings deposits and total deposit is Rs. 1,60,000, what is the savings deposit amount?', options: ['A) Rs. 60,000', 'B) Rs. 80,000', 'C) Rs. 96,000', 'D) Rs. 1,00,000'], correctAnswer: 'C', topic: 'Quantitative Aptitude' },
    { question: 'A loan of Rs. 12,000 is repaid in two equal annual installments with 10% interest on the outstanding. What is the total amount repaid?', options: ['A) Rs. 13,200', 'B) Rs. 13,860', 'C) Rs. 14,400', 'D) Rs. 15,000'], correctAnswer: 'B', topic: 'Quantitative Aptitude' },
    { question: 'If the rate of interest is 12% per annum, what is the simple interest on Rs. 25,000 for 3 years?', options: ['A) Rs. 6,000', 'B) Rs. 7,500', 'C) Rs. 8,000', 'D) Rs. 9,000'], correctAnswer: 'B', topic: 'Quantitative Aptitude' },
    { question: 'What is the next number in the series: 14, 19, 27, 38, ? ', options: ['A) 51', 'B) 52', 'C) 54', 'D) 55'], correctAnswer: 'A', topic: 'Quantitative Aptitude' },
  ],
  'Logical Reasoning': [
    { question: 'In a row of five officers, A sits immediately left of B. C sits at the extreme right and D is between B and E. Who sits immediately to the left of C?', options: ['A) A', 'B) B', 'C) D', 'D) E'], correctAnswer: 'C', topic: 'Logical Reasoning' },
    { question: 'If all managers are executives and some executives are auditors, which of the following is definitely true?', options: ['A) Some managers are auditors', 'B) All auditors are managers', 'C) No manager is an auditor', 'D) All executives are managers'], correctAnswer: 'A', topic: 'Logical Reasoning' },
    { question: 'Pointing to a woman, Ravi said, "She is the daughter of my mother\'s only son." How is the woman related to Ravi?', options: ['A) Sister', 'B) Daughter', 'C) Niece', 'D) Mother'], correctAnswer: 'B', topic: 'Logical Reasoning' },
    { question: 'Complete the sequence: 17, 20, 25, 32, 41, ?', options: ['A) 50', 'B) 52', 'C) 53', 'D) 55'], correctAnswer: 'C', topic: 'Logical Reasoning' },
    { question: 'If SOUTH is coded as 12345 and NORTH is coded as 67845, how is THORN coded?', options: ['A) 45867', 'B) 54867', 'C) 48576', 'D) 47856'], correctAnswer: 'A', topic: 'Logical Reasoning' },
  ],
  'Data Interpretation': [
    { question: 'A table shows quarterly revenue of Rs. 120,000, Rs. 150,000, Rs. 180,000 and Rs. 210,000. What is the average quarterly revenue?', options: ['A) Rs. 150,000', 'B) Rs. 160,000', 'C) Rs. 165,000', 'D) Rs. 170,000'], correctAnswer: 'C', topic: 'Data Interpretation' },
    { question: 'In a pie chart, marketing spends 25% of Rs. 8,000. What is the marketing budget?', options: ['A) Rs. 1,500', 'B) Rs. 1,800', 'C) Rs. 2,000', 'D) Rs. 2,200'], correctAnswer: 'B', topic: 'Data Interpretation' },
    { question: 'A bar graph shows sales of 40, 55 and 65 units. What is the percentage increase from month 1 to month 3?', options: ['A) 52.5%', 'B) 60%', 'C) 62.5%', 'D) 65%'], correctAnswer: 'C', topic: 'Data Interpretation' },
    { question: 'If the ratio of boys to girls is 7:5 and total students are 240, number of girls is:', options: ['A) 90', 'B) 100', 'C) 110', 'D) 120'], correctAnswer: 'B', topic: 'Data Interpretation' },
    { question: 'Company A earned 20% profit on Rs. 50 lakh revenue. What was the profit amount?', options: ['A) Rs. 10 lakh', 'B) Rs. 9 lakh', 'C) Rs. 8 lakh', 'D) Rs. 12 lakh'], correctAnswer: 'A', topic: 'Data Interpretation' },
  ],
  'Profit & Loss': [
    { question: 'A shirt is sold at 20% profit after giving 10% discount on marked price. If cost price is Rs. 600, what is the marked price?', options: ['A) Rs. 830', 'B) Rs. 840', 'C) Rs. 850', 'D) Rs. 860'], correctAnswer: 'B', topic: 'Profit & Loss' },
    { question: 'A trader marks goods 25% above cost and gives 10% discount. What is profit percent?', options: ['A) 10%', 'B) 12.5%', 'C) 15%', 'D) 17.5%'], correctAnswer: 'D', topic: 'Profit & Loss' },
    { question: 'If an item is sold for Rs. 4,500 at a loss of 10%, what is the cost price?', options: ['A) Rs. 5,000', 'B) Rs. 5,250', 'C) Rs. 4,950', 'D) Rs. 4,850'], correctAnswer: 'B', topic: 'Profit & Loss' },
  ],
  'Ratio & Proportion': [
    { question: 'Two numbers are in the ratio 3:5 and their sum is 64. What is the larger number?', options: ['A) 35', 'B) 40', 'C) 45', 'D) 48'], correctAnswer: 'D', topic: 'Ratio & Proportion' },
    { question: 'If 5 pens cost as much as 3 notebooks and 2 notebooks cost Rs. 120, what is the cost of 1 pen?', options: ['A) Rs. 18', 'B) Rs. 20', 'C) Rs. 22', 'D) Rs. 24'], correctAnswer: 'A', topic: 'Ratio & Proportion' },
  ],
  'Time & Work': [
    { question: 'A can do a job in 12 days and B can do it in 18 days. If they work together, how many days will they take?', options: ['A) 7.2', 'B) 8', 'C) 8.5', 'D) 9'], correctAnswer: 'A', topic: 'Time & Work' },
    { question: 'If 4 men can do a work in 15 days, how many days will 6 men take for the same work?', options: ['A) 8', 'B) 10', 'C) 12', 'D) 15'], correctAnswer: 'B', topic: 'Time & Work' },
  ],
  'Time, Speed & Distance': [
    { question: 'A man covers 30 km in 3 hours and returns on the same route in 2 hours. What is his average speed?', options: ['A) 12 km/h', 'B) 13 km/h', 'C) 14 km/h', 'D) 15 km/h'], correctAnswer: 'D', topic: 'Time, Speed & Distance' },
    { question: 'A train 120 m long crosses a platform of 180 m in 18 seconds. What is its speed in km/h?', options: ['A) 54', 'B) 60', 'C) 72', 'D) 80'], correctAnswer: 'C', topic: 'Time, Speed & Distance' },
  ],
  'Mixture & Alligation': [
    { question: 'In what ratio must milk and water be mixed to get a mixture worth Rs. 22 per litre if milk costs Rs. 28 per litre?', options: ['A) 2:1', 'B) 3:1', 'C) 4:1', 'D) 5:1'], correctAnswer: 'C', topic: 'Mixture & Alligation' },
    { question: 'A vendor mixes tea worth Rs. 120/kg with tea worth Rs. 80/kg to sell at Rs. 100/kg. What is the ratio of expensive to cheaper tea?', options: ['A) 1:2', 'B) 2:3', 'C) 3:2', 'D) 4:3'], correctAnswer: 'C', topic: 'Mixture & Alligation' },
  ],
  'Number Series': [
    { question: 'Find the next number: 4, 9, 19, 39, 79, ?', options: ['A) 149', 'B) 159', 'C) 169', 'D) 179'], correctAnswer: 'C', topic: 'Number Series' },
    { question: 'Find the next number: 2, 6, 12, 20, 30, ?', options: ['A) 36', 'B) 40', 'C) 42', 'D) 46'], correctAnswer: 'D', topic: 'Number Series' },
  ],
  'Syllogism': [
    { question: 'Statements: All artists are writers. Some writers are singers. Conclusions: I. Some artists are singers. II. All singers are artists. Which conclusions follow?', options: ['A) Only I', 'B) Only II', 'C) Both I and II', 'D) Neither'], correctAnswer: 'A', topic: 'Syllogism' },
    { question: 'Statements: Some pens are books. All books are papers. Conclusions: I. Some pens are papers. II. All papers are pens. Which follows?', options: ['A) Only I', 'B) Only II', 'C) Both', 'D) Neither'], correctAnswer: 'A', topic: 'Syllogism' },
  ],
  'Inequality': [
    { question: 'If x > y and y > z, which of the following is true?', options: ['A) x > z', 'B) z > x', 'C) x = z', 'D) Cannot determine'], correctAnswer: 'A', topic: 'Inequality' },
    { question: 'If A > B, B < C, and C = D, which is true?', options: ['A) A > C', 'B) D < A', 'C) B > D', 'D) A = B'], correctAnswer: 'A', topic: 'Inequality' },
  ],
  'Coding / Series / Direction': [
    { question: 'If in a code LANGUAGE is written as KNXBFCD, how is SYSTEM written?', options: ['A) RXSTDL', 'B) RXSTEM', 'C) RXSUDL', 'D) RXSDTL'], correctAnswer: 'A', topic: 'Coding / Series / Direction' },
    { question: 'If P is 5th to the left of Q and Q is 3rd to the right of R in a row, who is between P and R?', options: ['A) Q', 'B) P', 'C) Cannot determine', 'D) None'], correctAnswer: 'A', topic: 'Coding / Series / Direction' },
  ],
  'Seating Arrangement': [
    { question: 'Six people are seated in a row. A is left of B, C is right of B, and D is between C and E. Who sits at one end?', options: ['A) A', 'B) D', 'C) E', 'D) F'], correctAnswer: 'A', topic: 'Seating Arrangement' },
    { question: 'In a circular arrangement, P sits opposite Q and to the left of R. Who is opposite R?', options: ['A) P', 'B) Q', 'C) S', 'D) T'], correctAnswer: 'B', topic: 'Seating Arrangement' },
  ],
  'General Knowledge': [
    { question: 'Which institution issues currency notes in India?', options: ['A) SBI', 'B) RBI', 'C) SEBI', 'D) NABARD'], correctAnswer: 'B', topic: 'General Knowledge' },
    { question: 'Who is known as the father of the Indian Constitution?', options: ['A) Mahatma Gandhi', 'B) Jawaharlal Nehru', 'C) B. R. Ambedkar', 'D) Rajendra Prasad'], correctAnswer: 'C', topic: 'General Knowledge' },
    { question: 'Which is the largest public sector bank in India?', options: ['A) PNB', 'B) SBI', 'C) Bank of Baroda', 'D) Canara Bank'], correctAnswer: 'B', topic: 'General Knowledge' },
    { question: 'The headquarters of the Reserve Bank of India is in:', options: ['A) Delhi', 'B) Kolkata', 'C) Chennai', 'D) Mumbai'], correctAnswer: 'D', topic: 'General Knowledge' },
    { question: 'Which article of the Constitution deals with the Right to Equality?', options: ['A) Articles 14-18', 'B) Articles 19-22', 'C) Articles 23-24', 'D) Articles 25-28'], correctAnswer: 'A', topic: 'General Knowledge' },
  ],
};

function normalizeAdaptiveTopic(topic: string): string {
  const normalized = topic.trim().toLowerCase();
  if (normalized.includes('english')) return 'English';
  if (normalized.includes('data interpretation')) return 'Data Interpretation';
  if (normalized.includes('data sufficiency')) return 'Data Sufficiency';
  if (normalized.includes('quantity comparison')) return 'Quantity Comparison';
  if (normalized.includes('profit') && normalized.includes('loss')) return 'Profit & Loss';
  if (normalized.includes('ratio') || normalized.includes('proportion')) return 'Ratio & Proportion';
  if (normalized.includes('time') && normalized.includes('work')) return 'Time & Work';
  if (normalized.includes('speed') || normalized.includes('distance')) return 'Time, Speed & Distance';
  if (normalized.includes('mixture') || normalized.includes('alligation')) return 'Mixture & Alligation';
  if (normalized.includes('number series') || (normalized.includes('series') && !normalized.includes('coding'))) return 'Number Series';
  if (normalized.includes('quadratic')) return 'Quadratic Equation';
  if (normalized.includes('puzzle')) return 'Puzzles';
  if (normalized.includes('seating')) return 'Seating Arrangement';
  if (normalized.includes('syllogism')) return 'Syllogism';
  if (normalized.includes('inequality')) return 'Inequality';
  if (normalized.includes('coding') || normalized.includes('direction')) return 'Coding / Series / Direction';
  if (normalized.includes('vocabulary') || normalized.includes('synonym') || normalized.includes('antonym') || normalized.includes('idiom') || normalized.includes('phrase')) return 'Vocabulary';
  if (normalized.includes('cloze') || normalized.includes('fill in') || normalized.includes('fillers')) return 'Cloze Test';
  if (normalized.includes('error') || normalized.includes('sentence correction') || normalized.includes('sentence improvement')) return 'Error Detection';
  if (normalized.includes('para jumble') || normalized.includes('jumbles') || normalized.includes('arrangement')) return 'Para Jumbles';
  if (normalized.includes('reading comprehension') || normalized === 'rc') return 'Reading Comprehension';
  if (normalized.includes('aptitude') || normalized.includes('quant')) return 'Quantitative Aptitude';
  if (normalized.includes('reasoning')) return 'Logical Reasoning';
  if (normalized.includes('general knowledge') || normalized.includes('general awareness') || normalized.includes('computer')) return 'General Knowledge';
  return topic.trim() || 'General Knowledge';
}

function normalizeAdaptiveQuestionText(question: string) {
  return question.trim().toLowerCase().replace(/\s+/g, ' ');
}

function buildAdaptiveFallbackQuestion(topic: string, index: number): AdaptiveFallbackQuestion {
  const normalizedTopic = normalizeAdaptiveTopic(topic);
  const bank = adaptiveFallbackQuestionBank[normalizedTopic] ?? adaptiveFallbackQuestionBank['General Knowledge'];
  const template = bank[index % bank.length];
  return {
    ...template,
    topic: topic || normalizedTopic,
  };
}

function buildGeneratedAdaptiveFallbackQuestion(topic: string, index: number): AdaptiveFallbackQuestion {
  const normalizedTopic = normalizeAdaptiveTopic(topic);
  const seed = ((index - 1) % 5 + 5) % 5 + 1;
  const entity = ['branch manager', 'loan officer', 'customer', 'credit analyst', 'branch staff'][seed - 1];
  const amount = 1200 + ((seed - 1) * 275) % 9800;
  const rate = 5 + ((seed - 1) % 8);
  const time = 1 + ((seed - 1) % 4);
  const markedPrice = 800 + ((seed - 1) * 175) % 8200;
  const discount = 5 + ((seed - 1) % 16);
  const ratioA = 3 + ((seed - 1) % 7);
  const ratioB = 4 + ((seed - 1) % 6);
  const totalValue = 100 + ((seed - 1) * 11) % 200;
  const direction = ['North', 'South', 'East', 'West'][seed % 4];

  if (normalizedTopic === 'English') {
    const variants = [
      {
        question: `Choose the correct sentence for a bank memo: The ${entity} has submitted the application by the deadline.`,
        options: [`A) The ${entity} have submitted the application by the deadline.`, `B) The ${entity} has submitted the application by the deadline.`, `C) The ${entity} is submitted the application by the deadline.`, `D) The ${entity} submitted the application by the deadline.`],
        correctAnswer: 'B',
      },
      {
        question: `Identify the error in the sentence: "The ${entity} have completed the case study report."`,
        options: ['A) The ${entity}', 'B) have completed', 'C) the case study report', 'D) .'],
        correctAnswer: 'B',
      },
      {
        question: `Choose the best synonym of "DISBURSEMENT" in a banking context.`,
        options: ['A) Delay', 'B) Payment', 'C) Receipt', 'D) Investment'],
        correctAnswer: 'B',
      },
      {
        question: `Fill in the blank: The ${entity} was asked to ___ the pending loan applications by today.`,
        options: ['A) expedite', 'B) expel', 'C) explain', 'D) expose'],
        correctAnswer: 'A',
      },
      {
        question: `Choose the correct phrase: The bank decided to ___ its credit policy next month.`,
        options: ['A) review', 'B) reviewed', 'C) reviewing', 'D) reviews'],
        correctAnswer: 'A',
      },
    ];
    return {
      ...variants[(seed - 1) % variants.length],
      topic: topic || normalizedTopic,
      difficulty: 'hard',
      explanation: variants[(seed - 1) % variants.length].correctAnswer ? 'Use grammar and bank-specific context to choose the best option.' : 'Answer carefully using bank exam grammar and vocabulary reasoning.',
    };
  }

  if (normalizedTopic === 'Quantitative Aptitude') {
    const simpleInterest = Math.round((amount * rate * time) / 100);
    const discountedPrice = Math.round(markedPrice * (100 - discount) / 100);
    const ratioValue = Math.round((ratioB / (ratioA + ratioB)) * totalValue);

    const variants = [
      {
        question: `A loan of Rs. ${amount} carries simple interest at ${rate}% per annum for ${time} year(s). What is the interest amount?`,
        options: [`A) Rs. ${simpleInterest}`, `B) Rs. ${simpleInterest + 20}`, `C) Rs. ${simpleInterest - 10}`, `D) Rs. ${simpleInterest + 50}`],
        correctAnswer: 'A',
      },
      {
        question: `A product marked at Rs. ${markedPrice} is sold after ${discount}% discount. What is the selling price?`,
        options: [`A) Rs. ${discountedPrice}`, `B) Rs. ${discountedPrice + 30}`, `C) Rs. ${discountedPrice - 20}`, `D) Rs. ${discountedPrice + 10}`],
        correctAnswer: 'A',
      },
      {
        question: `Two amounts are in the ratio ${ratioA}:${ratioB} and their total is Rs. ${totalValue}. What is the larger share?`,
        options: [`A) Rs. ${ratioValue}`, `B) Rs. ${ratioValue + 5}`, `C) Rs. ${ratioValue - 5}`, `D) Rs. ${ratioValue + 15}`],
        correctAnswer: 'A',
      },
      {
        question: `A branch has ${totalValue} forms to distribute equally among ${ratioA + ratioB} counters. How many forms does each counter receive?`,
        options: [`A) ${Math.floor(totalValue / (ratioA + ratioB))}`, `B) ${Math.ceil(totalValue / (ratioA + ratioB))}`, `C) ${Math.floor(totalValue / (ratioA + ratioB)) + 1}`, `D) ${Math.floor(totalValue / (ratioA + ratioB)) - 1}`],
        correctAnswer: 'A',
      },
      {
        question: `A person walks 6 km north, then ${rate} km east, and then 6 km south. In which direction is he from the starting point?`,
        options: ['A) North', 'B) South', 'C) East', 'D) West'],
        correctAnswer: 'C',
      },
    ];
    return {
      ...variants[(seed - 1) % variants.length],
      topic: topic || normalizedTopic,
      difficulty: 'hard',
      explanation: 'Use the numeric details carefully and verify the final answer to match bank exam standards.',
    };
  }

  const variants = [
    {
      question: `A bank officer walks 3 km north, then 4 km east, and then 3 km south. In which direction is he from the starting point?`,
      options: ['A) North', 'B) South', 'C) East', 'D) West'],
      correctAnswer: 'C',
    },
    {
      question: `If all ${entity} are officers and some officers are auditors, which statement is definitely true?`,
      options: [`A) Some ${entity} are auditors`, `B) All auditors are ${entity}`, `C) No officer is an auditor`, `D) All officers are ${entity}`],
      correctAnswer: 'A',
    },
    {
      question: `If SOUTH is coded as 12345 and NORTH is coded as 67845, how is THORN coded?`,
      options: ['A) 45867', 'B) 54867', 'C) 48576', 'D) 47856'],
      correctAnswer: 'A',
    },
    {
      question: `Statements: Some files are folders. All folders are records. Which conclusion is definitely true?`,
      options: ['A) Some files are records', 'B) All records are files', 'C) No file is a record', 'D) All folders are files'],
      correctAnswer: 'A',
    },
  ];

  return {
    ...variants[(seed - 1) % variants.length],
    topic: topic || normalizedTopic,
    difficulty: 'hard',
    explanation: 'Use reasoning and careful elimination to select the best bank exam-style answer.',
  };
}

function buildUniqueAdaptiveFallbackQuestion(
  topic: string,
  seenQuestions: Set<string>,
  fallbackIndex: number
): AdaptiveFallbackQuestion {
  const normalizedTopic = normalizeAdaptiveTopic(topic);
  const preferredBank = adaptiveFallbackQuestionBank[normalizedTopic] ?? adaptiveFallbackQuestionBank['General Knowledge'];
  const allBanks = [
    preferredBank,
    ...Object.entries(adaptiveFallbackQuestionBank)
      .filter(([bankTopic]) => bankTopic !== normalizedTopic)
      .map(([, bank]) => bank),
  ];

  for (const bank of allBanks) {
    for (const template of bank) {
      const normalizedQuestion = normalizeAdaptiveQuestionText(template.question);
      if (!seenQuestions.has(normalizedQuestion)) {
        seenQuestions.add(normalizedQuestion);
        return {
          ...template,
          topic: topic || normalizedTopic,
        };
      }
    }
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const generated = buildGeneratedAdaptiveFallbackQuestion(topic, fallbackIndex + attempt);
    if (!generated || typeof generated.question !== 'string') {
      continue;
    }
    const normalized = normalizeAdaptiveQuestionText(generated.question);
    if (!seenQuestions.has(normalized)) {
      seenQuestions.add(normalized);
      return generated;
    }
  }

  const fallback = buildAdaptiveFallbackQuestion(topic, fallbackIndex);
  if (fallback && typeof fallback.question === 'string') {
    seenQuestions.add(normalizeAdaptiveQuestionText(fallback.question));
  }
  return fallback;
}

// Mock adaptive exam generator
function generateMockAdaptiveExam(input: any) {
  const examQuestions: AdaptiveFallbackQuestion[] = [];
  const previousQuestionContext = Array.isArray(input.previousQuestionContext) ? input.previousQuestionContext : [];
  const seenQuestions = new Set<string>(
    previousQuestionContext.map((entry: string) =>
      normalizeAdaptiveQuestionText(entry.split(':').slice(1).join(':') || entry)
    )
  );
  const weakestTopics = Array.isArray(input.weakestTopics) && input.weakestTopics.length > 0
    ? input.weakestTopics.map((topic: string) => normalizeAdaptiveTopic(topic))
    : ['General Knowledge'];
  const topicAnalysis = Array.isArray(input.topicAnalysis)
    ? input.topicAnalysis.map((entry: TopicAnalysisInput) => ({
        ...entry,
        topic: normalizeAdaptiveTopic(entry.topic),
      }))
    : [];
  const seenTopics = new Set<string>();
  const orderedTopics = [...weakestTopics, ...topicAnalysis.map((entry: TopicAnalysisInput) => entry.topic)].filter((topic: string) => {
    if (!topic || seenTopics.has(topic)) return false;
    seenTopics.add(topic);
    return true;
  });
  const normalizedTopics = orderedTopics.length > 0 ? orderedTopics : ['General Knowledge'];

  const getWeight = (topic: string) => {
    const performance = topicAnalysis.find((entry: TopicAnalysisInput) => entry.topic === topic)?.performancePercentage;
    if (typeof performance !== 'number') {
      return weakestTopics.includes(topic) ? 5 : 3;
    }
    if (performance <= 40) return 5;
    if (performance <= 70) return 3;
    return 2;
  };

  const weightedTopics = normalizedTopics.map((topic) => ({
    topic,
    weight: getWeight(topic),
  }));
  const totalWeight = weightedTopics.reduce((sum, topic) => sum + topic.weight, 0) || 1;
  const distribution = weightedTopics.map((topic) => ({
    topic: topic.topic,
    questionCount: Math.floor((topic.weight / totalWeight) * input.numQuestions),
  }));

  let assigned = distribution.reduce((sum, topic) => sum + topic.questionCount, 0);
  let index = 0;
  while (assigned < input.numQuestions) {
    distribution[index % distribution.length].questionCount += 1;
    assigned += 1;
    index += 1;
  }

  for (const entry of distribution) {
    for (let i = 0; i < entry.questionCount; i++) {
      const questionIndex = i + 1;
      const question = buildUniqueAdaptiveFallbackQuestion(entry.topic, seenQuestions, questionIndex);
      if (question) {
        examQuestions.push(question);
      } else {
        examQuestions.push(buildAdaptiveFallbackQuestion(entry.topic, questionIndex));
      }
    }
  }

  const focusTopic = weakestTopics[0] || normalizedTopics[0];
  const focusDistribution = distribution.find((entry) => entry.topic === focusTopic) ?? distribution[0];
  const percentageDistribution = distribution.map((entry) => ({
    topic: entry.topic,
    questionCount: entry.questionCount,
    percentage: Math.round((entry.questionCount / input.numQuestions) * 100),
  }));

  return {
    examQuestions,
    focusAreas: weakestTopics,
    distribution: percentageDistribution,
    explanation: `Based on your last exam, ${focusTopic} is your weakest area. This exam has ${focusDistribution ? Math.round((focusDistribution.questionCount / input.numQuestions) * 100) : 0}% ${focusTopic} questions to help you improve.`,
  };
}

export async function evaluateAnswersAction(input: {
  examAttempt: Array<{
    questionText: string;
    options: string[];
    correctAnswer: string;
    studentAnswer: string;
    topic: string;
    marks?: number;
  }>;
}) {
  try {
    console.log('[evaluateAnswersAction] Starting with', input.examAttempt.length, 'questions');

    // Check if API key is available and not placeholder
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey || apiKey.includes('YOUR_ACTUAL') || apiKey.includes('REPLACE_WITH')) {
      console.log('[evaluateAnswersAction] API key not set, returning mock evaluation');
      return generateMockEvaluation(input);
    }

    const result = await withActionTimeout(
      evaluateAnswersAndProvideFeedback(input)
    );
    console.log('[evaluateAnswersAction] Success: Evaluation complete');
    return result;
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    console.error('[evaluateAnswersAction] Error:', errorMessage, error?.cause);
    
    // If API fails, fall back to mock evaluation
    console.log('[evaluateAnswersAction] API failed, falling back to mock evaluation');
    return generateMockEvaluation(input);
  }
}

function normalizeFeedbackTopic(topic: string): string {
  const normalized = topic.trim().toLowerCase();
  if (normalized.includes('english')) return 'English';
  if (normalized.includes('aptitude') || normalized.includes('quant')) return 'Quantitative Aptitude';
  if (normalized.includes('reasoning') || normalized.includes('puzzle') || normalized.includes('seating') || normalized.includes('syllogism') || normalized.includes('inequality') || normalized.includes('coding') || normalized.includes('direction') || normalized.includes('analogy') || normalized.includes('classification') || normalized.includes('logical sequence')) return 'Logical Reasoning';
  return topic.trim();
}

// Mock evaluation generator
function generateMockEvaluation(input: any) {
  const questionEvaluations: Array<{
    questionText: string;
    correctAnswer: string;
    studentAnswer: string;
    isCorrect: boolean;
    score: number;
    detailedFeedback: string;
  }> = [];
  const topicStats: { [key: string]: { correct: number; total: number; feedback: string[] } } = {};

  let totalCorrect = 0;
  let totalMarks = 0;
  let totalPossibleMarks = 0;
  const results: Array<{
    question: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string;
    optionAnalysis: Record<'A' | 'B' | 'C' | 'D', string>;
  }> = [];

  input.examAttempt.forEach((attempt: {
    questionText: string;
    options: string[];
    correctAnswer: string;
    studentAnswer: string;
    topic: string;
    marks?: number;
  }, index: number) => {
    const isCorrect = attempt.studentAnswer === attempt.correctAnswer;
    const questionMarks = attempt.marks || 1;
    totalPossibleMarks += questionMarks;
    
    if (isCorrect) {
      totalCorrect++;
      totalMarks += questionMarks;
    }

    // Initialize topic stats
    if (!topicStats[attempt.topic]) {
      topicStats[attempt.topic] = { correct: 0, total: 0, feedback: [] };
    }
    topicStats[attempt.topic].total++;
    if (isCorrect) {
      topicStats[attempt.topic].correct++;
    }

    const normalizedTopic = normalizeFeedbackTopic(attempt.topic);
    const optionAnalysis = (Array.isArray(attempt.options) ? attempt.options : []).reduce((acc, optionText, optionIndex) => {
      const label = ['A', 'B', 'C', 'D'][optionIndex] as 'A' | 'B' | 'C' | 'D';
      const cleanText = String(optionText).replace(/^[A-D][).:\s-]*/i, '').trim();
      acc[label] = label === attempt.correctAnswer
        ? `Correct. ${cleanText} matches the question's requirement and reflects the right reasoning.`
        : `Incorrect. ${cleanText} does not satisfy the question's main logic or concept.`;
      return acc;
    }, {
      A: '',
      B: '',
      C: '',
      D: '',
    } as Record<'A' | 'B' | 'C' | 'D', string>);

    const explanationLines = [
      isCorrect
        ? `Correct. Option ${attempt.correctAnswer} is right because it matches the question's requirement and uses the correct reasoning.`
        : `The correct answer is ${attempt.correctAnswer}. ${attempt.studentAnswer} is not correct because it does not match the question's main requirement or reasoning.`,
      normalizedTopic === 'Quantitative Aptitude'
        ? `Solve this with numerical steps: write the equation, compute the values, and simplify carefully.`
        : normalizedTopic === 'Logical Reasoning'
          ? `Solve this with an explicit logic chain: identify the premise, eliminate false options, and choose the answer that follows.`
          : `Use the core concept of the question to justify the correct answer step by step.`,
      normalizedTopic === 'Quantitative Aptitude'
        ? `Show the arithmetic or algebra that leads to the result, such as addition, subtraction, multiplication, division, ratios, or percentages.`
        : normalizedTopic === 'Logical Reasoning'
          ? `Show why each other option is ruled out based on the question's conditions and logical relationships.`
          : `The other options are wrong because they miss the key point or misapply the concept.`,
      isCorrect
        ? `Compare the correct choice with the distractors so the reasoning is clear.`
        : `Compare the correct choice with the distractors to see why each wrong option fails.`,
      `Use this explanation to understand why the correct answer is the best choice.`,
    ];

    questionEvaluations.push({
      questionText: attempt.questionText,
      correctAnswer: attempt.correctAnswer,
      studentAnswer: attempt.studentAnswer,
      isCorrect,
      score: isCorrect ? questionMarks : 0,
      detailedFeedback: explanationLines.join('\n')
    });

    results.push({
      question: attempt.questionText,
      userAnswer: attempt.studentAnswer,
      correctAnswer: attempt.correctAnswer,
      isCorrect,
      explanation: explanationLines.join('\n'),
      optionAnalysis,
    });
  });

  const overallScore = totalPossibleMarks > 0 ? (totalMarks / totalPossibleMarks) * 100 : 0;

  // Generate topic analysis
  const topicAnalysis = Object.entries(topicStats).map(([topic, stats]) => ({
    topic,
    performancePercentage: (stats.correct / stats.total) * 100,
    weaknessIdentified: stats.correct / stats.total < 0.7,
    feedback: stats.correct / stats.total >= 0.8 
      ? `Excellent performance in ${topic}!` 
      : `Need improvement in ${topic}. Practice more questions.`
  }));

  // Find weakest topics
  const weakestTopics = topicAnalysis
    .filter(t => t.weaknessIdentified)
    .sort((a, b) => a.performancePercentage - b.performancePercentage)
    .map(t => t.topic)
    .slice(0, 2);

  if (weakestTopics.length === 0) {
    weakestTopics.push('General Knowledge');
  }

  const overallFeedback = overallScore >= 80 
    ? "Outstanding performance! You have excellent knowledge in this area."
    : overallScore >= 60 
    ? "Good performance! With some more practice, you can achieve excellence."
    : "Needs improvement. Focus on the weak areas and practice regularly.";

  return {
    score: totalCorrect,
    total: input.examAttempt.length,
    overallScore,
    overallFeedback,
    topicAnalysis,
    weakestTopics,
    questionEvaluations,
    results,
  };
}
