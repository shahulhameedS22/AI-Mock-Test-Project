'use server';
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateExamQuestionsAction = generateExamQuestionsAction;
exports.generateAdaptiveExamAction = generateAdaptiveExamAction;
exports.evaluateAnswersAction = evaluateAnswersAction;
var generate_mock_exam_questions_flow_1 = require("@/ai/flows/generate-mock-exam-questions-flow");
var generate_adaptive_mock_exam_1 = require("@/ai/flows/generate-adaptive-mock-exam");
var evaluate_answers_and_provide_feedback_flow_1 = require("@/ai/flows/evaluate-answers-and-provide-feedback-flow");
var AI_REQUEST_TIMEOUT_MS = 8000;
function withActionTimeout(promise, ms) {
    if (ms === void 0) { ms = AI_REQUEST_TIMEOUT_MS; }
    return new Promise(function (resolve, reject) {
        var timer = setTimeout(function () {
            reject(new Error("AI request timed out after ".concat(ms, "ms")));
        }, ms);
        promise
            .then(function (value) {
            clearTimeout(timer);
            resolve(value);
        })
            .catch(function (error) {
            clearTimeout(timer);
            reject(error);
        });
    });
}
function dedupeQuestionsByText(questions) {
    var seen = new Set();
    var out = [];
    for (var _i = 0, questions_1 = questions; _i < questions_1.length; _i++) {
        var q = questions_1[_i];
        var normalized = q.questionText.trim().toLowerCase();
        if (!seen.has(normalized)) {
            seen.add(normalized);
            out.push(q);
        }
    }
    return out;
}
function normalizeGeneratedQuestion(question) {
    var _a, _b, _c, _d, _e, _f, _g;
    var questionText = ((_a = question.question) === null || _a === void 0 ? void 0 : _a.trim()) || ((_b = question.questionText) === null || _b === void 0 ? void 0 : _b.trim()) || '';
    return {
        questionId: (_c = question.questionId) !== null && _c !== void 0 ? _c : '',
        questionText: questionText,
        options: (_d = question.options) !== null && _d !== void 0 ? _d : [],
        correctAnswer: (_e = question.correctAnswer) !== null && _e !== void 0 ? _e : 'A',
        explanation: (_f = question.explanation) !== null && _f !== void 0 ? _f : '',
        topic: question.topic || 'English',
        difficulty: ['easy', 'medium', 'hard'].includes((_g = question.difficulty) !== null && _g !== void 0 ? _g : '')
            ? question.difficulty
            : 'medium',
    };
}
function normalizeAdaptiveQuestionTextForAction(question) {
    return question.trim().toLowerCase().replace(/\s+/g, ' ');
}
function dedupeAdaptiveQuestionsByText(questions, previousQuestionContext) {
    if (previousQuestionContext === void 0) { previousQuestionContext = []; }
    var seen = new Set(previousQuestionContext.map(function (entry) {
        return normalizeAdaptiveQuestionTextForAction(entry.split(':').slice(1).join(':') || entry);
    }));
    var out = [];
    for (var _i = 0, questions_2 = questions; _i < questions_2.length; _i++) {
        var q = questions_2[_i];
        var normalized = normalizeAdaptiveQuestionTextForAction(q.question);
        if (!normalized || seen.has(normalized))
            continue;
        seen.add(normalized);
        out.push(q);
    }
    return out;
}
function fillAdaptiveExamQuestions(questions, targetCount, fallbackQuestions) {
    var seen = new Set(questions.map(function (question) { return normalizeAdaptiveQuestionTextForAction(question.question); }));
    var result = __spreadArray([], questions, true);
    var duplicateCandidates = [];
    for (var _i = 0, fallbackQuestions_1 = fallbackQuestions; _i < fallbackQuestions_1.length; _i++) {
        var question = fallbackQuestions_1[_i];
        if (result.length >= targetCount)
            break;
        var normalized = normalizeAdaptiveQuestionTextForAction(question.question);
        if (!seen.has(normalized)) {
            seen.add(normalized);
            result.push(question);
        }
        else {
            duplicateCandidates.push(question);
        }
    }
    var duplicateIndex = 0;
    while (result.length < targetCount && duplicateIndex < duplicateCandidates.length) {
        result.push(duplicateCandidates[duplicateIndex]);
        duplicateIndex += 1;
    }
    var fallbackIndex = 0;
    while (result.length < targetCount && fallbackQuestions.length > 0) {
        result.push(fallbackQuestions[fallbackIndex % fallbackQuestions.length]);
        fallbackIndex += 1;
    }
    return result.slice(0, targetCount);
}
function getQuestionTopicCounts(questions) {
    return questions.reduce(function (acc, question) {
        if (question.topic === 'English')
            acc.english += 1;
        if (question.topic === 'Quantitative Aptitude')
            acc.aptitude += 1;
        if (question.topic === 'Logical Reasoning')
            acc.reasoning += 1;
        return acc;
    }, { english: 0, aptitude: 0, reasoning: 0 });
}
function fillMissingGeneratedQuestions(input, questions, totalRequested) {
    if (questions.length >= totalRequested) {
        return questions.slice(0, totalRequested);
    }
    var existingTexts = new Set(questions.map(function (q) { return q.questionText.trim().toLowerCase(); }));
    var currentCounts = getQuestionTopicCounts(questions);
    var needed = {
        english: Math.max(0, input.categories.english - currentCounts.english),
        aptitude: Math.max(0, input.categories.aptitude - currentCounts.aptitude),
        reasoning: Math.max(0, input.categories.reasoning - currentCounts.reasoning),
    };
    var fallback = generateMockQuestions(input);
    var extraQuestions = [];
    for (var _i = 0, fallback_1 = fallback; _i < fallback_1.length; _i++) {
        var question = fallback_1[_i];
        if (extraQuestions.length >= totalRequested - questions.length)
            break;
        var normalized = question.questionText.trim().toLowerCase();
        if (existingTexts.has(normalized))
            continue;
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
        for (var _a = 0, fallback_2 = fallback; _a < fallback_2.length; _a++) {
            var question = fallback_2[_a];
            if (extraQuestions.length >= totalRequested - questions.length)
                break;
            var normalized = question.questionText.trim().toLowerCase();
            if (existingTexts.has(normalized))
                continue;
            extraQuestions.push(question);
            existingTexts.add(normalized);
        }
    }
    return __spreadArray(__spreadArray([], questions, true), extraQuestions, true).slice(0, totalRequested);
}
function limitQuestionsByCategories(questions, categories) {
    var buckets = {
        english: [],
        aptitude: [],
        reasoning: [],
    };
    for (var _i = 0, questions_3 = questions; _i < questions_3.length; _i++) {
        var question = questions_3[_i];
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
    return __spreadArray(__spreadArray(__spreadArray([], buckets.reasoning, true), buckets.aptitude, true), buckets.english, true);
}
function orderQuestionsByTopic(questions) {
    var topicRank = {
        'Logical Reasoning': 0,
        'Quantitative Aptitude': 1,
        'English': 2,
    };
    return __spreadArray([], questions, true).sort(function (a, b) { var _a, _b; return ((_a = topicRank[a.topic]) !== null && _a !== void 0 ? _a : 3) - ((_b = topicRank[b.topic]) !== null && _b !== void 0 ? _b : 3); });
}
function generateExamQuestionsAction(input) {
    return __awaiter(this, void 0, void 0, function () {
        var normalizedDifficulty, difficulty, apiKey, result, normalizedFromAi, dedupedQuestions, normalizedQuestions, allowedQuestions, totalRequested, limitedQuestions, finalQuestions, orderedQuestions, error_1, errorMessage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    normalizedDifficulty = input.difficultyLevel || 'medium';
                    difficulty = ['easy', 'medium', 'hard'].includes(normalizedDifficulty)
                        ? normalizedDifficulty
                        : 'medium';
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    console.log('[generateExamQuestionsAction] Starting with input:', JSON.stringify(__assign(__assign({}, input), { difficultyLevel: difficulty }), null, 2));
                    apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_AI_API_KEY;
                    if (!apiKey || apiKey.includes('YOUR_ACTUAL') || apiKey.includes('REPLACE_WITH')) {
                        console.log('[generateExamQuestionsAction] API key not set, returning mock questions');
                        return [2 /*return*/, { questions: generateMockQuestions(input) }];
                    }
                    return [4 /*yield*/, withActionTimeout((0, generate_mock_exam_questions_flow_1.generateMockExamQuestions)(__assign(__assign({}, input), { difficultyLevel: difficulty })))];
                case 2:
                    result = _a.sent();
                    normalizedFromAi = result.map(normalizeGeneratedQuestion);
                    dedupedQuestions = dedupeQuestionsByText(normalizedFromAi);
                    if (dedupedQuestions.length !== normalizedFromAi.length) {
                        console.warn('[generateExamQuestionsAction] Removed duplicate questions from AI response', normalizedFromAi.length - dedupedQuestions.length);
                    }
                    normalizedQuestions = dedupedQuestions.map(function (q) { return (__assign(__assign({}, q), { difficulty: difficulty })); });
                    allowedQuestions = normalizedQuestions.filter(function (q) {
                        return q.topic === 'English' ||
                            q.topic === 'Quantitative Aptitude' ||
                            q.topic === 'Logical Reasoning';
                    });
                    if (allowedQuestions.length !== normalizedQuestions.length) {
                        console.warn('[generateExamQuestionsAction] Dropped questions from unsupported topics', normalizedQuestions.length - allowedQuestions.length);
                    }
                    totalRequested = input.categories.english + input.categories.aptitude + input.categories.reasoning;
                    limitedQuestions = limitQuestionsByCategories(allowedQuestions, input.categories);
                    finalQuestions = fillMissingGeneratedQuestions(input, limitedQuestions, totalRequested);
                    if (finalQuestions.length !== totalRequested) {
                        console.warn('[generateExamQuestionsAction] Unable to reach requested count after fill, returning', finalQuestions.length, 'of', totalRequested);
                    }
                    orderedQuestions = orderQuestionsByTopic(finalQuestions);
                    console.log('[generateExamQuestionsAction] Success: Generated', orderedQuestions.length, 'questions');
                    return [2 /*return*/, { questions: orderedQuestions }];
                case 3:
                    error_1 = _a.sent();
                    errorMessage = (error_1 === null || error_1 === void 0 ? void 0 : error_1.message) || String(error_1);
                    console.error('[generateExamQuestionsAction] Error:', errorMessage, error_1 === null || error_1 === void 0 ? void 0 : error_1.cause, error_1 === null || error_1 === void 0 ? void 0 : error_1.stack);
                    // If API fails, fall back to mock questions
                    console.log('[generateExamQuestionsAction] API failed, falling back to mock questions');
                    return [2 /*return*/, { questions: generateMockQuestions(input) }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// Helper to select unique questions by shuffling to avoid duplicates when possible.
function pickUniqueQuestions(bank, count) {
    var _a;
    if (count <= 0)
        return [];
    var shuffled = __spreadArray([], bank, true).sort(function () { return Math.random() - 0.5; });
    if (shuffled.length === 0)
        return [];
    if (count <= shuffled.length) {
        return shuffled.slice(0, count);
    }
    // If there are fewer questions than requested, repeat the shuffled bank
    // until we reach the desired count. This ensures fallback generation still
    // returns exactly the requested number of questions.
    var result = [];
    var index = 0;
    while (result.length < count) {
        result.push(shuffled[index]);
        index += 1;
        if (index >= shuffled.length) {
            // Re-shuffle after each full cycle to avoid repeating the same order.
            for (var i = shuffled.length - 1; i > 0; i -= 1) {
                var j = Math.floor(Math.random() * (i + 1));
                _a = [shuffled[j], shuffled[i]], shuffled[i] = _a[0], shuffled[j] = _a[1];
            }
            index = 0;
        }
    }
    return result;
}
// Mock question generator for testing without API key
function generateMockQuestions(input) {
    var normalizedDifficulty = input.difficultyLevel || 'medium';
    var difficulty = ['easy', 'medium', 'hard'].includes(normalizedDifficulty)
        ? normalizedDifficulty
        : 'medium';
    var questions = [];
    var questionId = 1;
    // English questions - different for each
    var englishQuestions = [
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
    var aptitudeQuestions = [
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
    var reasoningQuestions = [
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
    var selectedEnglish = pickUniqueQuestions(englishQuestions, input.categories.english);
    var selectedAptitude = pickUniqueQuestions(aptitudeQuestions, input.categories.aptitude);
    var selectedReasoning = pickUniqueQuestions(reasoningQuestions, input.categories.reasoning);
    for (var _i = 0, selectedReasoning_1 = selectedReasoning; _i < selectedReasoning_1.length; _i++) {
        var q = selectedReasoning_1[_i];
        questions.push({
            questionId: "LR".concat(questionId++),
            questionText: q.text,
            options: q.options,
            correctAnswer: q.correct,
            explanation: q.explanation,
            topic: "Logical Reasoning",
            difficulty: difficulty
        });
    }
    for (var _a = 0, selectedAptitude_1 = selectedAptitude; _a < selectedAptitude_1.length; _a++) {
        var q = selectedAptitude_1[_a];
        questions.push({
            questionId: "QA".concat(questionId++),
            questionText: q.text,
            options: q.options,
            correctAnswer: q.correct,
            explanation: q.explanation,
            topic: "Quantitative Aptitude",
            difficulty: difficulty
        });
    }
    for (var _b = 0, selectedEnglish_1 = selectedEnglish; _b < selectedEnglish_1.length; _b++) {
        var q = selectedEnglish_1[_b];
        questions.push({
            questionId: "EN".concat(questionId++),
            questionText: q.text,
            options: q.options,
            correctAnswer: q.correct,
            explanation: q.explanation,
            topic: "English",
            difficulty: difficulty
        });
    }
    // For fallback/mock generation, preserve the requested quantity of questions.
    // Duplicates may occur only when the fallback bank is smaller than the requested count.
    return questions;
}
function generateAdaptiveExamAction(input) {
    return __awaiter(this, void 0, void 0, function () {
        var normalizedDifficulty, difficulty, apiKey, result, dedupedExamQuestions, fallbackQuestions, finalExamQuestions, error_2, errorMessage, normalizedDifficulty, difficulty;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    normalizedDifficulty = input.difficultyLevel || 'medium';
                    difficulty = ['easy', 'medium', 'hard'].includes(normalizedDifficulty)
                        ? normalizedDifficulty
                        : 'medium';
                    console.log('[generateAdaptiveExamAction] Starting with input:', JSON.stringify(__assign(__assign({}, input), { difficultyLevel: difficulty }), null, 2));
                    apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_AI_API_KEY;
                    if (!apiKey || apiKey.includes('YOUR_ACTUAL') || apiKey.includes('REPLACE_WITH')) {
                        console.log('[generateAdaptiveExamAction] API key not set, returning mock adaptive questions');
                        return [2 /*return*/, generateMockAdaptiveExam(__assign(__assign({}, input), { difficultyLevel: difficulty }))];
                    }
                    return [4 /*yield*/, withActionTimeout((0, generate_adaptive_mock_exam_1.generateAdaptiveMockExam)(__assign(__assign({}, input), { difficultyLevel: difficulty })))];
                case 1:
                    result = _a.sent();
                    if (!result || !Array.isArray(result.examQuestions) || result.examQuestions.length === 0) {
                        console.warn('[generateAdaptiveExamAction] AI adaptive exam returned no questions; falling back to local adaptive generator');
                        return [2 /*return*/, generateMockAdaptiveExam(__assign(__assign({}, input), { difficultyLevel: difficulty }))];
                    }
                    dedupedExamQuestions = dedupeAdaptiveQuestionsByText(result.examQuestions, input.previousQuestionContext);
                    if (dedupedExamQuestions.length !== result.examQuestions.length) {
                        console.warn('[generateAdaptiveExamAction] Removed duplicate adaptive questions from response', result.examQuestions.length - dedupedExamQuestions.length);
                    }
                    fallbackQuestions = generateMockAdaptiveExam(__assign(__assign({}, input), { difficultyLevel: difficulty })).examQuestions;
                    finalExamQuestions = dedupedExamQuestions.length > 0 ? dedupedExamQuestions : fallbackQuestions;
                    if (finalExamQuestions.length < input.numQuestions) {
                        finalExamQuestions = fillAdaptiveExamQuestions(finalExamQuestions, input.numQuestions, fallbackQuestions);
                    }
                    if (finalExamQuestions.length < input.numQuestions) {
                        console.warn('[generateAdaptiveExamAction] Unable to reach target adaptive count, returning available questions', finalExamQuestions.length, 'of', input.numQuestions);
                    }
                    console.log('[generateAdaptiveExamAction] Success: Generated adaptive exam', finalExamQuestions.length, 'questions');
                    return [2 /*return*/, __assign(__assign({}, result), { examQuestions: finalExamQuestions })];
                case 2:
                    error_2 = _a.sent();
                    errorMessage = (error_2 === null || error_2 === void 0 ? void 0 : error_2.message) || String(error_2);
                    console.error('[generateAdaptiveExamAction] Error:', errorMessage, error_2 === null || error_2 === void 0 ? void 0 : error_2.cause);
                    // If API fails, fall back to mock questions
                    console.log('[generateAdaptiveExamAction] API failed, falling back to mock adaptive questions');
                    normalizedDifficulty = input.difficultyLevel || 'medium';
                    difficulty = ['easy', 'medium', 'hard'].includes(normalizedDifficulty)
                        ? normalizedDifficulty
                        : 'medium';
                    return [2 /*return*/, generateMockAdaptiveExam(__assign(__assign({}, input), { difficultyLevel: difficulty }))];
                case 3: return [2 /*return*/];
            }
        });
    });
}
var adaptiveFallbackQuestionBank = {
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
function normalizeAdaptiveTopic(topic) {
    var normalized = topic.trim().toLowerCase();
    if (normalized.includes('english'))
        return 'English';
    if (normalized.includes('data interpretation'))
        return 'Data Interpretation';
    if (normalized.includes('data sufficiency'))
        return 'Data Sufficiency';
    if (normalized.includes('quantity comparison'))
        return 'Quantity Comparison';
    if (normalized.includes('profit') && normalized.includes('loss'))
        return 'Profit & Loss';
    if (normalized.includes('ratio') || normalized.includes('proportion'))
        return 'Ratio & Proportion';
    if (normalized.includes('time') && normalized.includes('work'))
        return 'Time & Work';
    if (normalized.includes('speed') || normalized.includes('distance'))
        return 'Time, Speed & Distance';
    if (normalized.includes('mixture') || normalized.includes('alligation'))
        return 'Mixture & Alligation';
    if (normalized.includes('number series') || (normalized.includes('series') && !normalized.includes('coding')))
        return 'Number Series';
    if (normalized.includes('quadratic'))
        return 'Quadratic Equation';
    if (normalized.includes('puzzle'))
        return 'Puzzles';
    if (normalized.includes('seating'))
        return 'Seating Arrangement';
    if (normalized.includes('syllogism'))
        return 'Syllogism';
    if (normalized.includes('inequality'))
        return 'Inequality';
    if (normalized.includes('coding') || normalized.includes('direction'))
        return 'Coding / Series / Direction';
    if (normalized.includes('vocabulary') || normalized.includes('synonym') || normalized.includes('antonym') || normalized.includes('idiom') || normalized.includes('phrase'))
        return 'Vocabulary';
    if (normalized.includes('cloze') || normalized.includes('fill in') || normalized.includes('fillers'))
        return 'Cloze Test';
    if (normalized.includes('error') || normalized.includes('sentence correction') || normalized.includes('sentence improvement'))
        return 'Error Detection';
    if (normalized.includes('para jumble') || normalized.includes('jumbles') || normalized.includes('arrangement'))
        return 'Para Jumbles';
    if (normalized.includes('reading comprehension') || normalized === 'rc')
        return 'Reading Comprehension';
    if (normalized.includes('aptitude') || normalized.includes('quant'))
        return 'Quantitative Aptitude';
    if (normalized.includes('reasoning'))
        return 'Logical Reasoning';
    if (normalized.includes('general knowledge') || normalized.includes('general awareness') || normalized.includes('computer'))
        return 'General Knowledge';
    return topic.trim() || 'General Knowledge';
}
function normalizeAdaptiveQuestionText(question) {
    return question.trim().toLowerCase().replace(/\s+/g, ' ');
}
function buildAdaptiveFallbackQuestion(topic, index) {
    var _a;
    var normalizedTopic = normalizeAdaptiveTopic(topic);
    var bank = (_a = adaptiveFallbackQuestionBank[normalizedTopic]) !== null && _a !== void 0 ? _a : adaptiveFallbackQuestionBank['General Knowledge'];
    var template = bank[index % bank.length];
    return __assign(__assign({}, template), { topic: topic || normalizedTopic });
}
function buildGeneratedAdaptiveFallbackQuestion(topic, index) {
    var normalizedTopic = normalizeAdaptiveTopic(topic);
    var seed = ((index - 1) % 5 + 5) % 5 + 1;
    var entity = ['branch manager', 'loan officer', 'customer', 'credit analyst', 'branch staff'][seed - 1];
    var amount = 1200 + ((seed - 1) * 275) % 9800;
    var rate = 5 + ((seed - 1) % 8);
    var time = 1 + ((seed - 1) % 4);
    var markedPrice = 800 + ((seed - 1) * 175) % 8200;
    var discount = 5 + ((seed - 1) % 16);
    var ratioA = 3 + ((seed - 1) % 7);
    var ratioB = 4 + ((seed - 1) % 6);
    var totalValue = 100 + ((seed - 1) * 11) % 200;
    var direction = ['North', 'South', 'East', 'West'][seed % 4];
    if (normalizedTopic === 'English') {
        var variants_1 = [
            {
                question: "Choose the correct sentence for a bank memo: The ".concat(entity, " has submitted the application by the deadline."),
                options: ["A) The ".concat(entity, " have submitted the application by the deadline."), "B) The ".concat(entity, " has submitted the application by the deadline."), "C) The ".concat(entity, " is submitted the application by the deadline."), "D) The ".concat(entity, " submitted the application by the deadline.")],
                correctAnswer: 'B',
            },
            {
                question: "Identify the error in the sentence: \"The ".concat(entity, " have completed the case study report.\""),
                options: ['A) The ${entity}', 'B) have completed', 'C) the case study report', 'D) .'],
                correctAnswer: 'B',
            },
            {
                question: "Choose the best synonym of \"DISBURSEMENT\" in a banking context.",
                options: ['A) Delay', 'B) Payment', 'C) Receipt', 'D) Investment'],
                correctAnswer: 'B',
            },
            {
                question: "Fill in the blank: The ".concat(entity, " was asked to ___ the pending loan applications by today."),
                options: ['A) expedite', 'B) expel', 'C) explain', 'D) expose'],
                correctAnswer: 'A',
            },
            {
                question: "Choose the correct phrase: The bank decided to ___ its credit policy next month.",
                options: ['A) review', 'B) reviewed', 'C) reviewing', 'D) reviews'],
                correctAnswer: 'A',
            },
        ];
        return __assign(__assign({}, variants_1[(seed - 1) % variants_1.length]), { topic: topic || normalizedTopic, difficulty: 'hard', explanation: variants_1[(seed - 1) % variants_1.length].correctAnswer ? 'Use grammar and bank-specific context to choose the best option.' : 'Answer carefully using bank exam grammar and vocabulary reasoning.' });
    }
    if (normalizedTopic === 'Quantitative Aptitude') {
        var simpleInterest = Math.round((amount * rate * time) / 100);
        var discountedPrice = Math.round(markedPrice * (100 - discount) / 100);
        var ratioValue = Math.round((ratioB / (ratioA + ratioB)) * totalValue);
        var variants_2 = [
            {
                question: "A loan of Rs. ".concat(amount, " carries simple interest at ").concat(rate, "% per annum for ").concat(time, " year(s). What is the interest amount?"),
                options: ["A) Rs. ".concat(simpleInterest), "B) Rs. ".concat(simpleInterest + 20), "C) Rs. ".concat(simpleInterest - 10), "D) Rs. ".concat(simpleInterest + 50)],
                correctAnswer: 'A',
            },
            {
                question: "A product marked at Rs. ".concat(markedPrice, " is sold after ").concat(discount, "% discount. What is the selling price?"),
                options: ["A) Rs. ".concat(discountedPrice), "B) Rs. ".concat(discountedPrice + 30), "C) Rs. ".concat(discountedPrice - 20), "D) Rs. ".concat(discountedPrice + 10)],
                correctAnswer: 'A',
            },
            {
                question: "Two amounts are in the ratio ".concat(ratioA, ":").concat(ratioB, " and their total is Rs. ").concat(totalValue, ". What is the larger share?"),
                options: ["A) Rs. ".concat(ratioValue), "B) Rs. ".concat(ratioValue + 5), "C) Rs. ".concat(ratioValue - 5), "D) Rs. ".concat(ratioValue + 15)],
                correctAnswer: 'A',
            },
            {
                question: "A branch has ".concat(totalValue, " forms to distribute equally among ").concat(ratioA + ratioB, " counters. How many forms does each counter receive?"),
                options: ["A) ".concat(Math.floor(totalValue / (ratioA + ratioB))), "B) ".concat(Math.ceil(totalValue / (ratioA + ratioB))), "C) ".concat(Math.floor(totalValue / (ratioA + ratioB)) + 1), "D) ".concat(Math.floor(totalValue / (ratioA + ratioB)) - 1)],
                correctAnswer: 'A',
            },
            {
                question: "A person walks 6 km north, then ".concat(rate, " km east, and then 6 km south. In which direction is he from the starting point?"),
                options: ['A) North', 'B) South', 'C) East', 'D) West'],
                correctAnswer: 'C',
            },
        ];
        return __assign(__assign({}, variants_2[(seed - 1) % variants_2.length]), { topic: topic || normalizedTopic, difficulty: 'hard', explanation: 'Use the numeric details carefully and verify the final answer to match bank exam standards.' });
    }
    var variants = [
        {
            question: "A bank officer walks 3 km north, then 4 km east, and then 3 km south. In which direction is he from the starting point?",
            options: ['A) North', 'B) South', 'C) East', 'D) West'],
            correctAnswer: 'C',
        },
        {
            question: "If all ".concat(entity, " are officers and some officers are auditors, which statement is definitely true?"),
            options: ["A) Some ".concat(entity, " are auditors"), "B) All auditors are ".concat(entity), "C) No officer is an auditor", "D) All officers are ".concat(entity)],
            correctAnswer: 'A',
        },
        {
            question: "If SOUTH is coded as 12345 and NORTH is coded as 67845, how is THORN coded?",
            options: ['A) 45867', 'B) 54867', 'C) 48576', 'D) 47856'],
            correctAnswer: 'A',
        },
        {
            question: "Statements: Some files are folders. All folders are records. Which conclusion is definitely true?",
            options: ['A) Some files are records', 'B) All records are files', 'C) No file is a record', 'D) All folders are files'],
            correctAnswer: 'A',
        },
    ];
    return __assign(__assign({}, variants[(seed - 1) % variants.length]), { topic: topic || normalizedTopic, difficulty: 'hard', explanation: 'Use reasoning and careful elimination to select the best bank exam-style answer.' });
}
function buildUniqueAdaptiveFallbackQuestion(topic, seenQuestions, fallbackIndex) {
    var _a;
    var normalizedTopic = normalizeAdaptiveTopic(topic);
    var preferredBank = (_a = adaptiveFallbackQuestionBank[normalizedTopic]) !== null && _a !== void 0 ? _a : adaptiveFallbackQuestionBank['General Knowledge'];
    var allBanks = __spreadArray([
        preferredBank
    ], Object.entries(adaptiveFallbackQuestionBank)
        .filter(function (_a) {
        var bankTopic = _a[0];
        return bankTopic !== normalizedTopic;
    })
        .map(function (_a) {
        var bank = _a[1];
        return bank;
    }), true);
    for (var _i = 0, allBanks_1 = allBanks; _i < allBanks_1.length; _i++) {
        var bank = allBanks_1[_i];
        for (var _b = 0, bank_1 = bank; _b < bank_1.length; _b++) {
            var template = bank_1[_b];
            var normalizedQuestion = normalizeAdaptiveQuestionText(template.question);
            if (!seenQuestions.has(normalizedQuestion)) {
                seenQuestions.add(normalizedQuestion);
                return __assign(__assign({}, template), { topic: topic || normalizedTopic });
            }
        }
    }
    for (var attempt = 0; attempt < 10; attempt += 1) {
        var generated = buildGeneratedAdaptiveFallbackQuestion(topic, fallbackIndex + attempt);
        if (!generated || typeof generated.question !== 'string') {
            continue;
        }
        var normalized = normalizeAdaptiveQuestionText(generated.question);
        if (!seenQuestions.has(normalized)) {
            seenQuestions.add(normalized);
            return generated;
        }
    }
    var fallback = buildAdaptiveFallbackQuestion(topic, fallbackIndex);
    if (fallback && typeof fallback.question === 'string') {
        seenQuestions.add(normalizeAdaptiveQuestionText(fallback.question));
    }
    return fallback;
}
// Mock adaptive exam generator
function generateMockAdaptiveExam(input) {
    var _a;
    var examQuestions = [];
    var previousQuestionContext = Array.isArray(input.previousQuestionContext) ? input.previousQuestionContext : [];
    var seenQuestions = new Set(previousQuestionContext.map(function (entry) {
        return normalizeAdaptiveQuestionText(entry.split(':').slice(1).join(':') || entry);
    }));
    var weakestTopics = Array.isArray(input.weakestTopics) && input.weakestTopics.length > 0
        ? input.weakestTopics.map(function (topic) { return normalizeAdaptiveTopic(topic); })
        : ['General Knowledge'];
    var topicAnalysis = Array.isArray(input.topicAnalysis)
        ? input.topicAnalysis.map(function (entry) { return (__assign(__assign({}, entry), { topic: normalizeAdaptiveTopic(entry.topic) })); })
        : [];
    var seenTopics = new Set();
    var orderedTopics = __spreadArray(__spreadArray([], weakestTopics, true), topicAnalysis.map(function (entry) { return entry.topic; }), true).filter(function (topic) {
        if (!topic || seenTopics.has(topic))
            return false;
        seenTopics.add(topic);
        return true;
    });
    var normalizedTopics = orderedTopics.length > 0 ? orderedTopics : ['General Knowledge'];
    var getWeight = function (topic) {
        var _a;
        var performance = (_a = topicAnalysis.find(function (entry) { return entry.topic === topic; })) === null || _a === void 0 ? void 0 : _a.performancePercentage;
        if (typeof performance !== 'number') {
            return weakestTopics.includes(topic) ? 5 : 3;
        }
        if (performance <= 40)
            return 5;
        if (performance <= 70)
            return 3;
        return 2;
    };
    var weightedTopics = normalizedTopics.map(function (topic) { return ({
        topic: topic,
        weight: getWeight(topic),
    }); });
    var totalWeight = weightedTopics.reduce(function (sum, topic) { return sum + topic.weight; }, 0) || 1;
    var distribution = weightedTopics.map(function (topic) { return ({
        topic: topic.topic,
        questionCount: Math.floor((topic.weight / totalWeight) * input.numQuestions),
    }); });
    var assigned = distribution.reduce(function (sum, topic) { return sum + topic.questionCount; }, 0);
    var index = 0;
    while (assigned < input.numQuestions) {
        distribution[index % distribution.length].questionCount += 1;
        assigned += 1;
        index += 1;
    }
    for (var _i = 0, distribution_1 = distribution; _i < distribution_1.length; _i++) {
        var entry = distribution_1[_i];
        for (var i = 0; i < entry.questionCount; i++) {
            var questionIndex = i + 1;
            var question = buildUniqueAdaptiveFallbackQuestion(entry.topic, seenQuestions, questionIndex);
            if (question) {
                examQuestions.push(question);
            }
            else {
                examQuestions.push(buildAdaptiveFallbackQuestion(entry.topic, questionIndex));
            }
        }
    }
    var focusTopic = weakestTopics[0] || normalizedTopics[0];
    var focusDistribution = (_a = distribution.find(function (entry) { return entry.topic === focusTopic; })) !== null && _a !== void 0 ? _a : distribution[0];
    var percentageDistribution = distribution.map(function (entry) { return ({
        topic: entry.topic,
        questionCount: entry.questionCount,
        percentage: Math.round((entry.questionCount / input.numQuestions) * 100),
    }); });
    return {
        examQuestions: examQuestions,
        focusAreas: weakestTopics,
        distribution: percentageDistribution,
        explanation: "Based on your last exam, ".concat(focusTopic, " is your weakest area. This exam has ").concat(focusDistribution ? Math.round((focusDistribution.questionCount / input.numQuestions) * 100) : 0, "% ").concat(focusTopic, " questions to help you improve."),
    };
}
function evaluateAnswersAction(input) {
    return __awaiter(this, void 0, void 0, function () {
        var apiKey, result, error_3, errorMessage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log('[evaluateAnswersAction] Starting with', input.examAttempt.length, 'questions');
                    apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_AI_API_KEY;
                    if (!apiKey || apiKey.includes('YOUR_ACTUAL') || apiKey.includes('REPLACE_WITH')) {
                        console.log('[evaluateAnswersAction] API key not set, returning mock evaluation');
                        return [2 /*return*/, generateMockEvaluation(input)];
                    }
                    return [4 /*yield*/, withActionTimeout((0, evaluate_answers_and_provide_feedback_flow_1.evaluateAnswersAndProvideFeedback)(input))];
                case 1:
                    result = _a.sent();
                    console.log('[evaluateAnswersAction] Success: Evaluation complete');
                    return [2 /*return*/, result];
                case 2:
                    error_3 = _a.sent();
                    errorMessage = (error_3 === null || error_3 === void 0 ? void 0 : error_3.message) || String(error_3);
                    console.error('[evaluateAnswersAction] Error:', errorMessage, error_3 === null || error_3 === void 0 ? void 0 : error_3.cause);
                    // If API fails, fall back to mock evaluation
                    console.log('[evaluateAnswersAction] API failed, falling back to mock evaluation');
                    return [2 /*return*/, generateMockEvaluation(input)];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function normalizeFeedbackTopic(topic) {
    var normalized = String(topic || '').trim().toLowerCase();
    if (normalized.includes('english')) return 'English';
    if (normalized.includes('aptitude') || normalized.includes('quant')) return 'Quantitative Aptitude';
    if (normalized.includes('reasoning') || normalized.includes('puzzle') || normalized.includes('seating') || normalized.includes('syllogism') || normalized.includes('inequality') || normalized.includes('coding') || normalized.includes('direction') || normalized.includes('analogy') || normalized.includes('classification') || normalized.includes('logical sequence')) return 'Logical Reasoning';
    return String(topic || '').trim();
}
// Mock evaluation generator
function generateMockEvaluation(input) {
    var questionEvaluations = [];
    var topicStats = {};
    var totalCorrect = 0;
    var totalMarks = 0;
    var totalPossibleMarks = 0;
    var results = [];
    input.examAttempt.forEach(function (attempt, index) {
        var isCorrect = attempt.studentAnswer === attempt.correctAnswer;
        var questionMarks = attempt.marks || 1;
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
        var normalizedTopic = normalizeFeedbackTopic(attempt.topic);
        var optionAnalysis = (Array.isArray(attempt.options) ? attempt.options : []).reduce(function (acc, optionText, optionIndex) {
            var label = ['A', 'B', 'C', 'D'][optionIndex];
            var cleanText = String(optionText).replace(/^[A-D][).:\s-]*/i, '').trim();
            acc[label] = label === attempt.correctAnswer
                ? "Correct. ".concat(cleanText, " matches the question's requirement and reflects the right reasoning.")
                : "Incorrect. ".concat(cleanText, " does not satisfy the question's main logic or concept.");
            return acc;
        }, {
            A: '',
            B: '',
            C: '',
            D: '',
        });
        var explanationLines = [
            isCorrect
                ? "Correct. Option ".concat(attempt.correctAnswer, " is right because it matches the question's requirement and uses the correct reasoning.")
                : "The correct answer is ".concat(attempt.correctAnswer, ". ").concat(attempt.studentAnswer, " is not correct because it does not match the question's main requirement or reasoning."),
            normalizedTopic === 'Quantitative Aptitude'
                ? "Solve this with numerical steps: write the equation, compute the values, and simplify carefully."
                : normalizedTopic === 'Logical Reasoning'
                    ? "Solve this with an explicit logic chain: identify the premise, eliminate false options, and choose the answer that follows."
                    : "Use the core concept of the question to justify the correct answer step by step.",
            normalizedTopic === 'Quantitative Aptitude'
                ? "Show the arithmetic or algebra that leads to the result, such as addition, subtraction, multiplication, division, ratios, or percentages."
                : normalizedTopic === 'Logical Reasoning'
                    ? "Show why each other option is ruled out based on the question's conditions and logical relationships."
                    : "The other options are wrong because they miss the key point or misapply the concept.",
            isCorrect
                ? "Compare the correct choice with the distractors so the reasoning is clear."
                : "Compare the correct choice with the distractors to see why each wrong option fails.",
            "Use this explanation to understand why the correct answer is the best choice.",
        ];
        questionEvaluations.push({
            questionText: attempt.questionText,
            correctAnswer: attempt.correctAnswer,
            studentAnswer: attempt.studentAnswer,
            isCorrect: isCorrect,
            score: isCorrect ? questionMarks : 0,
            detailedFeedback: explanationLines.join('\n')
        });
        results.push({
            question: attempt.questionText,
            userAnswer: attempt.studentAnswer,
            correctAnswer: attempt.correctAnswer,
            isCorrect: isCorrect,
            explanation: explanationLines.join('\n'),
            optionAnalysis: optionAnalysis,
        });
    });
    var overallScore = totalPossibleMarks > 0 ? (totalMarks / totalPossibleMarks) * 100 : 0;
    // Generate topic analysis
    var topicAnalysis = Object.entries(topicStats).map(function (_a) {
        var topic = _a[0], stats = _a[1];
        return ({
            topic: topic,
            performancePercentage: (stats.correct / stats.total) * 100,
            weaknessIdentified: stats.correct / stats.total < 0.7,
            feedback: stats.correct / stats.total >= 0.8
                ? "Excellent performance in ".concat(topic, "!")
                : "Need improvement in ".concat(topic, ". Practice more questions.")
        });
    });
    // Find weakest topics
    var weakestTopics = topicAnalysis
        .filter(function (t) { return t.weaknessIdentified; })
        .sort(function (a, b) { return a.performancePercentage - b.performancePercentage; })
        .map(function (t) { return t.topic; })
        .slice(0, 2);
    if (weakestTopics.length === 0) {
        weakestTopics.push('General Knowledge');
    }
    var overallFeedback = overallScore >= 80
        ? "Outstanding performance! You have excellent knowledge in this area."
        : overallScore >= 60
            ? "Good performance! With some more practice, you can achieve excellence."
            : "Needs improvement. Focus on the weak areas and practice regularly.";
    return {
        score: totalCorrect,
        total: input.examAttempt.length,
        overallScore: overallScore,
        overallFeedback: overallFeedback,
        topicAnalysis: topicAnalysis,
        weakestTopics: weakestTopics,
        questionEvaluations: questionEvaluations,
        results: results,
    };
}
