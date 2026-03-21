'use client'

import { useState, useMemo } from 'react'
import { Search, Building2, Users, Calendar, DollarSign, Settings, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAdminContext } from './AdminContext'
import { useAdminClinics, type ClinicWithBilling } from '@/lib/hooks/useAdminClinics'
import AdminClinicBilling from './AdminClinicBilling'
import AdminClinicModules from './AdminClinicModules'

const PAGE_SIZE = 10

const clinicTypes = [
  { value: 'all', label: 'All Types' },
  { value: 'general', label: 'General Practice' },
  { value: 'dental', label: 'Dental' },
  { value: 'physiotherapy', label: 'Physiotherapy' },
  { value: 'psychology', label: 'Psychology' },
  { value: 'specialist', label: 'Specialist' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'allied_health', label: 'Allied Health' },
  { value: 'chiropractic', label: 'Chiropractic' },
  { value: 'optometry', label: 'Optometry' },
]

export default function AdminClinics() {
  const { userId } = useAdminContext()
  const { data: clinics, isLoading } = useAdminClinics(userId)

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [billingFilter, setBillingFilter] = useState('all')
  const [page, setPage] = useState(0)

  const [billingClinic, setBillingClinic] = useState<ClinicWithBilling | null>(null)
  const [modulesClinic, setModulesClinic] = useState<ClinicWithBilling | null>(null)

  const filtered = useMemo(() => {
    let list = clinics ?? []

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.city?.toLowerCase().includes(q),
      )
    }

    if (typeFilter !== 'all') {
      list = list.filter((c) => c.clinic_type === typeFilter)
    }

    if (billingFilter === 'configured') {
      list = list.filter((c) => c.billing && c.billing.is_active)
    } else if (billingFilter === 'not_configured') {
      list = list.filter((c) => !c.billing || !c.billing.is_active)
    }

    return list
  }, [clinics, search, typeFilter, billingFilter])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Reset page on filter change
  const handleSearch = (val: string) => { setSearch(val); setPage(0) }
  const handleType = (val: string) => { setTypeFilter(val); setPage(0) }
  const handleBilling = (val: string) => { setBillingFilter(val); setPage(0) }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-lhc-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-lhc-text-main">Clinics</h2>
        <p className="text-sm text-lhc-text-muted">{filtered.length} clinics found</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lhc-text-muted" />
          <Input
            placeholder="Search by name, email, or city..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={handleType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Clinic Type" />
          </SelectTrigger>
          <SelectContent>
            {clinicTypes.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={billingFilter} onValueChange={handleBilling}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Billing" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Billing</SelectItem>
            <SelectItem value="configured">Configured</SelectItem>
            <SelectItem value="not_configured">Not Configured</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Clinics list */}
      {paginated.length === 0 ? (
        <p className="text-center text-lhc-text-muted py-12">No clinics match your filters.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-lhc-border text-left">
                  <th className="py-2 px-3 font-medium text-lhc-text-muted">Clinic Info</th>
                  <th className="py-2 px-3 font-medium text-lhc-text-muted">Location</th>
                  <th className="py-2 px-3 font-medium text-lhc-text-muted">Doctors</th>
                  <th className="py-2 px-3 font-medium text-lhc-text-muted">Bookings</th>
                  <th className="py-2 px-3 font-medium text-lhc-text-muted">Price</th>
                  <th className="py-2 px-3 font-medium text-lhc-text-muted">Status</th>
                  <th className="py-2 px-3 font-medium text-lhc-text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((clinic) => (
                  <tr key={clinic.id} className="border-b border-lhc-border/50 hover:bg-lhc-surface/50">
                    <td className="py-2.5 px-3">
                      <div>
                        <p className="font-medium text-lhc-text-main">{clinic.name}</p>
                        <div className="flex items-center gap-1">
                          {clinic.email && <span className="text-xs text-lhc-text-muted">{clinic.email}</span>}
                          {clinic.clinic_type && (
                            <Badge variant="outline" className="text-xs capitalize ml-1">
                              {clinic.clinic_type.replace(/_/g, ' ')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-lhc-text-muted">
                      {[clinic.city, clinic.state].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-lhc-text-main">{clinic.doctors_count}</td>
                    <td className="py-2.5 px-3 text-lhc-text-main">{clinic.bookings_count}</td>
                    <td className="py-2.5 px-3">
                      {clinic.billing ? (
                        <span className="text-lhc-text-main font-medium">
                          ${clinic.billing.price_per_appointment.toFixed(2)}/apt
                        </span>
                      ) : (
                        <span className="text-lhc-text-muted text-xs">Not Set</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge
                        variant="outline"
                        className={`text-xs ${clinic.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                      >
                        {clinic.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" onClick={() => setBillingClinic(clinic)}>
                          <DollarSign className="w-3 h-3 mr-1" /> Billing
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setModulesClinic(clinic)}>
                          <Settings className="w-3 h-3 mr-1" /> Modules
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {paginated.map((clinic) => (
              <Card key={clinic.id}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm text-lhc-text-main">{clinic.name}</p>
                      <p className="text-xs text-lhc-text-muted">
                        {[clinic.city, clinic.state].filter(Boolean).join(', ')}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-lhc-text-muted">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {clinic.doctors_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {clinic.bookings_count}
                        </span>
                        {clinic.billing && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" /> ${clinic.billing.price_per_appointment.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs ${clinic.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {clinic.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setBillingClinic(clinic)}>
                      Billing
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setModulesClinic(clinic)}>
                      Modules
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-2">
          <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 0}>
            Previous
          </Button>
          <span className="text-sm text-lhc-text-muted">
            Page {page + 1} of {totalPages}
          </span>
          <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1}>
            Next
          </Button>
        </div>
      )}

      {/* Billing dialog */}
      <AdminClinicBilling
        clinic={billingClinic}
        open={!!billingClinic}
        onClose={() => setBillingClinic(null)}
      />

      {/* Modules dialog */}
      <AdminClinicModules
        clinic={modulesClinic}
        open={!!modulesClinic}
        onClose={() => setModulesClinic(null)}
      />
    </div>
  )
}
