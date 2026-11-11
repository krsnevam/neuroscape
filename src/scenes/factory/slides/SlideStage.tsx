import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import SlideChart, { type ChartOp } from './SlideChart'

/**
 * Draws one lecture slide from the operations written by `npm run slides` (public/slides/Lxx.json).
 * All positions are in inches on a 13.333 x 7.5 canvas, the same numbers the PowerPoint file uses.
 */
export const SLIDE_W = 13.333
export const SLIDE_H = 7.5

interface Run {
  text: string
  bold?: boolean
  color?: string
  sup?: boolean
  sub?: boolean
  bullet?: boolean
  br?: boolean
  gap?: number
}
interface Box {
  x: number
  y: number
  w: number
  h: number
}
interface ShapeOp extends Box {
  t: 'shape'
  shape: 'rect' | 'roundRect' | 'ellipse' | 'line' | 'rightArrow'
  fill?: string
  stroke?: string
  sw?: number
  r?: number
  flip?: boolean
  end?: boolean
  begin?: boolean
}
interface TextOp extends Box {
  t: 'text'
  runs: Run[]
  size?: number
  bold?: boolean
  color?: string
  align?: 'left' | 'center' | 'right'
  valign?: 'top' | 'middle' | 'bottom'
  head?: boolean
  gap?: number
}
interface TableOp {
  t: 'table'
  x: number
  y: number
  w: number
  colW: number[]
  rowH: number
  rows: { text: string; bold?: boolean; color: string; fill: string; size: number }[][]
}
interface LinkOp extends Box {
  t: 'link'
  to: string
  label: string
}
export type SlideOp = ShapeOp | TextOp | TableOp | LinkOp | ChartOp
export interface Slide {
  kind: string
  dark: boolean
  title: string
  section: string | null
  notes: string
  ops: SlideOp[]
}
export interface Deck {
  code: string
  date: string
  title: string
  syllabus: string
  file: string
  slides: Slide[]
}

const HEAD_FONT = "Cambria, Georgia, 'Times New Roman', serif"
const BODY_FONT = "Calibri, Carlito, 'Segoe UI', system-ui, -apple-system, sans-serif"
const hex = (c?: string) => (c ? `#${c}` : undefined)

/** Shapes are drawn in one SVG whose user units are inches. */
function Shape({ op }: { op: ShapeOp }) {
  const stroke = hex(op.stroke)
  const sw = op.sw ? op.sw / 72 : 0
  const common = { fill: hex(op.fill) ?? 'none', stroke, strokeWidth: sw || undefined }
  if (op.shape === 'ellipse') return <ellipse cx={op.x + op.w / 2} cy={op.y + op.h / 2} rx={op.w / 2} ry={op.h / 2} {...common} />
  if (op.shape === 'rect' || op.shape === 'roundRect')
    return <rect x={op.x} y={op.y} width={op.w} height={op.h} rx={op.shape === 'roundRect' ? Math.min(op.r ?? 0.1, op.h / 2) : 0} {...common} />
  if (op.shape === 'rightArrow') {
    const { x, y, w, h } = op
    const neck = x + w * 0.45
    const pts = [
      [x, y + h * 0.3], [neck, y + h * 0.3], [neck, y], [x + w, y + h / 2], [neck, y + h], [neck, y + h * 0.7], [x, y + h * 0.7],
    ]
    return <polygon points={pts.map((p) => p.join(',')).join(' ')} fill={hex(op.fill)} />
  }
  // line, drawn left to right; `flip` means it rises
  const x1 = op.x
  const y1 = op.flip ? op.y + op.h : op.y
  const x2 = op.x + op.w
  const y2 = op.flip ? op.y : op.y + op.h
  const head = (tx: number, ty: number, fx: number, fy: number) => {
    const a = Math.atan2(ty - fy, tx - fx)
    const s = 0.11
    const p = (da: number) => `${tx - s * Math.cos(a + da)},${ty - s * Math.sin(a + da)}`
    return <polygon points={`${tx},${ty} ${p(0.42)} ${p(-0.42)}`} fill={stroke} />
  }
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={sw} />
      {op.end && head(x2, y2, x1, y1)}
      {op.begin && head(x1, y1, x2, y2)}
    </g>
  )
}

/** Groups runs into paragraphs: a run marked `br` ends its paragraph. */
function paragraphs(runs: Run[]) {
  const out: Run[][] = [[]]
  runs.forEach((r, i) => {
    out[out.length - 1].push(r)
    if (r.br && i < runs.length - 1) out.push([])
  })
  return out
}

