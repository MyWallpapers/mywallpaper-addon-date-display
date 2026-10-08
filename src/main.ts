import type { AddonValues, CanvasAddonMountContext, ResourceValue } from '../generated/mywallpaper-runtime'
import './styles.css'

type DateFormat = 'full' | 'long' | 'medium' | 'short' | 'iso'
type TimeFormat = '12h' | '24h'
type Alignment = 'left' | 'center' | 'right'
type TextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize'
type FontWeight = '300' | '400' | '500' | '600' | '700' | '900'
interface Settings {
  showDayOfWeek: boolean
  showDate: boolean
  dateFormat: DateFormat
  showTime: boolean
  timeFormat: TimeFormat
  showSeconds: boolean
  locale: string
  useCustomNames: boolean
  customDays: string
  customMonths: string
  fontSource: 'system' | 'remote'
  fontFamily: string
  fontUrl: string
  fontResource: ResourceValue | null
  fontWeight: FontWeight
  alignment: Alignment
  textTransform: TextTransform
  dayFontSize: number
  dateFontSize: number
  timeFontSize: number
  letterSpacing: number
  primaryColor: string
  secondaryColor: string
  opacity: number
  shadowStrength: number
  shadowColor: string
  backgroundColor: string
  backgroundBlur: number
  cornerRadius: number
  padding: number
}

interface DateParts {
  year: number
  month: number
  day: number
}

interface Formatters {
  weekday: Intl.DateTimeFormat
  dateParts: Intl.DateTimeFormat
  dateStyles: Record<'full' | 'long' | 'medium' | 'short', Intl.DateTimeFormat>
  time: Intl.DateTimeFormat
}

const defaults: Settings = {
  showDayOfWeek: true,
  showDate: true,
  dateFormat: 'long',
  showTime: false,
  timeFormat: '24h',
  showSeconds: false,
  locale: 'system',
  useCustomNames: false,
  customDays: 'Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday',
  customMonths: 'January,February,March,April,May,June,July,August,September,October,November,December',
  fontSource: 'system',
  fontFamily: 'Segoe UI',
  fontUrl: '',
  fontResource: null,
  fontWeight: '600',
  alignment: 'center',
  textTransform: 'none',
  dayFontSize: 42,
  dateFontSize: 64,
  timeFontSize: 52,
  letterSpacing: 1,
  primaryColor: '#ffffff',
  secondaryColor: '#b9c3d6',
  opacity: 100,
  shadowStrength: 35,
  shadowColor: '#000000',
  backgroundColor: '#00000000',
  backgroundBlur: 0,
  cornerRadius: 18,
  padding: 20,
}

const fontWeights = ['300', '400', '500', '600', '700', '900'] as const
const dateFormats = ['full', 'long', 'medium', 'short', 'iso'] as const
let mountSequence = 0

