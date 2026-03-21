'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Settings, Loader2, Save, MapPin, Clock, CreditCard, Building2,
  Plug, BarChart3, Plus, X, Copy, CheckCircle, AlertCircle,
  Trash2, Info, Globe, Phone, Mail, ExternalLink,
} from 'lucide-react'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import {
  clinicTypeOptions,
  alliedHealthSubTypes,
  getSpecializationsByClinicType,
} from '@/lib/utils/specializations'
import DeleteClinicDialog from './DeleteClinicDialog'

// ── Constants ────────────────────────────────────────────────────────────────

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
const DAY_LABELS: Record<string, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
}

const AUSTRALIAN_TIMEZONES = [
  { value: 'Australia/Sydney', label: 'Sydney/Melbourne (AEST/AEDT)' },
  { value: 'Australia/Brisbane', label: 'Brisbane (AEST)' },
  { value: 'Australia/Perth', label: 'Perth (AWST)' },
  { value: 'Australia/Adelaide', label: 'Adelaide (ACST/ACDT)' },
  { value: 'Australia/Darwin', label: 'Darwin (ACST)' },
  { value: 'Australia/Hobart', label: 'Hobart (AEST/AEDT)' },
]

const LANGUAGES = [
  'English', 'Mandarin', 'Arabic', 'Vietnamese',
  'Italian', 'Greek', 'French', 'Spanish',
  'Hindi', 'Punjabi', 'Korean', 'Tagalog',
]

const HEALTH_FUNDS = [
  'Medicare', 'Medibank', 'Bupa', 'HCF', 'GMHBA',
  'NIB', 'Australian Unity', 'Teachers Health', 'HBF', 'Defence Health',
]

const MEDICAL_FACILITIES = [
  'Digital X-Ray', 'Ultrasound', 'ECG Machine', 'Blood Testing Lab',
  'Pharmacy', 'Physiotherapy', 'Specialist Consulting Rooms',
  'Day Surgery', 'Imaging Centre', 'Pathology Collection',
]

const AMENITIES = [
  'Free WiFi', 'Wheelchair Access', 'Free Parking', 'Public Transport Access',
  'Childcare Area', 'Cafe/Refreshments', 'Magazine/Reading Area',
  'Television', 'Air Conditioning', 'Disabled Toilet',
]

// ── Types ────────────────────────────────────────────────────────────────────

interface TimeSlot {
  open: string
  close: string
}

interface DaySchedule {
  closed: boolean
  slots: TimeSlot[]
}

interface OperatingHours {
  timezone: string
  monday: DaySchedule
  tuesday: DaySchedule
  wednesday: DaySchedule
  thursday: DaySchedule
  friday: DaySchedule
  saturday: DaySchedule
  sunday: DaySchedule
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ClinicRow = Record<string, any>

// ── Helpers ──────────────────────────────────────────────────────────────────

function toStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return []
  return val.filter((v): v is string => typeof v === 'string')
}

function makeDaySchedule(day: string): DaySchedule {
  if (day === 'sunday') return { closed: true, slots: [] }
  if (day === 'saturday') return { closed: false, slots: [{ open: '09:00', close: '13:00' }] }
  return { closed: false, slots: [{ open: '08:00', close: '17:00' }] }
}

function defaultHours(): OperatingHours {
  return {
    timezone: 'Australia/Sydney',
    monday: makeDaySchedule('monday'),
    tuesday: makeDaySchedule('tuesday'),
    wednesday: makeDaySchedule('wednesday'),
    thursday: makeDaySchedule('thursday'),
    friday: makeDaySchedule('friday'),
    saturday: makeDaySchedule('saturday'),
    sunday: makeDaySchedule('sunday'),
  }
}

function getDaySchedule(hours: OperatingHours, day: string): DaySchedule {
  return hours[day as keyof OperatingHours] as unknown as DaySchedule
}

function setDaySchedule(hours: OperatingHours, day: string, schedule: DaySchedule): OperatingHours {
  return { ...hours, [day]: schedule }
}

