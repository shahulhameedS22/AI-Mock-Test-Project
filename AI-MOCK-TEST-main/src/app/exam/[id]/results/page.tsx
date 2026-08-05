"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAppStore, ExamRecord } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { 
  CheckCircle2, 
  XCircle, 
  LayoutDashboard, 
  RotateCcw, 
  FileText,
  MessageSquare,
  AlertCircle,
  TrendingUp,
  BrainCircuit,
  Loader2
} from "lucide-react"
import Link from "next/link"

function normalizeSectionName(topic: string) {
  const normalized = topic.trim().toLowerCase();
  if (normalized.includes('english')) return 'English';
  if (normalized.includes('aptitude') || normalized.includes('quant')) return 'Quantitative Aptitude';
  if (normalized.includes('reasoning') || normalized.includes('puzzle') || normalized.includes('seating') || normalized.includes('syllogism') || normalized.includes('inequality') || normalized.includes('coding') || normalized.includes('direction') || normalized.includes('analogy') || normalized.includes('classification') || normalized.includes('logical sequence')) return 'Logical Reasoning';
  return topic.trim();
}

function buildSectionSummary(topicAnalysis: Array<{ topic: string; performancePercentage: number; feedback: string }>) {
  const sections = ['English', 'Quantitative Aptitude', 'Logical Reasoning'];

  return sections.map((section) => {
    const related = topicAnalysis.filter((topic) => normalizeSectionName(topic.topic) === section);
    const score = related.length ? Math.round(related.reduce((sum, item) => sum + item.performancePercentage, 0) / related.length) : 0;
    const feedback = related.length
      ? related[0].feedback
      : `Review ${section} concepts and practice guided questions to improve this section.`;

    return { section, score, feedback };
  });
}