export function mount({ layer }: CanvasAddonMountContext): () => void {
  const widget = document.createElement('div')
  widget.className = 'mw-date-display'
  const weekday = document.createElement('div')
  weekday.className = 'mw-date-display__weekday'
  const date = document.createElement('time')
  date.className = 'mw-date-display__date'
  const time = document.createElement('time')
  time.className = 'mw-date-display__time'
  const content = document.createElement('div')
  content.className = 'mw-date-display__content'
  content.append(weekday, date, time)
  widget.append(content)
  layer.root.replaceChildren(widget)

  let settings = readSettings(layer.settings.get())
  let formatters = createFormatters(settings)
  let timer: number | null = null
  let fontRequest = 0
  let fontFace: FontFace | null = null
  let fontStylesheet: HTMLLinkElement | null = null
  const instanceFontFamily = `mwdd-${createInstanceToken()}-${(++mountSequence).toString(36)}`
  let lastFit: readonly number[] | null = null

  const fitContent = (): void => {
    const padding = clamp(settings.padding, 0, 80)
    const measurements = [
      Math.max(0, widget.clientWidth - padding * 2),
      Math.max(0, widget.clientHeight - padding * 2),
      content.offsetWidth,
      content.offsetHeight,
    ]
    if (lastFit?.every((value, index) => Math.abs(value - measurements[index]!) < 0.5)) return
    lastFit = measurements

    const [availableWidth, availableHeight, contentWidth, contentHeight] = measurements
    const scale = Math.min(
      1,
      contentWidth > 0 && availableWidth > 0 ? availableWidth / contentWidth : 1,
      contentHeight > 0 && availableHeight > 0 ? availableHeight / contentHeight : 1,
    )
    content.style.setProperty('--mw-dd-scale', String(scale))
  }

  const resizeObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver(fitContent)
    : null
  resizeObserver?.observe(widget)
  resizeObserver?.observe(content)

  const renderClock = (): void => {
    const now = new Date()
    let textChanged = false

    if (settings.showDayOfWeek) {
      const value = formatWeekday(now, settings, formatters)
      if (weekday.textContent !== value) {
        weekday.textContent = value
        textChanged = true
      }
    }
    if (settings.showDate) {
      const value = formatDate(now, settings, formatters)
      if (date.textContent !== value) {
        date.textContent = value
        textChanged = true
      }
      date.dateTime = localIsoDate(now)
    }
    if (settings.showTime) {
      const value = formatters.time.format(now)
      if (time.textContent !== value) {
        time.textContent = value
        textChanged = true
      }
      time.dateTime = now.toISOString()
    }
    if (textChanged) fitContent()
  }

  const scheduleNextUpdate = (): void => {
    if (timer !== null) window.clearTimeout(timer)
    timer = null
    if (document.visibilityState === 'hidden') return
    const delay = nextUpdateDelay(settings)
    if (delay === null) return
    timer = window.setTimeout(() => {
      timer = null
      renderClock()
      scheduleNextUpdate()
    }, delay)
  }

  const onResume = (): void => {
    if (document.visibilityState === 'hidden') {
      scheduleNextUpdate()
      return
    }
    renderClock()
    scheduleNextUpdate()
  }

  const applyAppearance = (): void => {
    widget.lang = resolvedLocale(settings.locale) ?? navigator.language ?? 'en'
    weekday.hidden = !settings.showDayOfWeek
    date.hidden = !settings.showDate
    time.hidden = !settings.showTime
    content.style.setProperty(
      '--mw-dd-origin',
      settings.alignment === 'left' ? 'left center' : settings.alignment === 'right' ? 'right center' : 'center center',
    )
    widget.style.setProperty('--mw-dd-align', alignmentValue(settings.alignment))
    widget.style.setProperty('--mw-dd-content-align', alignmentValue(settings.alignment))
    widget.style.setProperty('--mw-dd-text-align', settings.alignment)
    widget.style.setProperty('--mw-dd-font-family', fontFamilyValue(
      fontFace && settings.fontSource === 'remote' ? instanceFontFamily : settings.fontFamily,
    ))
    widget.style.setProperty('--mw-dd-font-weight', settings.fontWeight)
    widget.style.setProperty('--mw-dd-transform', settings.textTransform)
    widget.style.setProperty('--mw-dd-day-size', `${clamp(settings.dayFontSize, 8, 160)}px`)
    widget.style.setProperty('--mw-dd-date-size', `${clamp(settings.dateFontSize, 8, 200)}px`)
    widget.style.setProperty('--mw-dd-time-size', `${clamp(settings.timeFontSize, 8, 200)}px`)
    widget.style.setProperty('--mw-dd-letter-spacing', `${clamp(settings.letterSpacing, -5, 50)}px`)
    widget.style.setProperty('--mw-dd-primary', colorWithAlpha(settings.primaryColor, settings.opacity))
    widget.style.setProperty('--mw-dd-secondary', colorWithAlpha(settings.secondaryColor, settings.opacity))
    widget.style.setProperty('--mw-dd-shadow', shadowValue(settings.shadowColor, settings.shadowStrength))
    widget.style.setProperty('--mw-dd-background', safeColor(settings.backgroundColor, '#00000000', true))
    widget.style.setProperty('--mw-dd-blur', `${clamp(settings.backgroundBlur, 0, 40)}px`)
    widget.style.setProperty('--mw-dd-radius', `${clamp(settings.cornerRadius, 0, 64)}px`)
    widget.style.setProperty('--mw-dd-padding', `${clamp(settings.padding, 0, 80)}px`)
    lastFit = null
    fitContent()
  }

  const fontKey = (value: Settings): string => [
    value.fontSource,
    value.fontFamily,
    value.fontUrl,
    value.fontResource?.kind ?? '',
    value.fontResource?.url ?? '',
    value.fontWeight,
  ].join('\u0000')

  const refreshFont = async (): Promise<void> => {
    fontRequest += 1
    const request = fontRequest
    if (fontFace) document.fonts.delete(fontFace)
    fontFace = null
    fontStylesheet?.remove()
    fontStylesheet = null
    applyAppearance()
    if (settings.fontSource !== 'remote') return

    const selectedResource = settings.fontResource
    const weight = settings.fontWeight
    let url = selectedResource?.url ?? settings.fontUrl
    if (selectedResource) {
      if (!validHttpUrl(selectedResource.url)) return
      const resources = layer.resources as { resolve?: (value: ResourceValue) => Promise<string> } | undefined
      if (typeof resources?.resolve === 'function') {
        try {
          url = await resources.resolve.call(layer.resources, selectedResource)
        } catch {
          url = selectedResource.url
        }
      }
    }
    if (request !== fontRequest) return

    if (selectedResource || isDirectFontFile(url)) {
      if (!(selectedResource ? validResolvedFontUrl(url) : validHttpUrl(url))) return
      if (typeof FontFace !== 'function') return
      try {
        const face = new FontFace(instanceFontFamily, `url(${JSON.stringify(url)})`, {
          weight,
        })
        const loaded = await face.load()
        if (request !== fontRequest) return
        document.fonts.add(loaded)
        fontFace = loaded
        applyAppearance()
        fitContent()
      } catch {
        // Keep the installed/system fallback if the optional file is unavailable.
      }
      return
    }

    if (!validHttpUrl(url)) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = url
    link.referrerPolicy = 'no-referrer'
    link.crossOrigin = 'anonymous'
    document.head.append(link)
    fontStylesheet = link
  }

  const applySettings = (values: AddonValues): void => {
    const previousFont = fontKey(settings)
    settings = readSettings(values)
    formatters = createFormatters(settings)
    applyAppearance()
    renderClock()
    scheduleNextUpdate()
    if (fontKey(settings) !== previousFont) void refreshFont()
  }

  applyAppearance()
  renderClock()
  scheduleNextUpdate()
  void refreshFont()

  const unsubscribe = layer.settings.subscribe(applySettings)
  document.addEventListener('visibilitychange', onResume)
  window.addEventListener('focus', onResume)

  return () => {
    unsubscribe()
    if (timer !== null) window.clearTimeout(timer)
    resizeObserver?.disconnect()
    document.removeEventListener('visibilitychange', onResume)
    window.removeEventListener('focus', onResume)
    fontRequest += 1
    if (fontFace) document.fonts.delete(fontFace)
    fontStylesheet?.remove()
    layer.root.replaceChildren()
  }
}

