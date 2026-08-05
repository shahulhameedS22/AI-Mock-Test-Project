"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, RefreshCw, Download } from "lucide-react"
import { getAllUsersAnalytics, getTotalStats, getLoginHistory } from "@/lib/supabase-client"

interface UserStat {
  id: string
  name: string
  email: string
  average_score: number
  total_exams: number
  last_login: string | null
  login_count: number
  created_at: string
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserStat[]>([])
  const [stats, setStats] = useState({ totalUsers: 0, totalExams: 0, totalLogins: 0 })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<"exams" | "score" | "logins">("exams")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [usersData, statsData] = await Promise.all([
        getAllUsersAnalytics(),
        getTotalStats(),
      ])
      setUsers(usersData || [])
      setStats(statsData)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const sortedUsers = [...users].sort((a, b) => {
    switch (sortBy) {
      case "exams":
        return b.total_exams - a.total_exams
      case "score":
        return b.average_score - a.average_score
      case "logins":
        return b.login_count - a.login_count
      default:
        return 0
    }
  })

  const filteredUsers = sortedUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const exportToCSV = () => {
    const headers = ["Name", "Email", "Avg Score", "Total Exams", "Total Logins", "Last Login", "Joined"]
    const rows = users.map((user) => [
      user.name,
      user.email,
      user.average_score.toFixed(2),
      user.total_exams,
      user.login_count,
      user.last_login ? new Date(user.last_login).toLocaleDateString() : "Never",
      new Date(user.created_at).toLocaleDateString(),
    ])

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `users_analytics_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">User analytics and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Registered accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Exams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalExams}</div>
            <p className="text-xs text-muted-foreground">Completed tests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Logins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLogins}</div>
            <p className="text-xs text-muted-foreground">User sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Logins/User</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalUsers > 0 ? (stats.totalLogins / stats.totalUsers).toFixed(1) : 0}
            </div>
            <p className="text-xs text-muted-foreground">Sessions per user</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users Analytics</CardTitle>
          <CardDescription>
            {filteredUsers.length} of {users.length} users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Sort */}
          <div className="flex gap-4 flex-wrap">
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <div className="flex gap-2">
              {(["exams", "score", "logins"] as const).map((option) => (
                <Button
                  key={option}
                  variant={sortBy === option ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortBy(option)}
                >
                  Sort by {option}
                </Button>
              ))}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {users.length === 0 ? "No users yet" : "No results found"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Name</th>
                    <th className="text-left py-3 px-4 font-medium">Email</th>
                    <th className="text-right py-3 px-4 font-medium">Avg Score</th>
                    <th className="text-right py-3 px-4 font-medium">Exams</th>
                    <th className="text-right py-3 px-4 font-medium">Logins</th>
                    <th className="text-left py-3 px-4 font-medium">Last Login</th>
                    <th className="text-left py-3 px-4 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">{user.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{user.email}</td>
                      <td className="py-3 px-4 text-right">
                        <Badge
                          variant={user.average_score >= 75 ? "default" : "secondary"}
                        >
                          {user.average_score.toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">{user.total_exams}</td>
                      <td className="py-3 px-4 text-right">{user.login_count}</td>
                      <td className="py-3 px-4">
                        {user.last_login ? (
                          <span className="text-xs">
                            {new Date(user.last_login).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Never</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