export default function ResultPage() {
  const params = useParams()
  const router = useRouter()
  const { getExams } = useAppStore()
  const [exam, setExam] = useState<ExamRecord | null>(null)

  const examId = Array.isArray(params.id) ? params.id[0] : params.id

  useEffect(() => {
    const allExams = getExams()
    const currentExam = examId ? allExams.find((e) => e.id === examId) : undefined
    if (!currentExam || !currentExam.result) {
      router.push("/dashboard")
      return
    }

    setExam((prevExam) => {
      if (prevExam?.id === currentExam.id && prevExam.result === currentExam.result) {
        return prevExam
      }
      return currentExam
    })
  }, [examId, router])

  if (!exam) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-accent" />
      </div>
    )
  }

  const result = exam.result!
  const sectionSummary = buildSectionSummary(result.topicAnalysis)
  const weakSections = sectionSummary.filter((item) => item.score < 70).map((item) => item.section)
  const strongSections = sectionSummary.filter((item) => item.score >= 80).map((item) => item.section)
  const suggestionText = weakSections.length > 0
    ? `Focus on ${weakSections.join(', ')} and use targeted practice to boost your scores in those sections.`
    : strongSections.length > 0
      ? `Great work in ${strongSections.join(', ')}. Maintain your strengths and keep refining all sections.`
      : 'Continue practicing all sections and use topic-specific questions to build consistency.'

  const score = Math.round(result.overallScore)

  return (
    <div className="container max-w-5xl mx-auto py-10 px-4 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold">Exam Results</h1>
          <p className="text-muted-foreground">{exam.type} Mock Exam • {new Date(exam.timestamp).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/dashboard"><LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard</Link>
          </Button>
          <Button asChild className="bg-accent hover:bg-accent/80">
            <Link href="/exam/new"><RotateCcw className="mr-2 h-4 w-4" /> Retake Mock</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass-morphism border-white/10 md:col-span-1">
          <CardHeader className="text-center">
            <CardTitle className="text-lg">Overall Score</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <div className={`text-6xl font-black mb-2 ${score >= 70 ? 'text-green-400' : score >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
              {score}%
            </div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Performance</p>
          </CardContent>
        </Card>

        <Card className="glass-morphism border-white/10 md:col-span-2">
          <CardHeader className="flex flex-row items-center gap-2">
            <MessageSquare className="w-5 h-5 text-accent" />
            <CardTitle className="text-lg">AI Performance Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed italic text-muted-foreground">
              &quot;{result.overallFeedback}&quot;
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {sectionSummary.map((section) => (
          <Card key={section.section} className="glass-morphism border-white/10">
            <CardHeader className="text-center">
              <CardTitle className="text-sm">{section.section}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center py-5">
              <div className={`text-4xl font-bold ${section.score >= 80 ? 'text-green-400' : section.score >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                {section.score}%
              </div>
              <p className="text-xs text-muted-foreground">{section.feedback}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-morphism border-white/10">
        <CardHeader className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-accent" />
          <CardTitle className="text-lg">Performance Suggestions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">{suggestionText}</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-morphism border-white/10">
          <CardHeader className="flex flex-row items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent" />
            <CardTitle>Topic Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {result.topicAnalysis.map((topic) => (
              <div key={topic.topic} className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium">{topic.topic}</span>
                  <span className={`font-bold ${topic.performancePercentage >= 70 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {Math.round(topic.performancePercentage)}%
                  </span>
                </div>
                <Progress value={topic.performancePercentage} className="h-2" />
                <p className="text-xs text-muted-foreground leading-tight">{topic.feedback}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-morphism border-white/10">
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <CardTitle>Weakest Areas Detected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-6">
              {result.weakestTopics.map((topic) => (
                <Badge key={topic} variant="destructive" className="px-3 py-1 bg-destructive/10 text-destructive border-destructive/20 uppercase tracking-tighter">
                  {topic}
                </Badge>
              ))}
            </div>
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <BrainCircuit className="text-primary w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm">Recommendation for Students</p>
                <p className="text-xs text-muted-foreground">
                  {result.weakestTopics.length > 0
                    ? <>Based on your errors, we recommend taking an <b>Adaptive Mock</b> focused on {result.weakestTopics[0]}. This will help improve your weakest area.</>
                    : <>Good progress so far. Continue with an <b>Adaptive Mock</b> to strengthen your overall performance.</>}
                </p>
                <Button asChild size="sm" variant="link" className="p-0 h-auto text-accent text-xs">
                  <Link href="/exam/new?adaptive=true">Start Adaptive Prep Now</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-bold">Detailed Question Review</h2>
        </div>
        <Accordion type="single" collapsible className="w-full space-y-4">
          {(result.questionEvaluations ?? []).map((evalItem, i) => {
            const originalQuestion = exam.questions.find(q => q.questionText === evalItem.questionText)
            const questionResult = exam.result!.results?.find((result) => result.question === evalItem.questionText)
            const selectedOptionText = originalQuestion?.options[evalItem.studentAnswer.charCodeAt(0) - 65]
            const correctOptionText = originalQuestion?.options[evalItem.correctAnswer.charCodeAt(0) - 65]
            const improvementText = evalItem.detailedFeedback
            const solutionText = questionResult?.explanation || evalItem.detailedFeedback

            return (
              <AccordionItem key={i} value={`item-${i}`} className="border rounded-xl border-white/5 bg-white/5 px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-4 text-left w-full">
                    {evalItem.isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive shrink-0" />
                    )}
                    <div className="flex-1 truncate pr-4">
                      <span className="font-medium text-sm">Question {i + 1}:</span>
                      <span className="ml-2 text-sm text-muted-foreground italic font-normal">
                        {evalItem.questionText}
                      </span>
                    </div>
                    <Badge variant="outline" className="ml-auto text-[10px] hidden sm:flex uppercase opacity-50">
                      {originalQuestion?.topic ?? 'Unknown'}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <div className="grid gap-4 mt-2">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="p-3 rounded-lg bg-background/50 border border-white/5">
                        <p className="text-xs text-muted-foreground uppercase mb-1">Your Answer</p>
                        <p className={`font-bold ${evalItem.isCorrect ? 'text-green-400' : 'text-destructive'}`}>
                          Option {evalItem.studentAnswer}
                          {selectedOptionText ? ` — ${selectedOptionText.replace(/^[A-D][).:\s-]*/i, '').trim()}` : ''}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-background/50 border border-white/5">
                        <p className="text-xs text-muted-foreground uppercase mb-1">Correct Answer</p>
                        <p className="font-bold text-green-400">
                          Option {evalItem.correctAnswer}
                          {correctOptionText ? ` — ${correctOptionText.replace(/^[A-D][).:\s-]*/i, '').trim()}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground uppercase">AI Explanation & Improvement Guide</p>
                        <div className="text-sm p-4 rounded-xl bg-accent/5 border border-accent/10 leading-relaxed whitespace-pre-line">
                          {improvementText}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground uppercase">AI Generated Step-by-Step Solution</p>
                        <div className="text-sm p-4 rounded-xl bg-background/50 border border-white/10 leading-relaxed whitespace-pre-line">
                          {solutionText}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground uppercase">Option-by-option reasoning</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {(['A', 'B', 'C', 'D'] as const).map((label) => (
                            <div key={label} className="p-3 rounded-lg bg-background/50 border border-white/5">
                              <p className="text-[11px] uppercase text-muted-foreground mb-1">Option {label}</p>
                              <p className="text-sm leading-relaxed">
                                {questionResult?.optionAnalysis?.[label] ?? 'Review this option carefully and compare it with the correct reasoning.'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
          {(result.questionEvaluations ?? []).length === 0 && (
            <Card className="glass-morphism border-white/10 p-6 text-center text-muted-foreground">
              No detailed question explanations are available for this result yet.
            </Card>
          )}
        </Accordion>
      </div>
    </div>
  )
}