function Text({ op, u }: { op: TextOp; u: number }) {
  const pt = u / 72
  // system fonts that stand in for Calibri are wider, so body text is set a touch smaller
  const size = (op.size ?? 14) * pt * (op.head ? 1 : 0.94)
  const style: CSSProperties = {
    position: 'absolute',
    left: op.x * u,
    top: op.y * u,
    width: op.w * u,
    height: op.h * u,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: op.valign === 'middle' ? 'center' : op.valign === 'bottom' ? 'flex-end' : 'flex-start',
    textAlign: op.align ?? 'left',
    fontSize: size,
    lineHeight: 1.2,
    fontWeight: op.bold ? 700 : 400,
    fontFamily: op.head ? HEAD_FONT : BODY_FONT,
    color: hex(op.color) ?? '#1B2140',
    whiteSpace: 'pre-wrap',
    pointerEvents: 'none',
  }
  const paras = paragraphs(op.runs)
  return (
    <div style={style}>
      {paras.map((runs, i) => {
        const bullet = runs.some((r) => r.bullet)
        const gap = (runs.find((r) => r.gap)?.gap ?? op.gap ?? 0) * pt
        return (
          <p key={i} style={{ margin: 0, marginBottom: i < paras.length - 1 ? gap : 0, paddingLeft: bullet ? size * 1.05 : 0, position: 'relative' }}>
            {bullet && <span style={{ position: 'absolute', left: size * 0.15 }}>•</span>}
            {runs.map((r, k) => {
              const st: CSSProperties = { fontWeight: r.bold ? 700 : undefined, color: hex(r.color) }
              if (r.sup || r.sub) return (
                <span key={k} style={{ ...st, fontSize: '0.62em', verticalAlign: r.sup ? 'super' : 'sub', lineHeight: 0 }}>{r.text}</span>
              )
              return <span key={k} style={st}>{r.text}</span>
            })}
          </p>
        )
      })}
    </div>
  )
}

function Table({ op, u }: { op: TableOp; u: number }) {
  const pt = u / 72
  return (
    <div style={{ position: 'absolute', left: op.x * u, top: op.y * u, width: op.w * u, fontFamily: BODY_FONT }}>
      {op.rows.map((row, r) => (
        <div key={r} style={{ display: 'flex' }}>
          {row.map((c, k) => (
            <div
              key={k}
              style={{
                width: op.colW[k] * u,
                minHeight: op.rowH * u,
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                padding: `${4 * pt}px ${8 * pt}px`,
                border: `${0.75 * pt}px solid #D5DAE8`,
                marginLeft: k ? -0.75 * pt : 0,
                marginTop: r ? -0.75 * pt : 0,
                background: hex(c.fill),
                color: hex(c.color),
                fontSize: c.size * pt,
                fontWeight: c.bold ? 700 : 400,
                lineHeight: 1.15,
              }}
            >
              {c.text}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default function SlideStage({ slide, width, children }: { slide: Slide; width: number; children?: ReactNode }) {
  const u = width / SLIDE_W
  return (
    <div
      className="relative overflow-hidden"
      style={{ width, height: SLIDE_H * u, background: slide.dark ? '#141B3C' : '#FFFFFF' }}
      aria-label={slide.title}
    >
      <svg viewBox={`0 0 ${SLIDE_W} ${SLIDE_H}`} width={width} height={SLIDE_H * u} className="absolute inset-0" aria-hidden>
        {slide.ops.map((op, i) => (op.t === 'shape' ? <Shape key={i} op={op} /> : null))}
      </svg>
      {slide.ops.map((op, i) => {
        if (op.t === 'text') return <Text key={i} op={op} u={u} />
        if (op.t === 'table') return <Table key={i} op={op} u={u} />
        if (op.t === 'chart') return <SlideChart key={i} op={op} u={u} />
        if (op.t === 'link')
          return (
            <Link
              key={i}
              to={op.to}
              onClick={(e) => e.stopPropagation()}
              className="absolute grid place-items-center rounded-full font-semibold hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              style={{
                left: op.x * u,
                top: op.y * u,
                width: op.w * u,
                height: op.h * u,
                fontSize: (13 * u) / 72,
                fontFamily: BODY_FONT,
                background: slide.dark ? '#E9A23B' : '#0C9C9C',
                color: slide.dark ? '#141B3C' : '#FFFFFF',
              }}
            >
              {op.label}
            </Link>
          )
        return null
      })}
      {children}
    </div>
  )
}
