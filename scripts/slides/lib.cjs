/**
 * Slide kit for the Unit 5 lecture decks. One deck per lecture hour.
 * Each deck file exports { code, date, title, syllabus, file, slides: [...] } and every slide
 * names a `kind` handled below. Build with: npm run slides
 */
const pptxgen = require('pptxgenjs')

const W = 13.333
const H = 7.5
const MX = 0.6
const CW = W - 2 * MX
const TOP = 1.6
const BOTTOM = 6.55

const C = {
  navy: '141B3C',
  navy2: '1F2957',
  ink: '1B2140',
  mute: '5B6380',
  line: 'D5DAE8',
  tint: 'F2F4FA',
  white: 'FFFFFF',
  teal: '0C9C9C',
  tealSoft: 'D6F0EF',
  amber: 'E9A23B',
  amberSoft: 'FCEFD6',
  rose: 'D4455C',
  roseSoft: 'FADDE2',
  green: '2B9A68',
  greenSoft: 'D9F1E5',
  violet: '6657D9',
}
const HEAD = 'Cambria'
const BODY = 'Calibri'

const PHASES = ['Before training', 'Training', 'After training']

/** Rough check that text fits its box; prints a warning when it probably does not. */
let currentSlide = ''
const fits = (text, size, w, h) => {
  const paras = String(text).split('\n')
  let lines = 0
  for (const p of paras) lines += Math.max(1, Math.ceil((p.length * size * 0.0071) / w))
  const need = (lines * size * 1.22) / 72
  if (need > h + 0.02) console.warn(`  ! may overflow (${currentSlide}): "${String(text).slice(0, 50)}…" needs ${need.toFixed(2)}in, has ${h.toFixed(2)}in`)
}

const txt = (slide, text, o) => {
  if (typeof text === 'string' && o.w && o.h && o.fontSize) fits(text, o.fontSize, o.w, o.h)
  slide.addText(text, { isTextBox: true, margin: 0, fontFace: BODY, color: C.ink, valign: 'top', ...o })
}

const bulletRuns = (items, o = {}) =>
  items.map((t, i) => ({
    text: t,
    options: { bullet: { indent: 16 }, breakLine: i < items.length - 1, paraSpaceAfter: o.gap ?? 9 },
  }))

const bullets = (slide, items, o) => {
  fits(items.join('\n'), o.fontSize, o.w - 0.25, o.h - (items.length * (o.gap ?? 9)) / 72)
  slide.addText(bulletRuns(items, o), { isTextBox: true, margin: 0, fontFace: BODY, color: C.ink, valign: 'top', ...o })
}

const circle = (pres, slide, x, y, d, label, fill = C.teal, color = C.white) => {
  slide.addShape(pres.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill, width: 0 } })
  if (label !== undefined)
    slide.addText(String(label), {
      isTextBox: true, margin: 0, x, y, w: d, h: d, align: 'center', valign: 'middle',
      fontFace: BODY, bold: true, fontSize: Math.round(d * 30), color,
    })
}

const panel = (pres, slide, x, y, w, h, fill = C.tint, radius = 0.12) =>
  slide.addShape(pres.ShapeType.roundRect, { x, y, w, h, rectRadius: radius, fill: { color: fill }, line: { color: fill, width: 0 } })

const chip = (pres, slide, x, y, label, fill, color = C.white, size = 12) => {
  const w = Math.max(0.9, label.length * size * 0.0082 + 0.36)
  slide.addShape(pres.ShapeType.roundRect, { x, y, w, h: 0.34, rectRadius: 0.17, fill: { color: fill }, line: { color: fill, width: 0 } })
  slide.addText(label, { isTextBox: true, margin: 0, x, y, w, h: 0.34, align: 'center', valign: 'middle', fontFace: BODY, bold: true, fontSize: size, color })
  return w
}

/** A callout band used under cards, tables and flows. */
const noteBand = (pres, slide, text, y, h = 0.8) => {
  panel(pres, slide, MX, y, CW, h, C.navy)
  txt(slide, text, { x: MX + 0.35, y, w: CW - 0.7, h, fontSize: 16, color: C.white, valign: 'middle', bold: true })
}

/* ---------- drawings ---------- */

const lineSeg = (pres, slide, x1, y1, x2, y2, color = C.line, width = 1) => {
  const x = Math.min(x1, x2)
  const y = Math.min(y1, y2)
  slide.addShape(pres.ShapeType.line, {
    x, y, w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
    flipV: (x2 - x1) * (y2 - y1) < 0,
    line: { color, width },
  })
}

