/** L39: Post-training analysis for fitting, pattern recognition, clustering and prediction. Hagan Ch. 22. */
// deterministic pseudo-random numbers so the deck builds the same every time
let seed = 7
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1
const targets = Array.from({ length: 40 }, (_, i) => 6 + i)
const outputs = targets.map((t, i) => (i === 31 ? t - 14 : t + rnd() * 2.6))
const fpr = Array.from({ length: 21 }, (_, i) => i / 20)
const lags = Array.from({ length: 11 }, (_, i) => i)
const white = [1, 0.04, -0.05, 0.03, -0.02, 0.06, -0.04, 0.01, 0.03, -0.03, 0.02]
const coloured = [1, 0.66, 0.45, 0.31, 0.2, 0.13, 0.09, 0.05, 0.04, 0.02, 0.01]
// distance map of an 8 x 8 SOM: a ridge of large distances separates two groups
const umatrix = Array.from({ length: 8 }, (_, r) =>
  Array.from({ length: 8 }, (_, c) => {
    const d = Math.abs(c - (2.2 + r * 0.45))
    return Math.max(0.06, Math.min(1, 1 - d / 1.6)) * (d < 1.6 ? 1 : 0) + (d >= 1.6 ? 0.08 + 0.04 * ((r + c) % 3) : 0)
  }),
)
const hits = [
  [9, 7, 1, 0, 2, 6, 8, 5],
  [8, 6, 2, 0, 1, 7, 9, 6],
  [7, 9, 4, 1, 0, 3, 8, 7],
  [6, 8, 5, 1, 0, 2, 7, 9],
]

