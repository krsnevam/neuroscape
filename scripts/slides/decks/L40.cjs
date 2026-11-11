/**
 * L40: Overfitting and extrapolation; case studies 1 and 2.
 * Hagan Ch. 22 (overfitting, extrapolation), Ch. 23 (function approximation), Ch. 24 (probability estimation).
 * Case-study rows give the outline of each chapter; take exact figures from the textbook.
 */
const { caseFlow } = require('../lib.cjs')

const xs = Array.from({ length: 41 }, (_, i) => i / 40)
const truth = (x) => 300 * (1 - x) ** 1.4 + 20
const over = (x) => truth(x) + 38 * Math.sin(21 * x + 0.6) * (0.4 + 0.6 * Math.sin(5 * x) ** 2)
const months = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']
const actual = [30, 29, 26, 20, 15, 14, 17, 23]
const model = [30.2, 28.7, 26.1, 20.2, 12.5, 5.5, 0.5, -2.5]

module.exports = {
  code: 'L40',
  date: 'Thu 10 Dec 2026',
  file: 'L40-overfitting-and-case-studies-1-2.pptx',
  title: 'Overfitting, extrapolation and two case studies',
  syllabus: 'Overfitting and extrapolation · Function approximation · Probability estimation',
  phase: 'post',
  slides: [
    { kind: 'title', section: 'Opening', notes: 'Two ways a network that looked good can fail in use, then the first two complete case studies.' },
    {
      kind: 'compare', title: 'Two different ways to fail on new data',
      left: {
        tone: 'bad', tag: 'Overfitting', h: 'Wrong between the points',
        items: [
          'The network has memorised its examples, noise included.',
          'It fails on new inputs that lie inside the range it was trained on.',
          'Cause: too many weights for the data, or training for too long.',
          'The validation error warns you.',
        ],
      },
      right: {
        tone: 'bad', tag: 'Extrapolation', h: 'Wrong outside the training range',
        items: [
          'The network is asked about a situation it never saw.',
          'It may be an excellent fit everywhere it has data.',
          'Cause: the data did not cover real use.',
          'No error figure warns you, because the validation and test sets have the same gap.',
        ],
      },
      note: 'Different causes, different cures. Decide which one you have before changing anything.',
      notes: 'Students mix these up constantly. Overfitting is a training problem; extrapolation is a data problem.',
    },
    {
      kind: 'chart', section: 'Overfitting', title: 'Overfitting: the curve that tries too hard',
      type: 'line', labels: xs.map((x) => `${Math.round(100 - x * 100)}%`), labelEvery: 5,
      series: [{ name: 'True pattern', values: xs.map(truth) }, { name: '20 neurons trained to the end', values: xs.map(over) }],
      colors: ['5B6380', 'D4455C'],
      xTitle: 'Battery charge (illustrative)', yTitle: 'Minutes left',
      h: 'A battery estimator with 30 noisy readings',
      lines: [
        'The red curve passes through every reading, so its training error is nearly zero.',
        'Between readings it swings by 30 minutes or more.',
        'A phone showing "2 h left", then "2 h 40 min", then "1 h 50 min" as charge falls has this problem.',
        'The smooth grey curve has a higher training error and is far more useful.',
      ],
      notes: 'The network has enough freedom to fit the measurement noise, and nothing stops it from doing so.',
    },
    {
      kind: 'table', title: 'Spotting it: read the three errors',
      head: ['Training error', 'Validation error', 'Test error', 'Diagnosis'],
      widths: [2.6, 2.6, 2.6, 4.33],
      rows: [
        ['High', 'High', 'High', 'Underfitting: too few neurons, or training stuck'],
        ['Low', 'Much higher', 'Much higher', 'Overfitting'],
        ['Low', 'Low', 'Much higher', 'Extrapolation: test points outside the training range'],
        ['Low', 'Low', 'Low', 'Sound, within the range of the data'],
      ],
      rowH: 0.7,
      note: 'Other signs of overfitting: very large weights, and a fit that changes shape with every random start.',
      notes: 'Same table as L38, now with the errors in separate columns. It is worth memorising.',
    },
    {
      kind: 'cards', title: 'Four cures for overfitting',
      cols: 4,
      cards: [
        { h: 'Early stopping', b: 'Stop when the validation error turns upward and keep the best weights. Simple, and the usual first choice.' },
        { h: 'Regularisation', b: 'Add the sum of squared weights to the error. Smooth by design, and needs no validation set.' },
        { h: 'Fewer neurons', b: 'Remove the spare freedom. Risk: too few, and the network underfits.' },
        { h: 'More data', b: 'With enough examples per weight there is no room to memorise. The best cure, when you can get it.' },
      ],
      note: 'A committee of networks also helps: the wiggles of the members differ and partly cancel.',
      notes: 'Ask which cure they would use with 40 data points (regularisation, since early stopping would cost them 6 of the 40 for validation).',
    },
    {
      kind: 'chart', section: 'Extrapolation', title: 'Extrapolation: autumn data, winter question',
      type: 'line', labels: months, labelEvery: 1,
      series: [{ name: 'Actual monthly temperature, °C', values: actual }, { name: 'Network trained on Aug to Nov only', values: model }],
      colors: ['5B6380', 'D4455C'],
      xTitle: 'Month (illustrative figures for a north Indian city)', yTitle: 'Temperature, °C',
      h: 'Perfect on four months, absurd on the next four',
      lines: [
        'From August to November the network matches the data almost exactly.',
        'It has only ever seen temperature falling, so it keeps falling: 0 °C in February.',
        'Nothing in its data says that winter ends.',
        'More neurons, more training or regularisation would not help. Only data from those months would.',
      ],
      notes: 'This is the planned break-and-fix. The fix is to add a full year of data, after which the same network works.',
    },
    {
      kind: 'cards', title: 'Novelty detection: know when not to answer',
      cards: [
        { h: 'The simplest check', b: 'Store the minimum and maximum of every input in the training set. Flag any new input that falls outside.' },
        { h: 'A better check', b: 'Measure the distance from the new input to the nearest training examples. Far from all of them means the combination is new, even if each value alone is in range.' },
        { h: 'What to do with a flag', b: 'Do not show the output as if it were reliable. Fall back to a safe rule, ask a person, and log the case as new training data.' },
      ],
      note: 'A network always produces a number. Novelty detection adds the missing output: "I have not seen this before."',
      notes: 'Hagan suggests a companion network trained to recognise the region covered by the training data. Disagreement inside a committee is another practical signal.',
    },
    {
      kind: 'flow', section: 'Case studies', phase: 'all', title: 'Every case study follows the same six steps',
      steps: caseFlow(-1),
      note: 'Use these six headings for any case-study answer in the exam.',
      notes: 'The five Hagan case studies (Ch. 23 to 27) all follow this outline. We pair each with an everyday twin from NeuroScape.',
    },
    {
      kind: 'diagram', title: 'Case study 1: a smart position sensor',
      lw: 7.3,
      draw: ({ pres, slide, box, C, txt, drawBlocks }) => {
        drawBlocks(pres, slide, box, [
          { x: 0, y: 1.5, w: 1.2, h: 0.9, label: 'Light source', fill: C.amberSoft },
          { x: 1.6, y: 1.5, w: 1.25, h: 0.9, label: 'Object at position y', fill: C.white },
          { x: 3.25, y: 0.45, w: 1.3, h: 0.9, label: 'Solar cell 1: v₁', fill: C.tealSoft },
          { x: 3.25, y: 2.55, w: 1.3, h: 0.9, label: 'Solar cell 2: v₂', fill: C.tealSoft },
          { x: 4.95, y: 1.45, w: 1.25, h: 1.0, label: 'Neural network', fill: C.navy, color: C.white },
        ], [[0, 1], [1, 2], [1, 3], [2, 4], [3, 4]])
        txt(slide, '→ y', { x: box.x + 6.22, y: box.y + 1.7, w: 0.5, h: 0.5, fontSize: 15, bold: true, valign: 'middle' })
        txt(slide, 'Hagan, Neural Network Design, Chapter 23', { x: box.x, y: box.y + box.h - 0.3, w: box.w, h: 0.3, fontSize: 11, color: C.mute })
      },
      h: 'Function approximation: two voltages in, one position out',
      lines: [
        'An object between a light and two solar cells casts a shadow. Its position changes the two voltages.',
        'The relationship is smooth but nonlinear, and hard to write as a formula.',
        'A network learns the inverse: from (v₁, v₂) back to the position y.',
        'A cheap sensor plus a small network gives an accurate, calibrated instrument.',
      ],
      notes: 'The idea of a smart sensor: one or more ordinary sensors, with a network that turns their raw readings into the quantity you want.',
    },
    {
      kind: 'table', title: 'Case study 1 on the six-step outline',
      head: ['Step', 'Hagan Ch. 23: smart position sensor', 'Everyday twin: Battery Oracle'],
      widths: [1.7, 5.4, 5.03],
      size: 14,
      rows: [
        ['Problem', 'Fitting: position y from two solar-cell voltages', 'Fitting: minutes left from charge level and screen use'],
        ['Data', 'Measured voltage pairs at known positions; divided for training, validation and testing', 'Logged discharge runs from one phone'],
        ['Preprocess', 'Inputs and target normalised to [−1, 1]', 'The same'],
        ['Network', 'Two inputs, one tansig hidden layer of 10 neurons, one linear output', 'One hidden layer; the size is yours to choose'],
        ['Train', 'Bayesian regularisation, from several random starts', 'Levenberg-Marquardt with early stopping'],
        ['Analyse', 'Regression plot (R close to 1); error plotted against position', 'Regression plot, R, and the novelty flag'],
      ],
      rowH: 0.62,
      notes: 'Bayesian regularisation suits this case because the data set is small: no examples need to be given up for validation during training. Take the exact data counts and error figures from the chapter.',
    },
    {
      kind: 'diagram', title: 'Case study 2: estimating a probability',
      draw: ({ pres, slide, box, C, txt, drawNetwork }) => {
        drawNetwork(pres, slide, { x: box.x + 0.5, y: box.y, w: box.w - 2.6, h: box.h - 0.5 }, [
          { n: 4, label: 'Collision conditions', fill: C.amber },
          { n: 6, label: 'tansig hidden layer', fill: C.teal },
          { n: 3, label: 'softmax', fill: C.navy },
        ], { d: 0.46 })
        ;['P(chemisorbed)', 'P(scattered)', 'P(desorbed)'].forEach((t, i) =>
          txt(slide, t, { x: box.x + box.w - 1.95, y: box.y + 1.08 + i * 0.62, w: 1.95, h: 0.4, fontSize: 13, bold: true, valign: 'middle' }))
        txt(slide, 'Hagan, Neural Network Design, Chapter 24', { x: box.x, y: box.y + box.h - 0.3, w: box.w, h: 0.3, fontSize: 11, color: C.mute })
      },
      h: 'Three outcomes, three probabilities that sum to 1',
      lines: [
        'In making synthetic diamond, a carbon dimer strikes the surface. It may bond, bounce off, or bond and later leave.',
        'Which one happens is random. Only the probabilities depend on the collision conditions.',
        'Each condition was simulated 50 times; the targets are the observed fractions.',
        'The softmax output makes the three estimates positive and sum to 1.',
      ],
      notes: 'The targets themselves are noisy: 50 trials give fractions in steps of 2%. The network pools information from neighbouring conditions and so smooths that noise.',
    },
    {
      kind: 'table', title: 'Case study 2 on the six-step outline',
      head: ['Step', 'Hagan Ch. 24: carbon dimer on diamond', 'Everyday twin: Chase Predictor'],
      widths: [1.7, 5.4, 5.03],
      size: 14,
      rows: [
        ['Problem', 'Probability of each of three reaction outcomes', 'Probability that the chasing team wins from here'],
        ['Data', 'Molecular dynamics simulations: 50 runs for each of about 2,000 conditions', 'Past matches: the situation at each ball, and who won'],
        ['Preprocess', 'Collision conditions scaled; targets are outcome fractions', 'Runs needed, balls left and wickets in hand, scaled'],
        ['Network', 'tansig hidden layer of 10 neurons; softmax output of 3', 'tansig hidden layer; one sigmoid output'],
        ['Train', 'From several starts, with a validation set to stop', 'Cross-entropy, early stopping'],
        ['Analyse', 'Compare with simulated fractions on test conditions', 'Of situations rated 70%, do about 70% end in a win?'],
      ],
      rowH: 0.62,
      notes: 'The last row of the twin is calibration: a probability estimate is good if events rated 70% happen about 70% of the time. Take the exact training settings from the chapter.',
    },
    {
      kind: 'cards', title: 'Why use a network to estimate a probability?',
      cards: [
        { h: 'Targets are outcomes', b: 'Nobody can observe "a 70% chance". You observe wins and losses, or 37 bonds in 50 trials. The network turns outcomes into a smooth probability.' },
        { h: 'It pools nearby cases', b: 'No single match situation repeats often enough to count. The network shares evidence across similar situations.' },
        { h: 'It smooths the noise', b: 'In the Hagan study the network estimates were closer to the truth than the raw simulated fractions it was trained on.' },
      ],
      note: 'Trained with 0 / 1 targets and a sigmoid or softmax output, a network estimates the probability of the class.',
      notes: 'The published work behind the Hagan chapter reports that the network reduced the statistical uncertainty of the simulation results by a factor of about 3.5.',
    },
    {
      kind: 'demo', section: 'Live', tag: 'Break and fix', title: 'Two failures, two different repairs',
      steps: [
        'Train on August to November temperatures. Ask for January. The answer is absurd. Repair: add a full year of data.',
        'Fit a noisy sine wave with 20 neurons, trained to the end. The curve wiggles through every point.',
        'Switch on early stopping and train again. The wiggles go. Then try it on the first failure: nothing changes.',
      ],
      ask: 'Early stopping repaired the second failure and did nothing for the first. Why?',
      app: 'Battery Oracle: press Break, switch on early stopping, then query outside the data.',
      notes: 'This is the central point of the hour: a training fix cannot repair a data gap.',
    },
    {
      kind: 'app', section: 'Practice', title: 'Try it in NeuroScape',
      stations: [
        { name: 'Battery Oracle', do: 'Overfit with many neurons. Cure it with early stopping. Then ask about a charge level outside the data.', see: 'Wiggles disappear; the out-of-range answer is flagged as not to be trusted.' },
        { name: 'Chase Predictor', do: 'Train the win-probability network and step through a chase ball by ball.', see: 'The probability moving with each ball, and how well the ratings match real results.' },
        { name: 'The Delivery Promise', where: 'World 5 mission', do: 'Train on lunch orders only and play through to Ship.', see: 'Low test error, high live error: extrapolation that no error figure showed.' },
      ],
      notes: 'The mission run is the clearest demonstration that the test set cannot reveal extrapolation.',
    },
    {
      kind: 'quiz', title: 'Check your understanding',
      q: 'Distinguish between overfitting and extrapolation. How is each detected, and how is each prevented?',
      marks: 'Typical 8 to 10 mark question',
      points: [
        'Overfitting: memorising noise; wrong between training points. Sketch the wiggly fit.',
        'Detected by: training error low, validation and test errors much higher.',
        'Prevented by: early stopping, regularisation, fewer neurons, more data.',
        'Extrapolation: input outside the training range. Sketch the temperature example.',
        'Detected by novelty detection; prevented only by data that covers the range.',
      ],
      notes: 'A second likely question: "Explain a function approximation case study." The six-step table answers it.',
    },
    {
      kind: 'leave', title: 'Memorising and guessing are different faults',
      points: [
        { h: 'Overfitting', b: 'Read the three errors. Cure with early stopping or regularisation.' },
        { h: 'Extrapolation', b: 'Invisible in the errors. Cure with data; guard with novelty detection.' },
        { h: 'Six-step outline', b: 'Problem, data, preprocess, network, train, analyse.' },
        { h: 'Two case studies', b: 'A position sensor (fitting) and reaction probabilities.' },
      ],
      next: 'L41: the pattern recognition and clustering case studies.',
      notes: 'Ask students to read Hagan Ch. 25 and 26 before the next class, with the six-step outline beside them.',
    },
  ],
}
