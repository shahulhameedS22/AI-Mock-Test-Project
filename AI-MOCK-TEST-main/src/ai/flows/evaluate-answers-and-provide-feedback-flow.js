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
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateAnswersAndProvideFeedback = evaluateAnswersAndProvideFeedback;
/**
 * @fileOverview Evaluates student answers with robust string comparison
 * and generates qualitative AI feedback.
 */
var genkit_1 = require("@/ai/genkit");
var genkit_2 = require("genkit");
var ExamQuestionAttemptSchema = genkit_2.z.object({
    questionText: genkit_2.z.string(),
    options: genkit_2.z.array(genkit_2.z.string()).length(4),
    correctAnswer: genkit_2.z.string(),
    studentAnswer: genkit_2.z.string(),
    topic: genkit_2.z.string(),
    marks: genkit_2.z.number().optional(),
});
var EvaluateAnswersAndProvideFeedbackInputSchema = genkit_2.z.object({
    examAttempt: genkit_2.z.array(ExamQuestionAttemptSchema),
});
var TopicAnalysisSchema = genkit_2.z.object({
    topic: genkit_2.z.string(),
    performancePercentage: genkit_2.z.number(),
    weaknessIdentified: genkit_2.z.boolean(),
    feedback: genkit_2.z.string(),
});
var OptionAnalysisSchema = genkit_2.z.object({
    A: genkit_2.z.string(),
    B: genkit_2.z.string(),
    C: genkit_2.z.string(),
    D: genkit_2.z.string(),
});
var EvaluationResultSchema = genkit_2.z.object({
    question: genkit_2.z.string(),
    userAnswer: genkit_2.z.string(),
    correctAnswer: genkit_2.z.string(),
    isCorrect: genkit_2.z.boolean(),
    explanation: genkit_2.z.string(),
    optionAnalysis: OptionAnalysisSchema,
});
var QuestionEvaluationSchema = genkit_2.z.object({
    questionText: genkit_2.z.string(),
    studentAnswer: genkit_2.z.string(),
    correctAnswer: genkit_2.z.string(),
    isCorrect: genkit_2.z.boolean(),
    score: genkit_2.z.number(),
    detailedFeedback: genkit_2.z.string().describe('Short explanation of why the answer was correct or incorrect.'),
});
var EvaluateAnswersAndProvideFeedbackOutputSchema = genkit_2.z.object({
    score: genkit_2.z.number(),
    total: genkit_2.z.number(),
    results: genkit_2.z.array(EvaluationResultSchema),
    overallScore: genkit_2.z.number(),
    overallFeedback: genkit_2.z.string(),
    topicAnalysis: genkit_2.z.array(TopicAnalysisSchema),
    questionEvaluations: genkit_2.z.array(QuestionEvaluationSchema),
    weakestTopics: genkit_2.z.array(genkit_2.z.string()),
});
var evaluatePrompt = genkit_1.ai.definePrompt({
    name: 'evaluateAnswersAndProvideFeedbackPrompt',
    model: 'gemini-1.5',
    input: {
        schema: genkit_2.z.object({
            examAttempt: genkit_2.z.array(ExamQuestionAttemptSchema.extend({
                isCorrect: genkit_2.z.boolean(),
                marks: genkit_2.z.number().optional(),
            })),
            localOverallScore: genkit_2.z.number()
        })
    },
    output: { schema: EvaluateAnswersAndProvideFeedbackOutputSchema },
    prompt: "You are an expert bank exam evaluator and tutor. Evaluate the student's answers carefully.\n\nOutput only one valid JSON object matching the schema exactly. Do not include markdown, extra text, or explanations outside the JSON structure.\n\nRequired top-level fields:\n- score: number (number of correct answers)\n- total: number (number of questions)\n- results: array of per-question evaluations\n- overallScore: number\n- overallFeedback: string\n- topicAnalysis: array\n- questionEvaluations: array\n- weakestTopics: array\n\nFor each question in results:\n- question: the question text\n- userAnswer: the student's selected answer label\n- correctAnswer: the correct answer label\n- isCorrect: true or false\n- explanation: 4-6 lines of step-by-step solution reasoning in simple language\n- optionAnalysis: object with A, B, C, D explaining why each option is correct or wrong\n\nThe explanation must clearly state why the correct answer is right and why the other options are wrong.\nFor Quantitative Aptitude questions, include numerical calculations, formula steps, or arithmetic reasoning.\nFor Logical Reasoning questions, include the explicit logic chain and why each distractor fails.\nUse simple language and full step-by-step reasoning. Do not skip any question. The explanation must be at least 4 lines.\n\nHere is the attempt data:\n{{#each examAttempt}}\n- Topic: {{{topic}}}\n- Question: {{{questionText}}}\n- Options:\n  A) {{{options.[0]}}}\n  B) {{{options.[1]}}}\n  C) {{{options.[2]}}}\n  D) {{{options.[3]}}}\n- Student Answer: {{{studentAnswer}}}\n- Correct Answer: {{{correctAnswer}}}\n- Result: {{#if isCorrect}}Correct{{else}}Incorrect{{/if}}\n{{/each}}",
});
/**
 * Robustly cleans an answer string for comparison.
 * Handles formats like "Option A", "A.", "A", and variations of case/spacing.
 */