function readSettings(values: AddonValues): Settings {
  return {
    showDayOfWeek: booleanValue(values.showDayOfWeek, defaults.showDayOfWeek),
    showDate: booleanValue(values.showDate, defaults.showDate),
    dateFormat: enumValue(values.dateFormat, dateFormats, defaults.dateFormat),
    showTime: booleanValue(values.showTime, defaults.showTime),
    timeFormat: enumValue(values.timeFormat, ['12h', '24h'] as const, defaults.timeFormat),
    showSeconds: booleanValue(values.showSeconds, defaults.showSeconds),
    locale: stringValue(values.locale, defaults.locale),
    useCustomNames: booleanValue(values.useCustomNames, defaults.useCustomNames),
    customDays: stringValue(values.customDays, defaults.customDays),
    customMonths: stringValue(values.customMonths, defaults.customMonths),
    fontSource: enumValue(values.fontSource, ['system', 'remote'] as const, defaults.fontSource),
    fontFamily: stringValue(values.fontFamily, defaults.fontFamily),
    fontUrl: stringValue(values.fontUrl, defaults.fontUrl),
    fontResource: resourceValue(values.fontResource),
    fontWeight: enumValue(values.fontWeight, fontWeights, defaults.fontWeight),
    alignment: enumValue(values.alignment, ['left', 'center', 'right'] as const, defaults.alignment),
    textTransform: enumValue(values.textTransform, ['none', 'uppercase', 'lowercase', 'capitalize'] as const, defaults.textTransform),
    dayFontSize: numberValue(values.dayFontSize, defaults.dayFontSize),
    dateFontSize: numberValue(values.dateFontSize, defaults.dateFontSize),
    timeFontSize: numberValue(values.timeFontSize, defaults.timeFontSize),
    letterSpacing: numberValue(values.letterSpacing, defaults.letterSpacing),
    primaryColor: safeColor(stringValue(values.primaryColor, defaults.primaryColor), defaults.primaryColor),
    secondaryColor: safeColor(stringValue(values.secondaryColor, defaults.secondaryColor), defaults.secondaryColor),
    opacity: numberValue(values.opacity, defaults.opacity),
    shadowStrength: numberValue(values.shadowStrength, defaults.shadowStrength),
    shadowColor: safeColor(stringValue(values.shadowColor, defaults.shadowColor), defaults.shadowColor),
    backgroundColor: safeColor(stringValue(values.backgroundColor, defaults.backgroundColor), defaults.backgroundColor, true),
    backgroundBlur: numberValue(values.backgroundBlur, defaults.backgroundBlur),
    cornerRadius: numberValue(values.cornerRadius, defaults.cornerRadius),
    padding: numberValue(values.padding, defaults.padding),
  }
}

