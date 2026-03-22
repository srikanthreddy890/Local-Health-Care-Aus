'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Loader2, MapPin, Phone, Mail, Globe, Map, Eye,
  Hospital, Smile, Stethoscope, Activity, UserCog,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Service {
  id: string
  name: string
  address: string
  phone?: string
  email?: string
  website?: string
  rating?: number
  reviews_count?: number
  service_type: string
  google_maps_url?: string
  city?: string
  state?: string
  country_code?: string
}

// ── inferClinicType ─────────────────────────────────────────────────────────

function inferClinicType({
  name,
  description,
  specializations,
}: {
  name?: string | null
  description?: string | null
  specializations?: unknown
}): string | null {
  const text = [
    name ?? '',
    description ?? '',
    ...(Array.isArray(specializations) ? (specializations as string[]) : []),
  ]
    .join(' ')
    .toLowerCase()

  if (
    /dental|dentist|orthodont|endodont|periodont|prosthodont|teeth whitening|denture|oral surgeon|dental implant/.test(
      text
    )
  )
    return 'dental'
  if (
    /general pract|family doctor|physician|medical cent|\bgp\b|walk.in clinic|urgent care|women'?s health clinic/.test(
      text
    )
  )
    return 'medical_gp'
  if (
    /physio|podiatr|psycholog|chiropract|pharmacy|pharmacist|optometr|dietitian|physiotherap|acupunctur|massage/.test(
      text
    )
  )
    return 'allied_health'
  if (
    /specialist|cardiolog|dermatolog|oncolog|neurolog|surgeon|plastic surg|cosmetic surg|obstetrici|gynecolog/.test(
      text
    )
  )
    return 'specialist'

  return null
}

// ── serviceTypes config ────────────────────────────────────────────────────

const serviceTypes = [
  { id: 'all', label: 'All', Icon: Hospital },
  { id: 'dental', label: 'Dental', Icon: Smile },
  { id: 'medical_gp', label: 'GP / Medical', Icon: Stethoscope },
  { id: 'allied_health', label: 'Allied Health', Icon: Activity },
  { id: 'specialist', label: 'Specialist', Icon: UserCog },
] as const

// ── Main component ─────────────────────────────────────────────────────────

interface Props {
  userId: string
}