/** Layered network. layers: [{ n, label, fill }] */
const drawNetwork = (pres, slide, box, layers, o = {}) => {
  const d = o.d ?? 0.42
  const colX = (i) => box.x + (layers.length === 1 ? box.w / 2 : (i * (box.w - d)) / (layers.length - 1))
  const usableH = box.h - 0.5
  const pos = layers.map((L, i) => {
    const shown = Math.min(L.n, o.max ?? 7)
    const gap = Math.min(0.62, usableH / shown)
    const y0 = box.y + (usableH - gap * (shown - 1) - d) / 2
    return Array.from({ length: shown }, (_, k) => ({ x: colX(i), y: y0 + k * gap }))
  })
  for (let i = 0; i < pos.length - 1; i++)
    for (const a of pos[i]) for (const b of pos[i + 1]) lineSeg(pres, slide, a.x + d, a.y + d / 2, b.x, b.y + d / 2, C.line, 0.75)
  pos.forEach((col, i) => {
    for (const p of col) circle(pres, slide, p.x, p.y, d, undefined, layers[i].fill ?? C.teal)
    txt(slide, layers[i].label, { x: colX(i) - 0.9 + d / 2, y: box.y + box.h - 0.45, w: 1.8, h: 0.45, fontSize: 12, color: C.mute, align: 'center' })
  })
}

const mix = (a, b, t) => {
  const p = (h, i) => parseInt(h.slice(i, i + 2), 16)
  return [0, 2, 4].map((i) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * t).toString(16).padStart(2, '0')).join('').toUpperCase()
}

/** Grid of cells; values in 0..1, or objects { v, label } */
const drawGrid = (pres, slide, box, rows, o = {}) => {
  const n = rows.length
  const m = rows[0].length
  const cell = Math.min(box.w / m, box.h / n)
  const x0 = box.x + (box.w - cell * m) / 2
  const y0 = box.y + (box.h - cell * n) / 2
  rows.forEach((row, r) =>
    row.forEach((raw, c) => {
      const v = typeof raw === 'object' ? raw.v : raw
      const fill = typeof raw === 'object' && raw.fill ? raw.fill : mix(o.from ?? C.tint, o.to ?? C.navy, v)
      slide.addShape(pres.ShapeType.rect, { x: x0 + c * cell, y: y0 + r * cell, w: cell - 0.03, h: cell - 0.03, fill: { color: fill }, line: { color: C.white, width: 0.5 } })
      if (typeof raw === 'object' && raw.label !== undefined)
        slide.addText(String(raw.label), {
          isTextBox: true, margin: 0, x: x0 + c * cell, y: y0 + r * cell, w: cell - 0.03, h: cell - 0.03,
          align: 'center', valign: 'middle', fontFace: BODY, bold: true, fontSize: o.fontSize ?? 14, color: raw.color ?? (v > 0.5 ? C.white : C.ink),
        })
    }),
  )
}

/** Boxes joined by arrows, for block diagrams. nodes: [{ x, y, w, h, label, fill, color }] in box-relative inches */
const drawBlocks = (pres, slide, box, nodes, links = []) => {
  for (const [a, b, label] of links) {
    const A = nodes[a]
    const B = nodes[b]
    const x1 = box.x + A.x + A.w
    const y1 = box.y + A.y + A.h / 2
    const x2 = box.x + B.x
    const y2 = box.y + B.y + B.h / 2
    const x = Math.min(x1, x2)
    const y = Math.min(y1, y2)
    slide.addShape(pres.ShapeType.line, {
      x, y, w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), flipV: (x2 - x1) * (y2 - y1) < 0,
      line: { color: C.mute, width: 1.5, endArrowType: x2 >= x1 ? 'triangle' : 'none', beginArrowType: x2 < x1 ? 'triangle' : 'none' },
    })
    if (label) txt(slide, label, { x: (x1 + x2) / 2 - 0.7, y: (y1 + y2) / 2 - 0.32, w: 1.4, h: 0.28, fontSize: 11, color: C.mute, align: 'center' })
  }
  for (const n of nodes) {
    panel(pres, slide, box.x + n.x, box.y + n.y, n.w, n.h, n.fill ?? C.tint, 0.08)
    slide.addText(n.label, {
      isTextBox: true, margin: 2, x: box.x + n.x, y: box.y + n.y, w: n.w, h: n.h, align: 'center', valign: 'middle',
      fontFace: BODY, bold: true, fontSize: n.size ?? 13, color: n.color ?? C.ink,
    })
  }
}

/** Equation markup: x^{2} is superscript, w_{ij} is subscript. */
const eqRuns = (e) => {
  const runs = []
  const re = /([\^_])\{([^}]*)\}/g
  let last = 0
  let m
  while ((m = re.exec(e))) {
    if (m.index > last) runs.push({ text: e.slice(last, m.index), options: {} })
    runs.push({ text: m[2], options: m[1] === '^' ? { superscript: true } : { subscript: true } })
    last = re.lastIndex
  }
  if (last < e.length) runs.push({ text: e.slice(last), options: {} })
  return runs
}

