'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface Props {
  userName?: string
}

/**
 * Premium auth transition overlay.
 *
 * Phases:
 *  1. logo    (0 → 600ms)  — logo scales in with radiant glow
 *  2. welcome (600ms+)     — personalised greeting + subtitle stagger in
 *
 * No exit phase — the overlay stays at full opacity until Next.js unmounts
 * the /auth page tree when the destination route streams its response.
 */
export default function AuthLoadingOverlay({ userName }: Props) {
  const [phase, setPhase] = useState<'logo' | 'welcome'>('logo')

  useEffect(() => {
    const t = setTimeout(() => setPhase('welcome'), 600)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{
        background:
          'linear-gradient(140deg, #061210 0%, #0a2a1f 25%, #0d3528 50%, #0f6b4f 80%, #12B780 100%)',
        backgroundSize: '300% 300%',
        animation: 'auth-gradient-shift 8s ease infinite',
      }}
    >
      {/* ── Ambient orbs (soft depth lighting) ── */}
      {[
        { top: '15%', left: '20%', size: 280, color: 'rgba(18,183,128,0.08)', dx: '40px', dy: '-30px', dur: '12s', delay: '0s' },
        { top: '60%', left: '70%', size: 340, color: 'rgba(18,183,128,0.06)', dx: '-50px', dy: '25px', dur: '15s', delay: '2s' },
        { top: '75%', left: '15%', size: 200, color: 'rgba(74,222,128,0.05)', dx: '25px', dy: '-40px', dur: '10s', delay: '1s' },
        { top: '10%', left: '75%', size: 220, color: 'rgba(18,183,128,0.04)', dx: '-30px', dy: '35px', dur: '14s', delay: '3s' },
      ].map((orb, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            top: orb.top,
            left: orb.left,
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            ['--orb-dx' as string]: orb.dx,
            ['--orb-dy' as string]: orb.dy,
            animation: `auth-orb-float ${orb.dur} ease-in-out ${orb.delay} infinite`,
            filter: 'blur(40px)',
          }}
        />
      ))}

      {/* ── Subtle grain texture overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.03,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ── Center content ── */}
      <div className="relative flex flex-col items-center z-10">

        {/* Radiant glow behind logo */}
        <div
          className="absolute -top-8"
          style={{
            width: 160,
            height: 160,
            background: 'radial-gradient(circle, rgba(18,183,128,0.35) 0%, rgba(18,183,128,0.08) 50%, transparent 70%)',
            animation: 'auth-glow-pulse 3s ease-in-out infinite',
            filter: 'blur(20px)',
          }}
        />

        {/* Logo container — glass card */}
        <div
          className="relative flex items-center justify-center"
          style={{
            width: 88,
            height: 88,
            borderRadius: 22,
            background: 'linear-gradient(145deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow:
              '0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05) inset, 0 1px 0 rgba(255,255,255,0.1) inset',
            backdropFilter: 'blur(16px)',
            animation: 'auth-scale-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >
          <Image
            src="/images/brand/logo.png"
            alt="Local Health Care"
            width={48}
            height={48}
            priority
            style={{ filter: 'drop-shadow(0 2px 8px rgba(18,183,128,0.4))' }}
          />
        </div>

        {/* ── Text section ── */}
        <div className="text-center mt-7 flex flex-col items-center" style={{ minHeight: 72 }}>
          {phase === 'logo' && (
            <p
              className="text-sm font-medium tracking-[0.08em] uppercase"
              style={{
                color: 'rgba(255,255,255,0.5)',
                animation: 'auth-fade-in 0.4s ease-out forwards',
                letterSpacing: '0.12em',
              }}
            >
              Local Health Care
            </p>
          )}

          {phase === 'welcome' && (
            <>
              <h2
                className="font-extrabold text-white text-[1.75rem] sm:text-[2rem] leading-tight"
                style={{
                  animation: 'auth-slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                  textShadow: '0 2px 20px rgba(18,183,128,0.3)',
                }}
              >
                {userName ? `Welcome back, ${userName}!` : 'Welcome!'}
              </h2>
              <p
                className="text-sm mt-2"
                style={{
                  color: 'rgba(255,255,255,0.45)',
                  animation: 'auth-slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both',
                }}
              >
                Preparing your dashboard&hellip;
              </p>
            </>
          )}
        </div>

        {/* ── Progress track ── */}
        <div
          className="mt-8"
          style={{
            width: 200,
            animation: 'auth-fade-in 0.6s ease-out 0.3s both',
          }}
        >
          <div
            style={{
              height: 2,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.08)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Glowing progress sweep */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                width: '40%',
                borderRadius: 2,
                background:
                  'linear-gradient(90deg, transparent, rgba(18,183,128,0.9) 40%, rgba(74,222,128,1) 60%, transparent)',
                animation: 'auth-progress-glow 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite',
                boxShadow: '0 0 12px rgba(18,183,128,0.6), 0 0 4px rgba(18,183,128,0.4)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