function createFormatters(settings: Settings): Formatters {
  const locale = resolvedLocale(settings.locale)
  return {
    weekday: new Intl.DateTimeFormat(locale, { weekday: 'long' }),
    dateParts: new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', {
      year: 'numeric', month: 'numeric', day: 'numeric',
    }),
    dateStyles: {
      full: new Intl.DateTimeFormat(locale, { dateStyle: 'full' }),
      long: new Intl.DateTimeFormat(locale, { dateStyle: 'long' }),
      medium: new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }),
      short: new Intl.DateTimeFormat(locale, { dateStyle: 'short' }),
    },
    time: new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: settings.showSeconds ? '2-digit' : undefined,
      hour12: settings.timeFormat === '12h',
    }),
  }
}

function formatWeekday(value: Date, settings: Settings, formatters: Formatters): string {
  const names = settings.useCustomNames ? splitNames(settings.customDays, 7) : null
  return names?.[value.getDay()] ?? formatters.weekday.format(value)
}

function formatDate(value: Date, settings: Settings, formatters: Formatters): string {
  const parts = localDateParts(value, formatters.dateParts)
  const customMonths = settings.useCustomNames ? splitNames(settings.customMonths, 12) : null

  switch (settings.dateFormat) {
    case 'iso':
      return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
    default: {
      const formatter = formatters.dateStyles[settings.dateFormat]
      if (!customMonths && !settings.useCustomNames) return formatter.format(value)
      const customDays = settings.useCustomNames ? splitNames(settings.customDays, 7) : null
      return formatter.formatToParts(value).map((part) => {
        if (part.type === 'month' && customMonths) return customMonths[parts.month - 1]!
        if (part.type === 'weekday' && customDays) return customDays[value.getDay()]!
        return part.value
      }).join('')
    }
  }
}

