/**
 * L41: Pattern recognition and clustering case studies.
 * Hagan Ch. 25 (pattern recognition) and Ch. 26 (clustering).
 * Case-study rows give the outline of each chapter; take exact figures from the textbook.
 */
const { caseFlow } = require('../lib.cjs')

const umatrix = Array.from({ length: 8 }, (_, r) =>
  Array.from({ length: 10 }, (_, c) => {
    const ridge1 = Math.abs(c - (3 + 0.25 * r))
    const ridge2 = Math.abs(r - (4.6 - 0.1 * c)) + (c < 4 ? 9 : 0)
    const d = Math.min(ridge1, ridge2)
    return d < 0.6 ? 0.95 : d < 1.2 ? 0.5 : 0.08 + 0.05 * ((r * 3 + c) % 3)
  }),
)

module.exports = {
  code: 'L41',
  date: 'Mon 14 Dec 2026',
  file: 'L41-case-studies-3-4.pptx',
  title: 'Case studies: recognising and grouping',
  syllabus: 'Pattern recognition case study · Clustering case study',
  phase: 'all',
  slides: [
    { kind: 'title', section: 'Opening', notes: 'Two complete designs today: one with class labels, one with no labels at all.' },
    {
      kind: 'flow', title: 'The six-step outline, again',
      steps: caseFlow(-1),
      note: 'Today we fill it in twice: once for pattern recognition, once for clustering.',
      notes: 'Quick recall of L40: ask the class to name the six steps before showing them.',
    },
    {
      kind: 'cards', section: 'Pattern recognition', title: 'Case study 3: reading a heart trace',
      cards: [
        { h: 'The problem', b: 'From a patient\'s ECG recording, decide between two classes: healthy, or myocardial infarction (a heart attack).' },
        { h: 'Why it is hard', b: 'A raw ECG is thousands of samples per patient. Two healthy traces can look less alike than a healthy and a damaged one.' },
        { h: 'Why a network', b: 'Cardiologists read it from subtle changes in shape and timing. There is no simple formula, but there are labelled examples.' },
      ],
      note: 'Hagan, Neural Network Design, Chapter 25. The same design serves any "which class is this signal" problem.',
      notes: 'Other problems of the same shape: a bearing fault from a vibration trace, a spoken digit from audio, a faulty weld from a current waveform.',
    },
    {
      kind: 'diagram', title: 'Feature extraction does half the work',
      draw: ({ pres, slide, box, C, txt, drawBlocks }) => {
        drawBlocks(pres, slide, box, [
          { x: 0, y: 0.6, w: 1.7, h: 1.2, label: 'Raw ECG\nthousands of samples', fill: C.amberSoft },
          { x: 2.4, y: 0.6, w: 1.8, h: 1.2, label: 'Feature extraction', fill: C.white },
          { x: 4.9, y: 0.6, w: 1.75, h: 1.2, label: 'A short vector of features', fill: C.tealSoft },
        ], [[0, 1], [1, 2]])
        const feats = ['Heart rate', 'Interval lengths', 'Wave heights', 'Segment slopes', 'Age and sex']
        feats.forEach((f, i) => txt(slide, `•  ${f}`, { x: box.x + 4.95, y: box.y + 2.05 + i * 0.36, w: 1.75, h: 0.34, fontSize: 13, color: C.ink }))
      },
      h: 'From a long signal to a few meaningful numbers',
      lines: [
        'Feeding raw samples would need thousands of input weights and far more patients than exist.',
        'Instead, measure what a cardiologist looks at: intervals, amplitudes and slopes.',
        'Each feature means the same thing for every patient, whatever the recording length.',
        'Fewer inputs, fewer weights, less data needed (L35).',
      ],
      notes: 'In classical pattern recognition the features carry most of the engineering knowledge. The network only has to draw the boundary in feature space.',
    },
    {
      kind: 'table', title: 'Case study 3 on the six-step outline',
      head: ['Step', 'Hagan Ch. 25: heart attack from ECG', 'Everyday twin: Doodle Reader'],
      widths: [1.7, 5.4, 5.03],
      size: 14,
      rows: [
        ['Problem', 'Pattern recognition: healthy or myocardial infarction', 'Pattern recognition: which shape was drawn'],
        ['Data', 'Patient ECG records with a doctor\'s diagnosis; the two classes are unequal in number', 'Doodles drawn by you and your classmates'],
        ['Preprocess', 'Features extracted from each ECG, then normalised', 'The stroke reduced to a small grid of features'],
        ['Network', 'tansig hidden layer; softmax output with two neurons', 'tansig hidden layer; softmax, one neuron per shape'],
        ['Train', 'Scaled conjugate gradient with early stopping, several starts', 'The same'],
        ['Analyse', 'Confusion matrix and ROC curve on the test set', 'Confusion matrix: which shapes get mixed up'],
      ],
      rowH: 0.62,
      notes: 'Take the exact number of records, features and hidden neurons from the chapter. The training algorithm follows the L37 rule: classification networks use scaled conjugate gradient.',
    },
    {
      kind: 'cards', title: 'What the analysis found',
      cards: [
        { h: 'Unequal classes distort accuracy', tone: 'warn', b: 'With many more patients in one class, a high accuracy can hide poor results on the smaller class. Read each row of the confusion matrix.' },
        { h: 'The misses are not equal', b: 'Calling a heart attack healthy is far worse than the reverse. The ROC curve lets the hospital choose a threshold that favours catching it.' },
        { h: 'Study the errors one by one', b: 'Misclassified records are often mislabelled, badly recorded, or a type of patient missing from the data. Each one is a lead.' },
      ],
      note: 'Post-training analysis is not a final mark. It is how you find out what to fix in the data.',
      notes: 'This echoes the L38 fraud story: rare class, unequal costs, accuracy misleading.',
    },
    {
      kind: 'cards', title: 'Industry parallel: defect detection on a line',
      cards: [
        { h: 'The setting', b: 'A camera photographs every circuit board, bottle or weld leaving a production line. A network decides: pass or reject.' },
        { h: 'The same difficulties', b: 'Defects are rare, perhaps 1 part in 500. A missed defect reaches a customer; a false reject wastes a good part.' },
        { h: 'The same design', b: 'Extract features, train with cross-entropy, judge by confusion matrix, pick the threshold from the costs, and re-check when the product or lighting changes.' },
      ],
      note: 'Swap "ECG" for "camera image" and "patient" for "part": the six steps do not change.',
      notes: 'Ask the class for another example with rare positives and unequal costs: airport baggage screening, loan default, spam.',
    },
    {
      kind: 'cards', section: 'Clustering', title: 'Case study 4: mapping a forest with no labels',
      cards: [
        { h: 'The problem', b: 'A national forest is divided into 30 m by 30 m cells. For each cell there are map measurements. Which cells are alike?' },
        { h: 'No targets', b: 'Nobody supplies the right answer. The network has to find the groups by itself. This is clustering.' },
        { h: 'Why a SOM', b: 'It groups similar cells and also arranges the groups on a two-dimensional map, so ten measurements can be seen at once.' },
      ],
      note: 'Hagan, Neural Network Design, Chapter 26: forest cover data from the US Forest Service.',
      notes: 'The measurements are cartographic: elevation, slope, aspect, distances to water, roads and past fire points, and hillshade at three times of day.',
    },
    {
      kind: 'table', title: 'Case study 4 on the six-step outline',
      head: ['Step', 'Hagan Ch. 26: forest cover', 'Everyday twin: Colour Map'],
      widths: [1.7, 5.4, 5.03],
      size: 14,
      rows: [
        ['Problem', 'Clustering: which pieces of forest are alike', 'Clustering: which colours belong together'],
        ['Data', 'Ten numeric measurements for each cell of land; no targets', 'Red, green and blue values of sampled colours'],
        ['Preprocess', 'Each measurement normalised so that none dominates the distance', 'Already on a common 0 to 1 scale'],
        ['Network', 'Self-organising map: a two-dimensional grid of neurons', 'A SOM grid'],
        ['Train', 'Batch SOM algorithm for a fixed number of iterations; the neighbourhood shrinks', 'The same, shown step by step'],
        ['Analyse', 'Distance matrix, hit histogram, weight planes', 'The same three views'],
      ],
      rowH: 0.62,
      notes: 'Normalisation matters even more here than for an MLP: elevation in metres would swamp slope in degrees in every distance calculation. Take the map size and iteration count from the chapter.',
    },
    {
      kind: 'diagram', title: 'Reading the trained map',
      draw: ({ pres, slide, box, C, txt, drawGrid }) => {
        drawGrid(pres, slide, { x: box.x, y: box.y, w: box.w, h: box.h - 0.5 }, umatrix, { from: 'E6F4F4', to: C.navy })
        txt(slide, 'Distance matrix of a trained map (illustrative). Dark: large distance between neighbouring neurons.', { x: box.x, y: box.y + box.h - 0.4, w: box.w, h: 0.4, fontSize: 12, color: C.mute, align: 'center' })
      },
      h: 'Three light regions, so three kinds of land',
      lines: [
        'Dark ridges mark where the weights change sharply: the borders between clusters.',
        'The hit histogram shows how much land falls in each region.',
        'Weight planes say what defines a region: one may be high and steep, another low and near water.',
        'Naming the clusters needs someone who knows forests. The network only finds them.',
      ],
      notes: 'In the Hagan study the clusters can be compared afterwards with the known cover types, which were never shown to the network.',
    },
    {
      kind: 'cards', title: 'Industry parallel: customer segmentation',
      cards: [
        { h: 'The setting', b: 'A mobile operator has millions of prepaid customers. For each: recharge size and frequency, data used, calls made, time of day.' },
        { h: 'What the map gives', b: 'A handful of regions: heavy evening streamers, call-only users, weekend-only users. Marketing designs one plan for each.' },
        { h: 'The checks', b: 'Do the groups stay the same on next month\'s data? Does anyone in the business recognise them? If not, the clusters may be an accident.' },
      ],
      note: 'Clustering has no test error. Stability and usefulness are the only proof.',
      notes: 'Other uses of the same design: grouping sensor readings to find machine operating modes; grouping students by study pattern.',
    },
    {
      kind: 'demo', section: 'Live', tag: 'Demo', title: 'Your handwriting against a trained network',
      steps: [
        'Open a digit recogniser trained on the MNIST data set. Hold printed digits to the webcam: nearly all are right.',
        'Now volunteers write digits on paper with a ball pen and show them. Several are read wrongly.',
        'Collect the failures on the board. What do they have in common?',
      ],
      ask: 'The network scored 98% on its own test set. Why does it fail on digits written in this room?',
      app: 'Doodle Reader: teach it your shapes, then ask a classmate to draw.',
      notes: 'Expected findings: thin pen strokes, off-centre digits, a 7 with a crossbar, a 1 with a flag, lined paper. All differ from the training images.',
    },
    {
      kind: 'compare', title: 'Domain shift: the data changed, the model did not',
      left: {
        tone: 'bad', tag: 'What happened', h: 'Training and use did not match',
        items: [
          'Training digits: thick strokes, centred, size-normalised, white on black.',
          'Classroom digits: thin pen, off-centre, on lined paper, local writing styles.',
          'The test set came from the same source as the training set, so it could not warn us.',
        ],
      },
      right: {
        tone: 'good', tag: 'What to do', h: 'Close the gap between the two',
        items: [
          'Apply the same preprocessing at use as in training: centre, scale, thicken, invert.',
          'Add examples collected where the model will be used.',
          'Keep measuring after launch, and retrain when the error drifts.',
        ],
      },
      notes: 'This is extrapolation (L40) in a pattern recognition setting. The inputs are outside the region the training data covered.',
    },
    {
      kind: 'table', section: 'Exam template', title: 'A template for any case-study answer',
      head: ['Heading', 'Write', 'Marks are for'],
      widths: [2.2, 5.6, 4.33],
      rows: [
        ['1. Problem', 'Inputs, outputs and the task type', 'Naming the task correctly'],
        ['2. Data', 'Source, quantity, division into three sets', 'Coverage and the 70/15/15 idea'],
        ['3. Preprocessing', 'Normalisation, features, target coding', 'Reasons, not only names'],
        ['4. Architecture', 'Network type, layers, neurons, output function; draw it', 'A labelled diagram'],
        ['5. Training', 'Algorithm, performance function, stopping rule, restarts', 'Matching algorithm to task'],
        ['6. Analysis', 'The tool for this task, a sketch of it, and the conclusion', 'The sketch and its reading'],
      ],
      rowH: 0.6,
      notes: 'One short paragraph and one sketch per heading is a full answer. Students should practise it once on each of the five case studies.',
    },
    {
      kind: 'app', section: 'Practice', title: 'Try it in NeuroScape',
      stations: [
        { name: 'Doodle Reader', do: 'Teach it three shapes with your own drawings. Then let a classmate draw the same shapes.', see: 'The confusion matrix, and how the score drops for a different hand: domain shift.' },
        { name: 'Colour Map', do: 'Train the map and open Distance map, Hits and Weight planes in turn.', see: 'Borders between colour families and which of red, green and blue defines each region.' },
        { name: 'UPI Fraud Alarm', do: 'Revisit the threshold with the heart-attack case in mind.', see: 'How the best threshold moves when a miss costs far more than a false alarm.' },
      ],
      notes: 'Homework: write the six-step answer for either station as if it were an exam question.',
    },
    {
      kind: 'leave', title: 'Same six steps, with and without labels',
      points: [
        { h: 'Pattern recognition', b: 'Features, softmax, cross-entropy, confusion matrix and ROC.' },
        { h: 'Clustering', b: 'Normalise, train a SOM, read the distance matrix, hits and weight planes.' },
        { h: 'Domain shift', b: 'A model is only as good as the match between its training data and its use.' },
        { h: 'Answer template', b: 'Six headings, one sketch each.' },
      ],
      next: 'L42: the prediction case study, and the whole unit on one page.',
      notes: 'Remind students to bring one real time series they care about for the Beat the Model round.',
    },
  ],
}
