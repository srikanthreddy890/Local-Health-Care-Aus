'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import SignOutButton from '@/app/_components/SignOutButton'
import { AdminProvider } from './AdminContext'
import { useAdminBadgeCounts } from '@/lib/hooks/useAdminStats'

interface Props {
  userId: string
  userEmail: string
  children: React.ReactNode
}

interface NavItem {
  href: string
  label: string
  badgeKey?: 'pendingClaims' | 'pendingBlog'
}

const navItems: NavItem[] = [
  { href: '/admin/overview', label: 'Overview' },
  { href: '/admin/patients', label: 'Patients' },
  { href: '/admin/appointments', label: 'Appointments' },
  { href: '/admin/claims', label: 'Claims', badgeKey: 'pendingClaims' },
  { href: '/admin/clinics', label: 'Clinics' },
  { href: '/admin/register-clinic', label: 'Register Clinic' },
  { href: '/admin/blog', label: 'Blog', badgeKey: 'pendingBlog' },
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
        {/* Sticky header */}
        <div className="border-b border-lhc-border bg-lhc-surface sticky top-0 z-10">
          <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-lhc-primary" />
              <h1 className="font-bold text-lhc-text-main text-lg">Admin Portal</h1>
              <Badge variant="secondary">Admin Access</Badge>
            </div>
            <SignOutButton />
          </div>

          {/* Horizontal nav */}
          <div className="overflow-x-auto border-t border-lhc-border">
            <nav className="container mx-auto px-4 sm:px-6 flex min-w-max gap-0.5 py-1">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/admin/overview' && pathname.startsWith(item.href))
                const count = item.badgeKey ? badgeCounts[item.badgeKey] : 0
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors',
                      isActive
                        ? 'bg-lhc-primary text-white'
                        : 'text-lhc-text-muted hover:text-lhc-text-main hover:bg-lhc-border',
                    )}
                  >
                    {item.label}
                    {count > 0 && (
                      <Badge className="ml-1 h-4 min-w-4 px-1 text-[10px] bg-amber-500 text-white border-0">
                        {count}
                      </Badge>
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Page content */}
        <div className="container mx-auto px-4 sm:px-6 py-6">{children}</div>
      </div>
    </AdminProvider>
  )
}
