import type { AddonValues, CanvasAddonMountContext } from '../generated/mywallpaper-runtime'
import './styles.css'

type DateFormat = 'full' | 'long' | 'medium' | 'short' | 'iso'
type TimeFormat = '12h' | '24h'
type Alignment = 'left' | 'center' | 'right'
type TextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize'

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
  fontWeight: string
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

export function mount({ layer }: CanvasAddonMountContext): () => void {
  const root = document.createElement('main')
  const weekday = document.createElement('div')
  const date = document.createElement('div')
  const time = document.createElement('time')
  root.className = 'date-display'
  weekday.className = 'weekday'
  date.className = 'date'
  time.className = 'time'
  root.append(weekday, date, time)
  layer.root.replaceChildren(root)

  let settings = readSettings(layer.settings.get())
  let interval = 0
  let intervalPeriod = 0
  let disposeFont: () => void = () => undefined

  const schedule = (): void => {
    const nextPeriod = settings.showTime && settings.showSeconds ? 1_000 : 15_000
    if (nextPeriod === intervalPeriod) return
    window.clearInterval(interval)
    intervalPeriod = nextPeriod
    interval = window.setInterval(render, nextPeriod)
  }

  const applyFont = (): void => {
    disposeFont()
    disposeFont = loadRemoteFont(settings)
  }

  function render(): void {
    const now = new Date()
    const locale = settings.locale === 'system' ? undefined : settings.locale
    root.style.setProperty('--date-background', settings.backgroundColor)
    root.style.setProperty('--date-blur', `${clamp(settings.backgroundBlur, 0, 80)}px`)
    root.style.setProperty('--date-radius', `${clamp(settings.cornerRadius, 0, 100)}px`)
    root.style.setProperty('--date-padding', `${clamp(settings.padding, 0, 120)}px`)
    root.style.setProperty('--date-align', alignmentValue(settings.alignment))

    applyTextStyle(weekday, settings, settings.secondaryColor, settings.dayFontSize)
    applyTextStyle(date, settings, settings.primaryColor, settings.dateFontSize)
    applyTextStyle(time, settings, settings.primaryColor, settings.timeFontSize)

    weekday.hidden = !settings.showDayOfWeek
    date.hidden = !settings.showDate
    time.hidden = !settings.showTime
    weekday.textContent = formatWeekday(now, settings, locale)
    date.textContent = formatDate(now, settings, locale)
    time.textContent = new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: settings.showSeconds ? '2-digit' : undefined,
      hour12: settings.timeFormat === '12h',
    }).format(now)
    time.dateTime = now.toISOString()
  }

  const unsubscribe = layer.settings.subscribe((values) => {
    const previousFont = `${settings.fontSource}\u0000${settings.fontFamily}\u0000${settings.fontUrl}`
    settings = readSettings(values)
    if (`${settings.fontSource}\u0000${settings.fontFamily}\u0000${settings.fontUrl}` !== previousFont) applyFont()
    schedule()
    render()
  })

  applyFont()
  schedule()
  render()

  return () => {
    unsubscribe()
    window.clearInterval(interval)
    disposeFont()
    layer.root.replaceChildren()
  }
}

function readSettings(values: AddonValues): Settings {
  return {
    showDayOfWeek: booleanValue(values.showDayOfWeek, defaults.showDayOfWeek),
    showDate: booleanValue(values.showDate, defaults.showDate),
    dateFormat: enumValue(values.dateFormat, ['full', 'long', 'medium', 'short', 'iso'], defaults.dateFormat),
    showTime: booleanValue(values.showTime, defaults.showTime),
    timeFormat: enumValue(values.timeFormat, ['12h', '24h'], defaults.timeFormat),
    showSeconds: booleanValue(values.showSeconds, defaults.showSeconds),
    locale: stringValue(values.locale, defaults.locale),
    useCustomNames: booleanValue(values.useCustomNames, defaults.useCustomNames),
    customDays: stringValue(values.customDays, defaults.customDays),
    customMonths: stringValue(values.customMonths, defaults.customMonths),
    fontSource: enumValue(values.fontSource, ['system', 'remote'], defaults.fontSource),
    fontFamily: stringValue(values.fontFamily, defaults.fontFamily),
    fontUrl: stringValue(values.fontUrl, defaults.fontUrl),
    fontWeight: stringValue(values.fontWeight, defaults.fontWeight),
    alignment: enumValue(values.alignment, ['left', 'center', 'right'], defaults.alignment),
    textTransform: enumValue(values.textTransform, ['none', 'uppercase', 'lowercase', 'capitalize'], defaults.textTransform),
    dayFontSize: numberValue(values.dayFontSize, defaults.dayFontSize),
    dateFontSize: numberValue(values.dateFontSize, defaults.dateFontSize),
    timeFontSize: numberValue(values.timeFontSize, defaults.timeFontSize),
    letterSpacing: numberValue(values.letterSpacing, defaults.letterSpacing),
    primaryColor: stringValue(values.primaryColor, defaults.primaryColor),
    secondaryColor: stringValue(values.secondaryColor, defaults.secondaryColor),
    opacity: numberValue(values.opacity, defaults.opacity),
    shadowStrength: numberValue(values.shadowStrength, defaults.shadowStrength),
    shadowColor: stringValue(values.shadowColor, defaults.shadowColor),
    backgroundColor: stringValue(values.backgroundColor, defaults.backgroundColor),
    backgroundBlur: numberValue(values.backgroundBlur, defaults.backgroundBlur),
    cornerRadius: numberValue(values.cornerRadius, defaults.cornerRadius),
    padding: numberValue(values.padding, defaults.padding),
  }
}

