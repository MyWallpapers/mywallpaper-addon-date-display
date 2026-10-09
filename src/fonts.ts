import type { ResourceValue, SettingDefinition, AddonValues, CanvasEditorInspector } from '../generated/mywallpaper-runtime'

type FontStyle = 'normal' | 'italic' | 'oblique'
interface Face { family: string; source: string; style: FontStyle; descriptorStyle: string; min: number; max: number; unicodeRange: string }
interface Catalog { url: string; kind: 'file' | 'stylesheet'; faces: Face[] }
interface Choice { family: string; weight: number; style: FontStyle }
export interface FontState { status: 'idle' | 'loading' | 'ready' | 'failed'; catalog?: Catalog; choice?: Choice; selected?: Choice & { alias: string } }
interface Request { remote: boolean; resource: ResourceValue | null; url: string; family: string; weight: string; style: FontStyle; text: string }
const standardWeights = [100, 200, 300, 400, 500, 600, 700, 800, 900]
const weightNames: Record<number, string> = { 100: 'Thin', 200: 'Extra light', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extra bold', 900: 'Black' }
export const fontWeight = (value: unknown): number => typeof value === 'string' && /^\d{1,4}(?:\.\d+)?$/.test(value) && Number(value) >= 1 && Number(value) <= 1000 ? Number(value) : 600
const httpUrl = (value: string): boolean => { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password } catch { return false } }
const directFile = (url: string) => /\.(woff2?|ttf|otf)(?:[?#].*)?$/i.test(url)
const resolvedFile = (url: string) => httpUrl(url) || /^data:(font\/|application\/)/i.test(url)
const cssString = (value: string) => value.trim().replace(/^(['"])(.*)\1$/, '$2').replace(/\\([0-9a-f]{1,6})\s?|\\([^\n\r])/gi, (_, hex: string, char: string) => hex ? String.fromCodePoint(Math.min(parseInt(hex, 16), 0x10ffff)) : char)

async function stylesheet(url: string, signal: AbortSignal): Promise<Catalog> {
  const faces: Face[] = [], visited = new Set<string>()
  let remaining = 256 * 1024, binary = false, count = 0
  async function read(address: string): Promise<void> {
    if (visited.has(address)) return
    if (!httpUrl(address) || visited.size >= 4) throw new Error('Invalid font stylesheet')
    visited.add(address)
    const response = await fetch(address, { signal, credentials: 'omit', referrerPolicy: 'no-referrer' })
    if (!response.ok || !response.body) throw new Error('Font stylesheet unavailable')
    if (/^(font\/|application\/(?:x-font|font|octet-stream))/i.test(response.headers.get('content-type') ?? '')) {
      await response.body.cancel()
      if (visited.size === 1) { binary = true; return }
      throw new Error('Invalid imported stylesheet')
    }
    const reader = response.body.getReader(), decoder = new TextDecoder()
    let text = ''
    try {
      for (;;) {
        const chunk = await reader.read()
        if (chunk.done) break
        remaining -= chunk.value.byteLength
        if (remaining < 0) { await reader.cancel(); throw new Error('Font stylesheet too large') }
        text += decoder.decode(chunk.value, { stream: true })
      }
      text += decoder.decode()
    } finally { reader.releaseLock() }
    const imports: string[] = []
    // Fetch imports explicitly under the same byte, request and time limits.
    const css = text.replace(/@import\s+(?:url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)|"([^"]*)"|'([^']*)')[^;]*;/gi, (_, ...parts: string[]) => {
      imports.push(new URL(cssString(parts.slice(0, 5).find(Boolean) ?? ''), response.url).href); return ''
    })
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(css)
    function collect(rules: CSSRuleList): void {
      for (const rule of Array.from(rules)) {
        if (++count > 512) throw new Error('Too many font rules')
        if (rule.type === CSSRule.FONT_FACE_RULE) {
          const style = (rule as CSSFontFaceRule).style
          const family = cssString(style.getPropertyValue('font-family'))
          if (!family || family.length > 100 || /[\u0000-\u001f]/.test(family)) continue
          const weight = style.getPropertyValue('font-weight').trim().replace(/^normal$/, '400').replace(/^bold$/, '700') || '400'
          const bounds = weight.split(/\s+/).map(Number)
          if (bounds.length > 2 || bounds.some(value => !Number.isFinite(value) || value < 1 || value > 1000)
            || (bounds[1] !== undefined && bounds[1] < bounds[0]!)) continue
          const descriptorStyle = style.getPropertyValue('font-style') || 'normal'
          const kind = descriptorStyle.startsWith('italic') ? 'italic' : descriptorStyle.startsWith('oblique') ? 'oblique' : 'normal'
          const sources: string[] = []
          const expression = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)(\s*format\([^)]*\))?/gi
          for (const match of style.getPropertyValue('src').matchAll(expression)) {
            const source = new URL(cssString(match[1] ?? match[2] ?? match[3] ?? ''), response.url).href
            if (httpUrl(source)) sources.push(`url(${JSON.stringify(source)})${match[4] ?? ''}`)
          }
          if (!sources.length) continue
          if (faces.length >= 128) throw new Error('Too many font faces')
          faces.push({ family, source: sources.join(', '), style: kind, descriptorStyle,
            min: bounds[0]!, max: bounds[1] ?? bounds[0]!, unicodeRange: style.getPropertyValue('unicode-range') || 'U+0-10FFFF' })
        } else if ('cssRules' in rule) collect((rule as CSSGroupingRule).cssRules)
      }
    }
    collect(sheet.cssRules)
    for (const imported of imports) await read(imported)
  }
  await read(url)
  if (!binary && !faces.length) throw new Error('No downloadable font face in this stylesheet')
  return { url, kind: binary ? 'file' : 'stylesheet', faces }
}

