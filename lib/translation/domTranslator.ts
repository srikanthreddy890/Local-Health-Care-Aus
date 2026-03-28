import { getCachedTranslations, setCachedTranslations } from './translationCache'

/* ── Constants ────────────────────────────────────────────────── */
const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'CODE', 'PRE', 'SVG', 'NOSCRIPT', 'IFRAME', 'TEXTAREA',
])
const TRANSLATABLE_ATTRS = ['placeholder', 'aria-label', 'title', 'alt']
const BATCH_SIZE = 50
const OBSERVER_DEBOUNCE_MS = 400

/* ── Helpers ──────────────────────────────────────────────────── */

/** Check if a node or any ancestor should be skipped. */
function shouldSkip(node: Node): boolean {
  let el: Element | null = node.nodeType === Node.ELEMENT_NODE
    ? (node as Element)
    : node.parentElement

  while (el) {
    if (SKIP_TAGS.has(el.tagName)) return true
    if (el.classList?.contains('notranslate')) return true
    if ((el as HTMLElement).isContentEditable) return true
    if (el.hasAttribute?.('data-no-translate')) return true
    el = el.parentElement
  }
  return false
}

/** Check if text is worth translating (not just whitespace, numbers, or symbols). */
function isTranslatable(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed || trimmed.length < 2) return false
  // Must contain at least one letter
  return /[a-zA-Z]/.test(trimmed)
}

/* ── DomTranslator class ─────────────────────────────────────── */

interface TextNodeEntry {
  node: Text
  original: string
}

interface AttrEntry {
  element: Element
  attr: string
  original: string
}

export class DomTranslator {
  private textNodes: TextNodeEntry[] = []
  private attrEntries: AttrEntry[] = []
  private observer: MutationObserver | null = null
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private currentLang: string = 'en'
  private isTranslating = false

