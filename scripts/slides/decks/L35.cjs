/** L35: Pre-training steps. Hagan Ch. 22 (Pre-Training Steps). */
const tansig = (n) => Math.tanh(n)
const xs = Array.from({ length: 49 }, (_, i) => -6 + i * 0.25)

// hour-of-day x distance coverage: 1 = has training orders, 0 = none
const coverage = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 1, 0, 0, 0, 0],
  [0, 1, 1, 1, 1, 0, 0, 0],
  [0, 1, 1, 1, 1, 0, 0, 0],
]

module.exports = {
  code: 'L35',
  date: 'Thu 26 Nov 2026',
  file: 'L35-data-and-preprocessing.pptx',
  title: 'Before training: choosing and preparing data',
  syllabus: 'Pre-training steps · Selection of data · Data preprocessing',
  phase: 'pre',
  slides: [
    { kind: 'title', section: 'Opening', notes: 'Unit 5 is about using networks on real problems. Today: everything that happens before the first weight is trained.' },
    {
      kind: 'flow', phase: 'all', title: 'The map for the whole unit: the design flow',
      steps: [
        { h: 'Prepare the data', b: 'Select it, divide it, scale it, extract features.', on: true },
        { h: 'Choose the network', b: 'Type, layers, neurons, output function.' },
        { h: 'Train', b: 'Starting weights, algorithm, when to stop.' },
        { h: 'Analyse', b: 'Is it good enough? If not, what is wrong?' },
        { h: 'Use and watch', b: 'Deploy, track live error, retrain.' },
      ],
      note: 'It is a loop, not a line: analysis usually sends you back to the data.',
      notes: 'Draw this on the board and keep it there for all eight hours. Every lecture is one box. Stress the arrow back from Analyse to Data.',
    },
    {
      kind: 'cards', section: 'Selection of data', title: 'Why data decisions come before network decisions',
      cards: [
        { h: 'A network knows only what it saw', b: 'A delivery-time model trained on lunch orders near the kitchen has never seen an 8 pm order across the city. It will still answer, and it will be wrong.' },
        { h: 'No algorithm repairs missing data', b: 'More neurons, a better optimiser or longer training cannot add information that was never collected.' },
        { h: 'This is where the hours go', b: 'In industry projects most of the effort is collecting, cleaning and checking data. Training itself is often minutes.' },
      ],
      note: 'A network interpolates between its examples. It does not know what lies outside them.',
      notes: 'Ask: if your model has never seen rain, what does it say on a rainy day? It says something confident. That is the danger.',
    },
    {
      kind: 'diagram', title: 'Selection of data: cover the whole input space',
      draw: ({ pres, slide, box, C, txt, drawGrid }) => {
        txt(slide, 'Delivery orders in the training set', { x: box.x, y: box.y, w: box.w, h: 0.35, fontSize: 14, bold: true })
        drawGrid(pres, slide, { x: box.x + 0.9, y: box.y + 0.55, w: box.w - 1.0, h: box.h - 1.3 },
          coverage.map((r) => r.map((v) => ({ v, fill: v ? C.teal : C.roseSoft, label: v ? '' : '?', color: C.rose }))), { fontSize: 16 })
        txt(slide, 'Far', { x: box.x, y: box.y + 0.75, w: 0.8, h: 0.3, fontSize: 12, color: C.mute })
        txt(slide, 'Near', { x: box.x, y: box.y + box.h - 1.2, w: 0.8, h: 0.3, fontSize: 12, color: C.mute })
        txt(slide, '6 am  →  hour of the day  →  midnight', { x: box.x + 0.9, y: box.y + box.h - 0.6, w: box.w - 1.0, h: 0.3, fontSize: 12, color: C.mute, align: 'center' })
        txt(slide, 'Teal: situations with training orders.  Pink: no data, the model guesses.', { x: box.x, y: box.y + box.h - 0.28, w: box.w, h: 0.3, fontSize: 12, color: C.mute })
      },
      h: 'The data must span every situation the network will meet',
      lines: [
        'List the inputs and the range each one takes in real use.',
        'Check every combination that matters, not each input alone.',
        'A random sample of real use is the safest way to get coverage.',
        'Empty regions cannot be seen in the error figures: the test set is blind in the same places.',
      ],
      notes: 'Each input alone can look covered (all hours, all distances) while the far-and-late corner is empty. Coverage is about combinations.',
    },
    {
      kind: 'cards', title: 'How much data is enough?',
      cards: [
        { h: 'It depends on the function', b: 'A smooth relationship needs few points. One with many bends (rush hours, weekends, rain) needs many. Noisy measurements need more again.' },
        { h: 'Compare with the weights', b: 'A 2-8-1 network has 33 weights and biases. With 40 examples it can memorise them. Aim for several examples for every weight.' },
        { h: 'You find out afterwards', b: 'There is no formula in advance. Post-training analysis tells you: if training error is low and test error is high, you needed more data or a smaller network.' },
      ],
      note: 'Start with what you have, train, analyse, then decide whether to collect more.',
      notes: 'Hagan is explicit: the amount of data needed cannot be known before training. This links forward to L38 to L40.',
    },
    {
      kind: 'diagram', title: 'Divide the data three ways',
      draw: ({ pres, slide, box, C, txt, panel }) => {
        const parts = [
          { f: 0.7, label: 'Training 70%', sub: 'Computes the gradient and updates the weights', fill: C.teal },
          { f: 0.15, label: 'Validation 15%', sub: 'Decides when to stop and which network to keep', fill: C.amber },
          { f: 0.15, label: 'Test 15%', sub: 'Never used in training. The honest final estimate', fill: C.rose },
        ]
        let x = box.x
        for (const p of parts) {
          const w = box.w * p.f
          panel(pres, slide, x, box.y + 0.2, w - 0.06, 1.1, p.fill, 0.06)
          x += w
        }
        parts.forEach((p, i) => {
          const y = box.y + 1.75 + i * 0.85
          panel(pres, slide, box.x, y + 0.05, 0.3, 0.3, p.fill, 0.05)
          txt(slide, p.label, { x: box.x + 0.5, y, w: 2.1, h: 0.4, fontSize: 15, bold: true, valign: 'middle' })
          txt(slide, p.sub, { x: box.x + 2.6, y, w: box.w - 2.6, h: 0.6, fontSize: 14, valign: 'middle' })
        })
      },
      h: 'Each set answers a different question',
      lines: [
        '70 / 15 / 15 is a common starting split, not a law.',
        'Divide at random so all three sets cover the same situations.',
        'If the test set influenced any decision, it is no longer a test.',
        'For time series, divide in blocks of time, not at random.',
      ],
      notes: 'Analogy: training set is the textbook exercises, validation is the model paper you use to decide when you are ready, test is the SEE itself.',
    },
    {
      kind: 'formula', section: 'Data preprocessing', title: 'Normalisation: put every input on the same scale',
      tag: 'Two standard methods',
      eq: ['p^{n} = 2 (p − p^{min}) / (p^{max} − p^{min}) − 1', 'p^{n} = (p − p^{mean}) / p^{std}'],
      eqSize: 22,
      caption: 'First: min-max, maps each input to [−1, 1]. Second: mean and standard deviation, gives mean 0 and spread 1.',
      h: 'Rules that prevent mistakes',
      lines: [
        'Compute min, max, mean and std from the training set only.',
        'Store them. The same numbers must be applied to every new input after launch.',
        'Normalise the targets too, then convert the output back to real units.',
        'Mean and std is safer when a few extreme values would stretch min-max.',
      ],
      notes: 'Work one example on the board: distance from 200 m to 12,000 m, a 6,100 m order maps to 0. Then ask what an input of 15,000 m becomes: beyond +1, a sign of extrapolation.',
    },
    {
      kind: 'chart', title: 'Why scale? A sigmoid only responds near zero',
      type: 'line', labels: xs.map((x) => x.toFixed(1)), labelEvery: 8,
      series: [{ name: 'a = tansig(n)', values: xs.map(tansig) }],
      xTitle: 'Net input n', yTitle: 'Output a',
      h: 'Outside about −2 to 2 the neuron is flat',
      lines: [
        'Distance in metres gives n in the thousands: every neuron sits pinned at +1.',
        'A pinned neuron has almost zero slope, so the gradient is almost zero and learning stalls.',
        'Large-valued inputs also dominate small ones (metres against hours).',
        'Scaling changes nothing in the network. It changes what the network can learn.',
      ],
      notes: 'This is the same saturation argument used later for weight initialisation in L37. Plant it now.',
    },
    {
      kind: 'cards', title: 'Beyond scaling: give the network better inputs',
      cards: [
        { h: 'Nonlinear transforms', b: 'Use what you know. Take the log of income or price. Code the hour as sine and cosine so that 11 pm and 1 am sit close together.' },
        { h: 'Feature extraction', b: 'Replace raw signals with a few meaningful numbers: from an ECG trace, the intervals and peak heights; from a vibration signal, the energy in each frequency band.' },
        { h: 'Principal component analysis', b: 'When inputs are many and correlated, rotate to uncorrelated components and keep those that carry most of the variance. Fewer inputs, fewer weights.' },
      ],
      note: 'Every input removed means fewer weights to learn from the same data.',
      notes: 'PCA: keep components that together explain, say, 98% of the variance. Caution: PCA is linear and ignores the targets, so check the result still predicts well.',
    },
    {
      kind: 'table', title: 'Coding the targets',
      head: ['Situation', 'How to code the target', 'Why'],
      widths: [3.0, 4.4, 4.73],
      rows: [
        ['Fitting (a number)', 'The value itself, normalised like the inputs', 'Linear output neuron can produce any value'],
        ['Two classes', 'One output: 1 or 0 (or two outputs)', 'Reads as the probability of class 1'],
        ['N classes', 'One-of-N: N outputs, 1 for the right class, 0 elsewhere', 'No false ordering between classes; pairs with softmax'],
        ['Classes with tansig output', 'Use ±0.76 instead of ±1', 'Targets of ±1 push the neuron into saturation'],
      ],
      rowH: 0.72,
      note: 'Do not code classes as 1, 2, 3 on one neuron: that tells the network class 2 lies between 1 and 3.',
      notes: 'One-of-N is also called one-hot. The ±0.76 advice is from Hagan: it is where the tansig second derivative is largest.',
    },
    {
      kind: 'cards', title: 'Missing data',
      cards: [
        { h: 'Plenty of data', b: 'Drop the incomplete records. Check first that they are not all from one situation, or you create a blind spot.' },
        { h: 'Missing input value', b: 'Replace it with the mean of that input, and add an extra 0 / 1 input that flags "this value was missing".' },
        { h: 'Missing target value', b: 'Keep the record, but leave that output out of the error so it does not pull the weights.' },
      ],
      note: 'Also remove records that are plainly wrong: a delivery that "took" 9 hours because nobody tapped Delivered.',
      notes: 'The flag input lets the network learn that a missing value is itself informative, for example a sensor that drops out when it overheats.',
    },
    {
      kind: 'demo', section: 'Live', tag: 'Break and fix', title: 'A classifier that fails in front of the class',
      steps: [
        'In Teachable Machine, train "pen" against "phone" using only one student, one background, one angle.',
        'Hand the camera to another row. Watch it fail on a different hand and background.',
        'Add varied examples from across the room. Retrain. It now works.',
      ],
      ask: 'We did not change the network or the training. What did we change, and which step of the design flow was it?',
      app: 'Silk Board Sampler: press Break to sample only one time of day, then Fix.',
      notes: 'Keep the failure on screen for a moment before fixing. The lesson is that the fix was a data fix.',
    },
    {
      kind: 'app', section: 'Practice', title: 'Try it in NeuroScape',
      stations: [
        { name: 'The Delivery Promise', where: 'World 5 mission', do: 'Play stages 1 and 2 (Collect, Prepare). Choose lunch-only data, then whole-day data.', see: 'Red squares on the coverage map, and how they return as late orders at the end.' },
        { name: 'Silk Board Sampler', do: 'Sample traffic at one hour only, train, then test on the whole day.', see: 'Test error looks fine while live error is poor: the test set shares the blind spot.' },
        { name: 'Thermistor Bench', do: 'Switch normalisation off and train. Switch it on and train again.', see: 'With raw values the fit stays flat; with scaled inputs it follows the curve.' },
      ],
      notes: 'These can be set as a ten-minute homework before L36.',
    },
    {
      kind: 'quiz', title: 'Check your understanding',
      q: 'Explain the pre-training steps in neural network design. Why is the data divided into three sets?',
      marks: 'Typical 8 to 10 mark question',
      points: [
        'Selection of data: span the input space; enough data for the complexity of the function.',
        'Division into training, validation and test sets (about 70/15/15) and the role of each.',
        'Normalisation: both formulas, and why sigmoids need it.',
        'Nonlinear transforms, feature extraction and PCA, each with one example.',
        'Coding of targets (one-of-N) and handling of missing data.',
      ],
      notes: 'Give students two minutes to list the points before revealing the right side.',
    },
    {
      kind: 'leave', title: 'Data decisions come first',
      points: [
        { h: 'Cover the input space', b: 'A network cannot be trusted where it has no examples.' },
        { h: 'Three sets, three jobs', b: 'Train to learn, validate to stop, test to judge.' },
        { h: 'Scale and simplify inputs', b: 'Normalise, transform, extract features, reduce with PCA.' },
        { h: 'Code targets with care', b: 'One-of-N for classes; decide what to do with gaps.' },
      ],
      next: 'L36: which network for which problem, and how big.',
      notes: 'Close by pointing at box 2 of the design flow.',
    },
  ],
}
