/**
 * Home page — Server Component.
 *
 * Authenticated users are redirected server-side to their portal before
 * any HTML is sent to the browser. Unauthenticated visitors see the
 * public marketing page made up of static Server Components and a few
 * interactive Client Component islands.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HomeHeader from '@/app/_components/home/HomeHeader'
import HeroSection from '@/app/_components/home/HeroSection'
import HeroServiceCards from '@/app/_components/home/HeroServiceCards'
import PatientFeaturesSection from '@/app/_components/home/PatientFeaturesSection'
import CategorySection from '@/app/_components/home/CategorySection'
import PopularServices from '@/app/_components/home/PopularServices'
import HowItWorks from '@/app/_components/home/HowItWorks'
import WhyChooseUs from '@/app/_components/home/WhyChooseUs'
import ProviderCTA from '@/app/_components/home/ProviderCTA'
import HomeFooter from '@/app/_components/home/HomeFooter'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ── Server-side role routing for authenticated users ──────────────────
  if (user) {
    // 1. Admin check (user_roles table)
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (userRole?.role === 'admin') redirect('/admin')

    // 2. Google OAuth users without a phone → complete profile first
    const isGoogleUser = user.app_metadata?.provider === 'google'
    if (isGoogleUser) {
      const { data: googleProfile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .single()
      if (!googleProfile?.phone) redirect('/auth/complete-profile')
    }

    // 3. Staff membership check (clinic_users table)
    const { data: staffMembership } = await supabase
      .from('clinic_users')
      .select('clinic_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (staffMembership) redirect('/clinic/portal')

    // 4. Profile user_type check
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type, terms_accepted')
      .eq('id', user.id)
      .single()

    if (!profile?.terms_accepted) redirect('/auth/terms')

    if (profile?.user_type === 'clinic') redirect('/clinic/portal')

    redirect('/dashboard')
  }

  // ── Public marketing home page ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-lhc-background font-body">
      {/* Header — Client Component: has mobile menu toggle */}
      <HomeHeader />

      {/* Hero — Client Component: has search form */}
      <HeroSection />

      {/* Loyalty service cards — Client Component: navigate on click */}
      <HeroServiceCards />

      {/* Static sections — Server Components */}
      <PatientFeaturesSection />

      {/* Category & service grids — Client Components: navigate on click */}
      <CategorySection />
      <PopularServices />

      {/* Static sections */}
      <HowItWorks />
      <WhyChooseUs />

      {/* Provider CTA — Client Component */}
      <ProviderCTA />

      {/* Footer */}
      <HomeFooter />
    </div>
  )
}
