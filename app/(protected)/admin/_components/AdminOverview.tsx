'use client'

import Link from 'next/link'
import {
  Shield,
  Users,
  Building2,
  Stethoscope,
  Calendar,
  DollarSign,
  AlertCircle,
  UserPlus,
  ClipboardList,
  FileText,
  Loader2,
  BookOpen,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useAdminContext } from './AdminContext'
import { useAdminStats } from '@/lib/hooks/useAdminStats'

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string
  value: string | number
  subtitle: string
  icon: React.ElementType
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-lhc-primary/10">
            <Icon className="w-5 h-5 text-lhc-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-lhc-text-main">{value}</p>
            <p className="text-sm font-medium text-lhc-text-main">{title}</p>
            <p className="text-xs text-lhc-text-muted">{subtitle}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminOverview() {
  const { userId } = useAdminContext()
  const { data: stats, isLoading, isError } = useAdminStats(userId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-lhc-primary" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
        <p className="text-sm text-lhc-text-muted">Failed to load dashboard stats. Please try refreshing.</p>
      </div>
    )
  }

  const s = stats ?? {
    totalClinics: 0,
    activeClinics: 0,
    totalDoctors: 0,
    totalBookings: 0,
    totalPatients: 0,
    clinicsWithBilling: 0,
    pendingClaims: 0,
    pendingBlog: 0,
  }

  const billingCoverage =
    s.totalClinics > 0 ? Math.round((s.clinicsWithBilling / s.totalClinics) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-lhc-text-main">Dashboard Overview</h2>
        <p className="text-sm text-lhc-text-muted">Platform-wide statistics and quick actions</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Pending Claims" value={s.pendingClaims} subtitle="Awaiting review" icon={AlertCircle} />
        <StatCard title="Total Patients" value={s.totalPatients} subtitle="Registered patients" icon={Users} />
        <StatCard
          title="Clinics"
          value={s.totalClinics}
          subtitle={`${s.activeClinics} active`}
          icon={Building2}
        />
        <StatCard title="Doctors" value={s.totalDoctors} subtitle="Active doctors" icon={Stethoscope} />
        <StatCard title="Total Bookings" value={s.totalBookings} subtitle="All time bookings" icon={Calendar} />
        <StatCard title="Coverage" value={`${billingCoverage}%`} subtitle="Billing coverage" icon={DollarSign} />
        <StatCard title="Pending Blog" value={s.pendingBlog} subtitle="Awaiting review" icon={BookOpen} />
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-sm font-semibold text-lhc-text-main mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Link
            href="/admin/patients"
            className="inline-flex items-center justify-start gap-2 h-10 px-4 py-2 text-sm font-medium rounded-lg border border-lhc-border bg-transparent text-lhc-text-main hover:bg-lhc-background transition-colors"
          >
            <Users className="w-4 h-4" /> Manage Patients
          </Link>
          <Link
            href="/admin/appointments"
            className="inline-flex items-center justify-start gap-2 h-10 px-4 py-2 text-sm font-medium rounded-lg border border-lhc-border bg-transparent text-lhc-text-main hover:bg-lhc-background transition-colors"
          >
            <Calendar className="w-4 h-4" /> View All Appointments
          </Link>
          <Link
            href="/admin/claims"
            className="inline-flex items-center justify-start gap-2 h-10 px-4 py-2 text-sm font-medium rounded-lg border border-lhc-border bg-transparent text-lhc-text-main hover:bg-lhc-background transition-colors"
          >
            <ClipboardList className="w-4 h-4" /> Review Claims{s.pendingClaims > 0 ? ` (${s.pendingClaims})` : ''}
          </Link>
          <Link
            href="/admin/clinics"
            className="inline-flex items-center justify-start gap-2 h-10 px-4 py-2 text-sm font-medium rounded-lg border border-lhc-border bg-transparent text-lhc-text-main hover:bg-lhc-background transition-colors"
          >
            <DollarSign className="w-4 h-4" /> Manage Clinic Billing
          </Link>
          <Link
            href="/admin/register-clinic"
            className="inline-flex items-center justify-start gap-2 h-10 px-4 py-2 text-sm font-medium rounded-lg border border-lhc-border bg-transparent text-lhc-text-main hover:bg-lhc-background transition-colors"
          >
            <UserPlus className="w-4 h-4" /> Register New Clinic
          </Link>
          <Link
            href="/admin/blog"
            className="inline-flex items-center justify-start gap-2 h-10 px-4 py-2 text-sm font-medium rounded-lg border border-lhc-border bg-transparent text-lhc-text-main hover:bg-lhc-background transition-colors"
          >
            <BookOpen className="w-4 h-4" /> Review Blog Posts{s.pendingBlog > 0 ? ` (${s.pendingBlog})` : ''}
          </Link>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/admin/patients" className="block group">
          <Card className="transition-colors group-hover:border-lhc-primary/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-lhc-primary mt-0.5" />
                <div>
                  <h4 className="font-medium text-lhc-text-main">Patient Management</h4>
                  <p className="text-sm text-lhc-text-muted">
                    View and manage all registered patients, their appointments, prescriptions, and quote
                    requests.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/appointments" className="block group">
          <Card className="transition-colors group-hover:border-lhc-primary/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-lhc-primary mt-0.5" />
                <div>
                  <h4 className="font-medium text-lhc-text-main">Appointments Monitor</h4>
                  <p className="text-sm text-lhc-text-muted">
                    Track all bookings across standard, Centaur, and custom API integrations in one
                    unified view.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/claims" className="block group">
          <Card className="transition-colors group-hover:border-lhc-primary/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-lhc-primary mt-0.5" />
                <div>
                  <h4 className="font-medium text-lhc-text-main">Claims Review</h4>
                  <p className="text-sm text-lhc-text-muted">
                    Review and process clinic profile claim requests, verify documents, and
                    approve or reject ownership claims.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/clinics" className="block group">
          <Card className="transition-colors group-hover:border-lhc-primary/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-lhc-primary mt-0.5" />
                <div>
                  <h4 className="font-medium text-lhc-text-main">Clinic Billing</h4>
                  <p className="text-sm text-lhc-text-muted">
                    Configure per-clinic billing rates, manage module subscriptions, and review
                    billing history and estimated invoices.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/blog" className="block group">
          <Card className="transition-colors group-hover:border-lhc-primary/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <BookOpen className="w-5 h-5 text-lhc-primary mt-0.5" />
                <div>
                  <h4 className="font-medium text-lhc-text-main">Blog Review</h4>
                  <p className="text-sm text-lhc-text-muted">
                    Review and approve blog posts submitted by clinics, manage platform
                    articles, and moderate content.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
