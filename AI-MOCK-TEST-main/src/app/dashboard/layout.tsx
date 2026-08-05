"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardNav } from "@/components/dashboard-nav"
import { useAppStore } from "@/lib/store"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { getUser } = useAppStore()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!getUser()) {
      router.replace("/auth/login")
      return
    }

    setReady(true)
  }, [getUser, router])

  if (!ready) return null

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardNav />
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
