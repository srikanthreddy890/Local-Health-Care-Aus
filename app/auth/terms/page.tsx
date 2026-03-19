/**
 * Terms & Conditions gate — Server Component.
 *
 * All data fetching and redirect decisions happen on the server.
 * The interactive form (checkbox + buttons) lives in a small
 * Client Component island (TermsForm) passed only what it needs.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TermsForm from './_components/TermsForm'

export const dynamic = 'force-dynamic'

export default async function TermsGatePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type, terms_accepted')
    .eq('id', user.id)
    .single()

  // Already accepted — route to the correct portal
  if (profile?.terms_accepted) {
    redirect(profile.user_type === 'clinic' ? '/clinic/portal' : '/dashboard')
  }

  const userType = profile?.user_type ?? 'patient'

  return (
    <div className="min-h-screen bg-lhc-background flex items-center justify-center p-4">
      <TermsForm userId={user.id} userType={userType} />
    </div>
  )
}
