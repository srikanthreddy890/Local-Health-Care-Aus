'use client'

/**
 * Authentication — sign-in / sign-up with:
 * - Dynamic contextual heading
 * - Pill-style tab toggle
 * - Password visibility toggle
 * - Account type toggle cards (not dropdown)
 * - Password strength indicator
 * - Clear disabled/enabled button states
 * - Google OAuth
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Building, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react'
import TotpVerification from './TotpVerification'
import ForgotPassword from './ForgotPassword'
import AuthLoadingOverlay from './AuthLoadingOverlay'
import { clearDerivedSecretCache } from '@/lib/chatEncryption'

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
        <span className="bg-white px-2 text-lhc-text-muted">or</span>
      </div>
    </div>
  )
}

// ── Password strength calculator ──────────────────────────────────────────────
function getPasswordStrength(password: string): { level: number; label: string; color: string } {
  if (!password) return { level: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  if (score <= 1) return { level: 1, label: 'Weak', color: '#EF4444' }
  if (score === 2) return { level: 2, label: 'Fair', color: '#F97316' }
  if (score === 3) return { level: 3, label: 'Good', color: '#EAB308' }
  return { level: 4, label: 'Strong', color: '#22C55E' }
}

// ── Password input with visibility toggle ─────────────────────────────────────
function PasswordInput({ id, placeholder, value, onChange, disabled }: {
  id: string; placeholder: string; value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; disabled: boolean
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
        disabled={disabled}
        className="pr-11"
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        tabIndex={-1}
      >
        {visible ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
      </button>
    </div>
  )
}

// ── Password strength bar ─────────────────────────────────────────────────────
function PasswordStrengthBar({ password }: { password: string }) {
  const strength = getPasswordStrength(password)
  if (!password) return null

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((seg) => (
          <div
            key={seg}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{
              backgroundColor: seg <= strength.level ? strength.color : '#E5E7EB',
            }}
          />
        ))}
      </div>
      <p className="text-xs transition-colors" style={{ color: strength.color }}>
        {strength.label}
      </p>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Authentication({ redirectTo }: { redirectTo?: string }) {
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

  // ── Rate limiting ────────────────────────────────────────────────────────────
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null)
  const [lockoutRemaining, setLockoutRemaining] = useState(0)

  const isLockedOut = lockoutUntil !== null && Date.now() < lockoutUntil

  useEffect(() => {
    if (!lockoutUntil) return
    const tick = () => {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000)
      if (remaining <= 0) {
        setLockoutUntil(null)
        setLockoutRemaining(0)
      } else {
        setLockoutRemaining(remaining)
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [lockoutUntil])

  const [signInData, setSignInData] = useState({ email: '', password: '' })
  const [signUpData, setSignUpData] = useState({
    email: '', password: '', confirmPassword: '',
    firstName: '', lastName: '', clinicName: '', phone: '', userType: 'patient',
  })
  const [termsAccepted, setTermsAccepted] = useState(false)
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    return () => {
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current)
    }
  }, [])

  // ── After successful auth ──
  const handleSuccess = async () => {
    let firstName: string | undefined
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      firstName = (user?.user_metadata?.first_name as string | undefined)
        || (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0]
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
    setOverlayUserName(firstName)
    setShowOverlay(true)
    const destination = redirectTo || '/'
    setTimeout(() => router.replace(destination), 1200)
    safetyTimerRef.current = setTimeout(() => {
      window.location.href = destination
    }, 10_000)
  }

  // ── Sign in (via server-side route with IP + email rate limiting) ──────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    clearDerivedSecretCache()

    if (isLockedOut) {
      toast({ title: 'Too many attempts', description: `Please wait ${lockoutRemaining} seconds before trying again.`, variant: 'destructive' })
      return
    }

    setLoading(true)
    setLoadingMessage('Signing in\u2026')

    try {
      // Call server-side sign-in route (enforces per-IP + per-email rate limiting)
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signInData.email, password: signInData.password }),
      })

      const result = await res.json()

      if (!res.ok) {
        // Server-side rate limit hit (429)
        if (res.status === 429) {
          setLockoutUntil(Date.now() + (result.retryAfter ?? 900) * 1000)
          setFailedAttempts(0)
          throw new Error(result.error || 'Too many failed attempts. Please try again later.')
        }
        throw new Error(result.error || 'Sign in failed')
      }

      // MFA required — session is partially authenticated
      if (result.requiresMfa) {
        setPendingUserEmail(result.user?.email)
        setShowMfaVerification(true)
        setLoading(false)
        setLoadingMessage('')
        return
      }

      setFailedAttempts(0)
      setLockoutUntil(null)
      toast.success('Welcome back!')
      await handleSuccess()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Sign in failed'
      let friendly = 'Sign in failed'
      if (msg.includes('Invalid login credentials')) {
        friendly = 'Invalid email or password'
        const next = failedAttempts + 1
        setFailedAttempts(next)
        if (next >= 5) {
          setLockoutUntil(Date.now() + 120_000)
          setFailedAttempts(0)
          friendly = 'Too many failed attempts. Please wait 2 minutes before trying again.'
        }
      } else if (msg.includes('Too many failed attempts')) {
        friendly = msg
      } else if (msg.includes('Email not confirmed')) {
        friendly = 'Please confirm your email first'
      } else if (msg) {
        friendly = msg
      }
      toast({ title: 'Sign In Failed', description: friendly, variant: 'destructive' })
    } finally {
      setLoading(false)
      setLoadingMessage('')
    }
  }

  // ── MFA ────────────────────────────────────────────────────────────────
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
    if (signUpData.password.length < 8) {
      toast({ title: 'Password Too Short', description: 'Password must be at least 8 characters', variant: 'destructive' })
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
    setLoadingMessage('Creating account\u2026')

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

      if (data.user && !data.user.email_confirmed_at) {
        setRegistrationStep('success')
        toast.success('Registration successful! Check your email to confirm your account.')
        setSignUpData({ email: '', password: '', confirmPassword: '', firstName: '', lastName: '', clinicName: '', phone: '', userType: 'patient' })
        setTermsAccepted(false)
        return
      }

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
        friendly = 'Password must be at least 8 characters'
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
          redirectTo: `${window.location.origin}/api/auth/callback${redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : ''}`,
        },
      })

      if (error) {
        toast({ title: 'Google Sign-In Failed', description: error.message, variant: 'destructive' })
        setGoogleLoading(false)
      }
    } catch {
      toast({ title: 'Google Sign-In Failed', description: 'An unexpected error occurred. Please try again.', variant: 'destructive' })
      setGoogleLoading(false)
    }
  }

  // Check if sign-up form is complete for enabling the CTA
  const isSignUpFormValid = useMemo(() => {
    const hasName = signUpData.userType === 'patient'
      ? signUpData.firstName.trim().length > 0
      : signUpData.clinicName.trim().length > 0
    const hasEmail = signUpData.email.trim().length > 0
    const hasPassword = signUpData.password.length >= 8
    const passwordsMatch = signUpData.password === signUpData.confirmPassword
    return hasName && hasEmail && hasPassword && passwordsMatch && termsAccepted
  }, [signUpData, termsAccepted])

  // ── Loading overlay ─────────────────────────────────────────────────────
  if (showOverlay) {
    return <AuthLoadingOverlay userName={overlayUserName} />
  }

  // ── Inline states ──────────────────────────────────────────────────────
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

  // ── Dynamic heading ────────────────────────────────────────────────────────
  const heading = activeTab === 'signin' ? 'Welcome back' : 'Create your free account'
  const subtitle = activeTab === 'signin'
    ? 'Access your appointments and health records'
    : 'Join 50,000+ Australians managing their health'

  // ── Main sign-in / sign-up form ────────────────────────────────────────────
  return (
    <div>
      {/* Dynamic heading */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-extrabold text-lhc-text-main transition-all duration-200">
          {heading}
        </h2>
        <p className="text-sm text-lhc-text-muted mt-1.5 transition-all duration-200">
          {subtitle}
        </p>
      </div>

      {/* Pill-style tab toggle */}
      <div className="bg-gray-100 rounded-xl p-1 flex mb-6">
        <button
          type="button"
          onClick={() => { setActiveTab('signin'); setTermsAccepted(false) }}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
            activeTab === 'signin'
              ? 'bg-white shadow-sm text-lhc-text-main border border-lhc-primary/20'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('signup'); setTermsAccepted(false) }}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
            activeTab === 'signup'
              ? 'bg-white shadow-sm text-lhc-text-main border border-lhc-primary/20'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Sign up
        </button>
      </div>

      {/* ── Sign In ─────────────────────────────────────────── */}
      {activeTab === 'signin' && (
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
            <PasswordInput
              id="signin-password"
              placeholder="Enter your password"
              value={signInData.password}
              onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
              disabled={loading}
            />
          </div>

          {isLockedOut && (
            <p className="text-sm text-destructive text-center">
              Too many failed attempts. Try again in {lockoutRemaining}s.
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading || googleLoading || isLockedOut}>
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" />{loadingMessage || 'Signing in\u2026'}</>
            ) : isLockedOut ? `Locked (${lockoutRemaining}s)` : 'Sign in'}
          </Button>

          <OrDivider />

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading || isLockedOut}
          >
            {googleLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Redirecting to Google\u2026</>
            ) : (
              <><GoogleIcon /><span>Sign in with Google</span></>
            )}
          </Button>
        </form>
      )}

      {/* ── Sign Up ─────────────────────────────────────────── */}
      {activeTab === 'signup' && (
        <form onSubmit={handleSignUp} className="space-y-4">
          {/* Account type — toggle cards */}
          <div className="space-y-2">
            <Label>Account type</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSignUpData({ ...signUpData, userType: 'patient' })}
                disabled={loading}
                className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all duration-200 ${
                  signUpData.userType === 'patient'
                    ? 'border-lhc-primary bg-[#F0FDF4]'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <User className={`w-6 h-6 ${signUpData.userType === 'patient' ? 'text-lhc-primary' : 'text-gray-400'}`} />
                <span className={`text-sm font-semibold ${signUpData.userType === 'patient' ? 'text-lhc-text-main' : 'text-gray-500'}`}>
                  I&apos;m a Patient
                </span>
                <span className="text-[10px] text-gray-400 leading-tight text-center">
                  Book appointments &amp; manage health
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSignUpData({ ...signUpData, userType: 'clinic' })}
                disabled={loading}
                className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all duration-200 ${
                  signUpData.userType === 'clinic'
                    ? 'border-lhc-primary bg-[#F0FDF4]'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <Building className={`w-6 h-6 ${signUpData.userType === 'clinic' ? 'text-lhc-primary' : 'text-gray-400'}`} />
                <span className={`text-sm font-semibold ${signUpData.userType === 'clinic' ? 'text-lhc-text-main' : 'text-gray-500'}`}>
                  I&apos;m a Provider
                </span>
                <span className="text-[10px] text-gray-400 leading-tight text-center">
                  List your clinic &amp; manage bookings
                </span>
              </button>
            </div>
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

          {/* Password with strength indicator */}
          <div className="space-y-2">
            <Label htmlFor="signup-password">Password *</Label>
            <PasswordInput
              id="signup-password"
              placeholder="Create a password (min. 8 characters)"
              value={signUpData.password}
              onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
              disabled={loading}
            />
            <PasswordStrengthBar password={signUpData.password} />
          </div>

          {/* Confirm password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password *</Label>
            <PasswordInput
              id="confirmPassword"
              placeholder="Confirm your password"
              value={signUpData.confirmPassword}
              onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
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

          {/* Create account — clear disabled vs enabled states */}
          <Button
            type="submit"
            className={`w-full transition-all duration-300 ${
              isSignUpFormValid
                ? 'bg-[#00A86B] hover:bg-[#009960] text-white'
                : 'bg-gray-200 text-gray-400 hover:bg-gray-200 cursor-not-allowed'
            }`}
            disabled={loading || googleLoading || !termsAccepted}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" />{loadingMessage || 'Creating account\u2026'}</>
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
              <><Loader2 className="w-4 h-4 animate-spin" />Redirecting to Google\u2026</>
            ) : (
              <><GoogleIcon /><span>Sign up with Google</span></>
            )}
          </Button>
        </form>
      )}
    </div>
  )
}