/** In-app address of a station named on a slide (used only by the in-app viewer). */
const STATION_PATHS = {
  'The Delivery Promise': '/world/factory/mission',
  'Silk Board Sampler': '/world/factory/traffic',
  'Thermistor Bench': '/world/factory/sensor',
  'Error Valley Race': '/world/factory/valley',
  'UPI Fraud Alarm': '/world/factory/fraud',
  'Battery Oracle': '/world/factory/battery',
  'Chase Predictor': '/world/factory/cricket',
  'Doodle Reader': '/world/factory/doodle',
  'Colour Map': '/world/factory/colours',
  'Finish My Move': '/world/factory/wave',
  'Worlds 3 and 4': '/',
}
const pathOf = (name) => STATION_PATHS[name.trim()]

/* ---------- slide kinds ---------- */

const kinds = {
  title(pres, s, d, deck) {
    chip(pres, s, MX, 0.9, `${deck.code} · ${deck.date}`, C.teal, C.white, 14)
    txt(s, deck.title, { x: MX, y: 1.6, w: 9.6, h: 2.3, fontFace: HEAD, fontSize: 46, bold: true, color: C.white, valign: 'top' })
    txt(s, deck.syllabus, { x: MX, y: 4.05, w: 9.2, h: 0.9, fontSize: 20, color: 'C9D2F2' })
    txt(s, 'Artificial Neural Networks (SETE08) · Unit 5: Applications and Case Studies', { x: MX, y: 6.4, w: 9.5, h: 0.4, fontSize: 14, color: '9AA5D1' })
    // neuron motif: a small network on the right
    drawNetwork(pres, s, { x: 10.3, y: 1.5, w: 2.4, h: 4.2 }, [
      { n: 2, label: '', fill: C.amber },
      { n: 4, label: '', fill: C.teal },
      { n: 1, label: '', fill: C.white },
    ])
  },

  cards(pres, s, d) {
    const n = d.cards.length
    const cols = d.cols ?? (n === 4 ? 2 : Math.min(n, 3))
    const rows = Math.ceil(n / cols)
    const gap = 0.3
    const noteH = d.note ? 0.8 + gap : 0
    const w = (CW - gap * (cols - 1)) / cols
    const h = (BOTTOM - TOP - noteH - gap * (rows - 1)) / rows
    d.cards.forEach((c, i) => {
      const x = MX + (i % cols) * (w + gap)
      const y = TOP + Math.floor(i / cols) * (h + gap)
      panel(pres, s, x, y, w, h, c.fill ?? C.tint)
      circle(pres, s, x + 0.3, y + 0.32, 0.5, c.tag ?? i + 1, c.tone === 'bad' ? C.rose : c.tone === 'warn' ? C.amber : C.teal)
      if (cols > 3) {
        // narrow cards: heading sits under the number so long words are not broken
        txt(s, c.h, { x: x + 0.3, y: y + 0.98, w: w - 0.5, h: 0.5, fontSize: 18, bold: true, valign: 'middle' })
        txt(s, c.b, { x: x + 0.3, y: y + 1.6, w: w - 0.6, h: h - 1.8, fontSize: 15, color: C.ink })
      } else {
        txt(s, c.h, { x: x + 0.95, y: y + 0.2, w: w - 1.2, h: 0.75, fontSize: rows > 1 ? 18 : 20, bold: true, valign: 'middle' })
        txt(s, c.b, { x: x + 0.3, y: y + 1.12, w: w - 0.6, h: h - 1.3, fontSize: rows > 1 ? 15 : 17, color: C.ink })
      }
    })
    if (d.note) noteBand(pres, s, d.note, BOTTOM - 0.8)
  },

  compare(pres, s, d) {
    const gap = 0.35
    const noteH = d.note ? 0.8 + 0.3 : 0
    const w = (CW - gap) / 2
    const h = BOTTOM - TOP - noteH
    ;[d.left, d.right].forEach((p, i) => {
      const x = MX + i * (w + gap)
      const bad = p.tone === 'bad'
      const plain = p.tone === 'plain'
      panel(pres, s, x, TOP, w, h, plain ? C.tint : bad ? C.roseSoft : C.greenSoft)
      chip(pres, s, x + 0.3, TOP + 0.28, p.tag ?? (bad ? 'Goes wrong' : 'Works'), plain ? C.navy : bad ? C.rose : C.green)
      txt(s, p.h, { x: x + 0.3, y: TOP + 0.72, w: w - 0.6, h: 0.55, fontSize: 20, bold: true, valign: 'middle' })
      bullets(s, p.items, { x: x + 0.3, y: TOP + 1.42, w: w - 0.6, h: h - 1.6, fontSize: d.note ? 15 : 17 })
    })
    if (d.note) noteBand(pres, s, d.note, BOTTOM - 0.8)
  },

  table(pres, s, d) {
    const cols = d.head.length
    const widths = d.widths ?? Array(cols).fill(CW / cols)
    const head = d.head.map((t) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.navy }, fontSize: 15, fontFace: BODY, valign: 'middle' } }))
    const body = d.rows.map((r, ri) =>
      r.map((t, ci) => ({
        text: t,
        options: { color: C.ink, bold: ci === 0, fill: { color: ri % 2 ? C.white : C.tint }, fontSize: d.size ?? 15, fontFace: BODY, valign: 'middle' },
      })),
    )
    s.addTable([head, ...body], {
      x: MX, y: TOP, w: CW, colW: widths,
      rowH: d.rowH ?? 0.52,
      border: { type: 'solid', color: C.line, pt: 0.75 },
      margin: [4, 8, 4, 8],
    })
    if (d.note) noteBand(pres, s, d.note, BOTTOM - 0.8)
  },

  flow(pres, s, d) {
    const n = d.steps.length
    const arrow = n > 5 ? 0.26 : 0.32
    const noteH = d.note ? 0.8 + 0.3 : 0
    const w = (CW - arrow * (n - 1)) / n
    const h = BOTTOM - TOP - noteH
    d.steps.forEach((st, i) => {
      const x = MX + i * (w + arrow)
      const on = st.on
      const pad = n > 5 ? 0.18 : 0.25
      panel(pres, s, x, TOP, w, h, on ? C.navy : C.tint)
      circle(pres, s, x + pad, TOP + 0.25, 0.48, i + 1, on ? C.amber : C.teal)
      txt(s, st.h, { x: x + pad, y: TOP + 0.9, w: w - 2 * pad, h: 0.75, fontSize: n > 5 ? 16 : n > 4 ? 17 : 19, bold: true, color: on ? C.white : C.ink })
      txt(s, st.b, { x: x + pad, y: TOP + 1.7, w: w - 2 * pad, h: h - 1.9, fontSize: n > 5 ? 14 : n > 4 ? 15 : 16, color: on ? 'D5DBF5' : C.ink })
      if (i < n - 1)
        s.addShape(pres.ShapeType.rightArrow, { x: x + w + 0.04, y: TOP + h / 2 - 0.14, w: arrow - 0.08, h: 0.28, fill: { color: C.mute }, line: { color: C.mute, width: 0 } })
    })
    if (d.note) noteBand(pres, s, d.note, BOTTOM - 0.8)
  },

  formula(pres, s, d) {
    const lw = 6.2
    const h = BOTTOM - TOP
    panel(pres, s, MX, TOP, lw, h, C.navy)
    if (d.tag) chip(pres, s, MX + 0.4, TOP + 0.35, d.tag, C.teal)
    const eqs = Array.isArray(d.eq) ? d.eq : [d.eq]
    const eqH = d.caption ? h - 2.3 : h - 1.3
    s.addText(
      eqs.flatMap((e, i) => {
        const runs = eqRuns(e)
        runs[runs.length - 1].options = { ...runs[runs.length - 1].options, breakLine: i < eqs.length - 1 }
        return runs
      }),
      { isTextBox: true, margin: 0, x: MX + 0.4, y: TOP + 0.9, w: lw - 0.8, h: eqH, fontFace: HEAD, fontSize: d.eqSize ?? 26, color: C.white, valign: 'middle', paraSpaceAfter: 14 },
    )
    if (d.caption) txt(s, d.caption, { x: MX + 0.4, y: BOTTOM - 1.35, w: lw - 0.8, h: 1.1, fontSize: 14, color: 'C9D2F2', valign: 'bottom' })
    const rx = MX + lw + 0.4
    const rw = CW - lw - 0.4
    if (d.h) txt(s, d.h, { x: rx, y: TOP, w: rw, h: 0.75, fontSize: 19, bold: true })
    bullets(s, d.lines, { x: rx, y: TOP + (d.h ? 0.95 : 0), w: rw, h: h - (d.h ? 0.95 : 0), fontSize: 16, gap: 11 })
  },

  chart(pres, s, d) {
    const lw = 7.3
    const h = BOTTOM - TOP
    panel(pres, s, MX, TOP, lw, h, C.tint)
    const common = {
      x: MX + 0.15, y: TOP + 0.15, w: lw - 0.3, h: h - 0.3,
      chartColors: d.colors ?? [C.teal, C.amber, C.rose, C.violet],
      showLegend: d.series.length > 1, legendPos: 'b', legendFontSize: 12, legendColor: C.ink, legendFontFace: BODY,
      catAxisLabelColor: C.mute, valAxisLabelColor: C.mute, catAxisLabelFontSize: 11, valAxisLabelFontSize: 11,
      catAxisLabelFontFace: BODY, valAxisLabelFontFace: BODY,
      valGridLine: { color: 'DDE1EC', size: 0.5 }, catGridLine: { style: 'none' },
      showCatAxisTitle: !!d.xTitle, catAxisTitle: d.xTitle, catAxisTitleFontSize: 12, catAxisTitleColor: C.mute,
      showValAxisTitle: !!d.yTitle, valAxisTitle: d.yTitle, valAxisTitleFontSize: 12, valAxisTitleColor: C.mute,
      ...(d.options ?? {}),
    }
    if (d.type === 'scatter') {
      s.addChart(pres.charts.SCATTER, [{ name: 'x', values: d.x }, ...d.series.map((q) => ({ name: q.name, values: q.values }))], {
        ...common, lineSize: 0, lineDataSymbolSize: 6, showValAxisTitle: !!d.yTitle, ...(d.options ?? {}),
      })
    } else if (d.type === 'bar') {
      s.addChart(pres.charts.BAR, d.series.map((q) => ({ name: q.name, labels: d.labels, values: q.values })), { ...common, barDir: 'col', barGapWidthPct: 60 })
    } else {
      s.addChart(pres.charts.LINE, d.series.map((q) => ({ name: q.name, labels: d.labels, values: q.values })), {
        ...common, lineSize: 2.5, lineDataSymbol: 'none', catAxisLabelFrequency: d.labelEvery ?? Math.ceil(d.labels.length / 8),
      })
    }
    const rx = MX + lw + 0.4
    const rw = CW - lw - 0.4
    if (d.h) txt(s, d.h, { x: rx, y: TOP, w: rw, h: 0.75, fontSize: 19, bold: true })
    bullets(s, d.lines, { x: rx, y: TOP + (d.h ? 0.95 : 0), w: rw, h: h - (d.h ? 0.95 : 0), fontSize: 16, gap: 11 })
  },

  diagram(pres, s, d) {
    const lw = d.lw ?? 7.3
    const h = BOTTOM - TOP
    panel(pres, s, MX, TOP, lw, h, C.tint)
    d.draw({ pres, slide: s, box: { x: MX + 0.3, y: TOP + 0.3, w: lw - 0.6, h: h - 0.6 }, C, txt, circle, panel, chip, lineSeg, drawNetwork, drawGrid, drawBlocks, mix })
    const rx = MX + lw + 0.4
    const rw = CW - lw - 0.4
    if (d.h) txt(s, d.h, { x: rx, y: TOP, w: rw, h: 0.75, fontSize: 19, bold: true })
    bullets(s, d.lines, { x: rx, y: TOP + (d.h ? 0.95 : 0), w: rw, h: h - (d.h ? 0.95 : 0), fontSize: 16, gap: 11 })
  },

  demo(pres, s, d) {
    chip(pres, s, MX, 0.6, `LIVE · ${d.tag}`, C.amber, C.navy, 13)
    txt(s, d.title, { x: MX, y: 1.1, w: CW, h: 1.0, fontFace: HEAD, fontSize: 34, bold: true, color: C.white, valign: 'middle' })
    const lw = 7.4
    d.steps.forEach((st, i) => {
      const y = 2.45 + i * 1.02
      circle(pres, s, MX, y, 0.5, i + 1, C.teal)
      txt(s, st, { x: MX + 0.75, y: y - 0.08, w: lw - 0.75, h: 0.9, fontSize: 18, color: C.white, valign: 'middle' })
    })
    const rx = MX + lw + 0.5
    const rw = CW - lw - 0.5
    panel(pres, s, rx, 2.4, rw, 3.9, C.navy2)
    txt(s, 'Ask the class', { x: rx + 0.3, y: 2.6, w: rw - 0.6, h: 0.4, fontSize: 14, bold: true, color: C.amber })
    txt(s, d.ask, { x: rx + 0.3, y: 3.05, w: rw - 0.6, h: 1.7, fontSize: 17, color: C.white })
    txt(s, 'In NeuroScape', { x: rx + 0.3, y: 4.85, w: rw - 0.6, h: 0.4, fontSize: 14, bold: true, color: C.amber })
    txt(s, d.app, { x: rx + 0.3, y: 5.25, w: rw - 0.6, h: 0.95, fontSize: 15, color: 'D5DBF5' })
    const to = pathOf(d.app.split(':')[0])
    if (to && s.addLink) s.addLink({ x: rx + rw - 1.5, y: 4.78, w: 1.25, h: 0.4, to, label: 'Open →' })
  },

  app(pres, s, d) {
    const n = d.stations.length
    const gap = 0.3
    const w = (CW - gap * (n - 1)) / n
    const h = BOTTOM - TOP
    d.stations.forEach((st, i) => {
      const x = MX + i * (w + gap)
      panel(pres, s, x, TOP, w, h, C.tint)
      chip(pres, s, x + 0.3, TOP + 0.3, st.where ?? 'World 5 station', C.navy, C.white, 11)
      const to = pathOf(st.name)
      if (to && s.addLink) s.addLink({ x: x + w - 1.55, y: TOP + 0.27, w: 1.25, h: 0.4, to, label: 'Open →' })
      txt(s, st.name, { x: x + 0.3, y: TOP + 0.75, w: w - 0.6, h: 0.9, fontFace: HEAD, fontSize: n > 3 ? 19 : 22, bold: true, valign: 'middle' })
      txt(s, 'Do', { x: x + 0.3, y: TOP + 1.75, w: w - 0.6, h: 0.3, fontSize: 13, bold: true, color: C.teal })
      txt(s, st.do, { x: x + 0.3, y: TOP + 2.07, w: w - 0.6, h: 1.25, fontSize: n > 3 ? 14 : 15 })
      txt(s, 'Look for', { x: x + 0.3, y: TOP + 3.4, w: w - 0.6, h: 0.3, fontSize: 13, bold: true, color: C.teal })
      txt(s, st.see, { x: x + 0.3, y: TOP + 3.72, w: w - 0.6, h: 1.15, fontSize: n > 3 ? 14 : 15 })
    })
  },

  quiz(pres, s, d) {
    const h = BOTTOM - TOP
    const lw = 5.2
    panel(pres, s, MX, TOP, lw, h, C.navy)
    chip(pres, s, MX + 0.4, TOP + 0.4, d.tag ?? 'Exam-style question', C.amber, C.navy)
    txt(s, d.q, { x: MX + 0.4, y: TOP + 1.0, w: lw - 0.8, h: h - 1.9, fontFace: HEAD, fontSize: 22, color: C.white })
    if (d.marks) txt(s, d.marks, { x: MX + 0.4, y: BOTTOM - 0.7, w: lw - 0.8, h: 0.4, fontSize: 13, color: 'C9D2F2' })
    const rx = MX + lw + 0.4
    const rw = CW - lw - 0.4
    txt(s, d.h ?? 'A full-mark answer covers', { x: rx, y: TOP, w: rw, h: 0.5, fontSize: 19, bold: true })
    d.points.forEach((p, i) => {
      const ph = (h - 0.7) / d.points.length
      const y = TOP + 0.7 + i * ph
      circle(pres, s, rx, y + 0.02, 0.4, i + 1, C.teal)
      txt(s, p, { x: rx + 0.6, y, w: rw - 0.6, h: ph - 0.08, fontSize: 16 })
    })
  },

  leave(pres, s, d) {
    chip(pres, s, MX, 0.6, 'You leave with', C.teal, C.white, 13)
    txt(s, d.title, { x: MX, y: 1.1, w: CW, h: 1.0, fontFace: HEAD, fontSize: 34, bold: true, color: C.white, valign: 'middle' })
    const n = d.points.length
    const gap = 0.3
    const w = (CW - gap * (n - 1)) / n
    d.points.forEach((p, i) => {
      const x = MX + i * (w + gap)
      panel(pres, s, x, 2.4, w, 3.2, C.navy2)
      circle(pres, s, x + 0.3, 2.65, 0.5, i + 1, C.amber, C.navy)
      txt(s, p.h, { x: x + 0.3, y: 3.35, w: w - 0.6, h: 0.75, fontSize: 19, bold: true, color: C.white })
      txt(s, p.b, { x: x + 0.3, y: 4.15, w: w - 0.6, h: 1.3, fontSize: 16, color: 'D5DBF5' })
    })
    txt(s, [{ text: 'Next hour  ', options: { bold: true, color: C.amber } }, { text: d.next, options: { color: C.white } }], { x: MX, y: 5.95, w: CW, h: 0.6, fontSize: 18, valign: 'middle' })
  },
}