function localDateParts(value: Date, formatter: Intl.DateTimeFormat): DateParts {
  const parts = formatter.formatToParts(value)
  return {
    year: Number(parts.find((part) => part.type === 'year')?.value),
    month: Number(parts.find((part) => part.type === 'month')?.value),
    day: Number(parts.find((part) => part.type === 'day')?.value),
  }
}

function localIsoDate(value: Date): string {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}

function nextUpdateDelay(settings: Settings): number | null {
  const now = Date.now()
  if (settings.showTime) {
    const boundary = settings.showSeconds ? 1_000 : 60_000
    return boundary - (now % boundary) + 8
  }
  if (!settings.showDate && !settings.showDayOfWeek) return null
  const nextMidnight = new Date(now)
  nextMidnight.setHours(24, 0, 0, 40)
  return Math.max(1_000, nextMidnight.getTime() - now)
}

function resourceValue(value: unknown): ResourceValue | null {
  if (!isRecord(value) || typeof value.url !== 'string') return null
  if (value.kind !== 'live' && value.kind !== 'cached-public') return null
  return value as unknown as ResourceValue
}

function validHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname.length > 0
      && url.username === '' && url.password === ''
  } catch {
    return false
  }
}

function isDirectFontFile(value: string): boolean {
  return /\.(?:woff2?|ttf|otf)(?:[?#].*)?$/iu.test(value)
}

function fontFamilyValue(value: string): string {
  const cleaned = value.replace(/[\u0000-\u001f"'\\]/gu, '').trim()
  const family = cleaned || defaults.fontFamily
  return `"${family}", "Segoe UI", system-ui, sans-serif`
}

function colorWithAlpha(value: string, opacity: number): string {
  const color = safeColor(value, defaults.primaryColor).slice(0, 7)
  const alpha = Math.round(clamp(opacity, 0, 100) * 2.55).toString(16).padStart(2, '0')
  return `${color}${alpha}`
}

function shadowValue(colorValue: string, strength: number): string {
  const amount = clamp(strength, 0, 100)
  if (amount === 0) return 'none'
  const alpha = Math.round(amount * 1.45).toString(16).padStart(2, '0')
  return `0 2px ${Math.round(amount * 0.18)}px ${safeColor(colorValue, defaults.shadowColor).slice(0, 7)}${alpha}`
}

function safeColor(value: string, fallback: string, alpha = false): string {
  const expression = alpha ? /^#[\da-f]{6}(?:[\da-f]{2})?$/iu : /^#[\da-f]{6}$/iu
  return expression.test(value) ? value : fallback
}

function resolvedLocale(value: string): string | undefined {
  if (value === 'system') return undefined
  try {
    return Intl.getCanonicalLocales(value)[0]
  } catch {
    return undefined
  }
}

function splitNames(value: string, expected: number): string[] | null {
  const names = value.split(',').map((part) => part.trim())
  return names.length === expected && names.every(Boolean) ? names : null
}

function alignmentValue(value: Alignment): string {
  return value === 'left' ? 'flex-start' : value === 'right' ? 'flex-end' : 'center'
}

function pad(value: number): string { return String(value).padStart(2, '0') }
function booleanValue(value: unknown, fallback: boolean): boolean { return typeof value === 'boolean' ? value : fallback }
function numberValue(value: unknown, fallback: number): number { return typeof value === 'number' && Number.isFinite(value) ? value : fallback }
function stringValue(value: unknown, fallback: string): string { return typeof value === 'string' ? value : fallback }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value) }
function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
}
function enumValue<T extends string, TDefault extends T | null>(
  value: unknown,
  allowed: readonly T[],
  fallback: TDefault,
): T | TDefault {
  return typeof value === 'string' && allowed.includes(value as T) ? value as T : fallback
}

function createInstanceToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/gu, '')
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
}

function validResolvedFontUrl(value: string): boolean {
  if (validHttpUrl(value)) return true
  return /^data:(?:font\/[\w.+-]+|application\/[\w.+-]+)(?:;|,)/iu.test(value)
}