function select(catalog: Catalog, request: Request): { choice: Choice; faces: Face[] } {
  const desired = fontWeight(request.weight)
  if (catalog.kind === 'file') return { choice: { family: request.family || 'Custom font', weight: desired, style: request.style }, faces: [] }
  const family = catalog.faces.find(face => face.family.toLowerCase() === request.family.trim().toLowerCase())?.family ?? catalog.faces[0]!.family
  const familyFaces = catalog.faces.filter(face => face.family === family)
  const style = familyFaces.some(face => face.style === request.style) ? request.style : familyFaces[0]!.style
  const matching = familyFaces.filter(face => face.style === style)
  const closest = matching.reduce((best, face) => {
    const distance = Math.abs(Math.min(face.max, Math.max(face.min, desired)) - desired)
    const previous = Math.abs(Math.min(best.max, Math.max(best.min, desired)) - desired)
    return distance < previous ? face : best
  })
  const weight = Math.min(closest.max, Math.max(closest.min, desired))
  return { choice: { family, weight, style }, faces: matching.filter(face => face.min <= weight && face.max >= weight) }
}

function cancellable<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new Error('Font request cancelled'))
    const finish = () => signal.removeEventListener('abort', abort)
    operation.then(value => { finish(); resolve(value) }, error => { finish(); reject(error) })
    if (signal.aborted) abort()
    else signal.addEventListener('abort', abort, { once: true })
  })
}

export function createRemoteFonts(prefix: string, changed: (state: FontState) => void, resolveResource: (value: ResourceValue) => Promise<string>) {
  let epoch = 0, controller: AbortController | undefined, catalog: Catalog | undefined
  let active: { key: string; faces: FontFace[]; selected: Choice & { alias: string } } | undefined
  let last: Request | undefined
  const remove = (faces: FontFace[]) => faces.forEach(face => document.fonts.delete(face))
  const emit = changed
  async function update(request: Request): Promise<void> {
    last = request
    const current = ++epoch
    controller?.abort(); controller = new AbortController()
    const signal = controller.signal, candidates: FontFace[] = []
    if (!request.remote) { if (active) remove(active.faces); active = undefined; emit({ status: 'idle' }); return }
    const url = request.resource?.url || request.url
    const timeout = setTimeout(() => controller?.signal === signal && controller.abort(), 8000)
    let choice: Choice | undefined
    try {
      if (!httpUrl(url)) throw new Error('Invalid font URL')
      if (catalog?.url !== url) {
        emit({ status: 'loading', selected: active?.selected })
        const next = directFile(url) ? { url, kind: 'file' as const, faces: [] } : await stylesheet(url, signal)
        if (current !== epoch || signal.aborted) return
        catalog = next
      }
      if (current !== epoch || signal.aborted) return
      const selected = select(catalog, request), faces = selected.faces
      choice = selected.choice
      const key = JSON.stringify([url, catalog.kind === 'file' ? request.resource?.kind : undefined,
        choice.family, choice.style, faces])
      if (active?.key === key && (catalog.kind !== 'file' || active.selected.weight === choice.weight)) {
        active.selected = { ...choice, alias: active.selected.alias }
        emit({ status: 'ready', catalog, choice, selected: active.selected }); return
      }
      emit({ status: 'loading', catalog, choice, selected: active?.selected })
      const alias = `${prefix}-${current}`
      if (catalog.kind === 'file') {
        const source = request.resource ? await cancellable(resolveResource(request.resource), signal) : url
        if (current !== epoch || signal.aborted) return
        if (!resolvedFile(source)) throw new Error('Invalid resolved font file URL')
        candidates.push(new FontFace(alias, `url(${JSON.stringify(source)})`, { weight: String(choice.weight), style: choice.style }))
      } else for (const face of faces) candidates.push(new FontFace(alias, face.source, {
        weight: face.min === face.max ? String(face.min) : `${face.min} ${face.max}`,
        style: face.descriptorStyle, unicodeRange: face.unicodeRange,
      }))
      candidates.forEach(face => document.fonts.add(face))
      const loaded = await cancellable(document.fonts.load(`${choice.style} ${choice.weight} 16px "${alias}"`, request.text || 'Aa'), signal)
      if (!loaded.length) throw new Error('No matching font face')
      if (current !== epoch || signal.aborted) return
      const previous = active
      active = { key, faces: candidates, selected: { ...choice, alias } }
      emit({ status: 'ready', catalog, choice, selected: active.selected })
      if (previous) remove(previous.faces)
    } catch {
      if (current === epoch) emit({ status: 'failed', catalog: catalog?.url === url ? catalog : undefined, choice, selected: active?.selected })
    } finally {
      clearTimeout(timeout)
      if (active?.faces !== candidates) remove(candidates)
    }
  }
  return { update, retry() { catalog = undefined; if (last) void update(last) },
    dispose() { epoch++; controller?.abort(); if (active) remove(active.faces); active = undefined } }
}

