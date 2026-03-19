'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface Props {
  userName?: string
}

export default function AuthLoadingOverlay({ userName }: Props) {
  const [phase, setPhase] = useState<'enter' | 'welcome' | 'exit'>('enter')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Phase 1: logo enters (0-600ms)
    // Phase 2: welcome text (600-1800ms)
    // Phase 3: exit (1800-2400ms)

    const t1 = setTimeout(() => setPhase('welcome'), 700)
    const t2 = setTimeout(() => setPhase('exit'), 1900)

    // Animate progress bar
    let frame: number
    let start: number
    const duration = 2000
    function tick(ts: number) {
      if (!start) start = ts
      const elapsed = ts - start
      setProgress(Math.min((elapsed / duration) * 100, 100))
      if (elapsed < duration) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0B1F16 0%, #0d2a1e 40%, #12B780 100%)',
        animation: phase === 'exit' ? 'overlayFadeOut 0.5s ease-in forwards' : 'overlayFadeIn 0.3s ease-out forwards',
      }}
    >
      <style>{`
        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes overlayFadeOut {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(1.04); }
        }
        @keyframes logoIn {
          0% { opacity: 0; transform: scale(0.4) rotate(-15deg); }
          60% { transform: scale(1.12) rotate(4deg); }
          80% { transform: scale(0.96) rotate(-1deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes ringPulse {
          0% { transform: scale(0.8); opacity: 0.7; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes ringPulse2 {
          0% { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        @keyframes textSlideUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes subtitleFade {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-8px); opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes particleFloat {
          0% { transform: translateY(0) translateX(0) scale(1); opacity: 0.6; }
          50% { opacity: 0.3; }
          100% { transform: translateY(-120px) translateX(var(--dx, 20px)) scale(0); opacity: 0; }
        }
        .logo-animate { animation: logoIn 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .ring-1 { animation: ringPulse 1.6s ease-out 0.3s infinite; }
        .ring-2 { animation: ringPulse2 1.6s ease-out 0.7s infinite; }
        .text-enter { animation: textSlideUp 0.5s ease-out forwards; }
        .subtitle-enter { animation: subtitleFade 0.5s ease-out 0.15s both; }
        .dot-1 { animation: dotBounce 1.2s ease-in-out 0s infinite; }
        .dot-2 { animation: dotBounce 1.2s ease-in-out 0.2s infinite; }
        .dot-3 { animation: dotBounce 1.2s ease-in-out 0.4s infinite; }
      `}</style>

      {/* Floating particles */}
      {[
        { top: '20%', left: '15%', dx: '-30px', delay: '0s', size: 6 },
        { top: '70%', left: '10%', dx: '20px', delay: '0.3s', size: 4 },
        { top: '30%', left: '80%', dx: '40px', delay: '0.1s', size: 8 },
        { top: '60%', left: '75%', dx: '-20px', delay: '0.5s', size: 5 },
        { top: '80%', left: '50%', dx: '10px', delay: '0.2s', size: 3 },
        { top: '15%', left: '55%', dx: '-15px', delay: '0.7s', size: 6 },
      ].map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-lhc-primary/40"
          style={{
            top: p.top, left: p.left,
            width: p.size, height: p.size,
            ['--dx' as string]: p.dx,
            animation: `particleFloat 2.5s ease-out ${p.delay} infinite`,
          }}
        />
      ))}

      {/* Center content */}
      <div className="relative flex flex-col items-center gap-8">

        {/* Pulsing rings behind logo */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="ring-1 absolute w-24 h-24 rounded-full border-2 border-lhc-primary/50" />
          <div className="ring-2 absolute w-24 h-24 rounded-full border border-lhc-primary/30" />
        </div>

        {/* Logo circle */}
        <div
          className="logo-animate relative w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl"
          style={{ background: 'rgba(18,183,128,0.15)', border: '2px solid rgba(18,183,128,0.4)', backdropFilter: 'blur(12px)' }}
        >
          <Image src="/images/brand/logo.png" alt="Local Health Care" width={52} height={52} priority />
          {/* Inner glow */}
          <div className="absolute inset-0 rounded-3xl" style={{ boxShadow: '0 0 40px rgba(18,183,128,0.4) inset' }} />
        </div>

        {/* Text section */}
        <div className="text-center space-y-2 min-h-[72px] flex flex-col items-center justify-center">
          {phase === 'enter' && (
            <p className="text-enter text-white/70 text-base font-medium tracking-wide">
              Local Health Care
            </p>
          )}
          {phase !== 'enter' && (
            <>
              <h2
                className="text-enter font-extrabold text-white text-2xl sm:text-3xl"
                style={{
                  background: 'linear-gradient(90deg, #fff 0%, #12B780 50%, #fff 100%)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  animation: 'shimmer 2s linear infinite, textSlideUp 0.5s ease-out forwards',
                }}
              >
                {userName ? `Welcome back, ${userName}!` : 'Welcome!'}
              </h2>
              <p className="subtitle-enter text-white/60 text-sm">
                Taking you to your dashboard…
              </p>
            </>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-56 space-y-3">
          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #12B780, #4ade80, #12B780)',
                backgroundSize: '200% auto',
                animation: 'shimmer 1.5s linear infinite',
                boxShadow: '0 0 10px rgba(18,183,128,0.8)',
              }}
            />
          </div>

          {/* Loading dots */}
          <div className="flex items-center justify-center gap-1.5">
            <div className="dot-1 w-1.5 h-1.5 rounded-full bg-lhc-primary" />
            <div className="dot-2 w-1.5 h-1.5 rounded-full bg-lhc-primary" />
            <div className="dot-3 w-1.5 h-1.5 rounded-full bg-lhc-primary" />
          </div>
        </div>
      </div>
    </div>
  )
}
