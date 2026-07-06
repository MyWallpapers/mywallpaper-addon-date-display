import { useState, useEffect, useRef, useMemo, useCallback, type CSSProperties } from 'react'
import { createRoot } from 'react-dom/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Settings {
  // Display
  showDayOfWeek: boolean
  showDate: boolean
  dateFormat: 'long' | 'short' | 'numeric' | 'numeric-us' | 'iso' | 'day-month' | 'month-day'

  // Language
  languageMode: 'preset' | 'custom'
  language: string
  customDays: string
  customMonths: string

  // Font
  fontMode: 'preset' | 'custom'
  fontPreset: string
  customFontUrl: string
  customFontFamily: string
  customFontWeight: string
  customFontStyle: string

  // Style
  dayFontSize: number
  dateFontSize: number
  fontWeight: string
  textColor: string
  textAlign: 'left' | 'center' | 'right'
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
  textOpacity: number
  letterSpacing: number

}

interface MyWallpaperLayerApi {
  root: HTMLElement
  settings: {
    get(): Partial<Settings>
    subscribe(listener: (settings: Partial<Settings>) => void): () => void
  }
  lifecycle?: {
    onDispose(listener: () => void): () => void
  }
}

interface MyWallpaperApi {
  layer: MyWallpaperLayerApi
}

declare global {
  interface Window {
    MyWallpaper?: MyWallpaperApi
  }
}

const DEFAULT_SETTINGS: Settings = {
  showDayOfWeek: true,
  showDate: false,
  dateFormat: 'long',
  languageMode: 'preset',
  language: 'en',
  customDays: 'Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday',
  customMonths: 'January,February,March,April,May,June,July,August,September,October,November,December',
  fontMode: 'custom',
  fontPreset: 'Inter',
  customFontUrl: 'https://fonts.cdnfonts.com/css/anurati',
  customFontFamily: 'CustomFont',
  customFontWeight: '400',
  customFontStyle: 'normal',
  dayFontSize: 71,
  dateFontSize: 48,
  fontWeight: '600',
  textColor: '#ffffff',
  textAlign: 'center',
  textTransform: 'uppercase',
  textOpacity: 100,
  letterSpacing: 30,
}

const layer = window.MyWallpaper?.layer
const runtimeRoot = layer?.root ?? document.getElementById('root')

if (runtimeRoot) {
  runtimeRoot.classList.add('mwa-date-display-root')
  runtimeRoot.style.width = '100%'
  runtimeRoot.style.height = '100%'
  runtimeRoot.style.margin = '0'
  runtimeRoot.style.overflow = 'hidden'
  runtimeRoot.style.background = 'transparent'
}

if (!layer) {
  document.documentElement.style.width = '100%'
  document.documentElement.style.height = '100%'
  document.documentElement.style.margin = '0'
  document.body.style.width = '100%'
  document.body.style.height = '100%'
  document.body.style.margin = '0'
  document.body.style.overflow = 'hidden'
  document.body.style.background = 'transparent'
}

function normalizeSettings(settings: Partial<Settings>): Settings {
  return { ...DEFAULT_SETTINGS, ...settings }
}

function useLayerSettings(): Settings {
  const [settings, setSettings] = useState<Settings>(() => normalizeSettings(layer?.settings.get() ?? {}))

  useEffect(() => {
    return layer?.settings.subscribe((next) => setSettings(normalizeSettings(next))) ?? (() => {})
  }, [])

  return settings
}

// Default custom day/month names (English fallback)
const DEFAULT_DAYS = 'Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday'
const DEFAULT_MONTHS = 'January,February,March,April,May,June,July,August,September,October,November,December'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function padZero(n: number): string {
  return n < 10 ? `0${n}` : n.toString()
}

function intlDay(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date)
}

function intlMonth(date: Date, locale: string, style: 'long' | 'short' = 'long'): string {
  return new Intl.DateTimeFormat(locale, { month: style }).format(date)
}

function getDayOfWeek(date: Date, settings: Settings): string {
  if (settings.languageMode === 'custom') {
    const parts = (settings.customDays || DEFAULT_DAYS).split(',').map((s) => s.trim())
    return parts.length >= 7 ? parts[date.getDay()] : intlDay(date, 'en')
  }
  return intlDay(date, settings.language || 'en')
}

