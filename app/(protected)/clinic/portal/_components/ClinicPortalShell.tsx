'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Stethoscope, Calendar, MessageSquare, FileBox, ArrowRightLeft,
  FileText, Star, Receipt, Users, Settings, Shield, Pill, Inbox, MonitorCog, Newspaper, Globe,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import DefaultAvatar from '@/components/DefaultAvatar'
import { Badge } from '@/components/ui/badge'
import SignOutButton from '@/app/_components/SignOutButton'
import { useChatUnreadCount } from '@/lib/chat/useChatUnreadCount'
import type { LucideIcon } from 'lucide-react'

const ClinicDoctorSidebar = dynamic(() => import('./ClinicDoctorSidebar'), {
  ssr: false,
})
import type { PharmacyFeatureFlags } from '@/lib/utils/specializations'
import type { ClinicPermissions } from '@/lib/clinic/staffTypes'
import { ALL_PERMISSIONS, normalizePermissions } from '@/lib/clinic/staffTypes'

interface Props {
  clinicId: string
  clinicName: string
  clinicType: string | null
  clinicLogoUrl: string | null
  staffRole: string | null
  userId: string
  userEmail: string
  isOwner: boolean
  staffPermissions: ClinicPermissions | null
  featureFlags: PharmacyFeatureFlags
  centaurEnabled: boolean
  customApiEnabled: boolean
  emergencySlotsEnabled: boolean
  children: React.ReactNode
}

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  show: boolean
}

export default function ClinicPortalShell({
  clinicId,
  clinicName,
  clinicType,
  clinicLogoUrl,
  staffRole,
  userId,
  isOwner,
  staffPermissions,
  featureFlags,
  centaurEnabled,
  customApiEnabled,
  emergencySlotsEnabled,
  children,
}: Props) {
  const pathname = usePathname()
  const [isDoctorSidebarOpen, setIsDoctorSidebarOpen] = useState(false)
  const { unreadCount } = useChatUnreadCount(userId)

  // Resolve permissions — owner always gets ALL_PERMISSIONS
  const perms = isOwner ? ALL_PERMISSIONS : normalizePermissions(staffPermissions)

  const navItems: NavItem[] = [
    { href: '/clinic/portal/dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { href: '/clinic/portal/doctors', label: 'Doctors', icon: Stethoscope, show: perms.can_manage_doctors },
    { href: '/clinic/portal/appointments', label: 'Appointments', icon: Calendar, show: perms.can_manage_appointments },
    { href: '/clinic/portal/chat', label: 'Chat', icon: MessageSquare, show: featureFlags.showChat && perms.can_view_chat },
    { href: '/clinic/portal/documents', label: 'Documents', icon: FileBox, show: featureFlags.showPatientDocuments && perms.can_manage_documents },
    { href: '/clinic/portal/referrals', label: 'Referrals', icon: ArrowRightLeft, show: featureFlags.showReferrals && perms.can_manage_referrals },
    { href: '/clinic/portal/quotes', label: 'Quotes', icon: FileText, show: featureFlags.showQuotes && perms.can_manage_quotes },
    { href: '/clinic/portal/loyalty', label: 'Loyalty', icon: Star, show: featureFlags.showLoyaltyPoints && perms.can_manage_loyalty },
    { href: '/clinic/portal/billing', label: 'Billing', icon: Receipt, show: isOwner || perms.can_manage_billing },
    { href: '/clinic/portal/staff', label: 'Staff', icon: Users, show: true },
    { href: '/clinic/portal/settings', label: 'Settings', icon: Settings, show: isOwner || perms.can_manage_settings },
    { href: '/clinic/portal/security', label: 'Security', icon: Shield, show: true },
    { href: '/clinic/portal/prescriptions', label: 'Prescriptions', icon: Pill, show: perms.can_manage_prescriptions },
    {
      href: '/clinic/portal/prescriptions/incoming',
      label: 'Rx Inbox',
      icon: Inbox,
      show: featureFlags.showIncomingPrescriptions && perms.can_manage_prescriptions,
    },
    { href: '/clinic/portal/integrations', label: 'Integrations', icon: Globe, show: customApiEnabled && (isOwner || perms.can_manage_settings) },
    { href: '/clinic/portal/centaur', label: 'Centaur', icon: MonitorCog, show: centaurEnabled && perms.can_manage_settings },
    { href: '/clinic/portal/blog', label: 'Blog', icon: Newspaper, show: isOwner || perms.can_manage_blog },
  ]

  const visibleNav = navItems.filter((n) => n.show)

  return (
    <div className="min-h-screen bg-lhc-background relative">
      <div className={cn('transition-all duration-300', isDoctorSidebarOpen ? 'mr-[420px] lg:mr-[420px]' : '')}>
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="border-b border-[var(--color-border-tertiary,#E5E7EB)] bg-white sticky top-0 z-[110]">
          <div className="container mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {/* Clinic logo / fallback */}
              <div className="w-8 h-8 rounded-lg shrink-0 overflow-hidden">
                {clinicLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={clinicLogoUrl} alt={clinicName} className="w-full h-full object-cover" />
                ) : (
                  <DefaultAvatar variant="clinic" className="w-full h-full rounded-lg" iconScale={0.55} />
                )}
              </div>
              <div>
                <h1 className="font-medium text-lhc-text-main text-[16px] leading-tight">{clinicName || 'Clinic Portal'}</h1>
                {clinicType && (
                  <p className="text-[11px] text-lhc-text-muted capitalize leading-tight">{clinicType.replace(/_/g, ' ')}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {staffRole && (
                <Badge variant="secondary" className="capitalize text-[11px]">
                  {staffRole}
                </Badge>
              )}
              <SignOutButton />
            </div>
          </div>
        </div>

        {/* ── Icon + label tab bar ───────────────────────────────── */}
        <nav className="sticky top-16 z-[100] bg-white border-b border-[#E5E7EB]">
          <div className="container mx-auto px-4 sm:px-6 overflow-x-auto scrollbar-hide">
            <div className="flex items-center min-w-max">
              {visibleNav.map((item) => {
                const Icon = item.icon
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/clinic/portal/dashboard' && pathname.startsWith(item.href))
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
                      {item.label === 'Chat' && unreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-2.5 h-4 min-w-4 px-0.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold">
                          {unreadCount > 99 ? '99+' : unreadCount}
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
