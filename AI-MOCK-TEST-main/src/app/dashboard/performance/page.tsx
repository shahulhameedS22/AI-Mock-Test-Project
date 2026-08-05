"use client"

import { useEffect, useState } from "react"
import { useAppStore, ExamRecord } from "@/lib/store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { TrendingUp, TrendingDown } from "lucide-react"

function normalizeSectionName(topic: string) {
  const normalized = topic.trim().toLowerCase();
  if (normalized.includes('english')) return 'English';
  if (normalized.includes('aptitude') || normalized.includes('quant')) return 'Quantitative Aptitude';
  if (normalized.includes('reasoning') || normalized.includes('puzzle') || normalized.includes('seating') || normalized.includes('syllogism') || normalized.includes('inequality') || normalized.includes('coding') || normalized.includes('direction') || normalized.includes('analogy') || normalized.includes('classification') || normalized.includes('logical sequence')) return 'Logical Reasoning';
  return 'Other';
}

function getCategoryPerformance(exams: ExamRecord[]) {
  const stats: Record<string, { total: number; count: number }> = {
    English: { total: 0, count: 0 },
    'Quantitative Aptitude': { total: 0, count: 0 },
    'Logical Reasoning': { total: 0, count: 0 },
  };

  for (const exam of exams) {
    const topicAnalysis = exam.result?.topicAnalysis ?? [];
    for (const topic of topicAnalysis) {
      const category = normalizeSectionName(topic.topic);
      if (stats[category]) {
        stats[category].total += topic.performancePercentage;
        stats[category].count += 1;
      }
    }
  }

  return Object.entries(stats).map(([category, value]) => ({
    category,
    percentage: value.count ? Math.round(value.total / value.count) : 0,
    score: value.count ? Math.round(value.total / value.count) : 0,
  }));
}

function getExamSectionAverages(topicAnalysis: ExamRecord["result"] extends infer R ? R extends { topicAnalysis: Array<{ topic: string; performancePercentage: number }> } ? R["topicAnalysis"] : never : never) {
  const stats: Record<string, { total: number; count: number }> = {
    English: { total: 0, count: 0 },
    'Quantitative Aptitude': { total: 0, count: 0 },
    'Logical Reasoning': { total: 0, count: 0 },
  };

  for (const topic of topicAnalysis ?? []) {
    const category = normalizeSectionName(topic.topic);
    if (stats[category]) {
      stats[category].total += topic.performancePercentage;
      stats[category].count += 1;
    }
  }

  return Object.entries(stats).map(([category, value]) => ({
    category,
    average: value.count ? Math.round(value.total / value.count) : 0,
  }))
}

function getMostImprovedSection(exams: ExamRecord[]) {
  if (exams.length < 2) return null

  const latest = exams[0]
  const previous = exams[1]
  const latestAverages = getExamSectionAverages(latest.result?.topicAnalysis ?? [])
  const previousAverages = getExamSectionAverages(previous.result?.topicAnalysis ?? [])

  const improvements = latestAverages.map((latestSection) => {
    const previousSection = previousAverages.find((section) => section.category === latestSection.category)
    return {
      category: latestSection.category,
      delta: latestSection.average - (previousSection?.average ?? 0),
      latest: latestSection.average,
      previous: previousSection?.average ?? 0,
    }
  })

  const bestImprovement = improvements.sort((a, b) => b.delta - a.delta)[0]
  return bestImprovement && bestImprovement.delta > 0 ? bestImprovement : null
}

function getWeakTopicSuggestions(exams: ExamRecord[], user: any) {
  const latestExam = exams[0]
  const weakTopics: string[] = []

  if (latestExam?.result?.topicAnalysis?.length) {
    weakTopics.push(
      ...latestExam.result.topicAnalysis
        .sort((a, b) => a.performancePercentage - b.performancePercentage)
        .slice(0, 3)
        .map((topic) => normalizeSectionName(topic.topic))
    )
  }

  if (Array.isArray(user?.weakTopics) && user.weakTopics.length) {
    weakTopics.push(...user.weakTopics)
  } else {
    weakTopics.push("English", "Quantitative Aptitude", "Logical Reasoning")
  }

  return Array.from(new Set(weakTopics)).slice(0, 4)
}

export const dynamic = 'force-dynamic'

export default function PerformancePage() {
  const { getExams, getUser } = useAppStore()
  const [exams, setExams] = useState<ExamRecord[]>([])
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    setExams(getExams().sort((a, b) => b.timestamp - a.timestamp))
    setUser(getUser())
  }, [])

  const latestImprovement = getMostImprovedSection(exams)
  const weakTopicSuggestions = getWeakTopicSuggestions(exams, user)

  const chartData = exams
    .slice(0, 10)
    .reverse()
    .map(e => ({
      date: new Date(e.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: e.result?.overallScore || 0,
    }))

  const categoryPerformance = getCategoryPerformance(exams)

  const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b"]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Performance Analytics</h1>
        <p className="text-muted-foreground">Track your progress and identify improvement areas</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-morphism border-white/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user?.averageScore || 0}%</div>
            <p className="text-xs text-muted-foreground">Across all exams</p>
          </CardContent>
        </Card>

        <Card className="glass-morphism border-white/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Best Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.max(...exams.map(e => e.result?.overallScore || 0), 0)}%</div>
            <p className="text-xs text-muted-foreground">Personal best</p>
          </CardContent>
        </Card>

        <Card className="glass-morphism border-white/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{exams.length}</div>
            <p className="text-xs text-muted-foreground">Mock exams taken</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="glass-morphism border-white/5">
          <CardHeader>
            <CardTitle>Most Improved Section</CardTitle>
            <CardDescription>Latest score growth between your last two exams</CardDescription>
          </CardHeader>
          <CardContent>
            {latestImprovement ? (
              <div className="space-y-3">
                <p className="text-lg font-semibold">{latestImprovement.category}</p>
                <p className="text-sm text-muted-foreground">
                  Improved by <span className="font-semibold">{latestImprovement.delta}%</span> from {latestImprovement.previous}% to {latestImprovement.latest}%.
                </p>
                <p className="text-xs text-muted-foreground">
                  Keep strengthening this section to turn improvement into a consistent strength.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Take at least two exams to see your most improved section here.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-morphism border-white/5">
          <CardHeader>
            <CardTitle>Practice Suggestions</CardTitle>
            <CardDescription>Weak-topic focus for the next session</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Focus on the sections where you need the most practice next.
              </p>
              <div className="flex flex-wrap gap-2">
                {weakTopicSuggestions.length > 0 ? (
                  weakTopicSuggestions.map((topic) => (
                    <Badge key={topic} variant="secondary" className="px-3 py-1 uppercase tracking-wide">
                      {topic}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">Your latest exam data will surface targeted topics here.</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-morphism border-white/5">
        <CardHeader>
          <CardTitle>Score Trend</CardTitle>
          <CardDescription>Your performance over recent exams</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="score" stroke="#3b82f6" name="Score %" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="glass-morphism border-white/5">
          <CardHeader>
            <CardTitle>Category Performance</CardTitle>
            <CardDescription>Your strengths and weaknesses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="percentage" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-morphism border-white/5">
          <CardHeader>
            <CardTitle>Subject Distribution</CardTitle>
            <CardDescription>Performance breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryPerformance}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percentage }) => `${category}: ${percentage}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="percentage"
                >
                  {categoryPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