export default function NearbyServices({ userId }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeServiceType = searchParams.get('stype') ?? 'all'
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  // undefined = not yet fetched; null = fetched but no postcode; string = postcode set
  const [userPostcode, setUserPostcode] = useState<string | null | undefined>(undefined)
  const hasFetchedRef = useRef(false)

  function setActiveServiceType(type: string) {
    const p = new URLSearchParams(searchParams.toString())
    p.set('stype', type)
    router.replace(`?${p.toString()}`)
  }

  const fetchServices = useCallback(async () => {
    if (!userId || hasFetchedRef.current) return
    hasFetchedRef.current = true
    setLoading(true)
    try {
      const supabase = createClient()

      // 1. Get patient postcode
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('postcode')
        .eq('id', userId)
        .single()

      const postcode: string | null = profile?.postcode?.trim() ?? null
      setUserPostcode(postcode)

      if (!postcode) {
        setServices([])
        return
      }

      // 2. Fetch all open clinics at that postcode, sorted by rating
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rows, error } = await (supabase as any)
        .from('apify_clinics_public')
        .select('*')
        .eq('zip_code', postcode)
        .or('permanently_closed.is.null,permanently_closed.eq.false')
        .order('rating', { ascending: false, nullsFirst: false })

      if (error) throw error

      if (!rows?.length) {
        toast.info(`No clinics found in postcode ${postcode}`)
        setServices([])
        return
      }

      // 3. Transform rows — all apify_clinics_public fields are nullable in the schema
      const transformed: Service[] = (rows as Record<string, unknown>[])
        .filter((c) => c.id != null)
        .map((c) => ({
        id: c.id as string,
        name: (c.name as string | null) ?? 'Unknown Clinic',
        address: (c.address as string | null) ?? '',
        phone: (c.phone as string | null) ?? undefined,
        email: (c.email as string | null) ?? undefined,
        website: (c.website as string | null) ?? undefined,
        rating: (c.rating as number | null) ?? undefined,
        reviews_count: (c.reviews_count as number | null) ?? undefined,
        service_type: inferClinicType({
          name: c.name as string,
          description: c.description as string | null,
          specializations: c.specializations,
        }) ?? 'other',
        google_maps_url: (c.google_maps_url as string | null) ?? undefined,
        city: (c.city as string | null) ?? undefined,
        state: (c.state as string | null) ?? undefined,
        country_code: (c.country as string | null) ?? 'AU',
      }))

      setServices(transformed)
      toast.success(`Found ${transformed.length} clinics in your area`)
    } catch {
      toast.error('Could not load nearby services. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  const filteredServices = useMemo(() => {
    if (activeServiceType === 'all') return services
    return services.filter((s) => s.service_type === activeServiceType)
  }, [services, activeServiceType])

  // ── Empty states ────────────────────────────────────────────────────────

  if (loading || userPostcode === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-lhc-primary" />
      </div>
    )
  }

  if (userPostcode === null) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-lhc-primary/10 flex items-center justify-center">
          <MapPin className="w-8 h-8 text-lhc-primary/50" />
        </div>
        <div>
          <p className="font-semibold text-lhc-text-main">No postcode set</p>
          <p className="text-sm text-lhc-text-muted mt-1">
            Add your postcode in <strong>Profile → Personal Info</strong> to see nearby clinics.
          </p>
        </div>
      </div>
    )
  }

  // ── Tab heading ────────────────────────────────────────────────────────────

  const activeLabel = serviceTypes.find((t) => t.id === activeServiceType)?.label ?? ''
  const heading =
    activeServiceType === 'all' ? 'Clinics in Your Area' : `${activeLabel} Clinics in Your Area`

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="font-semibold text-lhc-text-main">{heading}</h2>
        {userPostcode && (
          <p className="text-sm text-lhc-text-muted">
            Showing results for postcode <strong>{userPostcode}</strong>
          </p>
        )}
      </div>

      {/* Type filter tabs */}
      <Tabs value={activeServiceType} onValueChange={setActiveServiceType}>
        <div className="overflow-x-auto -mx-1 pb-1">
          <TabsList className="inline-flex h-auto min-w-max gap-1 bg-lhc-surface border border-lhc-border rounded-lg p-1">
            {serviceTypes.map(({ id, label, Icon }) => (
              <TabsTrigger key={id} value={id} className="flex items-center gap-1.5 text-xs">
                <Icon className="w-3.5 h-3.5" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {serviceTypes.map(({ id }) => (
          <TabsContent key={id} value={id} className="mt-4">
            {filteredServices.length === 0 ? (
              <div className="py-12 text-center text-lhc-text-muted text-sm">
                {services.length === 0
                  ? `No clinics found in postcode ${userPostcode}`
                  : 'No clinics match this category.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredServices.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

// ── ServiceCard ────────────────────────────────────────────────────────────────

function ServiceCard({ service }: { service: Service }) {
  const router = useRouter()
  const cityState = [service.city, service.state].filter(Boolean).join(', ')

  return (
    <div className="bg-white rounded-2xl border border-lhc-border shadow-sm p-5 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <p className="font-bold text-lhc-text-main text-sm leading-snug line-clamp-2">
          {service.name}
        </p>
        {service.rating != null && (
          <div className="flex items-center gap-1 flex-shrink-0 text-xs text-amber-500 font-semibold">
            <span>★</span>
            <span>{service.rating.toFixed(1)}</span>
            {service.reviews_count != null && (
              <span className="text-lhc-text-muted font-normal">({service.reviews_count})</span>
            )}
          </div>
        )}
      </div>

      {/* Address */}
      <div className="flex flex-col gap-0.5">
        {service.address && (
          <div className="flex items-start gap-1.5 text-xs text-lhc-text-muted">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{service.address}</span>
          </div>
        )}
        {cityState && (
          <p className="text-xs text-lhc-text-muted pl-5">{cityState}</p>
        )}
      </div>

      {/* Type badge */}
      {service.service_type && service.service_type !== 'other' && (
        <Badge variant="secondary" className="self-start text-[10px] capitalize">
          {service.service_type.replaceAll('_', ' ')}
        </Badge>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mt-auto pt-1">
        {service.phone && (
          <ActionBtn
            icon={<Phone className="w-3.5 h-3.5" />}
            label="Call"
            onClick={() => window.open(`tel:${service.phone}`)}
          />
        )}
        {service.email && (
          <ActionBtn
            icon={<Mail className="w-3.5 h-3.5" />}
            label="Email"
            onClick={() => window.open(`mailto:${service.email}`)}
          />
        )}
        {service.website && (
          <ActionBtn
            icon={<Globe className="w-3.5 h-3.5" />}
            label="Website"
            onClick={() => window.open(service.website!, '_blank')}
          />
        )}
        {service.google_maps_url && (
          <ActionBtn
            icon={<Map className="w-3.5 h-3.5" />}
            label="Maps"
            onClick={() => window.open(service.google_maps_url!, '_blank')}
          />
        )}
        <button
          onClick={() => router.push(`/local-clinic/${service.id}`)}
          className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-medium bg-lhc-primary text-white hover:bg-lhc-primary-hover transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          View Details
        </button>
      </div>
    </div>
  )
}

function ActionBtn({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 h-8 px-3 border border-lhc-border rounded-xl text-xs font-medium text-lhc-text-muted hover:border-lhc-primary hover:text-lhc-primary transition-colors"
    >
      {icon}
      {label}
    </button>
  )
}
