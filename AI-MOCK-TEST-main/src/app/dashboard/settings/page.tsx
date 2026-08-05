"use client"

import { useEffect, useState } from "react"
import { useAppStore, UserProfile } from "@/lib/store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Bell, Lock, Eye, Volume2, Zap } from "lucide-react"

export default function SettingsPage() {
  const { getUser, updateUser } = useAppStore()
  const [user, setUser] = useState<UserProfile | null>(null)
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setUser(getUser())
  }, [])

  const handleSaveProfile = async () => {
    if (!user) return
    setLoading(true)
    try {
      updateUser(user)
      toast({
        title: "Success",
        description: "Profile settings saved successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences and settings</p>
      </div>

      {/* Profile Settings */}
      <Card className="glass-morphism border-white/5">
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={user.name}
                onChange={(e) => setUser({ ...user, name: e.target.value })}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user.email}
                onChange={(e) => setUser({ ...user, email: e.target.value })}
                className="mt-2"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="targetExam">Target Exam</Label>
            <Select value={user.targetExam || ""} onValueChange={(value) => setUser({ ...user, targetExam: value })}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select target exam" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sbi-po">SBI PO</SelectItem>
                <SelectItem value="sbi-clerk">SBI Clerk</SelectItem>
                <SelectItem value="ibps-po">IBPS PO</SelectItem>
                <SelectItem value="ibps-clerk">IBPS Clerk</SelectItem>
                <SelectItem value="rrb-ntpc">RRB NTPC</SelectItem>
                <SelectItem value="ssc-cgl">SSC CGL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSaveProfile} disabled={loading}>
            {loading ? "Saving..." : "Save Profile Changes"}
          </Button>
        </CardContent>
      </Card>

      <Separator className="bg-white/10" />

      {/* Notification Settings */}
      <Card className="glass-morphism border-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Manage how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Exam Reminders</p>
              <p className="text-sm text-muted-foreground">Get reminded about upcoming mock exams</p>
            </div>
            <input type="checkbox" className="h-4 w-4" defaultChecked />
          </div>
          <Separator className="bg-white/10" />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Performance Updates</p>
              <p className="text-sm text-muted-foreground">Weekly performance summaries</p>
            </div>
            <input type="checkbox" className="h-4 w-4" defaultChecked />
          </div>
          <Separator className="bg-white/10" />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">New Features</p>
              <p className="text-sm text-muted-foreground">Updates about new features</p>
            </div>
            <input type="checkbox" className="h-4 w-4" defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Separator className="bg-white/10" />

      {/* Exam Preferences */}
      <Card className="glass-morphism border-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Exam Preferences
          </CardTitle>
          <CardDescription>Customize your exam experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="difficulty">Preferred Difficulty Level</Label>
            <Select defaultValue="medium">
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="duration">Preferred Exam Duration</Label>
            <Select defaultValue="120">
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
                <SelectItem value="180">3 hours</SelectItem>
                <SelectItem value="240">4 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button>Save Preferences</Button>
        </CardContent>
      </Card>

      <Separator className="bg-white/10" />

      {/* Security */}
      <Card className="glass-morphism border-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>Manage your account security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full">
            Change Password
          </Button>
          <Button variant="outline" className="w-full">
            Two-Factor Authentication
          </Button>
          <Button variant="destructive" className="w-full">
            Delete Account
          </Button>
        </CardContent>
      </Card>

      <Separator className="bg-white/10" />

      {/* About */}
      <Card className="glass-morphism border-white/5">
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">App Version</span>
            <span>1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last Updated</span>
            <span>{new Date().toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Build</span>
            <span>Development</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
