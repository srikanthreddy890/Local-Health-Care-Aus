'use client'

/**
 * Authentication — sign-in / sign-up tabs + Google OAuth.
 *
 * Self-contained: after any successful auth event the component calls
 * router.replace('/') and the home page Server Component routes the user
 * to their portal based on role.
 *
 * Key differences from the original React Router version:
 *  - useNavigate → useRouter from next/navigation
 *  - supabase singleton → createClient() called inside the component
 *  - onBack / onSuccess props removed — routing is internal via router
 *  - checkSession useEffect removed — middleware + /api/auth/callback handle OAuth
 *  - OAuth redirectTo points to /api/auth/callback
 *  - Google profile completion (no phone) handled via /auth/complete-profile
 *    (middleware redirects after OAuth if phone is missing)
 *  - MFA verification is shown inline (same as original)
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { User, Building, CheckCircle, Loader2 } from 'lucide-react'
import TotpVerification from './TotpVerification'
import ForgotPassword from './ForgotPassword'
import AuthLoadingOverlay from './AuthLoadingOverlay'

// ── Google logo ────────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

function OrDivider() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-lhc-border" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-lhc-surface px-2 text-lhc-text-muted">or</span>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Authentication() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin')
  const [registrationStep, setRegistrationStep] = useState<'form' | 'success'>('form')
  const [showMfaVerification, setShowMfaVerification] = useState(false)
  const [pendingUserEmail, setPendingUserEmail] = useState<string | undefined>()
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)
  const [overlayUserName, setOverlayUserName] = useState<string | undefined>()

  const [signInData, setSignInData] = useState({ email: '', password: '' })
  const [signUpData, setSignUpData] = useState({
    email: '', password: '', confirmPassword: '',
    firstName: '', lastName: '', clinicName: '', phone: '', userType: 'patient',
  })
  const [termsAccepted, setTermsAccepted] = useState(false)

  // ── After successful auth: persist terms metadata, show overlay, then navigate ──
  const handleSuccess = async () => {
    let firstName: string | undefined
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      firstName = (user?.user_metadata?.first_name as string | undefined)
        || (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0]
      // Persist terms_accepted from sign-up metadata to the profiles row
      if (user?.user_metadata?.terms_accepted) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('terms_accepted')
          .eq('id', user.id)
          .single()
        if (!profile?.terms_accepted) {
          await supabase.from('profiles').update({
            terms_accepted: true,
            terms_accepted_at:
              user.user_metadata.terms_accepted_at ?? new Date().toISOString(),
          }).eq('id', user.id)
        }
      }
    } catch {
      // Non-critical
    }
    // Show the animated overlay, then navigate after it exits (~2.4s)
    setOverlayUserName(firstName)
    setShowOverlay(true)
    setTimeout(() => router.replace('/'), 2400)
  }

  // ── Sign in ────────────────────────────────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setLoadingMessage('Signing in…')

    const supabase = createClient()

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInData.email,
        password: signInData.password,
      })

      if (error) throw error

      // Check MFA requirement
      const { data: aal, error: aalError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

      if (aalError) {
        // Fail secure: revoke session if we cannot determine MFA status
        await supabase.auth.signOut()
        throw new Error('Unable to verify your security status. Please try again.')
      }

      if (aal?.nextLevel === 'aal2' && aal?.currentLevel !== 'aal2') {
        setPendingUserEmail(data.user?.email)
        setShowMfaVerification(true)
        setLoading(false)
        setLoadingMessage('')
        return
      }

      toast.success('Welcome back!')
      await handleSuccess()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Sign in failed'
      let friendly = 'Sign in failed'
      if (msg.includes('Invalid login credentials')) friendly = 'Invalid email or password'
      else if (msg.includes('Email not confirmed')) friendly = 'Please confirm your email first'
      else if (msg) friendly = msg
      toast({ title: 'Sign In Failed', description: friendly, variant: 'destructive' })
    } finally {
      setLoading(false)
      setLoadingMessage('')
    }
  }

  // ── MFA verified inline ────────────────────────────────────────────────────
  const handleMfaVerified = async () => {
    setShowMfaVerification(false)
    setPendingUserEmail(undefined)
    toast.success('Welcome back!')
    await handleSuccess()
  }

  const handleMfaBack = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setShowMfaVerification(false)
    setPendingUserEmail(undefined)
  }

  // ── Sign up ────────────────────────────────────────────────────────────────
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (signUpData.password !== signUpData.confirmPassword) {
      toast({ title: 'Password Mismatch', description: 'Passwords do not match', variant: 'destructive' })
      return
    }
    if (signUpData.password.length < 6) {
      toast({ title: 'Password Too Short', description: 'Password must be at least 6 characters', variant: 'destructive' })
      return
    }
    if (signUpData.userType === 'patient' && !signUpData.firstName.trim()) {
      toast({ title: 'Missing Information', description: 'First name is required', variant: 'destructive' })
      return
    }
    if (signUpData.userType === 'clinic' && !signUpData.clinicName.trim()) {
      toast({ title: 'Missing Information', description: 'Clinic name is required', variant: 'destructive' })
      return
    }
    if (!termsAccepted) {
      toast({ title: 'Terms Required', description: 'Please accept the Terms & Conditions to continue', variant: 'destructive' })
      return
    }

    setLoading(true)
    setLoadingMessage('Creating account…')

    const supabase = createClient()
    const termsAcceptedAt = new Date().toISOString()

    try {
      const { data, error } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            user_type: signUpData.userType,
            first_name: signUpData.userType === 'patient' ? signUpData.firstName : signUpData.clinicName,
            last_name: signUpData.userType === 'patient' ? signUpData.lastName : '',
            clinic_name: signUpData.userType === 'clinic' ? signUpData.clinicName : null,
            phone: signUpData.phone,
            terms_accepted: true,
            terms_accepted_at: termsAcceptedAt,
          },
        },
      })

      if (error) throw error

      // Email confirmation required
      if (data.user && !data.user.email_confirmed_at) {
        setRegistrationStep('success')
        toast.success('Registration successful! Check your email to confirm your account.')
        setSignUpData({ email: '', password: '', confirmPassword: '', firstName: '', lastName: '', clinicName: '', phone: '', userType: 'patient' })
        setTermsAccepted(false)
        return
      }

      // Immediately authenticated (email confirmation disabled in Supabase settings)
      if (data.user) {
        toast.success('Account created! Welcome to Local Health Care.')
        await handleSuccess()
        setSignUpData({ email: '', password: '', confirmPassword: '', firstName: '', lastName: '', clinicName: '', phone: '', userType: 'patient' })
        setTermsAccepted(false)
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : ''
      let friendly = 'Failed to create account'

      if (msg.includes('User already registered')) {
        friendly = 'An account with this email already exists. Please sign in.'
        setActiveTab('signin')
        setSignInData({ email: signUpData.email, password: '' })
      } else if (msg.includes('Invalid email')) {
        friendly = 'Please enter a valid email address'
      } else if (msg.includes('Password should be at least')) {
        friendly = 'Password must be at least 6 characters'
      } else if (msg) {
        friendly = msg
      }

      toast({ title: 'Registration Failed', description: friendly, variant: 'destructive' })
    } finally {
      setLoading(false)
      setLoadingMessage('')
    }
  }

  // ── Google OAuth ───────────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // The callback route exchanges the code and redirects to /
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      })

      if (error) {
        toast({ title: 'Google Sign-In Failed', description: error.message, variant: 'destructive' })
        setGoogleLoading(false)
      }
      // On success, browser follows the OAuth redirect — no further action needed here
    } catch {
      toast({ title: 'Google Sign-In Failed', description: 'An unexpected error occurred. Please try again.', variant: 'destructive' })
      setGoogleLoading(false)
    }
  }

  // ── Loading overlay (shown after successful auth) ─────────────────────────
  if (showOverlay) {
    return <AuthLoadingOverlay userName={overlayUserName} />
  }

  // ── Inline states: MFA, Forgot Password ──────────────────────────────────
  if (showForgotPassword) {
    return <ForgotPassword onBack={() => setShowForgotPassword(false)} />
  }

  if (showMfaVerification) {
    return (
      <TotpVerification
        onVerified={handleMfaVerified}
        onBack={handleMfaBack}
        userEmail={pendingUserEmail}
      />
    )
  }

  // ── Registration success screen ────────────────────────────────────────────
  if (registrationStep === 'success') {
    return (
      <div className="text-center py-8 space-y-4">
        <CheckCircle className="w-16 h-16 text-lhc-primary mx-auto" />
        <h3 className="text-xl font-semibold text-lhc-text-main">Registration successful!</h3>
        <p className="text-lhc-text-muted text-sm max-w-xs mx-auto">
          We sent a confirmation email. Click the link to activate your account,
          then come back to sign in.
        </p>
        <Button
          onClick={() => { setRegistrationStep('form'); setActiveTab('signin') }}
          className="mt-2"
        >
          Continue to sign in
        </Button>
      </div>
    )
  }

  // ── Main sign-in / sign-up form ────────────────────────────────────────────
  return (
    <Tabs
      value={activeTab}
      onValueChange={(val) => {
        setActiveTab(val as 'signin' | 'signup')
        setTermsAccepted(false)
      }}
    >
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="signin">Sign in</TabsTrigger>
        <TabsTrigger value="signup">Sign up</TabsTrigger>
      </TabsList>

      {/* ── Sign In ─────────────────────────────────────────── */}
      <TabsContent value="signin">
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signin-email">Email address</Label>
            <Input
              id="signin-email"
              type="email"
              placeholder="Enter your email"
              value={signInData.email}
              onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="signin-password">Password</Label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-xs text-lhc-primary hover:text-lhc-primary-hover transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <Input
              id="signin-password"
              type="password"
              placeholder="Enter your password"
              value={signInData.password}
              onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || googleLoading}>
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" />{loadingMessage || 'Signing in…'}</>
            ) : 'Sign in'}
          </Button>

          <OrDivider />

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
          >
            {googleLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Redirecting to Google…</>
            ) : (
              <><GoogleIcon /><span>Sign in with Google</span></>
            )}
          </Button>
        </form>
      </TabsContent>

      {/* ── Sign Up ─────────────────────────────────────────── */}
      <TabsContent value="signup">
        <form onSubmit={handleSignUp} className="space-y-4">
          {/* Account type */}
          <div className="space-y-2">
            <Label htmlFor="userType">Account type</Label>
            <Select
              value={signUpData.userType}
              onValueChange={(value) => setSignUpData({ ...signUpData, userType: value })}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="patient">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>Patient</span>
                  </div>
                </SelectItem>
                <SelectItem value="clinic">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    <span>Healthcare Provider</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Name fields */}
          {signUpData.userType === 'patient' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name *</Label>
                <Input
                  id="firstName"
                  placeholder="First name"
                  value={signUpData.firstName}
                  onChange={(e) => setSignUpData({ ...signUpData, firstName: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  placeholder="Last name"
                  value={signUpData.lastName}
                  onChange={(e) => setSignUpData({ ...signUpData, lastName: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="clinicName">Clinic name *</Label>
              <Input
                id="clinicName"
                placeholder="Enter your clinic name"
                value={signUpData.clinicName}
                onChange={(e) => setSignUpData({ ...signUpData, clinicName: e.target.value })}
                required
                disabled={loading}
              />
            </div>
          )}

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone number *</Label>
            <PhoneInput
              id="phone"
              international
              defaultCountry="AU"
              value={signUpData.phone}
              onChange={(value) => setSignUpData({ ...signUpData, phone: value ?? '' })}
              placeholder="+61 400 000 000"
              disabled={loading}
              className="flex h-10 w-full rounded-md border border-lhc-border bg-lhc-surface px-3 py-2 text-sm text-lhc-text-main placeholder:text-lhc-text-muted focus-within:ring-2 focus-within:ring-lhc-primary"
            />
            <p className="text-xs text-lhc-text-muted">Used for appointment reminders only.</p>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="signup-email">Email address *</Label>
            <Input
              id="signup-email"
              type="email"
              placeholder="Enter your email"
              value={signUpData.email}
              onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="signup-password">Password *</Label>
            <Input
              id="signup-password"
              type="password"
              placeholder="Create a password (min. 6 characters)"
              value={signUpData.password}
              onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          {/* Confirm password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password *</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={signUpData.confirmPassword}
              onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          {/* Terms */}
          <div className="flex items-start gap-3 pt-1">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
              disabled={loading}
            />
            <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer font-normal">
              I agree to the{' '}
              <Link href="/terms-and-conditions" target="_blank" className="text-lhc-primary underline hover:text-lhc-primary-hover">
                Terms &amp; Conditions
              </Link>{' '}
              and{' '}
              <Link href="/privacy-policy" target="_blank" className="text-lhc-primary underline hover:text-lhc-primary-hover">
                Privacy Policy
              </Link>{' '}
              *
            </Label>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || googleLoading || !termsAccepted}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" />{loadingMessage || 'Creating account…'}</>
            ) : 'Create account'}
          </Button>

          <OrDivider />

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
          >
            {googleLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Redirecting to Google…</>
            ) : (
              <><GoogleIcon /><span>Sign up with Google</span></>
            )}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  )
}
