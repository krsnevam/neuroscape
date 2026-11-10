import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import LabShell from '../../../ui/lab/LabShell'
import { Btn, Group, Seg, Slider, Stat, Stats } from '../../../ui/lab/controls'
import { rng } from '../../../engine'
import { gram, hebb, hebbCrossTalk, norm, pseudoinverseRule, recall } from '../../../engine/associator'
import { num } from './kit'

const SIDE = 6
const R = SIDE * SIDE

/** '#' is an inked pixel (+1), anything else is paper (−1). */
const icon = (rows: string[]) => rows.flatMap((r) => Array.from({ length: SIDE }, (_, j) => (r[j] === '#' ? 1 : -1)))

type PresetId = 'flags' | 'faces'
const presets: Record<PresetId, { names: string[]; icons: number[][] }> = {
  // Four signal flags chosen so that every pair has inner product exactly 0
  flags: {
    names: ['left', 'top', 'corners', 'bars'],
    icons: [
      icon(['###...', '###...', '###...', '###...', '###...', '###...']),
      icon(['######', '######', '######', '......', '......', '......']),
      icon(['...###', '...###', '...###', '###...', '###...', '###...']),
      icon(['#.##.#', '#.##.#', '#.##.#', '#.##.#', '#.##.#', '#.##.#']),
    ],
  },
  // Four emoji faces: the same eyes and mostly the same blank paper, so they overlap a lot
  faces: {
    names: ['smile', 'sad', 'flat', 'shock'],
    icons: [
      icon(['......', '.#..#.', '......', '#....#', '.####.', '......']),
      icon(['......', '.#..#.', '......', '.####.', '#....#', '......']),
      icon(['......', '.#..#.', '......', '......', '.####.', '......']),
      icon(['......', '.#..#.', '......', '..##..', '.#..#.', '..##..']),
    ],
  },
}

type Rule = 'hebb' | 'pinv'
type Damage = 'clean' | 'covered' | 'noisy'

/** +1 amber ink, 0 grey (unknown), −1 dark paper. Values outside ±1 are clipped for drawing. */
function shade(v: number): string {
  const c = Math.max(-1, Math.min(1, v))
  const mid = [51, 65, 85]
  const end = c >= 0 ? [251, 191, 36] : [2, 6, 23]
  const k = Math.abs(c)
  return `rgb(${mid.map((m, i) => Math.round(m + (end[i] - m) * k)).join(',')})`
}

function Grid({ v, onCell, className = 'w-16 sm:w-20', label }: { v: number[]; onCell?: (i: number) => void; className?: string; label: string }) {
  return (
    <div role={onCell ? 'group' : 'img'} aria-label={label} className={`grid shrink-0 gap-px rounded bg-slate-950 p-px ${className}`} style={{ gridTemplateColumns: `repeat(${SIDE}, 1fr)` }}>
      {v.map((x, i) =>
        onCell ? (
          <button
            key={i}
            type="button"
            aria-label={`pixel ${i + 1}, ${x > 0 ? 'ink' : 'paper'}`}
            onClick={() => onCell(i)}
            className="aspect-square transition-colors duration-300"
            style={{ background: shade(x) }}
          />
        ) : (
          <div key={i} className="aspect-square transition-colors duration-500" style={{ background: shade(x) }} />
        ),
      )}
    </div>
  )
}

function Panel({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {children}
      <div className="text-center font-mono text-[10px] leading-tight text-slate-200">{title}</div>
      {sub && <div className="max-w-24 text-center text-[10px] leading-tight text-slate-500">{sub}</div>}
    </div>
  )
}

const Sym = ({ children }: { children: ReactNode }) => (
  <div className="self-center pb-8 font-mono text-sm text-slate-400">{children}</div>
)

