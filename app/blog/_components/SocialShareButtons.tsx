'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Share2, Copy, Check } from 'lucide-react'

interface Props {
  url: string
  title: string
}

export default function SocialShareButtons({ url, title }: Props) {
  const [copied, setCopied] = useState(false)
  const encoded = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  function openPopup(shareUrl: string) {
    window.open(shareUrl, '_blank', 'width=600,height=400,noopener,noreferrer')
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* silent */
    }
  }

  function nativeShare() {
    if (navigator.share) {
      navigator.share({ title, url }).catch(() => {})
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        onClick={() => openPopup(`https://twitter.com/intent/tweet?url=${encoded}&text=${encodedTitle}`)}
      >
        X / Twitter
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => openPopup(`https://www.facebook.com/sharer/sharer.php?u=${encoded}`)}
      >
        Facebook
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => openPopup(`https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`)}
      >
        LinkedIn
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => openPopup(`https://wa.me/?text=${encodedTitle}%20${encoded}`)}
      >
        WhatsApp
      </Button>
      <Button variant="outline" size="sm" onClick={copyLink}>
        {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
        {copied ? 'Copied' : 'Copy Link'}
      </Button>
      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <Button variant="outline" size="sm" onClick={nativeShare}>
          <Share2 className="w-4 h-4 mr-1" /> Share
        </Button>
      )}
    </div>
  )
}
