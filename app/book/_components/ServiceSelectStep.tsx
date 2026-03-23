'use client'

import { useState, useEffect, useCallback } from 'react'
import { ClipboardList, Clock, Loader2, AlertCircle, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'

interface Service {
  id: string
  name: string
  description?: string | null
  price?: number | null
  duration_minutes?: number | null
}

interface Props {
  clinicId: string
  doctorId: string
  onSelect: (serviceId: string) => void
}

export default function ServiceSelectStep({ clinicId, doctorId, onSelect }: Props) {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  const fetchServices = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // 1. Get doctor-specific service IDs from the public view (works for anon users)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: dsRows, error: dsError } = await (supabase as any)
        .from('doctor_services_public')
        .select('service_id')
        .eq('doctor_id', doctorId)
        .eq('is_active', true)

      if (!dsError && dsRows && dsRows.length > 0) {
        // 2. Fetch full service details from services_public using the IDs
        const serviceIds = dsRows.map((r: { service_id: string }) => r.service_id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: svcData, error: svcError } = await (supabase as any)
          .from('services_public')
          .select('id, name, description, price, duration_minutes')
          .in('id', serviceIds)

        if (svcError) throw svcError

        // Deduplicate by name
        const serviceMap = new Map<string, Service>()
        for (const svc of (svcData ?? [])) {
          if (svc?.id && !serviceMap.has(svc.name)) {
            serviceMap.set(svc.name, svc)
          }
        }
        setServices(Array.from(serviceMap.values()))
      } else {
        // Fallback: no doctor_services mapping — fetch all clinic services
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from('services_public')
          .select('id, name, description, price, duration_minutes')
          .eq('clinic_id', clinicId)
        if (error) throw error
        setServices(data ?? [])
      }
    } catch (err) {
      toast({ title: 'Could not load services', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [clinicId, doctorId])

  useEffect(() => { fetchServices() }, [fetchServices])

  return (
    <div className="bg-white rounded-2xl border border-lhc-border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-lhc-border bg-lhc-background/40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-lhc-primary/10 flex items-center justify-center">
            <ClipboardList className="w-4 h-4 text-lhc-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lhc-text-main">Select a Service</h3>
            <p className="text-xs text-lhc-text-muted mt-0.5">Choose the service you need — this determines available time slots</p>
          </div>
        </div>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex items-center justify-center py-14 gap-2 text-lhc-text-muted">
            <Loader2 className="w-5 h-5 animate-spin text-lhc-primary" />
            <span className="text-sm">Loading services…</span>
          </div>
        ) : services.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center">
            <AlertCircle className="w-10 h-10 text-lhc-text-muted/25 mb-3" />
            <p className="font-medium text-lhc-text-main text-sm">No services available</p>
            <p className="text-xs text-lhc-text-muted mt-1">This doctor has no services configured yet. Please contact the clinic directly.</p>
          </div>
        ) : (
          <ServiceList services={services} onSelect={onSelect} />
        )}
      </div>
    </div>
  )
}

function ServiceList({ services, onSelect }: { services: Service[]; onSelect: (id: string) => void }) {
  const [search, setSearch] = useState('')
  const filtered = search.trim()
    ? services.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    : services

  return (
    <div className="space-y-3">
      {/* Search input — shown when 6+ services */}
      {services.length >= 6 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lhc-text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter services..."
            className="w-full h-10 pl-9 pr-4 border border-lhc-border rounded-lg text-sm text-lhc-text-main placeholder:text-lhc-text-muted focus:outline-none focus:border-lhc-primary transition-colors bg-lhc-background"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-lhc-text-muted text-center py-6">No services match "{search}"</p>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((svc) => (
              <button
                key={svc.id}
                onClick={() => onSelect(svc.id)}
                className="w-full group text-left rounded-2xl border-2 border-lhc-border hover:border-lhc-primary bg-lhc-background/30 hover:bg-white p-4 transition-all duration-150 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lhc-primary"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-lhc-text-main text-sm">{svc.name}</p>
                    {svc.description && (
                      <p className="text-xs text-lhc-text-muted mt-0.5 line-clamp-2">{svc.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {svc.duration_minutes != null && (
                        <span className="text-[11px] bg-lhc-background border border-lhc-border text-lhc-text-muted rounded-full px-2 py-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {svc.duration_minutes} min
                        </span>
                      )}
                      {svc.price != null && (
                        <span className="text-[11px] bg-lhc-primary/8 border border-lhc-primary/20 text-lhc-primary font-semibold rounded-full px-2 py-0.5">
                          ${svc.price}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-lhc-primary group-hover:underline flex-shrink-0 mt-1">Select →</span>
                </div>
              </button>
            ))}
          </div>
        )}
    </div>
  )
}