function formatDate(date: Date, settings: Settings): string {
  const day = date.getDate()
  const month = date.getMonth()
  const year = date.getFullYear()
  const locale = settings.languageMode === 'custom' ? 'en' : (settings.language || 'en')
  const format = settings.dateFormat || 'long'

  if (settings.languageMode === 'custom') {
    const parts = (settings.customMonths || DEFAULT_MONTHS).split(',').map((s) => s.trim())
    const monthName = parts.length >= 12 ? parts[month] : intlMonth(date, 'en')
    const monthShort = monthName.substring(0, 3)

    switch (format) {
      case 'long':    return `${monthName} ${day}, ${year}`
      case 'short':   return `${monthShort} ${day}, ${year}`
      case 'numeric': return `${padZero(day)}/${padZero(month + 1)}/${year}`
      case 'numeric-us': return `${padZero(month + 1)}/${padZero(day)}/${year}`
      case 'iso':     return `${year}-${padZero(month + 1)}-${padZero(day)}`
      case 'day-month': return `${day} ${monthName}`
      case 'month-day': return `${monthName} ${day}`
      default:        return `${monthName} ${day}, ${year}`
    }
  }

  // Preset language: use Intl for month names
  const monthLong = intlMonth(date, locale, 'long')
  const monthShort = intlMonth(date, locale, 'short')

  switch (format) {
    case 'long':    return `${monthLong} ${day}, ${year}`
    case 'short':   return `${monthShort} ${day}, ${year}`
    case 'numeric': return `${padZero(day)}/${padZero(month + 1)}/${year}`
    case 'numeric-us': return `${padZero(month + 1)}/${padZero(day)}/${year}`
    case 'iso':     return `${year}-${padZero(month + 1)}-${padZero(day)}`
    case 'day-month': return `${day} ${monthLong}`
    case 'month-day': return `${monthLong} ${day}`
    default:        return `${monthLong} ${day}, ${year}`
  }
}

// ---------------------------------------------------------------------------
// Font CSS parsing
// ---------------------------------------------------------------------------

const WEIGHT_MAP: Record<string, string> = {
  thin: '100', hairline: '100',
  extralight: '200', 'extra-light': '200', ultralight: '200',
  light: '300',
  normal: '400', regular: '400',
  medium: '500',
  semibold: '600', 'semi-bold': '600', demibold: '600',
  bold: '700',
  extrabold: '800', 'extra-bold': '800', ultrabold: '800',
  black: '900', heavy: '900',
}

const GENERIC_FAMILIES = new Set([
  'inherit', 'initial', 'unset', 'serif', 'sans-serif',
  'monospace', 'cursive', 'fantasy', 'system-ui',
])

interface FontFaceEntry {
  family: string
  weight: string
  style: string
}

