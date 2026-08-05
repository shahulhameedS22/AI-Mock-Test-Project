"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BrainCircuit, Users, FileQuestion, Settings, ShieldCheck, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export const dynamic = 'force-dynamic'

export default function AdminDashboard() {
  return (
    <div className="container py-10 px-4 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-lg">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold">QuantumQuizzes <span className="text-primary">Admin</span></h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Backup System</Button>
          <Button>System Restart</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-morphism border-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,284</div>
            <p className="text-xs text-muted-foreground">+12% from last week</p>
          </CardContent>
        </Card>
        <Card className="glass-morphism border-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Exams Generated</CardTitle>
            <BrainCircuit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15,402</div>
            <p className="text-xs text-muted-foreground">Avg 12 questions per exam</p>
          </CardContent>
        </Card>
        <Card className="glass-morphism border-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">AI Tokens Used</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.4M</div>
            <p className="text-xs text-muted-foreground">85% within quota</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="bg-muted/50 border border-white/10 p-1 mb-6">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="content">Question Bank</TabsTrigger>
          <TabsTrigger value="settings">AI Config</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <Card className="glass-morphism border-white/5">
            <CardHeader>
              <CardTitle>Registered Students</CardTitle>
              <CardDescription>Manage user accounts and view preparation metrics.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center font-bold">JD</div>
                      <div>
                        <p className="font-semibold">User_{i}@example.com</p>
                        <p className="text-xs text-muted-foreground">Joined 2 days ago • {4 * i} exams taken</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">Manage</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="content">
          <Card className="glass-morphism border-white/5">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>AI Question Generation Logs</CardTitle>
                <CardDescription>History of system-generated content quality.</CardDescription>
              </div>
              <Button size="sm"><FileQuestion className="mr-2 h-4 w-4" /> Seed Content</Button>
            </CardHeader>
            <CardContent>
              <div className="p-10 text-center text-muted-foreground italic border-2 border-dashed border-white/5 rounded-xl">
                Dynamic generation logs will appear here after more student activity.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="settings">
          <Card className="glass-morphism border-white/5">
            <CardHeader>
              <CardTitle>AI Global Settings</CardTitle>
              <CardDescription>Fine-tune model behavior and prompts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                <div className="space-y-0.5">
                  <p className="font-medium">Model Temperature</p>
                  <p className="text-xs text-muted-foreground">Controls creativity of question generation.</p>
                </div>
                <Badge variant="outline">0.7 (Stable)</Badge>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                <div className="space-y-0.5">
                  <p className="font-medium">Repetition Penalty</p>
                  <p className="text-xs text-muted-foreground">Prevents identical questions for same users.</p>
                </div>
                <Badge className="bg-accent">Enabled</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}