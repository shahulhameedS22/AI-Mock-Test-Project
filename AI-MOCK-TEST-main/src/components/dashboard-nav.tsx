"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/lib/store"
import { 
  LayoutDashboard, 
  FileText, 
  Settings, 
  History, 
  LogOut, 
  BrainCircuit,
  PieChart
} from "lucide-react"

const items = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Mock Tests",
    href: "/exam/new",
    icon: FileText,
  },
  {
    title: "Performance",
    href: "/dashboard/performance",
    icon: PieChart,
  },
  {
    title: "History",
    href: "/dashboard/history",
    icon: History,
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
]

export function DashboardNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAppStore()

  return (
    <nav className="flex flex-col h-full bg-white border-r border-border px-4 py-6 w-64 shrink-0">
      <div className="flex items-center gap-2 mb-8 pb-4 border-b border-border">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <BrainCircuit className="h-5 w-5 text-white" />
        </div>
        <span className="font-bold text-lg text-foreground">BankMaster</span>
      </div>
      <div className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
              pathname === item.href
                ? "bg-primary text-white"
                : "text-foreground hover:bg-blue-50 hover:text-primary"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.title}
          </Link>
        ))}
      </div>

      <div className="mt-auto">
        <button
          type="button"
          onClick={() => {
            logout()
            router.push("/auth/login")
          }}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </nav>
  )
}