function cleanAnswer(ans) {
    if (!ans)
        return "";
    return ans
        .replace(/^option\s+/i, "")
        .replace(/^([A-D])[).:\s-]*/i, "$1")
        .trim()
        .toUpperCase()
        .charAt(0);
}
function normalizeFeedbackTopic(topic) {
    var normalized = topic.trim().toLowerCase();
    if (normalized.includes('english'))
        return 'English';
    if (normalized.includes('aptitude') || normalized.includes('quant'))
        return 'Quantitative Aptitude';
    if (normalized.includes('reasoning') || normalized.includes('puzzle') || normalized.includes('seating') || normalized.includes('syllogism') || normalized.includes('inequality') || normalized.includes('coding') || normalized.includes('direction') || normalized.includes('analogy') || normalized.includes('classification') || normalized.includes('logical sequence'))
        return 'Logical Reasoning';
    return topic.trim();
}
function buildFeedbackForTopic(topic, performancePercentage) {
    if (performancePercentage >= 80) {
        return "Strong performance in ".concat(topic, ". Keep practicing to maintain this strength.");
    }
    if (performancePercentage >= 70) {
        return "Good work in ".concat(topic, ". Focus on a few more practice questions to improve further.");
    }
    return "Weak performance in ".concat(topic, ". Spend extra time practicing ").concat(topic, " questions and revising key concepts.");
}
function computeLocalTopicAnalysis(attempts) {
    var _a;
    var stats = new Map();
    for (var _i = 0, attempts_1 = attempts; _i < attempts_1.length; _i++) {
        var attempt = attempts_1[_i];
        var topic = normalizeFeedbackTopic(attempt.topic);
        var entry = (_a = stats.get(topic)) !== null && _a !== void 0 ? _a : { correct: 0, total: 0 };
        entry.total += 1;
        if (attempt.isCorrect) {
            entry.correct += 1;
        }
        stats.set(topic, entry);
    }
    return Array.from(stats.entries()).map(function (_a) {
        var topic = _a[0], stat = _a[1];
        var performancePercentage = stat.total > 0 ? (stat.correct / stat.total) * 100 : 0;
        return {
            topic: topic,
            performancePercentage: performancePercentage,
            weaknessIdentified: performancePercentage < 70,
            feedback: buildFeedbackForTopic(topic, performancePercentage),
        };
    }).sort(function (a, b) { return a.performancePercentage - b.performancePercentage; });
}
function mergeTopicAnalysis(localAnalysis, aiAnalysis) {
    var _a, _b;
    var merged = new Map();
    for (var _i = 0, localAnalysis_1 = localAnalysis; _i < localAnalysis_1.length; _i++) {
        var localEntry = localAnalysis_1[_i];
        merged.set(localEntry.topic, localEntry);
    }
    if (Array.isArray(aiAnalysis)) {
        for (var _c = 0, aiAnalysis_1 = aiAnalysis; _c < aiAnalysis_1.length; _c++) {
            var aiEntry = aiAnalysis_1[_c];
            var topic = normalizeFeedbackTopic(aiEntry.topic);
            var existing = merged.get(topic);
            var performancePercentage = existing ? existing.performancePercentage : aiEntry.performancePercentage;
            var weaknessIdentified = existing
                ? existing.performancePercentage < 70
                : (_a = aiEntry.weaknessIdentified) !== null && _a !== void 0 ? _a : aiEntry.performancePercentage < 70;
            merged.set(topic, {
                topic: topic,
                performancePercentage: performancePercentage,
                weaknessIdentified: weaknessIdentified,
                feedback: ((_b = aiEntry.feedback) === null || _b === void 0 ? void 0 : _b.trim()) || buildFeedbackForTopic(topic, performancePercentage),
            });
        }
    }
    return Array.from(merged.values()).sort(function (a, b) { return a.performancePercentage - b.performancePercentage; });
}
function evaluateAnswersAndProvideFeedback(input) {
    return __awaiter(this, void 0, void 0, function () {
        var processedAttempts, totalMarks, earnedMarks, localOverallScore, localTopicAnalysis, attempt, output, res, err_1, isNetworkError, mergedTopicAnalysis, weakestTopics, overallFeedback;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    processedAttempts = input.examAttempt.map(function (attempt) {
                        var studentAnsClean = cleanAnswer(attempt.studentAnswer);
                        var correctAnsClean = cleanAnswer(attempt.correctAnswer);
                        return __assign(__assign({}, attempt), { isCorrect: studentAnsClean !== "" && studentAnsClean === correctAnsClean });
                    });
                    totalMarks = processedAttempts.reduce(function (acc, p) { var _a; return acc + ((_a = p.marks) !== null && _a !== void 0 ? _a : 1); }, 0);
                    earnedMarks = processedAttempts.reduce(function (acc, p) { var _a; return acc + ((p.isCorrect ? ((_a = p.marks) !== null && _a !== void 0 ? _a : 1) : 0)); }, 0);
                    localOverallScore = totalMarks > 0 ? (earnedMarks / totalMarks) * 100 : 0;
                    localTopicAnalysis = computeLocalTopicAnalysis(processedAttempts);
                    attempt = 0;
                    _d.label = 1;
                case 1:
                    if (!true) return [3 /*break*/, 8];
                    _d.label = 2;
                case 2:
                    _d.trys.push([2, 4, , 7]);
                    return [4 /*yield*/, evaluatePrompt({
                            examAttempt: processedAttempts,
                            localOverallScore: localOverallScore
                        })];
                case 3:
                    res = _d.sent();
                    output = res.output;
                    return [3 /*break*/, 8];
                case 4:
                    err_1 = _d.sent();
                    attempt++;
                    isNetworkError = ((_a = err_1 === null || err_1 === void 0 ? void 0 : err_1.cause) === null || _a === void 0 ? void 0 : _a.code) === 'UND_ERR_CONNECT_TIMEOUT' ||
                        typeof (err_1 === null || err_1 === void 0 ? void 0 : err_1.message) === 'string' && err_1.message.includes('fetch failed');
                    console.error('evaluateAnswersAndProvideFeedback error', err_1, { attempt: attempt });
                    if (!(isNetworkError && attempt < 5)) return [3 /*break*/, 6];
                    console.warn("network issue contacting AI, retry #".concat(attempt));
                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1000 * Math.pow(2, attempt - 1)); })];
                case 5:
                    _d.sent();
                    return [3 /*break*/, 1];
                case 6:
                    if (isNetworkError) {
                        throw new Error('Network error: unable to reach AI service. ' +
                            'Check your internet connection or any firewall/proxy settings.');
                    }
                    throw new Error('Feedback generation failed');
                case 7: return [3 /*break*/, 1];
                case 8:
                    if (!output)
                        throw new Error('Feedback generation failed');
                    mergedTopicAnalysis = mergeTopicAnalysis(localTopicAnalysis, output.topicAnalysis);
                    weakestTopics = mergedTopicAnalysis
                        .filter(function (topic) { return topic.weaknessIdentified; })
                        .sort(function (a, b) { return a.performancePercentage - b.performancePercentage; })
                        .map(function (topic) { return topic.topic; })
                        .slice(0, 3);
                    overallFeedback = typeof output.overallFeedback === 'string' && output.overallFeedback.trim().length > 0
                        ? output.overallFeedback
                        : localTopicAnalysis.length === 0
                            ? 'Keep practicing to improve your exam performance.'
                            : "Your overall score is ".concat(Math.round(localOverallScore), "%. Focus on ").concat(weakestTopics.join(', '), " to improve faster.");
                    // 3. Merge local accuracy with AI feedback to ensure data integrity
                    return [2 /*return*/, __assign(__assign({}, output), { overallScore: localOverallScore, overallFeedback: overallFeedback, topicAnalysis: mergedTopicAnalysis, weakestTopics: weakestTopics.length > 0 ? weakestTopics : [(_c = (_b = mergedTopicAnalysis[0]) === null || _b === void 0 ? void 0 : _b.topic) !== null && _c !== void 0 ? _c : 'English'], questionEvaluations: output.questionEvaluations.map(function (evalItem, i) {
                                var _a;
                                var original = processedAttempts[i];
                                return __assign(__assign({}, evalItem), { questionText: original.questionText, studentAnswer: original.studentAnswer, correctAnswer: original.correctAnswer, isCorrect: original.isCorrect, score: original.isCorrect ? ((_a = original.marks) !== null && _a !== void 0 ? _a : 1) : 0 });
                            }) })];
            }
        });
    });
}