const DARK_KINDS = new Set(['title', 'demo', 'leave'])

async function buildDeck(deck, outDir) {
  const pres = new pptxgen()
  pres.layout = 'LAYOUT_WIDE'
  pres.author = 'Subramanya Navada'
  pres.company = 'NeuroScape'
  pres.title = `${deck.code}: ${deck.title}`
  pres.subject = 'Artificial Neural Networks (SETE08), Unit 5'
  pres.theme = { headFontFace: HEAD, bodyFontFace: BODY }

  pres.defineSlideMaster({ title: 'DARK', background: { color: C.navy } })
  const footer = (phase) => {
    const objs = []
    let x = MX
    PHASES.forEach((p, i) => {
      const on = phase === i || phase === 3
      const w = p.length * 0.085 + 0.35
      objs.push({ rect: { x, y: 6.93, w, h: 0.3, fill: { color: on ? C.teal : C.tint }, line: { color: on ? C.teal : C.tint, width: 0 } } })
      objs.push({ text: { text: p, options: { x, y: 6.93, w, h: 0.3, align: 'center', valign: 'middle', fontFace: BODY, fontSize: 10.5, bold: on, color: on ? C.white : C.mute, margin: 0 } } })
      x += w + 0.08
    })
    objs.push({ text: { text: `SETE08 · Unit 5 · ${deck.code}`, options: { x: 8.2, y: 6.93, w: 3.7, h: 0.3, align: 'right', valign: 'middle', fontFace: BODY, fontSize: 10.5, color: C.mute, margin: 0 } } })
    return objs
  }
  ;['PRE', 'TRAIN', 'POST', 'ALL', 'NONE'].forEach((name, i) =>
    pres.defineSlideMaster({
      title: `LIGHT_${name}`,
      background: { color: C.white },
      objects: [
        ...footer(i === 4 ? -1 : i),
        { placeholder: { options: { name: 'title', type: 'title', x: MX, y: 0.42, w: CW, h: 0.95, fontFace: HEAD, fontSize: 30, bold: true, color: C.ink, align: 'left', valign: 'middle', margin: 0 }, text: '' } },
      ],
      slideNumber: { x: 12.1, y: 6.93, w: 0.63, h: 0.3, fontFace: BODY, fontSize: 10.5, color: C.mute, align: 'right' },
    }),
  )
  const layoutOf = { pre: 'LIGHT_PRE', train: 'LIGHT_TRAIN', post: 'LIGHT_POST', all: 'LIGHT_ALL', none: 'LIGHT_NONE' }

  let section = null
  deck.slides.forEach((d, i) => {
    currentSlide = `${deck.code} #${i + 1} ${d.kind}`
    if (i === 0 && !d.section) d.section = 'Lecture'
    if (d.section && d.section !== section) {
      section = d.section
      pres.addSection({ title: section })
    }
    const dark = DARK_KINDS.has(d.kind)
    const s = pres.addSlide({ masterName: dark ? 'DARK' : layoutOf[d.phase ?? deck.phase ?? 'all'], sectionTitle: section ?? undefined })
    if (!dark) {
      if (d.title.length > 54) console.warn(`  ! long title (${currentSlide}): ${d.title}`)
      s.addText(d.title, { placeholder: 'title' })
    }
    if (!kinds[d.kind]) throw new Error(`Unknown slide kind ${d.kind}`)
    kinds[d.kind](pres, s, d, deck)
    if (d.notes) s.addNotes(d.notes)
  })
  const fileName = `${outDir}/${deck.file}`
  await pres.writeFile({ fileName })
  return fileName
}

