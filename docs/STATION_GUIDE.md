# How to build a station

A world is a floor of stations. A station is one hands-on scene built on an everyday example. This guide is the contract every station follows, so the app feels like one thing.

## What a station must do

1. **Start alive.** The first view already shows data and a network doing something. No empty screens.
2. **Use an everyday example** the class already has an opinion about (traffic, cricket, phone battery, canteen, exams, music, UPI, mangoes). Not the textbook's example. The maths underneath is still exactly Hagan's.
3. **Be hands-on.** The student drags, taps, draws or records. Every control changes the scene immediately.
4. **Compute everything live** with the engine in `src/engine`. Nothing is a pre-recorded animation.
5. **Follow Explore, Break, Fix, Prove.** Break is a failure the student causes; Fix repairs it with the syllabus concept; Prove is an exam-style question with a model answer. Give the Break and Fix steps a one-tap `actions` button.
6. **Tell the learner what is happening.** Pass `happening` to `LabShell`: one to three short sentences, recomputed every render from live state, with real numbers. Say what the network is doing now and why the picture looks like this. Example: "Neuron 3 won because its weights are closest to this point (distance 0.21). Only the winner moves, by α = 0.3 of the gap."
7. **Define its words.** Each station lists `words` (4 to 7 terms a first-time learner needs, one plain sentence each) and an `equation` in Hagan notation (p, W, b, n, a, t, e, α).
8. **Teach the theory.** Each station has a `theory` entry (type `LabTheory` in `src/data/labs.ts`): the idea in two to four plain sentences, how it works in three to five steps, three real situations where it is used today (where, plus a concrete example such as "Bank fraud screening: scoring each card payment in milliseconds"), and where it fails.
9. **State the complexity.** Each station has a `complexity` entry (type `LabComplexity`): the parameter-count formula with the number for this station, the work for one prediction, the work for a training step and a full run, the memory needed, and what happens as inputs, neurons or data grow. Use real counts ("64 × 10 + 10 × 3 = 670 multiplications") next to the order of growth ("grows with inputs × hidden neurons"). Where a station has a size control, also show the live count in the `happening` text or a `Stat`.
10. **Label the picture.** Axes, legends, units, and what each colour means, on the scene itself.

## Files

For a world with id `<world>` (see `src/data/worlds.ts`):

- `src/data/<world>Labs.ts`: the `Lab[]` list (type in `src/data/labs.ts`): id, lecture tag (use the unit, e.g. `Unit II`), title, story, topics, color, steps, words, equation.
- `src/scenes/<world>/labs/<Name>Lab.tsx`: one default-exported component per station.
- `src/scenes/<world>/index.ts`: `scenes` map from station id to `lazy(() => import('./labs/<Name>Lab'))`.
- New maths goes in a new file under `src/engine/` with a test in `src/engine/tests/` that checks it against a Hagan worked example or a hand calculation. Import it by file path (for example `from '../../../engine/hopfield'`).

Routing, the world floor and the hub pick the stations up from those files automatically.

## The kit

- `src/ui/lab/LabShell.tsx`: the frame. Props: `labId`, `children` (the scene), `panel` (controls), `actions`, `happening`.
- `src/ui/lab/controls.tsx`: `Group`, `Slider`, `Toggle`, `Seg`, `Btn`, `Stat`, `Stats`.
- `src/ui/lab/Canvas2D.tsx`: `Canvas2D` (calls `draw(ctx, w, h, t, dt)` every frame), `useTicker` (re-render readouts from refs), `makePlot`, `drawAxes`, `drawCurve`, `dot`.
- `src/components/Label3D.tsx`: text inside a 3D scene.
- Engine (`src/engine`): `createNetwork`, `forward`, `output`, `activations`, `gradient`, `createTrainer` (steepest descent and momentum), `lmStep`, `lossOn`, `paramCount`, `cloneNetwork`, transfer functions, `createSom`, `somStep`, `fitMinMax`, `normalize`, `confusion`, `rates`, `roc`, `autocorr`, `rng` (seeded), `gauss`, `shuffle`.

Read two finished stations before writing one: `src/scenes/factory/labs/TrafficLab.tsx` (2D) and `src/scenes/factory/labs/ValleyLab.tsx` (3D).

## Patterns that work

- Keep the simulation in a `useMemo` object or a ref; step it inside the `draw` callback (or `useFrame`); call `useTicker(250)` so the panel readouts follow.
- Use seeded data (`rng(seed)`) so a classroom demo is repeatable.
- 2D canvas for charts, React Three Fiber for anything that is really a surface, a cloud or a sheet.

## Rules learned the hard way

- **No `Html` from drei.** Its first label does not render with this React version. Use `Label3D`.
- **No `shadowBlur` on 2D canvases.** It is very slow on phones. `drawCurve` has a `glow` option that is cheap.
- **Budget each frame.** Aim for under 4 ms of script per frame on a laptop; phones are several times slower. Use mini-batches or step every few frames.
- Clamp anything that can diverge before drawing it, and say so on screen ("left the map") instead of drawing garbage.
- Camera, microphone and motion sensors need HTTPS and permission. Always provide a built-in sample so the station works without them.
- Works at 400 px wide. The scene gets about half the screen on a phone.
- Dark theme, Tailwind classes, the colours already used in the kit. Plain words in all copy: short sentences, no jargon without a definition, no exclamation marks.
- TypeScript strict; `npm run typecheck`, `npm test` and `npm run build` must pass.
