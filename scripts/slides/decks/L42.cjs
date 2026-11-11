/**
 * L42: Prediction case study and unit recap.
 * Hagan Ch. 27 (prediction). Case-study rows give the outline of the chapter; take exact figures from the textbook.
 */
const { designFlow } = require('../lib.cjs')

const lags = Array.from({ length: 11 }, (_, i) => i)
const shortTdl = [1, 0.58, 0.36, 0.22, 0.15, 0.09, 0.06, 0.03, 0.03, 0.01, 0.01]
const longTdl = [1, 0.05, -0.04, 0.03, -0.03, 0.04, -0.02, 0.02, 0.01, -0.02, 0.01]
const horizon = Array.from({ length: 20 }, (_, i) => i + 1)
const weeks = Array.from({ length: 16 }, (_, i) => i + 1)
const liveErr = [2.8, 2.9, 2.7, 2.9, 2.8, 3.0, 2.9, 3.1, 3.4, 3.7, 4.1, 4.6, 5.0, 5.5, 5.9, 6.3]

module.exports = {
  code: 'L42',
  date: 'Wed 16 Dec 2026',
  file: 'L42-prediction-and-recap.pptx',
  title: 'Predicting what comes next, and the whole unit',
  syllabus: 'Prediction case study · Unit 5 recap',
  phase: 'all',
  slides: [
    { kind: 'title', section: 'Opening', notes: 'The last case study adds the one thing the others lacked: time. Then the whole unit on one page.' },
    {
      kind: 'cards', section: 'Prediction', title: 'What makes prediction different',
      cards: [
        { h: 'Order matters', b: 'Shuffle a set of ECG records and nothing is lost. Shuffle an hour of electricity demand and it becomes meaningless.' },
        { h: 'The network needs memory', b: 'The next value depends on the recent past. A plain multilayer network sees only the present input, so the past must be supplied to it.' },
        { h: 'Its errors feed forward', b: 'To predict several steps ahead the network must use its own earlier predictions, and any error in them is carried along.' },
      ],
      note: 'Prediction is fitting, with the past as the input.',
      notes: 'Everyday predictions: tomorrow\'s electricity demand, the next bus arrival, where your thumb will be 100 ms from now on a touch screen.',
    },
    {
      kind: 'diagram', title: 'Memory from a tapped delay line',
      draw: ({ pres, slide, box, C, txt, drawBlocks }) => {
        drawBlocks(pres, slide, box, [
          { x: 0, y: 0.2, w: 1.5, h: 0.6, label: 'y(t − 1)', fill: C.tealSoft },
          { x: 0, y: 1.15, w: 1.5, h: 0.6, label: 'y(t − 2)', fill: C.tealSoft },
          { x: 0, y: 2.1, w: 1.5, h: 0.6, label: 'y(t − 3)', fill: C.tealSoft },
          { x: 0, y: 3.05, w: 1.5, h: 0.6, label: 'y(t − 4)', fill: C.tealSoft },
          { x: 2.7, y: 1.3, w: 1.9, h: 1.25, label: 'Multilayer network', fill: C.navy, color: C.white },
          { x: 5.3, y: 1.6, w: 1.35, h: 0.65, label: 'ŷ(t)', fill: C.amberSoft, size: 15 },
        ], [[0, 4], [1, 4], [2, 4], [3, 4], [4, 5]])
        txt(slide, 'Tapped delay line: the last four values, held side by side', { x: box.x, y: box.y + 3.85, w: box.w, h: 0.35, fontSize: 12, color: C.mute })
      },
      h: 'Turn a sequence into ordinary input vectors',
      lines: [
        'A tapped delay line stores the last d values of the signal.',
        'Together they form the input vector for an ordinary multilayer network.',
        'The network is still static; the memory lives in the delay line. This is the focused time-delay network.',
        'How long should d be? Long enough that the errors come out white (L39).',
      ],
      notes: 'From Unit 2: the tapped delay line was introduced with the ADALINE adaptive filter. Here it feeds a nonlinear network.',
    },
    {
      kind: 'diagram', title: 'The NARX network: past inputs and past outputs',
      draw: ({ pres, slide, box, C, txt, drawBlocks }) => {
        drawBlocks(pres, slide, box, [
          { x: 0, y: 0.5, w: 1.45, h: 0.7, label: 'Input u(t)', fill: C.amberSoft },
          { x: 2.0, y: 0.5, w: 1.3, h: 0.7, label: 'Delay line', fill: C.tealSoft },
          { x: 2.0, y: 2.7, w: 1.3, h: 0.7, label: 'Delay line', fill: C.tealSoft },
          { x: 3.9, y: 1.45, w: 1.5, h: 1.0, label: 'Multilayer network', fill: C.navy, color: C.white },
          { x: 5.75, y: 1.62, w: 0.95, h: 0.65, label: 'y(t)', fill: C.amberSoft, size: 15 },
          { x: 0, y: 2.7, w: 1.45, h: 0.7, label: 'Past outputs y', fill: C.white },
        ], [[0, 1], [1, 3], [2, 3], [3, 4], [5, 2]])
        txt(slide, 'y(t) = f( y(t−1), …, y(t−n),  u(t−1), …, u(t−m) )', { x: box.x, y: box.y + 3.75, w: box.w, h: 0.4, fontSize: 15, bold: true, fontFace: 'Cambria', align: 'center' })
      },
      h: 'Autoregressive, with an outside input',
      lines: [
        'NARX: nonlinear autoregressive network with exogenous input.',
        'Autoregressive: the output depends on its own past values.',
        'Exogenous input: it also depends on an outside signal u, such as a control current or the weather.',
        'Each has its own tapped delay line feeding one multilayer network.',
      ],
      notes: 'For demand forecasting, u might be temperature and the day of the week, and y the demand.',
    },
    {
      kind: 'compare', title: 'Two ways to feed the output back',
      left: {
        tone: 'plain', tag: 'Series-parallel (open loop)', h: 'Feed back the measured output',
        items: [
          'The delay line holds the true past values of y.',
          'The network is then purely feedforward, so ordinary backpropagation trains it.',
          'Inputs are accurate, so training is stable.',
          'Use: training, and one-step-ahead prediction.',
        ],
      },
      right: {
        tone: 'plain', tag: 'Parallel (closed loop)', h: 'Feed back the network\'s own output',
        items: [
          'The delay line holds the network\'s earlier predictions.',
          'No measurements are needed, so it can run many steps ahead.',
          'Each small error is fed back and can grow.',
          'Use: multi-step prediction and simulation, after training.',
        ],
      },
      note: 'Train in series-parallel form. Close the loop afterwards to predict further ahead.',
      notes: 'This is the standard recipe in the Hagan case study and in the MATLAB toolbox: train open loop, then convert to closed loop.',
    },
    {
      kind: 'table', section: 'Case study 5', title: 'Case study 5 on the six-step outline',
      head: ['Step', 'Hagan Ch. 27: magnetic levitation', 'Everyday twin: Finish My Move'],
      widths: [1.7, 5.4, 5.03],
      size: 14,
      rows: [
        ['Problem', 'Prediction: position of a magnet floating above an electromagnet, from the coil current', 'Prediction: where your hand movement goes next'],
        ['Data', 'Recorded sequences of current u(t) and position y(t) at a fixed sampling interval', 'The movement you just made, sampled many times a second'],
        ['Preprocess', 'Normalise; build delayed vectors; divide in blocks of time', 'A sliding window over the last samples'],
        ['Network', 'NARX: delay lines on u and y, tansig hidden layer, linear output', 'Time-delay network with a linear output'],
        ['Train', 'Series-parallel form with Levenberg-Marquardt, regularised', 'Levenberg-Marquardt on recent windows'],
        ['Analyse', 'Error autocorrelation, input-error cross-correlation; then closed-loop prediction', 'Error autocorrelation; open-loop and closed-loop forecasts'],
      ],
      rowH: 0.64,
      notes: 'Magnetic levitation is unstable and nonlinear, which is why it is a good test. Take the delay lengths, hidden neurons and data length from the chapter.',
    },
    {
      kind: 'chart', title: 'Checking the errors: delay line too short',
      type: 'bar', labels: lags.map(String),
      series: [{ name: 'Short delay line', values: shortTdl }, { name: 'Longer delay line', values: longTdl }],
      colors: ['D4455C', '0C9C9C'],
      xTitle: 'Lag τ (time steps)', yTitle: 'Error autocorrelation, scaled',
      h: 'The red errors are still predictable',
      lines: [
        'With a short delay line, an error now makes a similar error likely at the next few steps.',
        'That pattern is information the network could have used.',
        'Lengthen the delay lines and train again: only the spike at lag 0 remains.',
        'Then check the input-error cross-correlation in the same way.',
      ],
      notes: 'This is the L39 test applied in the case study. White errors mean nothing predictable is left.',
    },
    {
      kind: 'chart', title: 'Closed loop: errors grow with the horizon',
      type: 'line', labels: horizon.map(String), labelEvery: 2,
      series: [
        { name: 'One step ahead (open loop)', values: horizon.map(() => 0.4) },
        { name: 'Many steps ahead (closed loop)', values: horizon.map((h) => 0.4 * Math.pow(h, 0.85)) },
      ],
      xTitle: 'Steps ahead (illustrative)', yTitle: 'Typical error',
      h: 'Every forecast has a useful range',
      lines: [
        'One step ahead the network always starts from a measured value, so the error stays small.',
        'In closed loop each prediction is built on earlier predictions, and their errors add up.',
        'Report how far ahead the forecast stays inside the accuracy you need.',
        'Tomorrow\'s demand is forecast well. Next month\'s, from the same model, is not.',
      ],
      notes: 'In Finish My Move the closed-loop forecast is the one drawn ahead of the hand; students can see where it peels away from the real movement.',
    },
    {
      kind: 'cards', section: 'Industry', title: 'Industry parallel: load and demand forecasting',
      cards: [
        { h: 'Electricity load', b: 'A grid operator forecasts tomorrow\'s demand hour by hour to schedule power plants. Inputs: recent load, temperature, day of the week, holidays.' },
        { h: 'Demand for goods', b: 'A grocery app forecasts tomorrow\'s orders for each neighbourhood to stock its stores. Too little loses sales; too much is thrown away.' },
        { h: 'The same design', b: 'Delay lines on the series and on outside inputs, trained one step ahead, checked for white errors, then run forward.' },
      ],
      note: 'Forecasts are judged in money: every unit of error is fuel burnt, stock wasted or a customer lost.',
      notes: 'Special days are the classic difficulty: a festival or a cricket final shifts the evening peak, and there are few past examples to learn from.',
    },
    {
      kind: 'chart', title: 'Concept drift: when the world moves on',
      type: 'line', labels: weeks.map(String), labelEvery: 1,
      series: [{ name: 'Live forecast error', values: liveErr }, { name: 'Retrain trigger', values: weeks.map(() => 4.5) }],
      colors: ['D4455C', '5B6380'],
      xTitle: 'Weeks after launch (illustrative)', yTitle: 'Error',
      h: 'A good model does not stay good',
      lines: [
        'For eight weeks the live error matches the test error.',
        'Then something changes: summer arrives, prices rise, a competitor opens. The error creeps upward.',
        'The model has not changed. The relationship it learnt has.',
        'Track the live error, set a trigger, and retrain on recent data when it is crossed.',
      ],
      notes: 'Concept drift is extrapolation in time. Monitoring is the fifth box of the design flow, "Use and watch".',
    },
    {
      kind: 'demo', section: 'Live', tag: 'Competition', title: 'Beat the model',
      steps: [
        'Show the last 30 values of a real series, such as hourly city temperature or daily match scores.',
        'Everyone writes down their guess for the next value. Then reveal the network\'s forecast, then the truth.',
        'Score ten rounds: mean absolute error for the class average, the best student and the network.',
      ],
      ask: 'On which rounds did people beat the network, and what did they know that it did not?',
      app: 'Finish My Move: play the Beat the model round and compare scores.',
      notes: 'People usually win on rounds with a visible event the model has no input for, and lose on steady stretches. That is the lesson on choosing inputs.',
    },
    {
      kind: 'flow', section: 'Unit recap', title: 'The whole unit on one page',
      steps: designFlow(-1).map((s, i) => ({
        ...s,
        b: [
          'L35: cover the input space; 70/15/15; normalise; features; PCA.',
          'L36: task type decides the network and the output function.',
          'L37: small random start; LM or SCG; early stopping. L38: MSE or cross-entropy.',
          'L38 to L40: three errors; a tool for each task; overfitting and extrapolation.',
          'L41, L42: domain shift, concept drift, monitoring and retraining.',
        ][i],
      })),
      note: 'Every case study and every exam answer in this unit is a walk along these five boxes.',
      notes: 'Ask the class to close their notes and rebuild this slide on paper in three minutes.',
    },
    {
      kind: 'table', title: 'The five case studies side by side',
      head: ['Task', 'Hagan case study', 'Network', 'Analysis tool', 'NeuroScape twin'],
      widths: [2.2, 2.9, 2.6, 2.4, 2.03],
      size: 14,
      rows: [
        ['Function approximation', 'Ch. 23: smart position sensor', 'MLP, linear output', 'Regression plot, R', 'Battery Oracle'],
        ['Probability estimation', 'Ch. 24: carbon dimer on diamond', 'MLP, softmax output', 'Compare with observed fractions', 'Chase Predictor'],
        ['Pattern recognition', 'Ch. 25: heart attack from ECG', 'MLP, softmax output', 'Confusion matrix, ROC', 'Doodle Reader'],
        ['Clustering', 'Ch. 26: forest cover', 'Self-organising map', 'Distance matrix, hits, weight planes', 'Colour Map'],
        ['Prediction', 'Ch. 27: magnetic levitation', 'NARX', 'Error autocorrelation, cross-correlation', 'Finish My Move'],
      ],
      rowH: 0.7,
      notes: 'This table is the single most useful revision page for the unit.',
    },
    {
      kind: 'table', title: 'Where the exam questions come from',
      head: ['Question asks about', 'Lecture', 'Answer with'],
      widths: [4.6, 1.5, 6.03],
      rows: [
        ['Pre-training steps; data selection; preprocessing', 'L35', 'Coverage, three sets, normalisation formulas, PCA, target coding'],
        ['Choice of architecture', 'L36', 'The task, network and output function table'],
        ['Initialisation; training algorithms; stopping criteria', 'L37', 'Symmetry, LM against SCG, the early-stopping sketch'],
        ['Performance functions; regularisation', 'L38', 'MSE, cross-entropy, weight penalty, committees'],
        ['Post-training analysis', 'L39', 'One tool per task, each with a sketch'],
        ['Overfitting and extrapolation', 'L40', 'Three-error table, cures, novelty detection'],
        ['Any case study', 'L40 to L42', 'The six-step outline'],
      ],
      rowH: 0.54,
      size: 14,
      notes: 'Based on the syllabus headings for Unit 5. Check against previous SEE papers for the exact wording used.',
    },
    {
      kind: 'app', section: 'Practice', title: 'Try it in NeuroScape',
      stations: [
        { name: 'Finish My Move', do: 'Draw a repeating movement. Compare open-loop and closed-loop forecasts, then play Beat the model.', see: 'Where the closed-loop forecast drifts away, and the error correlation plots.' },
        { name: 'The Delivery Promise', where: 'World 5 mission', do: 'Play all six stages in one sitting, aiming for three stars.', see: 'Every decision of the unit, and what each one costs when it is wrong.' },
      ],
      notes: 'The mission is the best single revision exercise: one model taken through every stage of the design flow.',
    },
    {
      kind: 'leave', title: 'Unit 5: from data to a model you can trust',
      points: [
        { h: 'Prediction', b: 'Delay lines give memory. Train open loop, predict closed loop, check for white errors.' },
        { h: 'Models age', b: 'Watch the live error and retrain when the world drifts.' },
        { h: 'One design flow', b: 'Prepare, choose, train, analyse, use and watch.' },
        { h: 'One answer outline', b: 'Problem, data, preprocess, network, train, analyse.' },
      ],
      next: 'Revision: rework the five case studies with the six-step outline.',
      notes: 'End of Unit 5 and of CO5. Thank the class.',
    },
  ],
}