export function inspectFonts(definitions: SettingDefinition[], values: AddonValues, state: FontState): CanvasEditorInspector {
  const remote = values.fontSource === 'remote', choice = state.choice
  const dynamic = remote && state.catalog?.kind === 'stylesheet' && choice
  const faces = dynamic ? state.catalog!.faces.filter(face => face.family === choice.family) : []
  const styleFaces = faces.filter(face => face.style === choice?.style)
  const ranges = styleFaces.map(face => [face.min, face.max] as const).sort((a, b) => a[0] - b[0])
  let end = ranges[0]?.[1] ?? 0
  const continuous = ranges.length > 0 && ranges.every(([min, max]) => {
    if (min > end) return false
    end = Math.max(end, max); return true
  }) && end > ranges[0]![0]
  const weights = dynamic ? [...new Set(styleFaces.flatMap(face => [face.min, face.max,
    ...standardWeights.filter(weight => weight >= face.min && weight <= face.max)]).concat(choice.weight))].sort((a, b) => a - b)
    : [...new Set([...standardWeights, fontWeight(values.fontWeight)])].sort((a, b) => a - b)
  const families = dynamic ? [...new Set(state.catalog!.faces.map(face => face.family))] : []
  const styles = dynamic ? [...new Set(faces.map(face => face.style))] : ['normal', 'italic', 'oblique']
  const effective = { family: dynamic ? choice.family : String(values.fontFamily ?? 'Segoe UI'),
    weight: dynamic ? choice.weight : fontWeight(values.fontWeight), style: dynamic ? choice.style : String(values.fontStyle ?? 'normal') }
  const settings = definitions.map(field => {
    if (field.id === 'typography') return { ...field, description: remote ? state.status === 'loading' ? 'Reading and loading the selected font…' : state.status === 'failed' ? 'Font unavailable. The URL must allow browser access (CORS); the previous font stays visible.' : dynamic ? 'Families and variants detected from this stylesheet. Text size remains freely adjustable.' : 'For automatic family and variant detection, use a font stylesheet URL.' : undefined }
    if (field.id === 'fontFamily' && dynamic) return { ...field, type: 'select' as const, default: effective.family, options: families.map(family => ({ label: family, value: family })), description: 'Families available in the selected stylesheet.' }
    if (field.id === 'fontWeight') {
      const { options: _options, multiple: _multiple, min: _min, max: _max, step: _step, ...definition } = field
      return continuous
      ? { ...definition, type: 'range' as const, default: effective.weight, min: ranges[0]![0], max: end,
        description: `Variable font: weights ${ranges[0]![0]}–${end}.` }
      : { ...definition, type: 'select' as const, default: String(effective.weight),
        options: weights.map(weight => ({ label: `${weightNames[weight] ?? 'Weight'} (${weight})`, value: String(weight) })) }
    }
    if (field.id === 'fontStyle') return { ...field, type: 'select' as const, default: effective.style, options: styles.map(style => ({ label: style === 'normal' ? 'Normal' : style === 'italic' ? 'Italic' : 'Oblique', value: style })) }
    return field
  })
  if (remote && state.status === 'failed') settings.push({ id: 'retryFont', type: 'button',
    label: 'Font loading', buttonLabel: 'Retry font', parent: 'typography' })
  return { settings, values: { ...values, fontFamily: effective.family,
    fontWeight: continuous ? effective.weight : String(effective.weight), fontStyle: effective.style } }
}
