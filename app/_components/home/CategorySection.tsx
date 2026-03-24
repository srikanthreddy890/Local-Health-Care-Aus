'use client'

/**
 * CategorySection — 6×3 grid of healthcare categories with teal icons.
 * Each tile links to /book?category=<slug>.
 */

import Link from 'next/link'
import {
  MonitorSmartphone, Briefcase, Heart, Brain, Activity, FileCheck,
  Bone, Footprints, Plus, BrainCircuit, Fingerprint, Ear,
  Eye, MessageCircleHeart, Syringe, ShieldCheck, ScanLine,
} from 'lucide-react'
import { CATEGORIES } from '@/lib/categories'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  MonitorSmartphone, Briefcase, Heart, Brain, Activity, FileCheck,
  Bone, Footprints, Plus, BrainCircuit, Fingerprint, Ear,
  Eye, MessageCircleHeart, Syringe, ShieldCheck, ScanLine,
}

export default function CategorySection() {
  return (
    <section className="py-14 px-4 bg-white">
      <div className="container mx-auto max-w-5xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat, idx) => {
            const Icon = ICON_MAP[cat.icon]
            // 2-col: odd columns (idx%2===0) get right border; 3-col: non-last columns (idx%3!==2) get right border
            const borderClasses = [
              'border-b border-gray-100',
              idx % 2 === 0 ? 'sm:border-r' : '',
              // Reset 2-col borders and apply 3-col borders
              'lg:border-r-0',
              idx % 3 !== 2 ? 'lg:border-r' : '',
            ].filter(Boolean).join(' ')
            return (
              <Link
                key={cat.slug}
                href={`/book?category=${cat.slug}`}
                className={`flex items-center gap-3 px-5 py-4 transition-colors hover:bg-gray-50 ${borderClasses}`}
              >
                <div className="w-9 h-9 rounded-lg bg-lhc-primary/10 flex items-center justify-center flex-shrink-0">
                  {Icon && <Icon className="w-5 h-5 text-lhc-primary" />}
                </div>
                <span className="text-sm font-medium text-lhc-text-main">{cat.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
