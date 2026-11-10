# NeuroScape

A browser-based 3D app where students walk inside neural networks, change them by hand, and watch them learn, fail and recover in real time. It follows the SETE08 syllabus and the notation in Hagan's *Neural Network Design* (p, W, b, n, a). Every number on screen is computed live.

## Run

```bash
npm install
npm run dev        # dev server
npm test           # engine maths checked against Hagan worked examples
npm run typecheck
npm run build      # production build + PWA service worker (works offline)
npm run preview    # serve the build
```

## Structure

```
src/
  engine/          NN maths in TypeScript (Hagan notation), no UI dependencies
  engine/tests/    checks against Hagan worked examples
  scenes/hub/      world-selection lobby
  scenes/<world>/  one folder per world (neuron-lab, perceptron, error-valley, competitive, factory)
  components/      shared 3D parts
  ui/              overlay controls, equation view, charts
  modes/           explore, quest, challenge, teacher, exam
  data/            world list, datasets, quest scripts, exam questions
  store/           Zustand state
```

## Build progress

| # | Module | Status |
|---|--------|--------|
| 1 | Project setup: Vite, React, TS, R3F, Tailwind, PWA, 3D hub with five portals | Done |
| 2 | NN engine core: transfer functions, neuron, layer, forward pass, tests | Done |
| 3 | Shared 3D components: NeuronMesh, weighted connections, DataCloud, Surface3D | Next |
| 4 | Control panel and equation view | |
| 5 | World 5, L35–L37: data station, architecture playground, training station | |
| 6 | World 5, L38–L42: analysis room, overfitting, case studies, Beat the Model | |
| 7 | Quest engine (Explore, Play, Break, Fix, Prove) | |
| 8 | Worlds 3, 1, 2, 4 | |
| 9–11 | Challenge, Teacher mode, AR, sound, badges, exam prep | |

## Acceptance checks (every module)

- [ ] Maths matches a Hagan worked example (unit test passes)
- [ ] 30 fps or more on a mid-range Android phone and a lab PC (FPS meter shown top right)
- [ ] Every control changes the scene immediately
- [ ] The break-and-fix moment works without instructions from the teacher
- [ ] Works offline after first load
