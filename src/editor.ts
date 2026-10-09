import type {
  AddonValues, CanvasEditorInspectorAdapter, CanvasEditorTargetGeometry, CanvasLayerApi,
  SettingDefinition,
} from '../generated/mywallpaper-runtime'
import manifest from '../manifest.json'

const ids = ['weekday', 'date', 'time'] as const
type PartId = typeof ids[number]
type Layout = Partial<Record<PartId, CanvasEditorTargetGeometry>>
const labels: Record<PartId, string> = { weekday: 'Weekday', date: 'Date', time: 'Time' }
const fields: Record<PartId, string[]> = {
  weekday: ['showDayOfWeek', 'dayFontSize'],
  date: ['showDate', 'dateFormat', 'dateFontSize'],
  time: ['showTime', 'timeFormat', 'showSeconds', 'timeFontSize'],
}
const definitions = manifest.settings as SettingDefinition[]
const rootDefinitions = definitions.filter(field => field.id !== 'elementLayout' && field.id !== 'savedLayout')
const defaultValues = Object.fromEntries(definitions.filter(field => field.default !== undefined)
  .map(field => [field.id, field.default])) as AddonValues
const bound = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))
const rounded = (n: number) => Number(n.toFixed(4))
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Only three known frames, finite root-relative coordinates, and no executable data. */
function geometry(value: unknown): CanvasEditorTargetGeometry | undefined {
  if (!record(value)) return
  const keys = ['xPercent', 'yPercent', 'widthPercent', 'heightPercent', 'rotation'] as const
  if (!keys.every(key => typeof value[key] === 'number' && Number.isFinite(value[key]))) return
  const widthPercent = rounded(bound(value.widthPercent as number, .1, 100))
  const heightPercent = rounded(bound(value.heightPercent as number, .1, 100))
  return {
    xPercent: rounded(bound(value.xPercent as number, 0, 100 - widthPercent)),
    yPercent: rounded(bound(value.yPercent as number, 0, 100 - heightPercent)),
    widthPercent, heightPercent,
    rotation: rounded(((value.rotation as number % 360) + 540) % 360 - 180),
  }
}

function readLayout(value: unknown): Layout {
  if (typeof value !== 'string' || value.length > 4096) return {}
  try {
    const parsed: unknown = JSON.parse(value)
    if (!record(parsed)) return {}
    const layout: Layout = {}
    for (const id of ids) {
      const frame = geometry(parsed[id])
      if (frame) layout[id] = frame
    }
    return layout
  } catch { return {} }
}