/** Parse @font-face blocks and extract family, weight, and style metadata. */
function parseFontFaces(cssText: string): FontFaceEntry[] {
  const entries: FontFaceEntry[] = []
  const blocks = [...cssText.matchAll(/@font-face\s*\{([\s\S]*?)\}/gi)].map((match) => match[1])

  for (const block of blocks) {
    const familyMatch = block.match(/font-family\s*:\s*(['"]?)([^;'"]+)\1/i)
    if (!familyMatch) continue
    const family = familyMatch[2].trim().replace(/^['"]|['"]$/g, '').trim()
    if (!family || GENERIC_FAMILIES.has(family.toLowerCase())) continue

    let weight = '400'
    const weightMatch = block.match(/font-weight\s*:\s*([^;}\s]+)/i)
    if (weightMatch) {
      const w = weightMatch[1].trim().toLowerCase()
      weight = WEIGHT_MAP[w] || w
    }

    let style = 'normal'
    const styleMatch = block.match(/font-style\s*:\s*([^;}\s]+)/i)
    if (styleMatch) {
      style = styleMatch[1].trim().toLowerCase()
    }

    entries.push({ family, weight, style })
  }

  return entries
}

const DIRECT_FONT_FILE_RE = /\.(?:woff2?|ttf|otf)(?:[?#].*)?$/i

function isDirectFontFileUrl(url: string): boolean {
  return DIRECT_FONT_FILE_RE.test(url)
}

function titleCaseFontSlug(value: string): string | null {
  const cleaned = value
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/\b(?:thin|hairline|extra-light|extralight|ultralight|light|regular|normal|medium|semi-bold|semibold|bold|extra-bold|extrabold|ultrabold|black|heavy|italic|oblique)\b/gi, ' ')
    .replace(/[-_+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned) return null
  return cleaned.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function inferFontFamilyFromUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl)
    const family = url.searchParams.get('family')
    if (family) {
      const decoded = decodeURIComponent(family).replace(/\+/g, ' ').split(':')[0]?.trim()
      if (decoded) return decoded
    }

    const parts = decodeURIComponent(url.pathname).split('/').filter(Boolean)
    const cssIndex = parts.indexOf('css')
    if (cssIndex >= 0 && parts[cssIndex + 1]) return titleCaseFontSlug(parts[cssIndex + 1])

    return titleCaseFontSlug(parts[parts.length - 1] ?? '')
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DateDisplay() {
  const settings = useLayerSettings()

  const [now, setNow] = useState(() => new Date())

  // State to trigger re-render when custom font family is extracted
  const [loadedFontFamily, setLoadedFontFamily] = useState<string | null>(null)

  const cssLinkRef = useRef<HTMLLinkElement | null>(null)
  const directFontFaceRef = useRef<FontFace | null>(null)
  const loadIdRef = useRef(0)

  // -----------------------------------------------------------------------
  // Timer: check every minute, only re-render when the day changes
  // -----------------------------------------------------------------------
  useEffect(() => {
    const timer = setInterval(() => {
      const next = new Date()
      if (next.getDate() !== now.getDate()) setNow(next)
    }, 60_000)
    return () => clearInterval(timer)
  }, [now])

  const clearLoadedFont = useCallback(() => {
    cssLinkRef.current?.remove()
    cssLinkRef.current = null

    if (directFontFaceRef.current) {
      document.fonts.delete(directFontFaceRef.current)
      directFontFaceRef.current = null
    }
  }, [])

  useEffect(() => () => clearLoadedFont(), [clearLoadedFont])

  // -----------------------------------------------------------------------
  // Font loading pipeline: let the browser load CSS font sheets natively.
  // -----------------------------------------------------------------------
  const loadFont = useCallback(
    async (
      fontUrl: string,
      options?: { directFamily?: string; weight?: string; style?: string },
    ) => {
      if (!fontUrl) return

      const myLoadId = ++loadIdRef.current
      clearLoadedFont()
      setLoadedFontFamily(null)

      if (isDirectFontFileUrl(fontUrl)) {
        const family = options?.directFamily || 'CustomFont'
        const face = new FontFace(family, `url("${fontUrl.replace(/"/g, '\\"')}")`, {
          weight: options?.weight || '400',
          style: options?.style || 'normal',
        })

        if (loadIdRef.current !== myLoadId) return
        try {
          await face.load()
          if (loadIdRef.current !== myLoadId) return
          document.fonts.add(face)
          directFontFaceRef.current = face
          setLoadedFontFamily(family)
        } catch {
          setLoadedFontFamily(null)
        }
        return
      }

      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = fontUrl
      document.head.appendChild(link)
      cssLinkRef.current = link

      const inferredFamily = inferFontFamilyFromUrl(fontUrl)
      if (inferredFamily) setLoadedFontFamily(inferredFamily)

      try {
        const response = await fetch(fontUrl)
        if (!response.ok || loadIdRef.current !== myLoadId) return
        const entries = parseFontFaces(await response.text())
        const primaryFamily = entries[0]?.family
        if (primaryFamily && loadIdRef.current === myLoadId) setLoadedFontFamily(primaryFamily)
      } catch {
        // The <link> path still works for normal cross-origin stylesheet loading.
      }
    },
    [clearLoadedFont],
  )

  // -----------------------------------------------------------------------
  // Trigger font loading when settings change
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (settings.fontMode === 'custom' && settings.customFontUrl) {
      let url = settings.customFontUrl
      if (!url.startsWith('http://') && !url.startsWith('https://')) return

      // Auto-correct fonts.google.com to fonts.googleapis.com
      try {
        const urlObj = new URL(url)
        if (urlObj.hostname === 'fonts.google.com') {
          const fontMatch = url.match(/family=([^&]+)/)
          if (fontMatch) {
            url = `https://fonts.googleapis.com/css2?family=${fontMatch[1]}&display=swap`
          } else {
            return
          }
        }
      } catch {
        return
      }

      loadFont(url, {
        directFamily: settings.customFontFamily || 'CustomFont',
        weight: settings.customFontWeight || settings.fontWeight || '400',
        style: settings.customFontStyle || 'normal',
      })
    } else if (settings.fontMode === 'preset') {
      const fontName = settings.fontPreset || 'Inter'
      const fontUrl = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@300;400;500;600;700;800&display=swap`
      loadFont(fontUrl)
    } else {
      clearLoadedFont()
      setLoadedFontFamily(null)
    }
  }, [
    clearLoadedFont,
    loadFont,
    settings.customFontFamily,
    settings.customFontStyle,
    settings.customFontUrl,
    settings.customFontWeight,
    settings.fontMode,
    settings.fontPreset,
    settings.fontWeight,
  ])

  // -----------------------------------------------------------------------
  // Derived values
  // -----------------------------------------------------------------------
  const dayOfWeekText = useMemo(
    () => getDayOfWeek(now, settings),
    [now, settings.languageMode, settings.language, settings.customDays],
  )
  const dateText = useMemo(
    () => formatDate(now, settings),
    [now, settings.languageMode, settings.language, settings.customMonths, settings.dateFormat],
  )

  // Font family string
  const fontFamily = useMemo(() => {
    if (settings.fontMode === 'custom') {
      const inferredFamily = settings.customFontUrl && !isDirectFontFileUrl(settings.customFontUrl)
        ? inferFontFamilyFromUrl(settings.customFontUrl)
        : null
      const configuredFamily = settings.customFontFamily && settings.customFontFamily !== 'CustomFont'
        ? settings.customFontFamily
        : null
      const actual = loadedFontFamily || configuredFamily || inferredFamily || settings.customFontFamily || 'sans-serif'
      return `"${actual}", sans-serif`
    }
    const preset = settings.fontPreset || 'Inter'
    return `"${preset}", sans-serif`
  }, [settings.fontMode, settings.fontPreset, settings.customFontFamily, settings.customFontUrl, loadedFontFamily])

  const fontWeight = settings.fontMode === 'custom'
    ? settings.customFontWeight || settings.fontWeight || '600'
    : settings.fontWeight || '600'

  const fontStyle = settings.fontMode === 'custom'
    ? settings.customFontStyle || 'normal'
    : 'normal'

  // Alignment mapping
  const alignItems = settings.textAlign === 'center'
    ? 'center'
    : settings.textAlign === 'right'
      ? 'flex-end'
      : 'flex-start'

  // -----------------------------------------------------------------------
  // Styles
  // -----------------------------------------------------------------------
  const containerStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems,
    padding: 20,
    boxSizing: 'border-box',
    overflow: 'hidden',
    fontFamily,
    textAlign: (settings.textAlign || 'left') as CSSProperties['textAlign'],
  }

  const sharedTextStyle: CSSProperties = {
    fontFamily,
    fontWeight,
    fontStyle,
    color: settings.textColor || '#ffffff',
    opacity: (settings.textOpacity ?? 100) / 100,
    letterSpacing: `${settings.letterSpacing ?? 0}px`,
    textTransform: (settings.textTransform || 'none') as CSSProperties['textTransform'],
  }

  const dayStyle: CSSProperties = {
    ...sharedTextStyle,
    fontSize: `${settings.dayFontSize || 24}px`,
    marginBottom: 5,
  }

  const dateStyle: CSSProperties = {
    ...sharedTextStyle,
    fontSize: `${settings.dateFontSize || 48}px`,
    lineHeight: 1.1,
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div style={containerStyle}>
      {settings.showDayOfWeek && (
        <div style={dayStyle}>{dayOfWeekText}</div>
      )}
      {settings.showDate && (
        <div style={dateStyle}>{dateText}</div>
      )}
    </div>
  )
}

if (!runtimeRoot) {
  throw new Error('Date Display requires a root element')
}

const reactRoot = createRoot(runtimeRoot)
reactRoot.render(<DateDisplay />)

layer?.lifecycle?.onDispose(() => {
  reactRoot.unmount()
})
