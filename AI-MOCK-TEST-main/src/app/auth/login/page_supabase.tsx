"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { BrainCircuit, Loader2 } from "lucide-react"
import { supabase, recordLogin } from "@/lib/supabase-client"

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const email = String(formData.get("email") || "").trim().toLowerCase()
    const password = String(formData.get("password") || "")

    try {
      // Fetch user from Supabase
      const { data: users, error: queryError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

      if (queryError || !users) {
        throw new Error("Invalid email or password")
      }

      // Simple password comparison (in production, use bcrypt verification)
      // Note: This is simplified. In production, use proper password hashing on backend
      if (users.password_hash !== password) {
        throw new Error("Invalid email or password")
      }

      // Record login in login_history table
      await recordLogin(users.id)

      // Store current user in localStorage for quick access
      if (typeof window !== 'undefined') {
        localStorage.setItem('current_user_id', users.id)
        localStorage.setItem('current_user_email', users.email)
        localStorage.setItem('current_user_name', users.name)
      }

      router.push("/dashboard")
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Login failed. Please check your credentials and try again."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-8">
        <Card className="border-white/10 glass-morphism">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <BrainCircuit className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Login</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your dashboard
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  placeholder="student@example.com" 
                  required 
                  className="bg-background/50 border-white/10" 
                  disabled={loading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  name="password" 
                  type="password" 
                  required 
                  className="bg-background/50 border-white/10" 
                  disabled={loading}
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90" 
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Sign In"}
              </Button>
              <div className="text-sm text-center text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/auth/signup" className="text-accent hover:underline">
                  Sign up
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Info Box */}
        <Card className="border-white/10 bg-blue-50/10 p-4">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Demo Credentials:</strong><br/>
            Email: test@example.com<br/>
            Password: password123
          </p>
        </Card>
      </div>
    </div>
  )
}
