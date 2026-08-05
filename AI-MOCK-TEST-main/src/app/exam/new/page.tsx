"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2, Zap, BrainCircuit, Target } from "lucide-react"

type TopicAnalysisEntry = {
  topic: string
  performancePercentage: number
  weaknessIdentified: boolean
  feedback: string
}

type AdaptivePlan = {
  focusAreas: string[]
  explanation: string
  distribution: Array<{
    topic: string
    percentage: number
    questionCount: number
  }>
}

type AdaptiveHistory = {
  weakestTopics: string[]
  topicAnalysis: Array<{
    topic: string
    performancePercentage: number
  }>
  previousQuestionContext: string[]
  mistakenTopics: string[]
  mistakenQuestions: string[]
}

function normalizeTopicName(topic?: string) {
  const normalized = topic?.trim()
  if (!normalized) return "General Knowledge"

  const lower = normalized.toLowerCase()
  if (lower.includes("english")) return "English"
  if (lower.includes("data interpretation")) return "Data Interpretation"
  if (lower.includes("data sufficiency")) return "Data Sufficiency"
  if (lower.includes("quantity comparison")) return "Quantity Comparison"
  if (lower.includes("profit") && lower.includes("loss")) return "Profit & Loss"
  if (lower.includes("ratio") || lower.includes("proportion")) return "Ratio & Proportion"
  if (lower.includes("time") && lower.includes("work")) return "Time & Work"
  if (lower.includes("speed") || lower.includes("distance")) return "Time, Speed & Distance"
  if (lower.includes("mixture") || lower.includes("alligation")) return "Mixture & Alligation"
  if (lower.includes("number series") || (lower.includes("series") && !lower.includes("coding"))) return "Number Series"
  if (lower.includes("quadratic")) return "Quadratic Equation"
  if (lower.includes("puzzle")) return "Puzzles"
  if (lower.includes("seating")) return "Seating Arrangement"
  if (lower.includes("syllogism")) return "Syllogism"
  if (lower.includes("inequality")) return "Inequality"
  if (lower.includes("coding") || lower.includes("direction")) return "Coding / Series / Direction"
  if (lower.includes("vocabulary") || lower.includes("synonym") || lower.includes("antonym") || lower.includes("idiom") || lower.includes("phrase")) return "Vocabulary"
  if (lower.includes("cloze") || lower.includes("fill in") || lower.includes("fillers")) return "Cloze Test"
  if (lower.includes("error") || lower.includes("sentence correction") || lower.includes("sentence improvement")) return "Error Detection"
  if (lower.includes("para jumble") || lower.includes("jumbles") || lower.includes("arrangement")) return "Para Jumbles"
  if (lower.includes("reading comprehension") || lower.includes("rc")) return "Reading Comprehension"
  if (lower.includes("aptitude") || lower.includes("quant")) return "Quantitative Aptitude"
  if (lower.includes("reasoning")) return "Logical Reasoning"
  if (lower.includes("general knowledge") || lower.includes("general awareness") || lower.includes("computer")) {
    return "General Knowledge"
  }

  return normalized
}

function NewExamForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { getUser, getExams, saveExam } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  const [examType, setExamType] = useState("SBI PO")
  const difficulty: "easy" | "medium" | "hard" = "medium"
  const [pattern, setPattern] = useState("100marks")
  const [isAdaptive, setIsAdaptive] = useState(false)
  const [adaptiveEligible, setAdaptiveEligible] = useState(false)
  const numQuestions = isAdaptive || pattern === "100marks" ? "100" : "20"
  // caching: store last generation result so clicking "Start Test" is instant if options didn't change
  const [cachedQuestions, setCachedQuestions] = useState<any | null>(null)
  const [cachedKey, setCachedKey] = useState<string>("")

  // Avoid hydration mismatch by deferring reading from browser APIs
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const exams = getExams()
    const hasCompletedPerformance = exams.some((exam) => exam.result && Array.isArray(exam.result.topicAnalysis) && exam.result.topicAnalysis.length > 0)
    setAdaptiveEligible(hasCompletedPerformance)
    if (!hasCompletedPerformance) {
      setIsAdaptive(false)
    }

    const adaptiveParam = searchParams.get("adaptive")
    if (adaptiveParam === "true" && hasCompletedPerformance) {
      setIsAdaptive(true)
    }
  }, [searchParams, mounted])

  // Do not pre-generate exam questions in the background.
  // This avoids slow page load and unnecessary AI / API work before the user clicks Start.
  useEffect(() => {
    if (!mounted) return;
    setCachedKey("");
    setCachedQuestions(null);
  }, [mounted, examType, difficulty, numQuestions, pattern, isAdaptive])

  function getAdaptiveHistory(user: any): AdaptiveHistory {
    const exams = [...getExams()]
      .filter((exam) => exam.result?.topicAnalysis?.length)
      .sort((a, b) => b.timestamp - a.timestamp)

    const topicStats = new Map<string, { totalPerformance: number; attempts: number }>()

    for (const exam of exams) {
      for (const topicEntry of exam.result?.topicAnalysis ?? []) {
        const topic = normalizeTopicName(topicEntry.topic)
        const current = topicStats.get(topic) ?? { totalPerformance: 0, attempts: 0 }
        current.totalPerformance += topicEntry.performancePercentage
        current.attempts += 1
        topicStats.set(topic, current)
      }
    }

    const topicAnalysis = Array.from(topicStats.entries())
      .map(([topic, stats]) => ({
        topic,
        performancePercentage: Math.round(stats.totalPerformance / stats.attempts),
      }))
      .sort((a, b) => a.performancePercentage - b.performancePercentage)

    const weakTopicsFromUser = (user?.weakTopics ?? []).map((topic: string) => normalizeTopicName(topic))
    const weakTopicsFromHistory = topicAnalysis
      .filter((topic) => topic.performancePercentage <= 75)
      .map((topic) => topic.topic)

    const weakestTopics = Array.from(
      new Set([...weakTopicsFromUser, ...weakTopicsFromHistory].filter(Boolean))
    )

    const previousQuestionContext = exams
      .slice(0, 3)
      .flatMap((exam) => exam.questions.map((question) => `${normalizeTopicName(question.topic)}: ${question.questionText}`))
      .slice(0, 20)

    const mistakenQuestions = exams
      .slice(0, 3)
      .flatMap((exam) => (exam.result?.questionEvaluations ?? [])
        .filter((item: any) => item.isCorrect === false)
        .map((item: any) => `${normalizeTopicName(item.topic)}: ${item.questionText}`)
      )
      .slice(0, 20)

    const mistakenTopics = Array.from(
      new Set(
        exams
          .flatMap((exam) => (exam.result?.questionEvaluations ?? [])
            .filter((item: any) => item.isCorrect === false)
            .map((item: any) => normalizeTopicName(item.topic))
          )
          .filter(Boolean)
      )
    )

    return {
      weakestTopics: weakestTopics.length > 0 ? weakestTopics : ["General Knowledge"],
      topicAnalysis,
      previousQuestionContext,
      mistakenTopics,
      mistakenQuestions,
    }
  }

  async function postExamGeneration(body: any) {
    const response = await fetch('/api/exam/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const payload = await response.json()
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error || 'Failed to generate exam questions')
    }
    return payload.data
  }

  // reusable logic for generating question sets based on the current options and user
  async function generateQuestions(user: any) {
    const adaptiveHistory = getAdaptiveHistory(user)
    const weakTopics = adaptiveHistory.weakestTopics
    const strongTopics = user.strongTopics && user.strongTopics.length > 0 ? user.strongTopics : []
    const effectiveAdaptive = isAdaptive && adaptiveEligible
    let result: any

    if (effectiveAdaptive) {
      const adaptiveRes = await postExamGeneration({
        mode: 'adaptive',
        studentId: user.id,
        weakestTopics: weakTopics,
        numQuestions: parseInt(numQuestions),
        difficultyLevel: difficulty as any,
        topicAnalysis: adaptiveHistory.topicAnalysis.map((topic) => ({
          topic: topic.topic,
          performancePercentage: topic.performancePercentage,
        })),
        previousQuestionContext: adaptiveHistory.previousQuestionContext,
        mistakenTopics: adaptiveHistory.mistakenTopics,
        mistakenQuestions: adaptiveHistory.mistakenQuestions,
      })
      result = {
        questions: adaptiveRes.examQuestions.map((q: any, i: number) => ({
          questionId: `Q-ADAPT-${i}-${Date.now()}`,
          questionText: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation ?? 'Focus review on ' + q.topic,
          topic: q.topic,
          difficulty: q.difficulty ?? difficulty as any,
        })),
        adaptivePlan: {
          focusAreas: adaptiveRes.focusAreas,
          explanation: adaptiveRes.explanation,
          distribution: adaptiveRes.distribution,
        },
      }
    } else if (pattern === '100marks') {
      const reasoningCount = 35
      const aptitudeCount = 35
      const englishCount = 30
      const standardWeakTopics: string[] = []
      const standardStrongTopics: string[] = []
      const questionsRes = await postExamGeneration({
        mode: 'standard',
        studentId: user.id,
        examType,
        categories: {
          english: englishCount,
          aptitude: aptitudeCount,
          reasoning: reasoningCount,
        },
        difficultyLevel: difficulty as any,
        weakTopics: standardWeakTopics,
        strongTopics: standardStrongTopics,
      })
      const timestamp = Date.now()
      result = {
        questions: questionsRes.questions.map((q: any, i: number) => ({
          ...q,
          questionId: `Q-${i}-${timestamp}`,
          marks: 1,
        })),
      }
    } else {
      const total = parseInt(numQuestions)
      const english = Math.floor(total / 3)
      const aptitude = Math.floor(total / 3)
      const reasoning = total - english - aptitude
      const standardWeakTopics: string[] = []
      const standardStrongTopics: string[] = []
      const questionsRes = await postExamGeneration({
        mode: 'standard',
        studentId: user.id,
        examType,
        categories: { english, aptitude, reasoning },
        difficultyLevel: difficulty as any,
        weakTopics: standardWeakTopics,
        strongTopics: standardStrongTopics,
      })
      const timestamp = Date.now()
      result = {
        questions: questionsRes.questions.map((q: any, i: number) => ({
          ...q,
          questionId: `Q-STD-${i}-${timestamp}`,
          marks: 5,
        })),
      }
    }

    return result
  }

  const handleStart = async () => {
    if (!mounted) return;
    setLoading(true);
    try {
      const user = getUser();
      if (!user || !user.id) {
        throw new Error('User not found. Please log in.');
      }
      
      // get questions either from cache or freshly generate
      const adaptiveHistory = getAdaptiveHistory(user);
      const currentKey = JSON.stringify({
        examType,
        difficulty,
        numQuestions,
        pattern,
        isAdaptive,
        userId: user.id,
        weakTopics: adaptiveHistory.weakestTopics,
        topicAnalysis: adaptiveHistory.topicAnalysis,
      });
      let questionsResult: any;
      if (cachedKey === currentKey && cachedQuestions) {
        questionsResult = cachedQuestions;
      } else {
        questionsResult = await generateQuestions(user);
      }
      if (!questionsResult || !Array.isArray(questionsResult.questions)) {
        throw new Error('Question generation returned invalid result');
      }

      const examId = Math.random().toString(36).substring(7)
      saveExam({
        id: examId,
        type: examType,
        difficulty,
        timestamp: Date.now(),
        questions: questionsResult.questions,
        answers: {},
        adaptivePlan: questionsResult.adaptivePlan,
      })

      router.push(`/exam/${examId}`)
    } catch (error) {
      console.error('Exam generation error:', error)
      // Next.js often hides server error details in production; the `digest` field
      // can help when looking at logs.
      let errorMessage = 'Unknown error'
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null) {
        try {
          const serialized = JSON.stringify(error, Object.getOwnPropertyNames(error))
          errorMessage = serialized || String(error)
        } catch {
          errorMessage = String(error)
        }
      } else {
        errorMessage = String(error)
      }
      // if the error object has a digest property include it for debugging
      const digest = (error as any)?.digest
      if (digest) {
        console.warn('Next.js error digest:', digest)
        errorMessage += ` (digest: ${digest})`
      }
      if (errorMessage.toLowerCase().includes('network error')) {
        errorMessage += ' Ensure the server has internet access and can reach generativelanguage.googleapis.com';
      }
      const displayMessage = process.env.NODE_ENV === 'development' 
        ? `Failed to generate exam: ${errorMessage}`
        : 'Failed to generate exam. Please try again or check the console for details.';
      alert(displayMessage)
      
      // Log to console for debugging
      if (typeof window !== 'undefined') {
        console.error('[ExamGeneration]', {
          error: errorMessage,
          digest,
          fullError: error,
          serializedError: typeof error === 'object' && error !== null ? (() => {
            try {
              return JSON.stringify(error, Object.getOwnPropertyNames(error))
            } catch {
              return undefined
            }
          })() : undefined,
        });
      }
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const currentUser = getUser()

  return (
    <Card className="border-border bg-white">
      <CardHeader className="text-center">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Zap className="text-primary w-6 h-6" />
        </div>
        <CardTitle className="text-2xl text-foreground">Configure Mock Exam</CardTitle>
        <CardDescription className="text-muted-foreground">Our AI will generate unique questions just for you.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="text-foreground">Mode</Label>
          <RadioGroup 
            value={isAdaptive ? "adaptive" : "standard"} 
            onValueChange={(val) => setIsAdaptive(val === "adaptive")}
            className="grid grid-cols-2 gap-4"
          >
            <div>
              <RadioGroupItem value="standard" id="standard" className="peer sr-only" />
              <Label
                htmlFor="standard"
                className="flex flex-col items-center justify-between rounded-lg border-2 border-border bg-white hover:bg-blue-50 hover:border-primary peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-blue-50 transition-all cursor-pointer h-full p-4"
              >
                <Target className="mb-3 h-6 w-6 text-foreground" />
                <span className="text-sm font-medium text-foreground">Standard</span>
                <span className="text-xs text-muted-foreground text-center mt-1">General curriculum coverage</span>
              </Label>
            </div>
            <div>
              <RadioGroupItem value="adaptive" id="adaptive" className="peer sr-only" disabled={!adaptiveEligible} />
              <Label
                htmlFor="adaptive"
                className={`flex flex-col items-center justify-between rounded-lg border-2 border-border bg-white hover:bg-amber-50 hover:border-accent peer-data-[state=checked]:border-accent peer-data-[state=checked]:bg-amber-50 transition-all h-full p-4 ${!adaptiveEligible ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
              >
                <BrainCircuit className="mb-3 h-6 w-6 text-foreground" />
                <span className="text-sm font-medium text-foreground">Adaptive</span>
                <span className="text-xs text-muted-foreground text-center mt-1">100 questions focused on weak topics</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="exam-target" className="text-foreground">Exam Target</Label>
            <Select value={examType} onValueChange={setExamType}>
              <SelectTrigger id="exam-target" className="border-border text-foreground">
                <SelectValue placeholder="Select Target" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SBI PO">SBI PO</SelectItem>
                <SelectItem value="IBPS Clerk">IBPS Clerk</SelectItem>
                <SelectItem value="RBI Grade B">RBI Grade B</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pattern" className="text-foreground">Test Pattern</Label>
            <Select value={pattern} onValueChange={(val) => {
              setPattern(val)
            }}>
              <SelectTrigger id="pattern" className="border-border text-foreground whitespace-nowrap">
                <SelectValue placeholder="Select Pattern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100marks">100 Questions, 100 Marks</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full h-12 text-lg bg-accent hover:bg-accent/90 text-white font-medium" 
          onClick={handleStart}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 
              Generating...
            </>
          ) : "Generate & Start Test"}
        </Button>
      </CardFooter>
    </Card>
  )
}

export default function NewExamPage() {
  return (
    <div className="container max-w-2xl mx-auto py-10 px-4">
      <Suspense fallback={<div className="flex justify-center items-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <NewExamForm />
      </Suspense>
    </div>
  )
}