export default function MemoryWallLab() {
  const [preset, setPreset] = useState<PresetId>('flags')
  const [icons, setIcons] = useState(presets.flags.icons)
  const [Q, setQ] = useState(3)
  const [rule, setRule] = useState<Rule>('hebb')
  const [k, setK] = useState(0)
  const [damage, setDamage] = useState<Damage>('covered')
  const [shake, setShake] = useState(1)
  const wall = useRef<HTMLCanvasElement>(null)
  const names = presets[preset].names
  const kk = Math.min(k, Q - 1)

  const m = useMemo(() => {
    const T = icons.slice(0, Q)
    // Inputs are scaled to length 1 (each pixel is ±1/6), targets stay ±1
    const P = T.map((v) => v.map((x) => x / SIDE))
    const Wp = pseudoinverseRule(P, T)
    const dependent = rule === 'pinv' && !Wp
    const W = rule === 'pinv' && Wp ? Wp : hebb(P, T)
    let shown = T[kk].slice()
    if (damage === 'covered') shown = shown.map((x, i) => (i >= R / 2 ? 0 : x))
    if (damage === 'noisy') {
      const rand = rng(shake * 13 + kk)
      const flip = new Set<number>()
      while (flip.size < 5) flip.add(Math.floor(rand() * R))
      shown = shown.map((x, i) => (flip.has(i) ? -x : x))
    }
    const probe = shown.map((x) => x / SIDE)
    const a = recall(W, probe)
    const t = T[kk]
    const usingHebb = rule === 'hebb' || dependent
    const parts = hebbCrossTalk(P, T, kk, probe)
    const wanted = usingHebb ? parts.wanted : t
    const rest = usingHebb ? parts.crossTalk : a.map((x, i) => x - t[i])
    const G = gram(P)
    let worst = 0
    let worstPair: [number, number] = [0, 1]
    G.forEach((row, i) =>
      row.forEach((g, j) => {
        if (i < j && Math.abs(g) > Math.abs(worst)) {
          worst = g
          worstPair = [i, j]
        }
      }),
    )
    return {
      W,
      shown,
      a,
      t,
      wanted,
      rest,
      G,
      worst,
      worstPair,
      dependent,
      usingHebb,
      strength: P[kk].reduce((s, x, i) => s + x * probe[i], 0),
      err: norm(a.map((x, i) => x - t[i])),
      restLen: norm(rest),
      wrongSign: a.filter((x, i) => (x > 0 ? 1 : -1) !== t[i] || x === 0).length,
      snapped: a.map((x) => (x >= 0 ? 1 : -1)),
    }
  }, [icons, Q, rule, kk, damage, shake])

  // The wall itself: every one of the 36 × 36 weights as one small brick
  useEffect(() => {
    const c = wall.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const s = c.width / R
    let peak = 0
    for (const row of m.W) for (const x of row) peak = Math.max(peak, Math.abs(x))
    for (let i = 0; i < R; i++)
      for (let j = 0; j < R; j++) {
        ctx.fillStyle = shade(peak ? m.W[i][j] / peak : 0)
        ctx.fillRect(j * s, i * s, s, s)
      }
  }, [m.W])

  const flipPixel = (q: number, i: number) => setIcons((old) => old.map((v, n) => (n === q ? v.map((x, j) => (j === i ? -x : x)) : v)))
  const load = (id: PresetId) => {
    setPreset(id)
    setIcons(presets[id].icons)
  }

  const exact = m.err < 1e-6
  const hebbOps = Q * R * R
  const invOps = Q * Q * Q
  const damageWords = damage === 'covered' ? 'with its lower half covered' : damage === 'noisy' ? 'with 5 pixels flipped' : 'undamaged'

  return (
    <LabShell
      labId="memory-wall"
      actions={{
        break: {
          label: 'Store the four faces with the Hebb rule',
          run: () => {
            load('faces')
            setQ(4)
            setRule('hebb')
            setDamage('clean')
            setK(0)
          },
        },
        fix: { label: 'Switch to the pseudoinverse rule', run: () => setRule('pinv') },
      }}
      happening={
        <>
          <p>
            The wall stores {Q} icons in one matrix W of {R} × {R} = {R * R} weights, using{' '}
            {m.usingHebb ? 'the Hebb rule W = T Pᵀ' : 'the pseudoinverse rule W = T P⁺'}. It is being shown "{names[kk]}" {damageWords} and answers a = Wp.
          </p>
          <p>
            {m.usingHebb
              ? Math.abs(m.worst) < 0.005
                ? `Every pair of stored inputs has inner product 0, so there is no cross-talk. The answer is ${num(m.strength)} × the true icon${damage === 'clean' ? ', which is exact' : '; the sign of every pixel is still right, so hardlims restores the whole picture'}.`
                : `The inputs overlap: "${names[m.worstPair[0]]}" and "${names[m.worstPair[1]]}" have inner product ${num(m.worst)}. So the answer is ${num(m.strength)} × the true icon plus a share of every other icon. That cross-talk has length ${m.restLen.toFixed(2)} and ${m.wrongSign} of ${R} pixels come out with the wrong sign.`
              : exact
                ? `P⁺ cancels the overlaps (the largest is ${num(m.worst)}), so a equals the target exactly: error 0.00. This works because the ${Q} patterns are linearly independent.`
                : `For the stored icons themselves this rule is exact. This probe is damaged, so it is not one of them: the error has length ${m.err.toFixed(2)} and ${m.wrongSign} of ${R} pixels have the wrong sign.`}
          </p>
          {m.dependent && <p className="text-amber-200">Two stored icons are the same or dependent, so PᵀP has no inverse. The wall is using the Hebb rule until you change a pixel.</p>}
        </>
      }
      panel={
        <>
          <Group title="What is on the wall">
            <Seg
              label="Icon set"
              value={preset}
              onChange={load}
              options={[
                { value: 'flags', label: 'Signal flags (orthogonal)' },
                { value: 'faces', label: 'Emoji faces (alike)' },
              ]}
            />
            <Slider label="Icons stored, Q" value={Q} min={2} max={4} onChange={setQ} />
            <Seg
              label="Storage rule"
              value={rule}
              onChange={setRule}
              options={[
                { value: 'hebb', label: 'Hebb: W = T Pᵀ' },
                { value: 'pinv', label: 'Pseudoinverse: W = T P⁺' },
              ]}
            />
          </Group>
          <Group title="What the wall is shown">
            <Seg label="Icon to recall" value={String(kk)} onChange={(v) => setK(Number(v))} options={names.slice(0, Q).map((n, i) => ({ value: String(i), label: n }))} />
            <Seg
              label="Damage"
              value={damage}
              onChange={setDamage}
              options={[
                { value: 'clean', label: 'None' },
                { value: 'covered', label: 'Lower half covered' },
                { value: 'noisy', label: '5 pixels flipped' },
              ]}
            />
            {damage === 'noisy' && <Btn onClick={() => setShake((s) => s + 1)}>Flip 5 different pixels</Btn>}
          </Group>
          <Group title="Recall quality">
            <Stats>
              <Stat label="Error ‖t − a‖" value={m.err.toFixed(2)} tone={exact ? 'good' : m.wrongSign ? 'bad' : 'warn'} />
              <Stat label="Wrong-sign pixels" value={`${m.wrongSign} / ${R}`} tone={m.wrongSign ? 'bad' : 'good'} />
              <Stat label="Largest overlap" value={num(m.worst)} tone={Math.abs(m.worst) < 0.005 ? 'good' : 'warn'} />
              <Stat label="Weights in W" value={R * R} />
              <Stat label="Hebb: multiplications" value={hebbOps} />
              <Stat label="P⁺: extra inverse" value={`${Q}×${Q}, about ${invOps} steps`} />
            </Stats>
            <p className="text-[11px] leading-snug text-slate-500">
              Storing with Hebb takes Q × S × R = {Q} × {R} × {R} multiplications. The pseudoinverse also needs the {Q} × {Q} table of inner products and its inverse.
            </p>
          </Group>
        </>
      }
    >
      <div className="flex h-full flex-col gap-2.5 overflow-y-auto p-3">
        <section className="rounded-lg border border-white/10 bg-white/5 p-2.5">
          <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
            1. Stored icons (tap pixels to redraw, tap a name to recall it)
          </h2>
          <div className="flex flex-wrap items-start gap-3">
            {icons.slice(0, Q).map((v, q) => (
              <div key={q} className={`flex flex-col items-center gap-1 rounded-md p-1 ${q === kk ? 'bg-fuchsia-400/15 ring-1 ring-fuchsia-300/60' : ''}`}>
                <Grid v={v} onCell={(i) => flipPixel(q, i)} label={`stored icon ${names[q]}`} />
                <button type="button" onClick={() => setK(q)} className="rounded px-1.5 py-0.5 font-mono text-[11px] text-slate-200 hover:bg-white/10">
                  p{'₁₂₃₄'[q]} {names[q]}
                </button>
              </div>
            ))}
            <div className="ml-auto flex flex-col items-center gap-1">
              <canvas ref={wall} width={108} height={108} className="h-20 w-20 rounded sm:h-24 sm:w-24" style={{ imageRendering: 'pixelated' }} aria-label="weight matrix W" />
              <div className="text-center font-mono text-[10px] leading-tight text-slate-300">
                the wall W<br />
                <span className="text-slate-500">{R} × {R} weights</span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/5 p-2.5">
          <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">2. Recall: a = Wp</h2>
          <div className="flex flex-wrap items-start gap-x-2 gap-y-3">
            <Panel title="p shown" sub={damage === 'covered' ? 'grey = covered (0)' : damage === 'noisy' ? '5 pixels flipped' : 'undamaged'}>
              <Grid v={m.shown} label="probe pattern" />
            </Panel>
            <Sym><span className="animate-pulse text-fuchsia-300">→ W →</span></Sym>
            <Panel title="a = Wp" sub={`error ${m.err.toFixed(2)}`}>
              <Grid v={m.a} label="recalled pattern" />
            </Panel>
            <Sym>=</Sym>
            <Panel title={m.usingHebb ? `${num(m.strength)} × t` : 'target t'} sub="the wanted part">
              <Grid v={m.wanted} label="wanted part" />
            </Panel>
            <Sym>+</Sym>
            <Panel title={m.usingHebb ? 'cross-talk' : 'error a − t'} sub={m.usingHebb ? `Σ t_q (p_qᵀp), length ${m.restLen.toFixed(2)}` : `length ${m.restLen.toFixed(2)}`}>
              <Grid v={m.rest} label="cross-talk or error" />
            </Panel>
            <Sym>⇒</Sym>
            <Panel title="hardlims(a)" sub={m.wrongSign ? `${m.wrongSign} pixels wrong` : 'matches the stored icon'}>
              <div className={`rounded ring-2 ${m.wrongSign ? 'ring-rose-400/80' : 'ring-emerald-400/80'}`}>
                <Grid v={m.snapped} label="recall after hardlims" />
              </div>
            </Panel>
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/5 p-2.5">
          <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
            3. Performance analysis: inner products p_qᵀ p_k
          </h2>
          <div className="flex flex-wrap items-center gap-4">
            <table className="border-separate border-spacing-1 font-mono text-[11px]">
              <thead>
                <tr>
                  <th />
                  {names.slice(0, Q).map((n) => (
                    <th key={n} className="px-1 font-normal text-slate-400">{n}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {m.G.map((row, i) => (
                  <tr key={i}>
                    <th className="pr-1 text-right font-normal text-slate-400">{names[i]}</th>
                    {row.map((g, j) => {
                      const zero = Math.abs(g) < 0.005
                      return (
                        <td
                          key={j}
                          className={`rounded px-2 py-1 text-center tabular-nums transition-colors duration-500 ${
                            i === j ? 'bg-sky-400/15 text-sky-200' : zero ? 'bg-emerald-400/15 text-emerald-200' : 'text-rose-100'
                          } ${i === kk || j === kk ? 'ring-1 ring-fuchsia-300/50' : ''}`}
                          style={i !== j && !zero ? { background: `rgba(244,63,94,${0.12 + 0.45 * Math.min(1, Math.abs(g))})` } : undefined}
                        >
                          {num(g)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="flex min-w-40 flex-1 flex-col gap-1 text-[11px] leading-snug text-slate-300">
              <li><b className="text-sky-300">Blue diagonal</b>: each input with itself. 1.00 means length 1.</li>
              <li><b className="text-emerald-300">Green 0.00</b>: the pair is orthogonal and adds no cross-talk.</li>
              <li><b className="text-rose-300">Red</b>: the pair overlaps. With Hebb, that fraction of the other icon leaks into the answer.</li>
              <li>Pixel colours: <span className="text-amber-300">amber +1</span>, grey 0, dark −1.</li>
            </ul>
          </div>
        </section>
      </div>
    </LabShell>
  )
}
