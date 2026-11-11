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
npm run slides     # rebuild the Unit V lecture decks into public/slides
```

## Structure

```
src/
  engine/          NN maths in TypeScript (Hagan notation), no UI dependencies
  engine/tests/    checks against Hagan worked examples
  scenes/hub/      world-selection lobby
  scenes/<world>/  one folder per world (neuron-lab, perceptron, error-valley, competitive, factory)
  components/      shared 3D parts (Label3D)
  ui/              overlay controls; ui/lab is the frame and plots shared by every station
  modes/           explore, quest, challenge, teacher, exam
  data/            world list, station stories and mission steps
  store/           Zustand state
```

## Build progress

| # | Module | Status |
|---|--------|--------|
| 1 | Project setup: Vite, React, TS, R3F, Tailwind, PWA, 3D hub with five portals | Done |
| 2 | NN engine core: transfer functions, neuron, layer, forward pass, tests | Done |
| 3 | Shared lab kit: station frame, mission steps, live 2D plots, 3D labels | Done |
| 4 | Engine training: backpropagation, momentum, Levenberg-Marquardt, SOM, analysis helpers, tests | Done |
| 5 | World 5 (Model Factory): nine hands-on stations for L35 to L42 | Done, needs testing on phones |
| 6 | Quest engine shared by all worlds, Beat the Model challenge | |
| 7 | Worlds 3, 1, 2, 4 | |
| 8–10 | Challenge, Teacher mode, AR, sound, badges, exam prep | |

## World 5: the Model Factory

Open `/#/world/factory`. Each station is built on an everyday example and follows Explore, Break, Fix, Prove. All training runs live in the browser with the engine in `src/engine`.

| Lecture | Station | Everyday example | Unit V topic |
|---------|---------|------------------|--------------|
| L35 | Silk Board Sampler | Minutes to cross Silk Board junction by hour of day | Selection of data, sampling, three-way split |
| L35–36 | Thermistor Bench | Calibrating an Arduino thermistor reading (0 to 1023) | Preprocessing, choice of architecture |
| L37 | Error Valley Race | Will you stay awake in the 8 am class? Three algorithms race on the error surface | Initialisation, training algorithm, stopping |
| L38–39 | UPI Fraud Alarm | Flagging fraudulent payments when only 6% are fraud | Post-training analysis, confusion matrix, ROC |
| L39–40 | Battery Oracle | Predicting when your phone battery dies from a few readings | Overfitting and extrapolation |
| L40 | Chase Predictor | Win probability in the last overs of a T20 chase | Function approximation, probability estimation |
| L41 | Doodle Reader | Teaching a network your own circle, cross and tick | Pattern recognition case study |
| L41 | Colour Map | A self-organising map of the colours in a camera picture | Clustering case study |
| L42 | Finish My Move | Forecasting your finger or phone-tilt rhythm | Prediction case study |

### Lecture plan and slides

The floor's "Lecture plan and slides" button lists the eight Unit V hours (L35 to L42) from `src/data/unit5Plan.ts`: what each teaches, its live classroom element and the stations to open. Each deck opens inside the app at `/#/world/factory/slides/L35` (arrow keys or a click to move, N for speaker notes, F to present), and the "Open" buttons on its slides lead to the stations. A PowerPoint copy of every deck can be downloaded. Each station also links the decks of the lectures it is used in.

The decks live in `public/slides` (a `.pptx` to download and a `.json` the app draws, both from one source) and are generated from `scripts/slides/decks/L35.cjs` to `L42.cjs` with the slide kit in `scripts/slides/lib.cjs`. Edit a deck file and run `npm run slides` (or `npm run slides -- L37` for one deck). Every slide carries speaker notes.

The camera, photo and phone-tilt inputs need HTTPS (or localhost) and the user's permission; every station also works without them.

## Acceptance checks (every module)

- [ ] Maths matches a Hagan worked example (unit test passes)
- [ ] 30 fps or more on a mid-range Android phone and a lab PC (FPS meter shown top right)
- [ ] Every control changes the scene immediately
- [ ] The break-and-fix moment works without instructions from the teacher
- [ ] Works offline after first load
