"use client"

import { useEffect, useState } from "react"
import { useAppStore, UserProfile, ExamRecord } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  PlusCircle, 
  Target, 
  History, 
  AlertCircle,
  Trophy,
  ArrowRight
} from "lucide-react"
import Link from "next/link"
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"

export default function DashboardPage() {
  const { getUser, getExams } = useAppStore()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [exams, setExams] = useState<ExamRecord[]>([])

  useEffect(() => {
    setUser(getUser())
    setExams(getExams().sort((a, b) => b.timestamp - a.timestamp))
  }, [])

  if (!user) return null

  const defaultWeakTopics = ["English", "Quantitative Aptitude", "Logical Reasoning"]
  const hasExamAnalysis = exams.some((exam) => (exam.result?.topicAnalysis?.length ?? 0) > 0)
  const weakTopics = Array.isArray(user.weakTopics) && user.weakTopics.length > 0
    ? user.weakTopics
    : defaultWeakTopics
  const displayedWeakTopics = Array.from(new Set([...weakTopics, ...defaultWeakTopics])).slice(0, 3)
  const topicPriorityLabel = hasExamAnalysis ? "High" : "Medium"

  const chartData = exams
    .slice(0, 5)
    .reverse()
    .map(e => ({
      name: new Date(e.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: e.result?.overallScore || 0
    }))

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Welcome back, {user.name}</h1>
          <p className="text-muted-foreground">Here&apos;s your preparation status for banking exams.</p>
        </div>
        <Button className="bg-accent hover:bg-accent/90 text-white">
          <Link href="/exam/new" className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" /> New Mock Exam
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-white hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
            <Trophy className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{Math.round(user.averageScore)}%</div>
            <p className="text-xs text-muted-foreground">
              Across {user.totalExams} mock exams
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-white hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Weakest Topic</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate text-foreground">{displayedWeakTopics[0] || "None yet"}</div>
            <p className="text-xs text-muted-foreground">
              Next exam will focus here.
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-white hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Level</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize text-foreground">{user.difficultyPreference}</div>
            <p className="text-xs text-muted-foreground">
              Adapts to your performance.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-border bg-white hover:shadow-md transition-all">
          <CardHeader>
            <CardTitle className="text-foreground">Recent Performance</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" stroke="#999999" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#999999" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                  <Tooltip 
                    cursor={{fill: '#f0f4f8'}} 
                    contentStyle={{backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px'}}
                  />
                  <Bar dataKey="score" fill="#1D4ED8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3 border-border bg-white hover:shadow-md transition-all">
          <CardHeader>
            <CardTitle className="text-foreground">Topic Focus</CardTitle>
            <CardDescription className="text-muted-foreground">Areas needing immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {displayedWeakTopics.length > 0 ? (
                displayedWeakTopics.map((topic, i) => (
                  <div key={topic} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/5">{i+1}</Badge>
                        <span className="font-medium text-foreground">{topic}</span>
                      </div>
                      <span className="text-muted-foreground text-xs">Priority: {topicPriorityLabel}</span>
                    </div>
                    <Progress value={25 + Math.random() * 20} className="h-1.5" />
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  Complete a mock test to get personalized high-priority topics.
                </div>
              )}
              
              {displayedWeakTopics.length > 0 && (
                <Button asChild className="w-full mt-4 bg-accent hover:bg-accent/90 text-white">
                  <Link href="/exam/new?adaptive=true">
                    Improve Weak Topics <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Recent Activity</h2>
          <Button variant="ghost" asChild size="sm">
            <Link href="/dashboard/history" className="text-primary hover:text-primary/90">View all</Link>
          </Button>
        </div>
        <div className="grid gap-4">
          {exams.length > 0 ? (
            exams.slice(0, 3).map((exam) => (
              <Link key={exam.id} href={`/exam/${exam.id}/results`}>
                <Card className="border-border bg-white hover:shadow-md transition-all cursor-pointer">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <History className="text-primary w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{exam.type} Mock Exam</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(exam.timestamp).toLocaleString()} • {exam.difficulty} difficulty
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-accent">{exam.result?.overallScore || 0}%</div>
                      <div className="text-xs text-muted-foreground">Score</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          ) : (
            <Card className="border-border bg-white p-8 text-center text-muted-foreground">
              No exams taken yet. Start your first mock test!
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}