/* ---------- scene export for the in-app viewer ---------- */

const r3 = (v) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v)

/**
 * Runs the same slide kinds against a recorder instead of PowerPoint, and returns every slide as a
 * list of drawing operations in inches on a 13.333 x 7.5 canvas. The app renders these directly,
 * so the deck seen in the browser and the .pptx come from one source.
 */
function buildScene(deck) {
  const warn = console.warn
  console.warn = () => {}
  const pres = {
    ShapeType: { ellipse: 'ellipse', roundRect: 'roundRect', rect: 'rect', line: 'line', rightArrow: 'rightArrow' },
    charts: { LINE: 'line', BAR: 'bar', SCATTER: 'scatter' },
  }
  const runsOf = (text) =>
    (Array.isArray(text) ? text : [{ text, options: {} }]).map((r) => {
      const o = r.options ?? {}
      const out = { text: r.text }
      if (o.bold) out.bold = true
      if (o.color) out.color = o.color
      if (o.superscript) out.sup = true
      if (o.subscript) out.sub = true
      if (o.bullet) out.bullet = true
      if (o.breakLine) out.br = true
      if (o.paraSpaceAfter) out.gap = o.paraSpaceAfter
      return out
    })
  const textOp = (text, o) => ({
    t: 'text', x: r3(o.x), y: r3(o.y), w: r3(o.w), h: r3(o.h), runs: runsOf(text),
    size: o.fontSize, bold: o.bold || undefined, color: o.color, align: o.align, valign: o.valign,
    head: o.fontFace === HEAD || undefined, gap: o.paraSpaceAfter,
  })
  let section = null
  const slides = deck.slides.map((d, i) => {
    if (i === 0 && !d.section) d.section = 'Lecture'
    if (d.section) section = d.section
    const dark = DARK_KINDS.has(d.kind)
    const ops = []
    const s = {
      addShape: (shape, o) =>
        ops.push({
          t: 'shape', shape, x: r3(o.x), y: r3(o.y), w: r3(o.w), h: r3(o.h),
          fill: o.fill?.color, stroke: o.line?.width ? o.line.color : undefined, sw: o.line?.width || undefined,
          r: o.rectRadius, flip: o.flipV || undefined,
          end: o.line?.endArrowType === 'triangle' || undefined, begin: o.line?.beginArrowType === 'triangle' || undefined,
        }),
      addText: (text, o) => {
        if (!o.placeholder) ops.push(textOp(text, o))
      },
      addTable: (rows, o) =>
        ops.push({
          t: 'table', x: r3(o.x), y: r3(o.y), w: r3(o.w), colW: o.colW.map(r3), rowH: o.rowH,
          rows: rows.map((row) => row.map((c) => ({ text: c.text, bold: c.options.bold || undefined, color: c.options.color, fill: c.options.fill.color, size: c.options.fontSize }))),
        }),
      addChart: (kind, data, o) => {
        const scatter = kind === 'scatter'
        ops.push({
          t: 'chart', kind, x: r3(o.x), y: r3(o.y), w: r3(o.w), h: r3(o.h),
          labels: scatter ? undefined : data[0].labels,
          xs: scatter ? data[0].values.map(r3) : undefined,
          series: (scatter ? data.slice(1) : data).map((q) => ({ name: q.name, values: q.values.map(r3) })),
          colors: o.chartColors, xTitle: o.catAxisTitle, yTitle: o.valAxisTitle,
          every: o.catAxisLabelFrequency, min: o.valAxisMinVal, max: o.valAxisMaxVal,
        })
      },
      addNotes: () => {},
      addLink: (o) => ops.push({ t: 'link', ...o, x: r3(o.x), y: r3(o.y) }),
    }
    if (!dark) {
      const phase = { pre: 0, train: 1, post: 2, all: 3, none: -1 }[d.phase ?? deck.phase ?? 'all']
      let x = MX
      PHASES.forEach((p, k) => {
        const on = phase === k || phase === 3
        const w = p.length * 0.085 + 0.35
        s.addShape('rect', { x, y: 6.93, w, h: 0.3, fill: { color: on ? C.teal : C.tint } })
        s.addText(p, { x, y: 6.93, w, h: 0.3, align: 'center', valign: 'middle', fontSize: 10.5, bold: on, color: on ? C.white : C.mute })
        x += w + 0.08
      })
      s.addText(`SETE08 · Unit 5 · ${deck.code}`, { x: 8.2, y: 6.93, w: 3.7, h: 0.3, align: 'right', valign: 'middle', fontSize: 10.5, color: C.mute })
      s.addText(String(i + 1), { x: 12.1, y: 6.93, w: 0.63, h: 0.3, align: 'right', valign: 'middle', fontSize: 10.5, color: C.mute })
      s.addText(d.title, { x: MX, y: 0.42, w: CW, h: 0.95, fontFace: HEAD, fontSize: 30, bold: true, color: C.ink, align: 'left', valign: 'middle' })
    }
    kinds[d.kind](pres, s, d, deck)
    return { kind: d.kind, dark, title: d.title ?? deck.title, section, notes: d.notes ?? '', ops }
  })
  console.warn = warn
  return { code: deck.code, date: deck.date, title: deck.title, syllabus: deck.syllabus, file: deck.file, slides }
}