function migrateHours(raw: unknown): OperatingHours {
  if (!raw || typeof raw !== 'object') return defaultHours()
  const obj = raw as Record<string, unknown>
  const tz = typeof obj.timezone === 'string' ? obj.timezone : 'Australia/Sydney'

  // Already new format?
  const isNew = obj.monday && typeof obj.monday === 'object' && 'slots' in (obj.monday as object)

  const result = defaultHours()
  result.timezone = tz

  for (const day of DAYS) {
    if (isNew) {
      const d = obj[day] as { closed?: boolean; slots?: TimeSlot[] } | undefined
      ;(result as unknown as Record<string, DaySchedule>)[day] = {
        closed: d?.closed ?? false,
        slots: Array.isArray(d?.slots) ? d.slots : [{ open: '08:00', close: '17:00' }],
      }
    } else {
      // Old format: { open, close, closed }
      const old = obj[day] as { open?: string; close?: string; closed?: boolean } | undefined
      if (!old) {
        ;(result as unknown as Record<string, DaySchedule>)[day] = { closed: true, slots: [] }
      } else {
        ;(result as unknown as Record<string, DaySchedule>)[day] = {
          closed: old.closed ?? false,
          slots: old.closed ? [] : [{ open: old.open ?? '08:00', close: old.close ?? '17:00' }],
        }
      }
    }
  }
  return result
}

function to12Hour(t: string): string {
  const [h, m] = t.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return t
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
}

function isValidSlot(slot: TimeSlot): boolean {
  return slot.close > slot.open
}

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  clinicId: string
  isOwner?: boolean
}

