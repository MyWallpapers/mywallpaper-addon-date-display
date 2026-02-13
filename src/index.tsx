import { useSettings, useNetwork, useSettingsActions } from '@mywallpaper/sdk-react'
import { useState, useEffect, useRef, useMemo, useCallback, type CSSProperties } from 'react'

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
  language: 'en' | 'fr' | 'de' | 'es' | 'it' | 'pt' | 'ja' | 'zh' | 'ko' | 'ru' | 'ar'
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

  // Effects
  enableShadow: boolean
  shadowColor: string
  shadowBlur: number
  shadowOffsetX: number
  shadowOffsetY: number
}

interface LanguageData {
  days: string[]
  months: string[]
}

interface FontData {
  families: string[]
  weights: Record<string, string[]>
  styles: Record<string, string[]>
}

// ---------------------------------------------------------------------------
// Language data
// ---------------------------------------------------------------------------

const LANGUAGES: Record<string, LanguageData> = {
  en: {
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  },
  fr: {
    days: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
    months: ['Janvier', 'F\u00e9vrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Ao\u00fbt', 'Septembre', 'Octobre', 'Novembre', 'D\u00e9cembre'],
  },
  de: {
    days: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
    months: ['Januar', 'Februar', 'M\u00e4rz', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
  },
  es: {
    days: ['Domingo', 'Lunes', 'Martes', 'Mi\u00e9rcoles', 'Jueves', 'Viernes', 'S\u00e1bado'],
    months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  },
  it: {
    days: ['Domenica', 'Luned\u00ec', 'Marted\u00ec', 'Mercoled\u00ec', 'Gioved\u00ec', 'Venerd\u00ec', 'Sabato'],
    months: ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'],
  },
  pt: {
    days: ['Domingo', 'Segunda-feira', 'Ter\u00e7a-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'S\u00e1bado'],
    months: ['Janeiro', 'Fevereiro', 'Mar\u00e7o', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
  },
  ja: {
    days: ['\u65e5\u66dc\u65e5', '\u6708\u66dc\u65e5', '\u706b\u66dc\u65e5', '\u6c34\u66dc\u65e5', '\u6728\u66dc\u65e5', '\u91d1\u66dc\u65e5', '\u571f\u66dc\u65e5'],
    months: ['1\u6708', '2\u6708', '3\u6708', '4\u6708', '5\u6708', '6\u6708', '7\u6708', '8\u6708', '9\u6708', '10\u6708', '11\u6708', '12\u6708'],
  },
  zh: {
    days: ['\u661f\u671f\u65e5', '\u661f\u671f\u4e00', '\u661f\u671f\u4e8c', '\u661f\u671f\u4e09', '\u661f\u671f\u56db', '\u661f\u671f\u4e94', '\u661f\u671f\u516d'],
    months: ['\u4e00\u6708', '\u4e8c\u6708', '\u4e09\u6708', '\u56db\u6708', '\u4e94\u6708', '\u516d\u6708', '\u4e03\u6708', '\u516b\u6708', '\u4e5d\u6708', '\u5341\u6708', '\u5341\u4e00\u6708', '\u5341\u4e8c\u6708'],
  },
  ko: {
    days: ['\uc77c\uc694\uc77c', '\uc6d4\uc694\uc77c', '\ud654\uc694\uc77c', '\uc218\uc694\uc77c', '\ubaa9\uc694\uc77c', '\uae08\uc694\uc77c', '\ud1a0\uc694\uc77c'],
    months: ['1\uc6d4', '2\uc6d4', '3\uc6d4', '4\uc6d4', '5\uc6d4', '6\uc6d4', '7\uc6d4', '8\uc6d4', '9\uc6d4', '10\uc6d4', '11\uc6d4', '12\uc6d4'],
  },
  ru: {
    days: ['\u0412\u043e\u0441\u043a\u0440\u0435\u0441\u0435\u043d\u044c\u0435', '\u041f\u043e\u043d\u0435\u0434\u0435\u043b\u044c\u043d\u0438\u043a', '\u0412\u0442\u043e\u0440\u043d\u0438\u043a', '\u0421\u0440\u0435\u0434\u0430', '\u0427\u0435\u0442\u0432\u0435\u0440\u0433', '\u041f\u044f\u0442\u043d\u0438\u0446\u0430', '\u0421\u0443\u0431\u0431\u043e\u0442\u0430'],
    months: ['\u042f\u043d\u0432\u0430\u0440\u044c', '\u0424\u0435\u0432\u0440\u0430\u043b\u044c', '\u041c\u0430\u0440\u0442', '\u0410\u043f\u0440\u0435\u043b\u044c', '\u041c\u0430\u0439', '\u0418\u044e\u043d\u044c', '\u0418\u044e\u043b\u044c', '\u0410\u0432\u0433\u0443\u0441\u0442', '\u0421\u0435\u043d\u0442\u044f\u0431\u0440\u044c', '\u041e\u043a\u0442\u044f\u0431\u0440\u044c', '\u041d\u043e\u044f\u0431\u0440\u044c', '\u0414\u0435\u043a\u0430\u0431\u0440\u044c'],
  },
  ar: {
    days: ['\u0627\u0644\u0623\u062d\u062f', '\u0627\u0644\u0625\u062b\u0646\u064a\u0646', '\u0627\u0644\u062b\u0644\u0627\u062b\u0627\u0621', '\u0627\u0644\u0623\u0631\u0628\u0639\u0627\u0621', '\u0627\u0644\u062e\u0645\u064a\u0633', '\u0627\u0644\u062c\u0645\u0639\u0629', '\u0627\u0644\u0633\u0628\u062a'],
    months: ['\u064a\u0646\u0627\u064a\u0631', '\u0641\u0628\u0631\u0627\u064a\u0631', '\u0645\u0627\u0631\u0633', '\u0623\u0628\u0631\u064a\u0644', '\u0645\u0627\u064a\u0648', '\u064a\u0648\u0646\u064a\u0648', '\u064a\u0648\u0644\u064a\u0648', '\u0623\u063a\u0633\u0637\u0633', '\u0633\u0628\u062a\u0645\u0628\u0631', '\u0623\u0643\u062a\u0648\u0628\u0631', '\u0646\u0648\u0641\u0645\u0628\u0631', '\u062f\u064a\u0633\u0645\u0628\u0631'],
  },
}

// ---------------------------------------------------------------------------
// Weight / style labels
// ---------------------------------------------------------------------------

const WEIGHT_LABELS: Record<string, string> = {
  '100': 'Thin (100)',
  '200': 'Extra-Light (200)',
  '300': 'Light (300)',
  '400': 'Regular (400)',
  '500': 'Medium (500)',
  '600': 'Semi-Bold (600)',
  '700': 'Bold (700)',
  '800': 'Extra-Bold (800)',
  '900': 'Black (900)',
}

const STYLE_LABELS: Record<string, string> = {
  normal: 'Normal',
  italic: 'Italic',
  oblique: 'Oblique',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function padZero(n: number): string {
  return n < 10 ? '0' + n : n.toString()
}

function getLanguageData(settings: Settings): LanguageData {
  if (settings.languageMode === 'custom') {
    const customDays = (settings.customDays || '').split(',').map((s) => s.trim())
    const customMonths = (settings.customMonths || '').split(',').map((s) => s.trim())
    return {
      days: customDays.length >= 7 ? customDays : LANGUAGES.en.days,
      months: customMonths.length >= 12 ? customMonths : LANGUAGES.en.months,
    }
  }
  return LANGUAGES[settings.language] || LANGUAGES.en
}

function formatDate(date: Date, settings: Settings, langData: LanguageData): string {
  const day = date.getDate()
  const month = date.getMonth()
  const year = date.getFullYear()
  const monthName = langData.months[month]
  const monthShort = monthName.substring(0, 3)
  const format = settings.dateFormat || 'long'

  switch (format) {
    case 'long':
      return monthName + ' ' + day + ', ' + year
    case 'short':
      return monthShort + ' ' + day + ', ' + year
    case 'numeric':
      return padZero(day) + '/' + padZero(month + 1) + '/' + year
    case 'numeric-us':
      return padZero(month + 1) + '/' + padZero(day) + '/' + year
    case 'iso':
      return year + '-' + padZero(month + 1) + '-' + padZero(day)
    case 'day-month':
      return day + ' ' + monthName
    case 'month-day':
      return monthName + ' ' + day
    default:
      return monthName + ' ' + day + ', ' + year
  }
}

/** Parse @font-face blocks from CSS text and return families, weights, and styles. */
function parseFontDataFromCSS(cssText: string): FontData {
  const result: FontData = {
    families: [],
    weights: {},
    styles: {},
  }

  const seenFamilies: Record<string, boolean> = {}

  // Extract all @font-face blocks (multiline)
  let fontFaceBlocks = cssText.match(/@font-face\s*\{[^}]+\}/gi) || []
  if (fontFaceBlocks.length === 0) {
    fontFaceBlocks = cssText.match(/@font-face\s*\{[\s\S]*?\}/gi) || []
  }

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

  for (const block of fontFaceBlocks) {
    // Family
    const familyMatch = block.match(/font-family\s*:\s*(['"]?)([^;'"]+)\1/i)
    if (!familyMatch) continue
    const family = familyMatch[2].trim().replace(/^['"]|['"]$/g, '').trim()
    if (!family || GENERIC_FAMILIES.has(family.toLowerCase())) continue

    // Weight
    let weight = '400'
    const weightMatch = block.match(/font-weight\s*:\s*([^;}\s]+)/i)
    if (weightMatch) {
      const w = weightMatch[1].trim().toLowerCase()
      weight = WEIGHT_MAP[w] || w
    }

    // Style
    let style = 'normal'
    const styleMatch = block.match(/font-style\s*:\s*([^;}\s]+)/i)
    if (styleMatch) {
      style = styleMatch[1].trim().toLowerCase()
    }

    // Track family
    if (!seenFamilies[family]) {
      seenFamilies[family] = true
      result.families.push(family)
      result.weights[family] = []
      result.styles[family] = []
    }

    if (!result.weights[family].includes(weight)) {
      result.weights[family].push(weight)
    }
    if (!result.styles[family].includes(style)) {
      result.styles[family].push(style)
    }
  }

  // Sort weights numerically
  for (const family of Object.keys(result.weights)) {
    result.weights[family].sort((a, b) => parseInt(a) - parseInt(b))
  }

  return result
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DateDisplay() {
  const settings = useSettings<Settings>()
  const { fetch: proxyFetch } = useNetwork()
  const { updateOptions } = useSettingsActions()

  const [now, setNow] = useState(() => new Date())

  // Track loaded font URL to avoid redundant fetches
  const loadedFontUrlRef = useRef<string | null>(null)
  const fontStyleElRef = useRef<HTMLStyleElement | null>(null)
  const extractedFontFamilyRef = useRef<string | null>(null)
  const fontDataRef = useRef<FontData | null>(null)

  // -----------------------------------------------------------------------
  // Timer: update current date every 60 seconds
  // -----------------------------------------------------------------------
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // -----------------------------------------------------------------------
  // Font loading
  // -----------------------------------------------------------------------
  const loadCustomFont = useCallback(
    async (url: string) => {
      if (!url || loadedFontUrlRef.current === url) return

      // Validate URL
      if (!url.startsWith('http://') && !url.startsWith('https://')) return

      let correctedUrl = url
      try {
        const urlObj = new URL(url)
        // Auto-correct fonts.google.com to fonts.googleapis.com
        if (urlObj.hostname === 'fonts.google.com') {
          const fontMatch = url.match(/family=([^&]+)/)
          if (fontMatch) {
            correctedUrl = 'https://fonts.googleapis.com/css2?family=' + fontMatch[1] + '&display=swap'
          } else {
            return
          }
        }
      } catch {
        return
      }

      try {
        const response = await proxyFetch(correctedUrl)
        if (!response.ok || !response.data) return

        loadedFontUrlRef.current = correctedUrl
        const cssText = response.data as string

        // Remove previous style element
        if (fontStyleElRef.current) {
          fontStyleElRef.current.remove()
        }

        // Inject @font-face CSS
        const styleEl = document.createElement('style')
        styleEl.textContent = cssText
        document.head.appendChild(styleEl)
        fontStyleElRef.current = styleEl

        // Parse font data
        const fontData = parseFontDataFromCSS(cssText)
        fontDataRef.current = fontData

        if (fontData.families.length > 0) {
          const primaryFamily = fontData.families[0]
          extractedFontFamilyRef.current = primaryFamily

          // Update font family dropdown
          const familyOptions = fontData.families.map((f) => ({ label: f, value: f }))
          updateOptions('customFontFamily', familyOptions, primaryFamily)

          // Update weight dropdown
          const weights = fontData.weights[primaryFamily] || []
          if (weights.length > 0) {
            const weightOptions = weights.map((w) => ({
              label: WEIGHT_LABELS[w] || 'Weight ' + w,
              value: w,
            }))
            const defaultWeight = weights.includes('400')
              ? '400'
              : weights.includes('500')
                ? '500'
                : weights.includes('600')
                  ? '600'
                  : weights[0]
            updateOptions('customFontWeight', weightOptions, defaultWeight)
          }

          // Update style dropdown
          const styles = fontData.styles[primaryFamily] || []
          if (styles.length <= 1) {
            updateOptions('customFontStyle', [{ label: 'Normal', value: 'normal' }], 'normal')
          } else {
            const styleOptions = styles.map((s) => ({
              label: STYLE_LABELS[s] || s.charAt(0).toUpperCase() + s.slice(1),
              value: s,
            }))
            updateOptions('customFontStyle', styleOptions, 'normal')
          }
        }
      } catch {
        // Font loading failed silently
      }
    },
    [proxyFetch, updateOptions],
  )

  // Load font when settings change
  useEffect(() => {
    if (settings.fontMode === 'custom' && settings.customFontUrl) {
      loadCustomFont(settings.customFontUrl)
    } else {
      // Reset custom font state when switching to preset
      extractedFontFamilyRef.current = null
      fontDataRef.current = null
      loadedFontUrlRef.current = null
    }
  }, [settings.fontMode, settings.customFontUrl, loadCustomFont])

  // Preset font: inject @import for Google Fonts
  useEffect(() => {
    if (settings.fontMode !== 'preset') return
    const fontName = settings.fontPreset || 'Inter'
    const fontUrl =
      'https://fonts.googleapis.com/css2?family=' +
      fontName.replace(/ /g, '+') +
      ':wght@300;400;500;600;700;800&display=swap'

    if (loadedFontUrlRef.current === fontUrl) return
    loadedFontUrlRef.current = fontUrl

    if (fontStyleElRef.current) {
      fontStyleElRef.current.remove()
    }
    const styleEl = document.createElement('style')
    styleEl.textContent = '@import url("' + fontUrl + '");'
    document.head.appendChild(styleEl)
    fontStyleElRef.current = styleEl
  }, [settings.fontMode, settings.fontPreset])

  // -----------------------------------------------------------------------
  // Derived values
  // -----------------------------------------------------------------------
  const langData = useMemo(() => getLanguageData(settings), [
    settings.languageMode,
    settings.language,
    settings.customDays,
    settings.customMonths,
  ])

  const dayOfWeekText = langData.days[now.getDay()]
  const dateText = formatDate(now, settings, langData)

  // Font family string
  const fontFamily = useMemo(() => {
    if (settings.fontMode === 'custom') {
      const actual = extractedFontFamilyRef.current || settings.customFontFamily || 'sans-serif'
      return '"' + actual + '", sans-serif'
    }
    const preset = settings.fontPreset || 'Inter'
    return '"' + preset + '", sans-serif'
  }, [settings.fontMode, settings.fontPreset, settings.customFontFamily])

  const fontWeight = settings.fontMode === 'custom'
    ? settings.customFontWeight || settings.fontWeight || '600'
    : settings.fontWeight || '600'

  const fontStyle = settings.fontMode === 'custom'
    ? settings.customFontStyle || 'normal'
    : 'normal'

  // Text shadow
  const textShadow = settings.enableShadow
    ? `${settings.shadowOffsetX ?? 2}px ${settings.shadowOffsetY ?? 2}px ${settings.shadowBlur ?? 10}px ${settings.shadowColor || '#000000'}`
    : 'none'

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
    letterSpacing: (settings.letterSpacing ?? 0) + 'px',
    textShadow,
    textTransform: (settings.textTransform || 'none') as CSSProperties['textTransform'],
  }

  const dayStyle: CSSProperties = {
    ...sharedTextStyle,
    fontSize: (settings.dayFontSize || 24) + 'px',
    marginBottom: 5,
  }

  const dateStyle: CSSProperties = {
    ...sharedTextStyle,
    fontSize: (settings.dateFontSize || 48) + 'px',
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