export function createDateEditor(
  layer: CanvasLayerApi, widget: HTMLElement, content: HTMLElement,
  parts: Record<PartId, HTMLElement>, enabled: boolean,
) {
  let automatic: Layout = {}
  let preview: Layout | undefined
  let measuring = false
  let disposed = false
  let generation = 0
  let fingerprint = ''
  let stopTargets: (() => void) | undefined
  let invalidateAutomatic = true

  const visibleIds = () => ids.filter(id => !parts[id].hidden)
  const saved = () => readLayout(layer.settings.get().elementLayout)
  const frames = (): Layout => ({ ...automatic, ...saved(), ...preview })
  const custom = () => Object.keys(preview ?? saved()).length > 0

  function fitAutomatic(): void {
    widget.classList.remove('mw-date-display--free')
    for (const id of ids) parts[id].removeAttribute('style')
    const padding = parseFloat(widget.style.getPropertyValue('--mw-dd-padding')) || 0
    const width = widget.clientWidth, height = widget.clientHeight
    if (width <= 0 || height <= 0) { automatic = {}; return }
    const scale = Math.min(1,
      Math.max(0, width - padding * 2) / Math.max(1, content.offsetWidth),
      Math.max(0, height - padding * 2) / Math.max(1, content.offsetHeight))
    content.style.setProperty('--mw-dd-scale', String(scale))
    // Local layout offsets remain correct when the entire host layer is rotated/scaled.
    const origin = getComputedStyle(content).transformOrigin.split(' ').map(parseFloat)
    const x = content.offsetLeft + (origin[0] ?? 0) * (1 - scale)
    const y = content.offsetTop + (origin[1] ?? 0) * (1 - scale)
    automatic = {}
    for (const id of visibleIds()) {
      const part = parts[id]
      automatic[id] = geometry({
        xPercent: (x + part.offsetLeft * scale) / width * 100,
        yPercent: (y + part.offsetTop * scale) / height * 100,
        widthPercent: part.offsetWidth * scale / width * 100,
        heightPercent: part.offsetHeight * scale / height * 100, rotation: 0,
      })
    }
  }

  function paint(layout: Layout): void {
    widget.classList.add('mw-date-display--free')
    for (const id of visibleIds()) {
      const part = parts[id], frame = layout[id]
      if (!frame) continue
      part.style.left = `${frame.xPercent}%`
      part.style.top = `${frame.yPercent}%`
      part.style.width = `${frame.widthPercent}%`
      part.style.height = `${frame.heightPercent}%`
      part.style.transform = `rotate(${frame.rotation}deg)`
      const text = part.firstElementChild as HTMLElement
      const scale = Math.min(1, part.clientWidth / Math.max(1, text.offsetWidth),
        part.clientHeight / Math.max(1, text.offsetHeight))
      part.style.setProperty('--mw-dd-part-scale', String(scale))
    }
  }

  const reset: SettingDefinition = { id: 'resetLayout', type: 'button', label: 'Arrangement',
    buttonLabel: 'Restore automatic arrangement' }
  const inspector: CanvasEditorInspectorAdapter = {
    get(targetId) {
      const values = { ...defaultValues, ...layer.settings.get() }
      if (targetId === null) return { settings: [...rootDefinitions, reset], values }
      if (!ids.includes(targetId as PartId)) throw new Error('This element is no longer available.')
      const id = targetId as PartId, frame = frames()[id]
      if (!frame) throw new Error('This element is hidden.')
      return {
        settings: [
          ...definitions.filter(field => fields[id].includes(field.id)).map(({ parent: _parent, ...field }) => field),
          { id: 'geometry', type: 'section', label: 'Position and size', defaultCollapsed: true },
          { id: 'position', type: 'vector2', label: 'Position (%)', parent: 'geometry',
            axisLabels: ['X', 'Y'], min: 0, max: 100, step: .1 },
          { id: 'size', type: 'vector2', label: 'Size (%)', parent: 'geometry',
            axisLabels: ['Width', 'Height'], min: .1, max: 100, step: .1 },
          { id: 'rotation', type: 'number', label: 'Rotation (°)', parent: 'geometry', min: -180, max: 180, step: 1 },
          reset,
        ],
        values: { ...values, position: { x: frame.xPercent, y: frame.yPercent },
          size: { x: frame.widthPercent, y: frame.heightPercent }, rotation: frame.rotation },
      }
    },
    change(targetId, values) {
      if (targetId === null) {
        const patch: AddonValues = {}
        for (const field of rootDefinitions) {
          if (field.type !== 'section' && field.type !== 'button' && values[field.id] !== undefined) {
            patch[field.id] = values[field.id]!
          }
        }
        return { layer: patch }
      }
      if (!ids.includes(targetId as PartId)) return
      const id = targetId as PartId, layout = frames(), current = layout[id]
      if (!current || parts[id].hidden) return
      const patch: AddonValues = {}
      for (const key of fields[id]) if (values[key] !== undefined) patch[key] = values[key]!
      const position = values.position, size = values.size
      if (position !== undefined || size !== undefined || values.rotation !== undefined) {
        const next = geometry({ ...current,
          ...(record(position) ? { xPercent: position.x, yPercent: position.y } : {}),
          ...(record(size) ? { widthPercent: size.x, heightPercent: size.y } : {}),
          ...(values.rotation !== undefined ? { rotation: values.rotation } : {}),
        })
        if (next) patch.elementLayout = JSON.stringify({ ...layout, [id]: next })
      }
      return { layer: patch }
    },
    action(_targetId, actionId) {
      if (actionId === 'resetLayout') return { layer: { elementLayout: '{}' } }
    },
  }

  function refresh(): void {
    if (disposed || measuring) return
    measuring = true
    if (!custom() || invalidateAutomatic) fitAutomatic()
    invalidateAutomatic = false
    if (custom()) paint(frames())
    measuring = false
    if (!enabled || !layer.editor || preview || widget.clientWidth <= 0 || widget.clientHeight <= 0) return
    const layout = frames()
    const targets = visibleIds().flatMap(id => layout[id] ? [{
      id, label: labels[id], geometry: layout[id]!, canMove: true, canResize: true, canRotate: true,
    }] : [])
    const nextFingerprint = JSON.stringify(targets)
    if (fingerprint === nextFingerprint && stopTargets) return
    fingerprint = nextFingerprint
    const currentGeneration = ++generation
    stopTargets = layer.editor.registerTargets(targets, event => {
      if (disposed || currentGeneration !== generation || !ids.includes(event.targetId as PartId)) return
      const id = event.targetId as PartId
      if (parts[id].hidden) return
      if (event.phase === 'cancel') { preview = undefined; refresh(); return }
      const next = geometry(event.geometry)
      if (!next) { preview = undefined; refresh(); return }
      const layout = { ...automatic, ...saved() }
      // Freeze all visible automatic frames on the first gesture; other parts never jump.
      const updated = { ...layout, [id]: next }
      if (event.phase === 'preview') { preview = updated; paint(updated); return }
      preview = undefined
      if (JSON.stringify(next) === JSON.stringify(layout[id])) { refresh(); return }
      paint(updated)
      // The host persists this single declared value through its validated undo history.
      return { elementLayout: JSON.stringify(updated) }
    }, inspector)
  }

  return {
    refresh,
    invalidate() { preview = undefined; invalidateAutomatic = true },
    dispose() { disposed = true; generation++; stopTargets?.() },
  }
}