function applyTextStyle(element: HTMLElement, settings: Settings, color: string, fontSize: number): void {
  element.style.fontFamily = `"${settings.fontFamily.replace(/["\\]/g, '')}", "Segoe UI", sans-serif`
  element.style.fontWeight = settings.fontWeight
  element.style.letterSpacing = `${clamp(settings.letterSpacing, -4, 24)}px`
  element.style.textAlign = settings.alignment
  element.style.textTransform = settings.textTransform
  element.style.opacity = String(clamp(settings.opacity, 10, 100) / 100)
  element.style.color = color
  element.style.fontSize = `${clamp(fontSize, 8, 300)}px`
  element.style.textShadow = settings.shadowStrength > 0
    ? `0 0 ${Math.round(clamp(settings.shadowStrength, 0, 100) * 0.32)}px ${settings.shadowColor}`
    : 'none'
}

function formatWeekday(value: Date, settings: Settings, locale: string | undefined): string {
  const names = settings.useCustomNames ? splitNames(settings.customDays, 7) : null
  return names?.[value.getDay()] ?? new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(value)
}

function formatDate(value: Date, settings: Settings, locale: string | undefined): string {
  if (settings.dateFormat === 'iso') {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
  }
  const months = settings.useCustomNames ? splitNames(settings.customMonths, 12) : null
  if (!months) return new Intl.DateTimeFormat(locale, { dateStyle: settings.dateFormat }).format(value)
  const month = months[value.getMonth()] ?? ''
  if (settings.dateFormat === 'short') return `${value.getDate()}/${value.getMonth() + 1}/${value.getFullYear()}`
  if (settings.dateFormat === 'medium') return `${month.slice(0, 3)} ${value.getDate()}, ${value.getFullYear()}`
  if (settings.dateFormat === 'full') return `${formatWeekday(value, settings, locale)}, ${month} ${value.getDate()}, ${value.getFullYear()}`
  return `${month} ${value.getDate()}, ${value.getFullYear()}`
}

function splitNames(value: string, expected: number): string[] | null {
  const names = value.split(',').map((part) => part.trim()).filter(Boolean)
  return names.length === expected ? names : null
}

function loadRemoteFont(settings: Settings): () => void {
  if (settings.fontSource !== 'remote' || !/^https:\/\//i.test(settings.fontUrl)) return () => undefined
  if (/\.(?:woff2?|ttf|otf)(?:[?#].*)?$/i.test(settings.fontUrl)) {
    const face = new FontFace(settings.fontFamily, `url("${settings.fontUrl.replace(/"/g, '\\"')}")`)
    let installed = false
    void face.load().then((loaded) => {
      document.fonts.add(loaded)
      installed = true
    }).catch(() => undefined)
    return () => { if (installed) document.fonts.delete(face) }
  }
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = settings.fontUrl
  document.head.append(link)
  return () => link.remove()
}

function alignmentValue(value: Alignment): string {
  return value === 'left' ? 'flex-start' : value === 'right' ? 'flex-end' : 'center'
}

function booleanValue(value: unknown, fallback: boolean): boolean { return typeof value === 'boolean' ? value : fallback }
function numberValue(value: unknown, fallback: number): number { return typeof value === 'number' && Number.isFinite(value) ? value : fallback }
function stringValue(value: unknown, fallback: string): string { return typeof value === 'string' ? value : fallback }
function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? value as T : fallback
}
function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
}
