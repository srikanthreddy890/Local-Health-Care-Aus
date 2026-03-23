'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Shield, Users, Calendar, FileText, Building2, PlusCircle, Newspaper,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import SignOutButton from '@/app/_components/SignOutButton'
import { AdminProvider } from './AdminContext'
import { useAdminBadgeCounts } from '@/lib/hooks/useAdminStats'
import type { LucideIcon } from 'lucide-react'

interface Props {
  userId: string
  userEmail: string
  children: React.ReactNode
}

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  badgeKey?: 'pendingClaims' | 'pendingBlog'
}

const navItems: NavItem[] = [
  { href: '/admin/overview', label: 'Overview', icon: Shield },
  { href: '/admin/patients', label: 'Patients', icon: Users },
  { href: '/admin/appointments', label: 'Appointments', icon: Calendar },
  { href: '/admin/claims', label: 'Claims', icon: FileText, badgeKey: 'pendingClaims' },
  { href: '/admin/clinics', label: 'Clinics', icon: Building2 },
  { href: '/admin/register-clinic', label: 'Register', icon: PlusCircle },
  { href: '/admin/blog', label: 'Blog', icon: Newspaper, badgeKey: 'pendingBlog' },
]

export default function AdminPortalShell({ userId, userEmail, children }: Props) {
  const pathname = usePathname()
  const { pendingClaims, pendingBlog } = useAdminBadgeCounts(userId)

  const badgeCounts: Record<string, number> = {
    pendingClaims,
    pendingBlog,
  }

  return (
    <AdminProvider userId={userId} userEmail={userEmail}>
      <div className="min-h-screen bg-lhc-background">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="border-b border-[#E5E7EB] bg-white sticky top-0 z-[110]">
          <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-lhc-primary" />
              <h1 className="font-bold text-lhc-text-main text-lg">Admin Portal</h1>
              <Badge variant="secondary">Admin Access</Badge>
            </div>
            <SignOutButton />
          </div>
        </div>

        {/* ── Icon + label tab bar ───────────────────────────────── */}
        <nav className="sticky top-16 z-[100] bg-white border-b border-[#E5E7EB]">
          <div className="container mx-auto px-4 sm:px-6 overflow-x-auto scrollbar-hide">
            <div className="flex items-center min-w-max">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/admin/overview' && pathname.startsWith(item.href))
                const count = item.badgeKey ? badgeCounts[item.badgeKey] : 0
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'relative flex flex-col items-center justify-center h-14 px-3.5 transition-colors duration-150',
                      isActive
                        ? '[&>div>svg]:text-[#00A86B] [&>span]:text-[#00A86B] [&>span]:font-medium'
                        : '[&>div>svg]:text-[#9CA3AF] [&>span]:text-[#9CA3AF] hover:bg-[#F9FAFB]',
                    )}
                  >
                    <div className="relative">
                      <Icon className="w-4 h-4" />
                      {count > 0 && (
                        <span className="absolute -top-1.5 -right-2.5 h-4 min-w-4 px-0.5 flex items-center justify-center rounded-full bg-amber-500 text-white text-[9px] font-bold">
                          {count}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] mt-0.5 whitespace-nowrap">{item.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#00A86B] rounded-full" />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        </nav>

        {/* ── Page content ───────────────────────────────────────── */}
        <div className="container mx-auto px-4 sm:px-6 py-6">{children}</div>
      </div>
    </AdminProvider>
  )
}