/** The five-step design flow used as the map on most decks. `on` is the highlighted step (0-4). */
const designFlow = (on) =>
  [
    { h: 'Prepare the data', b: 'Select it, divide it, scale it, extract features.' },
    { h: 'Choose the network', b: 'Type, layers, neurons, output function.' },
    { h: 'Train', b: 'Starting weights, algorithm, when to stop.' },
    { h: 'Analyse', b: 'Is it good enough? If not, what is wrong?' },
    { h: 'Use and watch', b: 'Deploy, track live error, retrain.' },
  ].map((s, i) => ({ ...s, on: i === on }))

/** The six-step outline every case study follows (and every exam answer about one). */
const caseFlow = (on) =>
  [
    { h: 'Problem', b: 'What goes in, what must come out, which task type.' },
    { h: 'Data', b: 'Where it comes from, how much, how it is divided.' },
    { h: 'Preprocess', b: 'Scaling, features, target coding.' },
    { h: 'Network', b: 'Type, layers, neurons, output function.' },
    { h: 'Train', b: 'Algorithm, error measure, stopping, restarts.' },
    { h: 'Analyse', b: 'The tool for the task, and the verdict.' },
  ].map((s, i) => ({ ...s, on: i === on }))

module.exports = { buildDeck, buildScene, designFlow, caseFlow, C, W, H, MX, CW, TOP, BOTTOM }
