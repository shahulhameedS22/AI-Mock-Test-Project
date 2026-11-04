"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, FileQuestion, CheckCircle2, ShieldCheck } from "lucide-react"

interface Stats {
  totalUsers: number
  totalExams: number
  completedExams: number
  users: Array<{ id: string; name: string; email: string; role: string; total_exams: number; average_score: number; last_login: string | null; created_at: string }>
}

// Access control is enforced by middleware (must be logged in) AND by /api/admin/stats (must have role = admin).
export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<{ status: number; message: string } | null>(null)

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw { status: r.status, message: data.error ?? "Failed to load" }
        setStats(data)
      })
      .catch((e) => setError({ status: e.status ?? 0, message: e.message ?? "Failed to load" }))
  }, [])

  if (error) {
    return (
      <div className="container py-20 text-center space-y-4">
        <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground" />
        <p role="alert" className="text-lg">{error.status === 403 ? "You don't have access to this page." : error.message}</p>
        <Button asChild><Link href="/dashboard">Back to dashboard</Link></Button>
      </div>
    )
  }
  if (!stats) return <div className="container py-10 space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-64 w-full" /></div>

  const cards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users },
    { label: "Exams Generated", value: stats.totalExams, icon: FileQuestion },
    { label: "Exams Completed", value: stats.completedExams, icon: CheckCircle2 },
  ]

  return (
    <div className="container py-10 px-4 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary rounded-lg"><ShieldCheck className="w-6 h-6 text-white" /></div>
        <h1 className="text-3xl font-bold">BankMaster <span className="text-primary">Admin</span></h1>
        <Button asChild variant="outline" className="ml-auto"><Link href="/dashboard">Dashboard</Link></Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle><Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{value.toLocaleString()}</div></CardContent>
          </Card>
        ))}
      </div>
      <Card className="bg-white">
        <CardHeader><CardTitle>Registered Students</CardTitle><CardDescription>Latest 100 accounts</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Exams</TableHead><TableHead>Avg score</TableHead><TableHead>Joined</TableHead></TableRow></TableHeader>
            <TableBody>
              {stats.users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell><TableCell>{u.email}</TableCell>
                  <TableCell><Badge variant={u.role === "admin" ? "default" : "outline"}>{u.role}</Badge></TableCell>
                  <TableCell>{u.total_exams}</TableCell><TableCell>{Math.round(u.average_score)}%</TableCell>
                  <TableCell>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