module.exports = {
  code: 'L39',
  date: 'Wed 9 Dec 2026',
  file: 'L39-post-training-analysis.pptx',
  title: 'Post-training analysis: a tool for each task',
  syllabus: 'Post-training analysis · Pattern recognition · Clustering · Prediction',
  phase: 'post',
  slides: [
    { kind: 'title', section: 'Opening', notes: 'One error number is never enough. Each task type has its own picture that shows what the number hides.' },
    {
      kind: 'table', title: 'One task, one analysis tool',
      head: ['Task', 'Main tool', 'The question it answers'],
      widths: [2.8, 4.3, 5.03],
      rows: [
        ['Fitting', 'Regression plot and R value', 'Do the outputs track the targets across the whole range?'],
        ['Pattern recognition', 'Confusion matrix and ROC curve', 'Which classes are confused, and at what threshold?'],
        ['Clustering', 'Distance matrix, hit histogram, weight planes', 'How many groups are there, and what defines each?'],
        ['Prediction', 'Error autocorrelation, input-error cross-correlation', 'Is there any pattern left in the errors?'],
      ],
      rowH: 0.8,
      note: 'Always run the analysis on the training, validation and test sets separately.',
      notes: 'This table is the spine of the hour. Each row gets two or three slides.',
    },
    {
      kind: 'chart', section: 'Fitting', title: 'Fitting: the regression plot',
      type: 'scatter', x: targets,
      series: [{ name: 'Network output', values: outputs }, { name: 'Perfect fit: a = t', values: targets }],
      colors: ['0C9C9C', 'C9CEDD'],
      xTitle: 'Target t: real minutes of battery left', yTitle: 'Output a',
      h: 'Plot every output against its target',
      lines: [
        'A perfect network puts every point on the line a = t.',
        'Fit a straight line a = m t + c through the points. Good: m near 1, c near 0.',
        'R, the correlation coefficient, measures how tightly the points hug that line. R near 1 is good.',
        'One point sits far below the line: an outlier worth checking by hand.',
      ],
      notes: 'The outlier here might be a phone with a faulty battery, or a wrong record. The plot does not say which; it says where to look.',
    },
    {
      kind: 'cards', title: 'Reading R, and what it hides',
      cards: [
        { h: 'R close to 1', b: 'The outputs explain almost all the variation in the targets. R² is the fraction explained: R = 0.95 means about 90%.' },
        { h: 'A high R is not proof', tone: 'warn', b: 'A few extreme points can lift R while the middle of the range is poor. Always look at the scatter, not only the number.' },
        { h: 'Compare the three sets', b: 'R = 0.99 on training and 0.80 on test is overfitting. Similar values on all three sets is what you want.' },
      ],
      note: 'Outliers on the plot are either bad data to remove or rare cases the network needs more examples of.',
      notes: 'Also useful: a histogram of the errors. It should be centred on zero and roughly bell-shaped.',
    },
    {
      kind: 'diagram', section: 'Pattern recognition', title: 'Pattern recognition: the confusion matrix',
      draw: ({ pres, slide, box, C, txt, drawGrid }) => {
        txt(slide, 'Model says:', { x: box.x + 1.9, y: box.y, w: 4.4, h: 0.3, fontSize: 13, color: C.mute, align: 'center' })
        txt(slide, 'Fraud', { x: box.x + 1.9, y: box.y + 0.3, w: 2.2, h: 0.3, fontSize: 14, bold: true, align: 'center' })
        txt(slide, 'Genuine', { x: box.x + 4.1, y: box.y + 0.3, w: 2.2, h: 0.3, fontSize: 14, bold: true, align: 'center' })
        txt(slide, 'Really fraud (100)', { x: box.x, y: box.y + 1.1, w: 1.8, h: 0.8, fontSize: 14, bold: true })
        txt(slide, 'Really genuine (9,900)', { x: box.x, y: box.y + 2.75, w: 1.8, h: 0.8, fontSize: 14, bold: true })
        drawGrid(pres, slide, { x: box.x + 1.9, y: box.y + 0.7, w: 4.4, h: 3.3 }, [
          [{ v: 1, fill: C.green, label: '85 caught', color: C.white }, { v: 0, fill: C.roseSoft, label: '15 missed', color: C.ink }],
          [{ v: 0, fill: C.amberSoft, label: '297 false alarms', color: C.ink }, { v: 1, fill: C.green, label: '9,603 passed', color: C.white }],
        ], { fontSize: 16 })
      },
      h: 'Four counts, three useful rates',
      lines: [
        'Sensitivity (true positive rate): 85 / 100 = 85% of frauds caught.',
        'Specificity: 9,603 / 9,900 = 97% of genuine payments passed.',
        'Precision: 85 / (85 + 297) = 22% of alarms are real fraud.',
        'Accuracy is 96.9%, lower than the useless "never fraud" model at 99%.',
      ],
      notes: 'This is the same payment data as L38, now with a useful model. Note how accuracy went down while usefulness went up.',
    },
    {
      kind: 'chart', title: 'The ROC curve: every threshold at once',
      type: 'line', labels: fpr.map((f) => f.toFixed(2)), labelEvery: 2,
      series: [
        { name: 'This network', values: fpr.map((f) => (f === 0 ? 0 : Math.pow(f, 0.22))) },
        { name: 'Random guessing', values: fpr },
      ],
      colors: ['0C9C9C', 'C9CEDD'],
      xTitle: 'False positive rate (genuine payments flagged)', yTitle: 'True positive rate (frauds caught)',
      h: 'Slide the threshold and trace the trade',
      lines: [
        'The network gives a score from 0 to 1. The threshold turns it into a decision.',
        'Lower the threshold: more frauds caught, more false alarms.',
        'A curve hugging the top-left corner is a good classifier. The diagonal is a coin toss.',
        'The business picks the point: what does a missed fraud cost against an annoyed customer?',
      ],
      notes: 'The area under the curve summarises it in one number: 1.0 is perfect, 0.5 is guessing. The curve does not change when classes are imbalanced, which is why it is preferred to accuracy.',
    },
    {
      kind: 'diagram', section: 'Clustering', title: 'Clustering: the SOM distance matrix',
      draw: ({ pres, slide, box, C, txt, drawGrid }) => {
        drawGrid(pres, slide, { x: box.x, y: box.y, w: box.w, h: box.h - 0.5 }, umatrix, { from: 'E6F4F4', to: C.navy })
        txt(slide, 'Each cell is one neuron. Dark: its weights are far from its neighbours.', { x: box.x, y: box.y + box.h - 0.35, w: box.w, h: 0.35, fontSize: 12, color: C.mute, align: 'center' })
      },
      h: 'Dark ridges are the borders between clusters',
      lines: [
        'After training, measure the distance between the weight vectors of neighbouring neurons.',
        'Light regions: neighbours are alike. This is the inside of one cluster.',
        'A dark band: weights change sharply across it. Two different groups meet here.',
        'Here one ridge splits the map into two groups of customers.',
      ],
      notes: 'Also called the U-matrix. It is how you count clusters when you were never told how many there are.',
    },
    {
      kind: 'diagram', title: 'Hit histogram and weight planes',
      draw: ({ pres, slide, box, C, txt, drawGrid }) => {
        const max = 9
        txt(slide, 'Hits: how many examples each neuron wins', { x: box.x, y: box.y, w: box.w, h: 0.3, fontSize: 13, bold: true })
        drawGrid(pres, slide, { x: box.x, y: box.y + 0.4, w: box.w, h: 2.35 }, hits.map((r) => r.map((h) => ({ v: h / max, label: h }))), { from: 'E6F4F4', to: C.teal, fontSize: 12 })
        txt(slide, 'Weight planes: one map per input', { x: box.x, y: box.y + 2.95, w: box.w, h: 0.3, fontSize: 13, bold: true })
        const names = ['Recharge amount', 'Data used', 'Calls made']
        names.forEach((n, k) => {
          const w = box.w / 3 - 0.15
          const x = box.x + k * (w + 0.22)
          const rows = Array.from({ length: 3 }, (_, r) => Array.from({ length: 6 }, (_, c) => (k === 0 ? c / 5 : k === 1 ? c / 5 : 1 - (r + 0.5) / 3) * 0.9 + 0.05))
          drawGrid(pres, slide, { x, y: box.y + 3.3, w, h: 0.75 }, rows, { from: 'FCEFD6', to: 'B5651D' })
          txt(slide, n, { x, y: box.y + 4.07, w, h: 0.28, fontSize: 11, color: C.mute, align: 'center' })
        })
      },
      h: 'Two more views of the same trained map',
      lines: [
        'Hit histogram: neurons with many hits sit inside clusters. Neurons with zero hits lie on the borders.',
        'Weight plane: the value of one input weight across the grid.',
        'Two planes that look alike mean those inputs are correlated: recharge amount and data used rise together.',
        'A plane that looks different is carrying separate information.',
      ],
      notes: 'Many dead neurons (zero hits) suggest the map is too large for the data. Two summary numbers also exist: quantisation error and topographic error.',
    },
    {
      kind: 'chart', section: 'Prediction', title: 'Prediction: is anything left in the errors?',
      type: 'bar', labels: lags.map(String),
      series: [{ name: 'Good model: white errors', values: white }, { name: 'Poor model: errors still correlated', values: coloured }],
      colors: ['0C9C9C', 'D4455C'],
      xTitle: 'Lag τ (time steps)', yTitle: 'Autocorrelation of the error, scaled',
      h: 'Autocorrelation of the prediction errors',
      lines: [
        'If the network has learnt everything predictable, its errors are random: knowing one tells you nothing about the next.',
        'Then the autocorrelation is a single spike at lag 0 and near zero elsewhere.',
        'Bars standing above the confidence band mean a pattern remains.',
        'The cure is usually longer tapped delay lines, so the network sees further back.',
      ],
      notes: 'White noise errors is the goal. If today\'s error predicts tomorrow\'s, the model could have used that and did not.',
    },
    {
      kind: 'formula', title: 'The two correlation tests, with their bounds',
      tag: 'Prediction networks',
      eq: ['R_{e}(τ) = 1/(Q−τ) Σ e(t) e(t+τ)', 'bounds:  ± 2 R_{e}(0) / √Q', 'R_{pe}(τ) = 1/(Q−τ) Σ p(t) e(t+τ)'],
      eqSize: 22,
      caption: 'e: prediction error. p: input sequence. Q: number of time steps. Values inside the bounds count as zero.',
      h: 'Errors should be unrelated to anything known',
      lines: [
        'Error autocorrelation (first line): errors must not predict later errors. Only τ = 0 may exceed the bounds.',
        'Input-error cross-correlation (third line): the input must not predict the errors, at any lag.',
        'If it does, part of the input effect has not been captured.',
        'The bounds are 95% confidence limits. With Q = 500 they are about ± 9% of the value at lag 0.',
      ],
      notes: 'The cross-correlation bounds are plus or minus 2 times the square root of the product of the error and input autocorrelations at lag 0, divided by root Q. Both tests appear in the Hagan prediction case study, L42.',
    },
    {
      kind: 'demo', section: 'Live', tag: 'Class data demo', title: 'Cluster this class, live',
      steps: [
        'Everyone fills a two-minute form: hours of sleep, screen time, cups of tea or coffee, minutes of travel to college.',
        'Download the sheet, normalise the four columns and train a small SOM in front of the class.',
        'Read the distance map and the hit histogram together. Name the clusters from the weight planes.',
      ],
      ask: 'How many groups did the map find in this room? Which of the four questions separates them most?',
      app: 'Colour Map: switch between Distance map, Hits and Weight planes.',
      notes: 'Keep the form anonymous. If the internet fails, use the Colour Map station, which shows the same three views.',
    },
    {
      kind: 'app', section: 'Practice', title: 'Try it in NeuroScape',
      stations: [
        { name: 'Battery Oracle', do: 'Open the regression plot for the training and the test points.', see: 'R on each set, and how far apart they are when the network overfits.' },
        { name: 'UPI Fraud Alarm', do: 'Drag the threshold from 0.9 down to 0.1.', see: 'The four counts change and a point moves along the ROC curve.' },
        { name: 'Colour Map', do: 'Train the map, then switch to Distance map, Hits and Weight planes.', see: 'Dark borders between colour families, and empty neurons along them.' },
        { name: 'Finish My Move', do: 'Shorten the tapped delay line, then lengthen it.', see: 'Error autocorrelation bars rising above the band, then falling inside it.' },
      ],
      notes: 'One station per row of the opening table. A good lab hour is to visit all four and sketch each plot.',
    },
    {
      kind: 'quiz', title: 'Check your understanding',
      q: 'Explain the post-training analysis methods used for (a) pattern recognition and (b) prediction networks.',
      marks: 'Typical 8 to 10 mark question',
      points: [
        'Confusion matrix: sketch the 2 × 2 table; define sensitivity and specificity.',
        'ROC curve: true positive rate against false positive rate as the threshold moves.',
        'Error autocorrelation: formula; should be zero except at lag 0; confidence bounds.',
        'Input-error cross-correlation: should be zero at all lags.',
        'What to do when a test fails: more data, longer delay lines, more neurons.',
      ],
      notes: 'Variants ask for fitting (regression plot, R) and clustering (distance matrix, hits, weight planes). The same four-row table answers all of them.',
    },
    {
      kind: 'leave', title: 'The right tool for each task',
      points: [
        { h: 'Fitting', b: 'Regression plot and R, on all three sets.' },
        { h: 'Pattern recognition', b: 'Confusion matrix, then the ROC curve to pick a threshold.' },
        { h: 'Clustering', b: 'Distance matrix, hit histogram and weight planes.' },
        { h: 'Prediction', b: 'Error autocorrelation and input-error cross-correlation.' },
      ],
      next: 'L40: overfitting, extrapolation, and the first two case studies.',
      notes: 'From the next hour these tools are used inside complete case studies.',
    },
  ],
}