  /* ── Collect translatable content from the DOM ────────────── */
  private collectNodes(root: Node): { texts: TextNodeEntry[]; attrs: AttrEntry[] } {
    const texts: TextNodeEntry[] = []
    const attrs: AttrEntry[] = []

    // Collect text nodes
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        if (shouldSkip(node)) return NodeFilter.FILTER_REJECT
        if (!isTranslatable(node.textContent ?? '')) return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      },
    })

    let textNode: Text | null
    while ((textNode = walker.nextNode() as Text | null)) {
      texts.push({ node: textNode, original: textNode.textContent ?? '' })
    }

    // Collect translatable attributes
    if (root.nodeType === Node.ELEMENT_NODE || root === document.body) {
      const elements = (root as Element).querySelectorAll?.('*') ?? []
      for (const el of elements) {
        if (shouldSkip(el)) continue
        for (const attr of TRANSLATABLE_ATTRS) {
          const val = el.getAttribute(attr)
          if (val && isTranslatable(val)) {
            attrs.push({ element: el, attr, original: val })
          }
        }
      }
    }

    return { texts, attrs }
  }

  /* ── Batch translate via API ──────────────────────────────── */
  private async batchTranslate(
    strings: string[],
    langCode: string,
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>()
    if (strings.length === 0) return result

    // Split into batches
    for (let i = 0; i < strings.length; i += BATCH_SIZE) {
      const batch = strings.slice(i, i + BATCH_SIZE)
      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: batch, target: langCode }),
        })
        if (!res.ok) {
          console.warn(`[DomTranslator] API returned ${res.status}`)
          continue
        }
        const data = await res.json()
        const translations: string[] = data.translations ?? []
        batch.forEach((orig, idx) => {
          if (translations[idx]) result.set(orig, translations[idx])
        })
      } catch (err) {
        console.warn('[DomTranslator] Batch translate failed:', err)
      }
    }

    return result
  }

  /* ── Apply translations to the DOM ───────────────────────── */
  private applyTranslations(
    textEntries: TextNodeEntry[],
    attrEntries: AttrEntry[],
    translationMap: Map<string, string>,
  ) {
    for (const entry of textEntries) {
      const trimmed = entry.original.trim()
      const translated = translationMap.get(trimmed)
      if (translated) {
        // Preserve original leading/trailing whitespace
        const leading = entry.original.match(/^\s*/)?.[0] ?? ''
        const trailing = entry.original.match(/\s*$/)?.[0] ?? ''
        entry.node.textContent = leading + translated + trailing
      }
    }

    for (const entry of attrEntries) {
      const translated = translationMap.get(entry.original.trim())
      if (translated) {
        entry.element.setAttribute(entry.attr, translated)
      }
    }
  }

  /* ── Public: translate the page ──────────────────────────── */
  async translate(langCode: string): Promise<void> {
    if (this.isTranslating) return
    this.isTranslating = true
    this.currentLang = langCode

    try {
      const { texts, attrs } = this.collectNodes(document.body)

      // Store references for restore
      this.textNodes = texts
      this.attrEntries = attrs

      // Deduplicate
      const uniqueStrings = new Set<string>()
      for (const t of texts) uniqueStrings.add(t.original.trim())
      for (const a of attrs) uniqueStrings.add(a.original.trim())

      // Check cache
      const cached = getCachedTranslations(langCode)
      const uncached: string[] = []
      const translationMap = new Map<string, string>()

      for (const str of uniqueStrings) {
        if (cached[str]) {
          translationMap.set(str, cached[str])
        } else {
          uncached.push(str)
        }
      }

      // Fetch uncached translations
      if (uncached.length > 0) {
        const fetched = await this.batchTranslate(uncached, langCode)

        // Merge into map and cache
        const newCacheEntries: Record<string, string> = {}
        for (const [orig, trans] of fetched) {
          translationMap.set(orig, trans)
          newCacheEntries[orig] = trans
        }
        if (Object.keys(newCacheEntries).length > 0) {
          setCachedTranslations(langCode, newCacheEntries)
        }
      }

      // Apply to DOM
      this.applyTranslations(texts, attrs, translationMap)
    } finally {
      this.isTranslating = false
    }
  }

  /* ── Public: restore original text ───────────────────────── */
  restore() {
    for (const entry of this.textNodes) {
      entry.node.textContent = entry.original
    }
    for (const entry of this.attrEntries) {
      entry.element.setAttribute(entry.attr, entry.original)
    }
    this.textNodes = []
    this.attrEntries = []
    this.currentLang = 'en'
  }

  /* ── Public: observe DOM for dynamic content ─────────────── */
  observe() {
    if (this.observer) return

    this.observer = new MutationObserver((mutations) => {
      if (this.currentLang === 'en' || this.isTranslating) return

      // Debounce
      if (this.debounceTimer) clearTimeout(this.debounceTimer)
      this.debounceTimer = setTimeout(() => {
        this.translateMutations(mutations)
      }, OBSERVER_DEBOUNCE_MS)
    })

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    })
  }

  /** Translate newly added nodes from mutations. */
  private async translateMutations(mutations: MutationRecord[]) {
    if (this.isTranslating || this.currentLang === 'en') return

    const addedNodes: Node[] = []
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
          addedNodes.push(node)
        }
      }
    }
    if (addedNodes.length === 0) return

    this.isTranslating = true
    try {
      const allTexts: TextNodeEntry[] = []
      const allAttrs: AttrEntry[] = []

      for (const node of addedNodes) {
        const { texts, attrs } = this.collectNodes(node)
        allTexts.push(...texts)
        allAttrs.push(...attrs)
      }

      if (allTexts.length === 0 && allAttrs.length === 0) return

      // Deduplicate
      const uniqueStrings = new Set<string>()
      for (const t of allTexts) uniqueStrings.add(t.original.trim())
      for (const a of allAttrs) uniqueStrings.add(a.original.trim())

      const cached = getCachedTranslations(this.currentLang)
      const uncached: string[] = []
      const translationMap = new Map<string, string>()

      for (const str of uniqueStrings) {
        if (cached[str]) {
          translationMap.set(str, cached[str])
        } else {
          uncached.push(str)
        }
      }

      if (uncached.length > 0) {
        const fetched = await this.batchTranslate(uncached, this.currentLang)
        const newCacheEntries: Record<string, string> = {}
        for (const [orig, trans] of fetched) {
          translationMap.set(orig, trans)
          newCacheEntries[orig] = trans
        }
        if (Object.keys(newCacheEntries).length > 0) {
          setCachedTranslations(this.currentLang, newCacheEntries)
        }
      }

      // Apply and track for restore
      this.applyTranslations(allTexts, allAttrs, translationMap)
      this.textNodes.push(...allTexts)
      this.attrEntries.push(...allAttrs)
    } finally {
      this.isTranslating = false
    }
  }

  /* ── Public: disconnect observer ─────────────────────────── */
  disconnect() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.observer?.disconnect()
    this.observer = null
  }
}
