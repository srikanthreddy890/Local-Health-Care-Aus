'use client'

import { Button } from '@/components/ui/button'
import { Heart, Smile, Stethoscope, Pill, Microscope, Leaf, Newspaper, type LucideIcon } from 'lucide-react'
import type { BlogCategory } from '@/lib/utils/blogUtils'

const ICON_MAP: Record<string, LucideIcon> = {
  Heart,
  Smile,
  Stethoscope,
  Pill,
  Microscope,
  Leaf,
  Newspaper,
}

interface Props {
  categories: BlogCategory[]
  selected: string | null
  onSelect: (id: string | null) => void
}

export default function CategoryFilterBar({ categories, selected, onSelect }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
      <Button
        variant={selected === null ? 'default' : 'outline'}
        size="sm"
        onClick={() => onSelect(null)}
        className="flex-shrink-0"
      >
        All Posts
      </Button>
      {categories.map((cat) => {
        const Icon = cat.icon ? ICON_MAP[cat.icon] : null
        return (
          <Button
            key={cat.id}
            variant={selected === cat.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelect(cat.id)}
            className="flex-shrink-0"
          >
            {Icon && <Icon className="w-3.5 h-3.5 mr-1.5" />}
            {cat.name}
          </Button>
        )
      })}
    </div>
  )
}