export default function EnhancedClinicProfile({ clinicId, isOwner = true }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')

  // Form state
  const [name, setName] = useState('')
  const [clinicType, setClinicType] = useState('')
  const [subType, setSubType] = useState('')
  const [phone, setPhone] = useState<string | undefined>('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [googleMapsUrl, setGoogleMapsUrl] = useState('')
  const [description, setDescription] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [languages, setLanguages] = useState<string[]>([])
  const [specializations, setSpecializations] = useState<string[]>([])

  // Operating hours
  const [hours, setHours] = useState<OperatingHours>(defaultHours())

  // Services & Billing
  const [healthFunds, setHealthFunds] = useState<string[]>([])
  const [bulkBilling, setBulkBilling] = useState(false)
  const [telehealth, setTelehealth] = useState(false)
  const [emergencyServices, setEmergencyServices] = useState(false)
  const [parkingAvailable, setParkingAvailable] = useState(false)

  // Module flags (read-only)
  const [moduleFlags, setModuleFlags] = useState({
    bulk_import_enabled: false,
    quotes_enabled: false,
    emergency_slots_enabled: false,
    chat_enabled: false,
  })

  // Facilities
  const [facilities, setFacilities] = useState<string[]>([])
  const [amenities, setAmenities] = useState<string[]>([])

  // Integrations
  const [customApiEnabled, setCustomApiEnabled] = useState(false)

  // Coordinates
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [fetchingCoords, setFetchingCoords] = useState(false)
  const [coordsFetched, setCoordsFetched] = useState(false)

  // Performance stats
  const [stats, setStats] = useState({
    totalDoctors: 0,
    totalBookings: 0,
    totalServices: 0,
    rating: null as number | null,
    reviewsCount: 0,
    isVerified: false,
    isActive: true,
    createdAt: '',
  })

  // Delete dialog
  const [showDelete, setShowDelete] = useState(false)

  // Original Google Maps URL to detect changes
  const [originalGoogleMapsUrl, setOriginalGoogleMapsUrl] = useState('')

  // ── Load clinic data ─────────────────────────────────────────────────────

  const loadClinic = useCallback(async () => {
    setLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', clinicId)
        .single()
      if (error) throw error
      const c = data as ClinicRow

      setName(c.name ?? '')
      setClinicType(c.clinic_type ?? '')
      setSubType(c.sub_type ?? '')
      setPhone(c.phone ?? '')
      setEmail(c.email ?? '')
      setWebsite(c.website ?? '')
      setGoogleMapsUrl(c.google_maps_url ?? '')
      setOriginalGoogleMapsUrl(c.google_maps_url ?? '')
      setDescription(c.description ?? '')
      setAddressLine1(c.address_line1 ?? '')
      setAddressLine2(c.address_line2 ?? '')
      setCity(c.city ?? '')
      setState(c.state ?? '')
      setZipCode(c.zip_code ?? '')
      setLanguages(toStringArray(c.languages_spoken))
      setSpecializations(toStringArray(c.specializations))

      // Hours — try new format first, fall back to old
      const rawHours = c.operating_hours_detailed ?? c.operating_hours
      setHours(migrateHours(rawHours))

      setHealthFunds(toStringArray(c.health_fund_cards_accepted))
      setBulkBilling(!!c.bulk_billing_available)
      setTelehealth(!!c.telehealth_available)
      setEmergencyServices(!!c.emergency_services)
      setParkingAvailable(!!c.parking_available)

      setModuleFlags({
        bulk_import_enabled: !!c.bulk_import_enabled,
        quotes_enabled: !!c.quotes_enabled,
        emergency_slots_enabled: !!c.emergency_slots_enabled,
        chat_enabled: !!c.chat_enabled,
      })

      setFacilities(toStringArray(c.facilities))
      setAmenities(toStringArray(c.amenities))
      setCustomApiEnabled(!!c.custom_api_enabled)
      setLatitude(c.latitude ?? null)
      setLongitude(c.longitude ?? null)

      setStats({
        totalDoctors: 0,
        totalBookings: 0,
        totalServices: 0,
        rating: c.rating ?? null,
        reviewsCount: c.reviews_count ?? 0,
        isVerified: !!c.is_verified,
        isActive: c.is_active !== false,
        createdAt: c.created_at ?? '',
      })

      // Fetch counts for performance tab
      const [doctorsRes, bookingsRes, servicesRes] = await Promise.all([
        supabase.from('doctors').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId).eq('is_active', true),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId),
        supabase.from('services').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId).eq('is_active', true),
      ])
      setStats(prev => ({
        ...prev,
        totalDoctors: doctorsRes.count ?? 0,
        totalBookings: bookingsRes.count ?? 0,
        totalServices: servicesRes.count ?? 0,
      }))
    } catch {
      toast.error('Failed to load clinic settings.')
    } finally {
      setLoading(false)
    }
  }, [clinicId])

  useEffect(() => { loadClinic() }, [loadClinic])

  // ── Save handler ─────────────────────────────────────────────────────────

  async function handleSave() {
    // Validate phone
    if (phone && !phone.startsWith('+')) {
      toast.error('Phone number must start with + (international format).')
      return
    }

    // Validate hours
    for (const day of DAYS) {
      const d = getDaySchedule(hours, day)
      if (!d.closed) {
        for (const slot of d.slots) {
          if (!isValidSlot(slot)) {
            toast.error(`${DAY_LABELS[day]}: Close time must be after open time.`)
            return
          }
        }
      }
    }

    setSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any

      const hoursPayload: Record<string, unknown> = { timezone: hours.timezone }
      for (const day of DAYS) {
        hoursPayload[day] = getDaySchedule(hours, day)
      }

      const payload = {
        name,
        clinic_type: clinicType || null,
        sub_type: clinicType === 'allied_health' ? (subType || null) : null,
        phone: phone || null,
        email: email || null,
        website: website || null,
        google_maps_url: googleMapsUrl || null,
        description: description || null,
        address_line1: addressLine1 || null,
        address_line2: addressLine2 || null,
        city: city || null,
        state: state || null,
        zip_code: zipCode || null,
        languages_spoken: languages,
        specializations,
        operating_hours_detailed: hoursPayload,
        health_fund_cards_accepted: healthFunds,
        bulk_billing_available: bulkBilling,
        telehealth_available: telehealth,
        emergency_services: emergencyServices,
        parking_available: parkingAvailable,
        facilities,
        amenities,
        custom_api_enabled: customApiEnabled,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('clinics')
        .update(payload)
        .eq('id', clinicId)

      if (error) throw error
      toast.success('Settings saved!')
    } catch {
      toast.error('Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  // ── Fetch coordinates ────────────────────────────────────────────────────

  async function fetchCoordinates() {
    if (!googleMapsUrl) { toast.error('Enter a Google Maps URL first.'); return }
    setFetchingCoords(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { data, error } = await supabase.functions.invoke('apify-fetch-place-details', {
        body: { url: googleMapsUrl },
      })
      if (error) throw error
      if (!data?.success || !data.latitude || !data.longitude) {
        toast.error('Could not extract coordinates from that URL.')
        return
      }
      const lat = parseFloat(data.latitude)
      const lng = parseFloat(data.longitude)
      if (isNaN(lat) || isNaN(lng)) {
        toast.error('Invalid coordinates returned.')
        return
      }
      // Save immediately
      const { error: updateErr } = await supabase
        .from('clinics')
        .update({ latitude: lat, longitude: lng, google_maps_url: googleMapsUrl })
        .eq('id', clinicId)
      if (updateErr) throw updateErr

      setLatitude(lat)
      setLongitude(lng)
      setOriginalGoogleMapsUrl(googleMapsUrl)
      setCoordsFetched(true)
      toast.success('Coordinates saved!')
    } catch {
      toast.error('Failed to fetch coordinates.')
    } finally {
      setFetchingCoords(false)
    }
  }

  // ── Toggle helpers ───────────────────────────────────────────────────────

  function toggleInArray(arr: string[], item: string, setFn: (v: string[]) => void) {
    setFn(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item])
  }

  function setHoursField(day: string, slotIdx: number, field: 'open' | 'close', val: string) {
    setHours(prev => {
      const d = getDaySchedule(prev, day)
      const slots = [...d.slots]
      slots[slotIdx] = { ...slots[slotIdx], [field]: val }
      return setDaySchedule(prev, day, { ...d, slots })
    })
  }

  function toggleDayClosed(day: string) {
    setHours(prev => {
      const d = getDaySchedule(prev, day)
      const closed = !d.closed
      return setDaySchedule(prev, day, { closed, slots: closed ? [] : [{ open: '08:00', close: '17:00' }] })
    })
  }

  function addSlot(day: string) {
    setHours(prev => {
      const d = getDaySchedule(prev, day)
      return setDaySchedule(prev, day, { ...d, slots: [...d.slots, { open: '13:00', close: '17:00' }] })
    })
  }

  function removeSlot(day: string, idx: number) {
    setHours(prev => {
      const d = getDaySchedule(prev, day)
      return setDaySchedule(prev, day, { ...d, slots: d.slots.filter((_, i) => i !== idx) })
    })
  }

  function applyToWeekdays(sourceDay: string) {
    setHours(prev => {
      const source = getDaySchedule(prev, sourceDay)
      let next = { ...prev }
      for (const day of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']) {
        next = setDaySchedule(next, day, { closed: source.closed, slots: source.slots.map(s => ({ ...s })) })
      }
      return next
    })
  }

  // ── Loading state ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-lhc-primary" />
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const showSave = activeTab !== 'performance'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-lhc-primary" />
          <h1 className="text-2xl font-bold text-lhc-text-main">Clinic Settings</h1>
        </div>
        {showSave && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full flex flex-wrap">
          <TabsTrigger value="basic"><Building2 className="w-4 h-4 mr-1.5" />Basic Info</TabsTrigger>
          <TabsTrigger value="hours"><Clock className="w-4 h-4 mr-1.5" />Hours</TabsTrigger>
          <TabsTrigger value="billing"><CreditCard className="w-4 h-4 mr-1.5" />Services</TabsTrigger>
          <TabsTrigger value="facilities"><Building2 className="w-4 h-4 mr-1.5" />Facilities</TabsTrigger>
          <TabsTrigger value="integrations"><Plug className="w-4 h-4 mr-1.5" />Integrations</TabsTrigger>
          <TabsTrigger value="performance"><BarChart3 className="w-4 h-4 mr-1.5" />Performance</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Basic Info ─────────────────────────────────────────── */}
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle className="text-lhc-text-main">Basic Information</CardTitle>
              <CardDescription>Update your clinic&apos;s core details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Name & Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="clinic-name">Clinic Name <span className="text-red-500">*</span></Label>
                  <Input id="clinic-name" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Practice Type</Label>
                  <Select value={clinicType} onValueChange={setClinicType}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {clinicTypeOptions.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Allied health sub-type */}
              {clinicType === 'allied_health' && (
                <div className="space-y-1.5">
                  <Label>Allied Health Sub-Type</Label>
                  <Select value={subType} onValueChange={setSubType}>
                    <SelectTrigger><SelectValue placeholder="Select sub-type" /></SelectTrigger>
                    <SelectContent>
                      {alliedHealthSubTypes.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Phone & Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label><Phone className="w-3.5 h-3.5 inline mr-1" />Phone</Label>
                  <PhoneInput
                    international
                    defaultCountry="AU"
                    value={phone}
                    onChange={setPhone}
                    className="flex h-10 w-full rounded-md border border-lhc-border bg-lhc-background px-3 py-2 text-sm text-lhc-text-main"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="clinic-email"><Mail className="w-3.5 h-3.5 inline mr-1" />Email</Label>
                  <Input id="clinic-email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>

              {/* Website */}
              <div className="space-y-1.5">
                <Label htmlFor="clinic-website"><Globe className="w-3.5 h-3.5 inline mr-1" />Website</Label>
                <Input id="clinic-website" type="url" placeholder="https://yourclinic.com.au" value={website} onChange={e => setWebsite(e.target.value)} />
              </div>

              {/* Google Maps URL */}
              <div className="space-y-1.5">
                <Label><MapPin className="w-3.5 h-3.5 inline mr-1" />Google Maps URL</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://maps.google.com/..."
                    value={googleMapsUrl}
                    onChange={e => { setGoogleMapsUrl(e.target.value); setCoordsFetched(false) }}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={fetchCoordinates}
                    disabled={fetchingCoords || (!googleMapsUrl) || (googleMapsUrl === originalGoogleMapsUrl && coordsFetched)}
                  >
                    {fetchingCoords ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                    {googleMapsUrl === originalGoogleMapsUrl && coordsFetched ? 'Fetched' : 'Fetch'}
                  </Button>
                </div>
                {latitude !== null && longitude !== null && (
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Lat: {latitude.toFixed(6)}, Lng: {longitude.toFixed(6)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 ml-auto"
                      onClick={() => { navigator.clipboard.writeText(`${latitude}, ${longitude}`); toast.success('Copied!') }}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="clinic-desc">Description</Label>
                <Textarea id="clinic-desc" rows={3} placeholder="A brief overview of your clinic…" value={description} onChange={e => setDescription(e.target.value)} />
              </div>

              {/* Address */}
              <div className="space-y-3">
                <Label>Address</Label>
                <Input placeholder="Address line 1" value={addressLine1} onChange={e => setAddressLine1(e.target.value)} />
                <Input placeholder="Address line 2 (optional)" value={addressLine2} onChange={e => setAddressLine2(e.target.value)} />
                <div className="grid grid-cols-3 gap-3">
                  <Input placeholder="City" value={city} onChange={e => setCity(e.target.value)} />
                  <Input placeholder="State" value={state} onChange={e => setState(e.target.value)} />
                  <Input placeholder="Postcode" value={zipCode} onChange={e => setZipCode(e.target.value)} />
                </div>
              </div>

              {/* Languages */}
              <div className="space-y-2">
                <Label>Languages Spoken</Label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => toggleInArray(languages, lang, setLanguages)}
                      className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                        languages.includes(lang)
                          ? 'bg-lhc-primary text-white border-lhc-primary'
                          : 'bg-lhc-background text-lhc-text-muted border-lhc-border hover:border-lhc-primary'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {/* Specializations */}
              {clinicType && getSpecializationsByClinicType(clinicType).length > 0 && (
                <div className="space-y-2">
                  <Label>Specializations</Label>
                  <div className="flex flex-wrap gap-2">
                    {getSpecializationsByClinicType(clinicType).map(spec => (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => toggleInArray(specializations, spec, setSpecializations)}
                        className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                          specializations.includes(spec)
                            ? 'bg-lhc-primary text-white border-lhc-primary'
                            : 'bg-lhc-background text-lhc-text-muted border-lhc-border hover:border-lhc-primary'
                        }`}
                      >
                        {spec}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Danger Zone — owners only */}
          {isOwner && (
            <Card className="mt-6 border-red-200">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <div>
                      <p className="text-sm font-medium text-red-600">Danger Zone</p>
                      <p className="text-xs text-lhc-text-muted">Deleting your clinic is permanent and cannot be undone.</p>
                    </div>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}>
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Delete Clinic
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <DeleteClinicDialog
            clinicId={clinicId}
            clinicName={name}
            open={showDelete}
            onOpenChange={setShowDelete}
          />
        </TabsContent>

        {/* ── Tab 2: Operating Hours ──────────────────────────────────── */}
        <TabsContent value="hours">
          <Card>
            <CardHeader>
              <CardTitle className="text-lhc-text-main">Operating Hours</CardTitle>
              <CardDescription>Set your regular trading hours for each day.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Timezone */}
              <div className="space-y-1.5">
                <Label>Timezone</Label>
                <Select
                  value={hours.timezone ?? 'Australia/Sydney'}
                  onValueChange={tz => setHours(prev => ({ ...prev, timezone: tz }))}
                >
                  <SelectTrigger className="w-full md:w-80"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AUSTRALIAN_TIMEZONES.map(tz => (
                      <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Days */}
              <div className="space-y-3">
                {DAYS.map(day => {
                  const d = getDaySchedule(hours, day)
                  return (
                    <Card key={day} className="border-lhc-border">
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="w-24 text-sm font-medium text-lhc-text-main">{DAY_LABELS[day]}</span>
                            <div className="flex items-center gap-2">
                              <Switch checked={!d.closed} onCheckedChange={() => toggleDayClosed(day)} />
                              <span className="text-xs text-lhc-text-muted">{d.closed ? 'Closed' : 'Open'}</span>
                            </div>
                          </div>
                          {!d.closed && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => addSlot(day)} className="text-xs h-7">
                                <Plus className="w-3 h-3 mr-1" />Slot
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => applyToWeekdays(day)} className="text-xs h-7">
                                Apply to Weekdays
                              </Button>
                            </div>
                          )}
                        </div>
                        {!d.closed && d.slots.map((slot, idx) => (
                          <div key={idx} className="flex items-center gap-2 mt-2">
                            <Input
                              type="time"
                              value={slot.open}
                              onChange={e => setHoursField(day, idx, 'open', e.target.value)}
                              className="w-32"
                            />
                            <span className="text-lhc-text-muted text-sm">—</span>
                            <Input
                              type="time"
                              value={slot.close}
                              onChange={e => setHoursField(day, idx, 'close', e.target.value)}
                              className="w-32"
                            />
                            <span className="text-xs text-lhc-text-muted">
                              ({to12Hour(slot.open)} – {to12Hour(slot.close)})
                            </span>
                            {d.slots.length > 1 && (
                              <Button variant="ghost" size="sm" onClick={() => removeSlot(day, idx)} className="h-7 w-7 p-0 text-red-500">
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 3: Services & Billing ───────────────────────────────── */}
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle className="text-lhc-text-main">Services & Billing</CardTitle>
              <CardDescription>Health fund acceptance and service options.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Health Funds */}
              <div className="space-y-2">
                <Label>Health Funds Accepted</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {HEALTH_FUNDS.map(fund => (
                    <button
                      key={fund}
                      type="button"
                      onClick={() => toggleInArray(healthFunds, fund, setHealthFunds)}
                      className={`px-3 py-2 text-sm rounded-lg border text-left transition-colors ${
                        healthFunds.includes(fund)
                          ? 'bg-lhc-primary text-white border-lhc-primary'
                          : 'bg-lhc-background text-lhc-text-muted border-lhc-border hover:border-lhc-primary'
                      }`}
                    >
                      {fund}
                    </button>
                  ))}
                </div>
              </div>

              {/* Service Options */}
              <div className="space-y-3">
                <Label>Service Options</Label>
                <div className="space-y-3">
                  {[
                    { label: 'Bulk Billing Available', checked: bulkBilling, onChange: setBulkBilling },
                    { label: 'Telehealth Available', checked: telehealth, onChange: setTelehealth },
                    { label: 'Emergency Services', checked: emergencyServices, onChange: setEmergencyServices },
                    { label: 'Parking Available', checked: parkingAvailable, onChange: setParkingAvailable },
                  ].map(toggle => (
                    <div key={toggle.label} className="flex items-center justify-between py-2 px-3 border border-lhc-border rounded-lg">
                      <span className="text-sm text-lhc-text-main">{toggle.label}</span>
                      <Switch checked={toggle.checked} onCheckedChange={toggle.onChange} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Module flags (read-only) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label>Module Access</Label>
                  <Badge variant="secondary" className="text-xs">
                    <Info className="w-3 h-3 mr-1" />Admin managed
                  </Badge>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                  These modules are managed by a platform administrator and cannot be changed here.
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Bulk Doctor Import', checked: moduleFlags.bulk_import_enabled },
                    { label: 'Quote Requests', checked: moduleFlags.quotes_enabled },
                    { label: 'Emergency Appointments', checked: moduleFlags.emergency_slots_enabled },
                    { label: 'Patient Messaging', checked: moduleFlags.chat_enabled },
                  ].map(mod => (
                    <div key={mod.label} className="flex items-center justify-between py-2 px-3 border border-lhc-border rounded-lg opacity-60">
                      <span className="text-sm text-lhc-text-muted">{mod.label}</span>
                      <Switch checked={mod.checked} disabled />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 4: Facilities ───────────────────────────────────────── */}
        <TabsContent value="facilities">
          <Card>
            <CardHeader>
              <CardTitle className="text-lhc-text-main">Facilities & Amenities</CardTitle>
              <CardDescription>What your clinic offers patients.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Medical Facilities</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {MEDICAL_FACILITIES.map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleInArray(facilities, item, setFacilities)}
                      className={`px-3 py-2 text-sm rounded-lg border text-left transition-colors ${
                        facilities.includes(item)
                          ? 'bg-lhc-primary text-white border-lhc-primary'
                          : 'bg-lhc-background text-lhc-text-muted border-lhc-border hover:border-lhc-primary'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Amenities</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {AMENITIES.map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleInArray(amenities, item, setAmenities)}
                      className={`px-3 py-2 text-sm rounded-lg border text-left transition-colors ${
                        amenities.includes(item)
                          ? 'bg-lhc-primary text-white border-lhc-primary'
                          : 'bg-lhc-background text-lhc-text-muted border-lhc-border hover:border-lhc-primary'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 5: Integrations ─────────────────────────────────────── */}
        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle className="text-lhc-text-main">Integrations</CardTitle>
              <CardDescription>Manage API integrations and external services.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between py-3 px-4 border border-lhc-border rounded-lg">
                <div>
                  <p className="text-sm font-medium text-lhc-text-main">Custom API Booking</p>
                  <p className="text-xs text-lhc-text-muted mt-0.5">
                    Allow patients to book through your custom API integration.
                  </p>
                </div>
                <Switch checked={customApiEnabled} onCheckedChange={setCustomApiEnabled} />
              </div>

              {/* Integration status */}
              <div className="space-y-2">
                <Label>Integration Status</Label>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={customApiEnabled ? 'default' : 'secondary'}>
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Custom API: {customApiEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </div>

              <div className="bg-lhc-background border border-lhc-border rounded-lg p-4 text-sm text-lhc-text-muted">
                <Info className="w-4 h-4 inline mr-2" />
                API configuration details can be managed through the platform administrator.
                Contact support if you need to set up or modify API integrations.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 6: Performance ──────────────────────────────────────── */}
        <TabsContent value="performance">
          <div className="space-y-4">
            {/* Stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Active Doctors', value: stats.totalDoctors },
                { label: 'Total Bookings', value: stats.totalBookings },
                { label: 'Active Services', value: stats.totalServices },
              ].map(s => (
                <Card key={s.label}>
                  <CardContent className="pt-4 pb-3">
                    <p className="text-xs text-lhc-text-muted">{s.label}</p>
                    <p className="text-2xl font-bold text-lhc-text-main mt-1">{s.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {stats.rating !== null && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <p className="text-xs text-lhc-text-muted">Average Rating</p>
                    <p className="text-2xl font-bold text-lhc-text-main mt-1">{stats.rating.toFixed(1)} / 5</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <p className="text-xs text-lhc-text-muted">Reviews</p>
                    <p className="text-2xl font-bold text-lhc-text-main mt-1">{stats.reviewsCount}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Clinic info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lhc-text-main text-base">Clinic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-lhc-text-muted">Clinic ID</span>
                  <code className="font-mono text-xs bg-lhc-background px-2 py-1 rounded border border-lhc-border">{clinicId}</code>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-lhc-text-muted">Verification Status</span>
                  <Badge variant={stats.isVerified ? 'default' : 'secondary'}>
                    {stats.isVerified ? 'Verified' : 'Pending'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-lhc-text-muted">Profile Status</span>
                  <Badge variant={stats.isActive ? 'default' : 'secondary'}>
                    {stats.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {stats.createdAt && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-lhc-text-muted">Created</span>
                    <span className="text-lhc-text-main">{new Date(stats.createdAt).toLocaleDateString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
