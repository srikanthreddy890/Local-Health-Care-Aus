'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import SignOutButton from '@/app/_components/SignOutButton'
import ClinicDoctorSidebar from './ClinicDoctorSidebar'
import { useChatUnreadCount } from '@/lib/chat/useChatUnreadCount'
import type { PharmacyFeatureFlags } from '@/lib/utils/specializations'

interface Props {
  clinicId: string
  clinicName: string
  clinicType: string | null
  staffRole: string | null
  userId: string
  userEmail: string
  isOwner: boolean
  featureFlags: PharmacyFeatureFlags
  centaurEnabled: boolean
  emergencySlotsEnabled: boolean
  children: React.ReactNode
}

interface NavItem {
  href: string
  label: string
  show: boolean
}

export default function ClinicPortalShell({
  clinicId,
  clinicName,
  clinicType,
  staffRole,
  userId,
  isOwner,
  featureFlags,
  centaurEnabled,
  emergencySlotsEnabled,
  children,
}: Props) {
  const pathname = usePathname()
  const [isDoctorSidebarOpen, setIsDoctorSidebarOpen] = useState(false)
  const { unreadCount } = useChatUnreadCount(userId)

  const navItems: NavItem[] = [
    { href: '/clinic/portal/dashboard', label: 'Dashboard', show: true },
    { href: '/clinic/portal/doctors', label: 'Doctors', show: true },
    { href: '/clinic/portal/appointments', label: 'Appointments', show: true },
    { href: '/clinic/portal/chat', label: 'Chat', show: featureFlags.showChat },
    { href: '/clinic/portal/documents', label: 'Documents', show: featureFlags.showPatientDocuments },
    { href: '/clinic/portal/referrals', label: 'Referrals', show: featureFlags.showReferrals },
    { href: '/clinic/portal/quotes', label: 'Quotes', show: featureFlags.showQuotes },
    { href: '/clinic/portal/loyalty', label: 'Loyalty', show: featureFlags.showLoyaltyPoints },
    { href: '/clinic/portal/billing', label: 'Billing', show: isOwner },
    { href: '/clinic/portal/staff', label: 'Staff', show: true },
    { href: '/clinic/portal/settings', label: 'Settings', show: isOwner },
    { href: '/clinic/portal/security', label: 'Security', show: true },
    { href: '/clinic/portal/prescriptions', label: 'Prescriptions', show: true },
    {
      href: '/clinic/portal/prescriptions/incoming',
      label: 'Rx Inbox',
      show: featureFlags.showIncomingPrescriptions,
    },
    { href: '/clinic/portal/centaur', label: 'Centaur', show: centaurEnabled },
    { href: '/clinic/portal/blog', label: 'Blog', show: isOwner },
  ]

  const visibleNav = navItems.filter((n) => n.show)

  return (
    <div className="min-h-screen bg-lhc-background relative">
      <div className={cn('transition-all duration-300', isDoctorSidebarOpen ? 'mr-[420px] lg:mr-[420px]' : '')}>
        {/* Sticky header */}
        <div className="border-b border-lhc-border bg-lhc-surface sticky top-0 z-10">
          <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div>
              <h1 className="font-bold text-lhc-text-main text-lg">{clinicName || 'Clinic Portal'}</h1>
              {clinicType && (
                <p className="text-xs text-lhc-text-muted capitalize">{clinicType.replace(/_/g, ' ')}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {staffRole && (
                <Badge variant="secondary" className="capitalize">
                  {staffRole}
                </Badge>
              )}
              <SignOutButton />
            </div>
          </div>

          {/* Horizontal nav */}
          <div className="overflow-x-auto border-t border-lhc-border">
            <nav className="container mx-auto px-4 sm:px-6 flex min-w-max gap-0.5 py-1">
              {visibleNav.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/clinic/portal/dashboard' && pathname.startsWith(item.href))
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
                    {item.label === 'Chat' && unreadCount > 0 && (
                      <Badge className="ml-1 h-4 min-w-4 px-1 text-[10px] bg-lhc-primary text-white border-0">
                        {unreadCount > 99 ? '99+' : unreadCount}
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

      {/* Fixed doctor sidebar */}
      <ClinicDoctorSidebar
        clinicId={clinicId}
        isOpen={isDoctorSidebarOpen}
        onToggle={() => setIsDoctorSidebarOpen((prev) => !prev)}
        emergencySlotsEnabled={emergencySlotsEnabled}
      />
    </div>
  )
}
