/**
 * The eight Unit V lecture hours (L35 to L42): what each teaches, its live classroom element,
 * the World 5 stations that practise it, and the slide deck that goes with it.
 * Decks are built by `npm run slides` into public/slides.
 */
export interface LectureHour {
  code: string
  date: string
  title: string
  /** Syllabus headings covered in the hour */
  syllabus: string
  /** Points taught, in order */
  teaches: string[]
  /** The live element planned for the classroom */
  live: { kind: string; what: string }
  /** World 5 stations to open (ids), in the order they are used */
  stations: string[]
  /** Mission stages that belong to this hour, if any */
  mission?: string
  leaveWith: string
  deck: { file: string; slides: number }
}

export const unit5Plan: LectureHour[] = [
  {
    code: 'L35',
    date: 'Thu 26 Nov',
    title: 'Before training: choosing and preparing data',
    syllabus: 'Pre-training steps · Selection of data · Data preprocessing',
    teaches: [
      'The design flow: before, during and after training',
      'Covering the input space; how much data; training, validation and test sets',
      'Normalisation, nonlinear transforms, feature extraction, PCA',
      'Coding targets (one-of-N) and handling missing data',
    ],
    live: { kind: 'Break and fix', what: 'A classifier trained on biased data fails in front of the class, then works once balanced data is added.' },
    stations: ['traffic', 'sensor'],
    mission: 'Stages 1 and 2: Collect, Prepare',
    leaveWith: 'Why data decisions come before any network decisions.',
    deck: { file: 'L35-data-and-preprocessing.pptx', slides: 15 },
  },
  {
    code: 'L36',
    date: 'Mon 30 Nov',
    title: 'Which network, and how big?',
    syllabus: 'Choice of network architecture · Training the network',
    teaches: [
      'Naming the task: fitting, pattern recognition, clustering or prediction',
      'The network for each: MLP, RBF, LVQ, SOM, NARX',
      'Layers, hidden neurons, output transfer function, input selection',
      'The training loop in outline',
    ],
    live: { kind: 'Demo', what: 'Adding neurons and layers and watching the decision boundary bend.' },
    stations: ['sensor'],
    mission: 'Stage 3: Design',
    leaveWith: 'A table of task type, suitable network and output function.',
    deck: { file: 'L36-network-architecture.pptx', slides: 16 },
  },
  {
    code: 'L37',
    date: 'Wed 2 Dec',
    title: 'Training: where to start, how to step, when to stop',
    syllabus: 'Weight initialization · Choice of training algorithm · Stopping criteria',
    teaches: [
      'Small random weights; why not zero (symmetry); Nguyen-Widrow',
      'Steepest descent, Levenberg-Marquardt, scaled conjugate gradient',
      'Gradient, goal, maximum iterations and early stopping',
    ],
    live: { kind: 'Break and fix', what: 'A zero start that never learns, then three learning rates side by side.' },
    stations: ['valley'],
    mission: 'Stage 4: Train',
    leaveWith: 'How to decide when to stop training.',
    deck: { file: 'L37-training-choices.pptx', slides: 15 },
  },
  {
    code: 'L38',
    date: 'Mon 7 Dec',
    title: 'What does "good" mean? Performance functions',
    syllabus: 'Choice of performance function · Post-training analysis',
    teaches: [
      'Mean square error, cross-entropy, regularisation',
      'Committees of networks',
      'The purpose of post-training analysis; reading the three errors',
    ],
    live: { kind: 'Industry story', what: 'The fraud detector that was 99% accurate and caught no fraud.' },
    stations: ['fraud', 'battery'],
    mission: 'Stage 5: Inspect',
    leaveWith: 'Which performance function suits which task.',
    deck: { file: 'L38-performance-functions.pptx', slides: 16 },
  },
  {
    code: 'L39',
    date: 'Wed 9 Dec',
    title: 'Post-training analysis: a tool for each task',
    syllabus: 'Post-training analysis · Pattern recognition · Clustering · Prediction',
    teaches: [
      'Fitting: regression plot and R',
      'Pattern recognition: confusion matrix and ROC curve',
      'Clustering: distance matrix, hit histogram, weight planes',
      'Prediction: error autocorrelation and input-error cross-correlation',
    ],
    live: { kind: 'Class data demo', what: 'A two-minute class survey clustered live with a SOM.' },
    stations: ['battery', 'fraud', 'colours', 'wave'],
    leaveWith: 'The right analysis tool for each task type.',
    deck: { file: 'L39-post-training-analysis.pptx', slides: 14 },
  },
  {
    code: 'L40',
    date: 'Thu 10 Dec',
    title: 'Overfitting, extrapolation and two case studies',
    syllabus: 'Overfitting and extrapolation · Function approximation · Probability estimation',
    teaches: [
      'Overfitting: symptoms and cures',
      'Extrapolation and novelty detection',
      'Case study 1: function approximation (Hagan Ch. 23)',
      'Case study 2: probability estimation (Hagan Ch. 24)',
    ],
    live: { kind: 'Break and fix', what: 'Trained on autumn, asked about winter; then an overfitted curve cured by early stopping.' },
    stations: ['battery', 'cricket'],
    leaveWith: 'How to tell overfitting from extrapolation, and two complete case-study flows.',
    deck: { file: 'L40-overfitting-and-case-studies-1-2.pptx', slides: 17 },
  },
  {
    code: 'L41',
    date: 'Mon 14 Dec',
    title: 'Case studies: recognising and grouping',
    syllabus: 'Pattern recognition case study · Clustering case study',
    teaches: [
      'Case study 3: pattern recognition (Hagan Ch. 25)',
      'Case study 4: clustering (Hagan Ch. 26)',
      'Industry parallels: defect detection, customer segmentation',
      'Domain shift, and a template for case-study answers',
    ],
    live: { kind: 'Demo', what: "Students' handwritten digits read through the webcam; some fail." },
    stations: ['doodle', 'colours', 'fraud'],
    leaveWith: 'A template for writing a case-study answer in the exam.',
    deck: { file: 'L41-case-studies-3-4.pptx', slides: 16 },
  },
  {
    code: 'L42',
    date: 'Wed 16 Dec',
    title: 'Predicting what comes next, and the whole unit',
    syllabus: 'Prediction case study · Unit 5 recap',
    teaches: [
      'Tapped delay lines and the NARX network',
      'Case study 5: prediction (Hagan Ch. 27)',
      'Load forecasting, demand prediction, concept drift',
      'The full design flow on one page',
    ],
    live: { kind: 'Competition', what: 'Beat the Model: students predict the next value of a real series against the network.' },
    stations: ['wave'],
    mission: 'Stage 6: Ship, and the whole mission as revision',
    leaveWith: 'The complete Unit 5 flow, ready for the SEE.',
    deck: { file: 'L42-prediction-and-recap.pptx', slides: 16 },
  },
]

/** Lecture hours in which a station is used, in order. */
export const lecturesOfStation = (stationId: string) => unit5Plan.filter((l) => l.stations.includes(stationId))

/** Address of a deck under the app's base path. */
export const deckHref = (file: string) => `${import.meta.env.BASE_URL}slides/${file}`
