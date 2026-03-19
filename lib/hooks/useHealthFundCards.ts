'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'

export interface HealthFundCard {
  id: string
  patient_id: string
  provider_name: string
  member_number: string
  card_holder_name: string
  expiry_date: string | null
  is_primary: boolean | null
  hicaps_compatible: boolean | null
  card_image_path: string | null
  back_image_path: string | null
  is_verified: boolean | null
  created_at: string
  updated_at: string
}

export interface AddCardData {
  provider_name: string
  member_number: string
  card_holder_name: string
  expiry_date?: string | null
  is_primary?: boolean
  hicaps_compatible?: boolean
}

export function useHealthFundCards(patientId: string | null) {
  const [cards, setCards] = useState<HealthFundCard[]>([])
  const [loading, setLoading] = useState(false)

  const fetchCards = useCallback(async () => {
    if (!patientId) return
    setLoading(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('health_fund_cards')
        .select('*')
        .eq('patient_id', patientId)
        .order('is_primary', { ascending: false })
      if (error) throw error
      setCards(data ?? [])
    } catch {
      toast({ title: 'Error', description: 'Could not load health fund cards.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => { fetchCards() }, [fetchCards])

  async function addCard(data: AddCardData, frontBlob?: Blob | null, backBlob?: Blob | null): Promise<boolean> {
    if (!patientId) return false
    const supabase = createClient()

    let cardImagePath: string | null = null
    let backImagePath: string | null = null

    try {
      if (frontBlob) {
        const frontPath = `${patientId}/front-${crypto.randomUUID()}.jpg`
        const { error } = await supabase.storage
          .from('health-fund-cards')
          .upload(frontPath, frontBlob, { contentType: 'image/jpeg' })
        if (error) throw error
        cardImagePath = frontPath
      }
      if (backBlob) {
        const backPath = `${patientId}/back-${crypto.randomUUID()}.jpg`
        const { error } = await supabase.storage
          .from('health-fund-cards')
          .upload(backPath, backBlob, { contentType: 'image/jpeg' })
        if (error) throw error
        backImagePath = backPath
      }

      // If setting as primary, clear existing primary first
      if (data.is_primary) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('health_fund_cards')
          .update({ is_primary: false })
          .eq('patient_id', patientId)
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: dbError } = await (supabase as any)
        .from('health_fund_cards')
        .insert({
          patient_id: patientId,
          provider_name: data.provider_name,
          member_number: data.member_number,
          card_holder_name: data.card_holder_name,
          expiry_date: data.expiry_date ?? null,
          is_primary: data.is_primary ?? false,
          hicaps_compatible: data.hicaps_compatible ?? false,
          card_image_path: cardImagePath,
          back_image_path: backImagePath,
        })
      if (dbError) throw dbError

      toast({ title: 'Card added', description: `${data.provider_name} card saved.` })
      await fetchCards()
      return true
    } catch {
      // Rollback uploaded images on failure
      const toRemove = [cardImagePath, backImagePath].filter(Boolean) as string[]
      if (toRemove.length) await supabase.storage.from('health-fund-cards').remove(toRemove)
      toast({ title: 'Error', description: 'Could not save health fund card.', variant: 'destructive' })
      return false
    }
  }

  async function updateCard(id: string, data: Partial<AddCardData>): Promise<boolean> {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('health_fund_cards')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      toast({ title: 'Error', description: 'Could not update card.', variant: 'destructive' })
      return false
    }
    await fetchCards()
    return true
  }

  async function deleteCard(id: string): Promise<void> {
    const supabase = createClient()
    const card = cards.find((c) => c.id === id)
    if (!card) return

    const pathsToRemove = [card.card_image_path, card.back_image_path].filter(Boolean) as string[]
    if (pathsToRemove.length) {
      await supabase.storage.from('health-fund-cards').remove(pathsToRemove)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('health_fund_cards')
      .delete()
      .eq('id', id)
    if (error) {
      toast({ title: 'Error', description: 'Could not delete card.', variant: 'destructive' })
      return
    }
    toast({ title: 'Card removed' })
    setCards((prev) => prev.filter((c) => c.id !== id))
  }

  async function setPrimary(id: string): Promise<void> {
    if (!patientId) return
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('health_fund_cards')
      .update({ is_primary: false })
      .eq('patient_id', patientId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('health_fund_cards')
      .update({ is_primary: true })
      .eq('id', id)
    if (error) {
      toast({ title: 'Error', description: 'Could not set primary card.', variant: 'destructive' })
      return
    }
    await fetchCards()
  }

  async function getImageUrl(path: string): Promise<string | null> {
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from('health-fund-cards')
      .createSignedUrl(path, 300)
    if (error || !data) return null
    return data.signedUrl
  }

  return { cards, loading, refetch: fetchCards, addCard, updateCard, deleteCard, setPrimary, getImageUrl }
}
