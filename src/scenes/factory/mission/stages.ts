import type { Config } from './sim'

/**
 * The six stages of the mission. Each is one decision point of Unit V, and each names the
 * stations that practise it in depth, so the mission is the thread that ties the stations together.
 */
export interface Stage {
  id: 'data' | 'prepare' | 'design' | 'train' | 'inspect' | 'ship'
  name: string
  /** Syllabus topics this stage covers */
  syllabus: string
  /** The question the player is answering */
  question: string
  /** Why it matters, in plain words */
  why: string
  /** How to read the picture for this stage */
  picture: string
  /** Stations that go deeper into this stage */
  stations: string[]
  tutor: {
    say: string
    ask: string
    mistake: { label: string; patch: Partial<Config> }
    fix: { label: string; patch: Partial<Config> }
  }
}

export const stages: Stage[] = [
  {
    id: 'data',
    name: 'Collect',
    syllabus: 'Pre-training steps · Selection of data',
    question: 'Which past orders will the model learn from?',
    why: 'The model can only learn situations that are in its data. Every square on the map with no dots is a situation it will have to guess. Each record also costs money to check, so more is not free.',
    picture: 'Across: hour of the day. Up: distance. Grey dots are orders the app will get after launch. Coloured dots are the records you chose: blue to train, amber to validate, rose to test. Red squares have no training data.',
    stations: ['traffic'],
    tutor: {
      say: 'Before any network, we choose data. Look at the red squares: the model will be blind there. Notice the test set comes from the same sample, so it is blind in the same places.',
      ask: 'If we only log lunchtime orders near the kitchen, what will the model say about a 9 km order at 8 pm? Will our test error warn us?',
      mistake: { label: 'Lunch only, nearby only', patch: { window: 'lunch', area: 'near', size: 60 } },
      fix: { label: 'Whole day, whole city, 200 records', patch: { window: 'all', area: 'all', size: 200 } },
    },
  },
  {
    id: 'prepare',
    name: 'Prepare',
    syllabus: 'Data preprocessing',
    question: 'Is the data clean and scaled before the network sees it?',
    why: 'Sigmoid neurons respond only to inputs of about −1 to 1. Distance in metres is in the thousands, which pins them flat. Broken records, where a rider forgot to tap "Delivered", pull the whole model towards nonsense.',
    picture: 'Left: each training order as the network receives it. The green box is the range where neurons can respond. Right: the delivery times in your records; red dots are broken records lasting hours.',
    stations: ['sensor', 'doodle'],
    tutor: {
      say: 'Two jobs here: scale the inputs so they land inside the green box, and remove records that are obviously wrong. Neither changes the network. Both change what it can learn.',
      ask: 'One record says a delivery took 5 hours. Should the model learn from it? How would you decide which records to drop?',
      mistake: { label: 'Raw metres, broken records kept', patch: { normalise: false, clean: false } },
      fix: { label: 'Scale and clean', patch: { normalise: true, clean: true } },
    },
  },
  {
    id: 'design',
    name: 'Design',
    syllabus: 'Choice of network architecture',
    question: 'How many hidden neurons?',
    why: 'Each hidden neuron adds one bend to what the network can draw. Too few and it cannot follow the rush hours. Too many for the data you have and it memorises individual orders instead of the pattern.',
    picture: 'The network: two inputs, your hidden neurons, one output in minutes. The bar compares its number of weights with the number of training orders. You want several orders for every weight.',
    stations: ['sensor', 'battery'],
    tutor: {
      say: 'The inputs and outputs are fixed by the problem. The hidden layer is our choice. Count the parameters, then compare with the number of training examples.',
      ask: 'With 42 training orders, how many neurons would you trust? What does the network do with the spare freedom?',
      mistake: { label: '20 neurons on 60 records', patch: { neurons: 20, size: 60, stopping: 'fixed' } },
      fix: { label: '8 neurons on 200 records', patch: { neurons: 8, size: 200 } },
    },
  },
  {
    id: 'train',
    name: 'Train',
    syllabus: 'Weight initialization · Choice of training algorithm · Stopping criteria · Performance function',
    question: 'Which algorithm, what learning rate, when to stop, how many starts?',
    why: 'Training rolls the weights downhill on the error. A learning rate that is too high makes the error explode. Stopping when the validation error stops improving prevents memorising. Different starting weights end in different places, so several starts are safer than one.',
    picture: 'Top: predicted delivery time through the day for a 2 km order (blue) and a 7 km order (pink), with nearby training orders as dots. Bottom: error on training orders (blue) and validation orders (amber) as training runs.',
    stations: ['valley'],
    tutor: {
      say: 'Watch the two error lines. Blue is what the network trains on; amber is orders it never trains on. When amber stops falling, more training only memorises.',
      ask: 'Why do we start from several random sets of weights? Which one do we keep, and judged on which data?',
      mistake: { label: 'Steepest descent, α = 3', patch: { algo: 'sd', alpha: 3, stopping: 'fixed', restarts: 1 } },
      fix: { label: 'Levenberg-Marquardt, early stopping, 3 starts', patch: { algo: 'lm', stopping: 'early', restarts: 3 } },
    },
  },
  {
    id: 'inspect',
    name: 'Inspect',
    syllabus: 'Post-training analysis · Overfitting and extrapolation',
    question: 'Is it good enough to ship, and where can it not be trusted?',
    why: 'Three errors tell the story. All high: the network is too weak or badly trained. Training low but test high: it memorised. All low: good, but only for the situations your data covers. A square marked "no test data" is not safe; it is unknown.',
    picture: 'Left: each test order, real time across and predicted time up. On the dashed line means perfect. Right: error in each situation. Grey squares have no test orders at all.',
    stations: ['fraud', 'battery'],
    tutor: {
      say: 'This is the last look before real customers. Read the three errors first, then the scatter, then the grid. The grey squares are the trap: no error is shown because there is nothing to test with.',
      ask: 'The test error is 3 minutes. Does that mean customers will see 3-minute errors after launch? What would have to be true?',
      mistake: { label: 'Show a blind model', patch: { window: 'lunch', area: 'all' } },
      fix: { label: 'Show a covered model', patch: { window: 'all', area: 'all' } },
    },
  },
  {
    id: 'ship',
    name: 'Ship',
    syllabus: 'Applications and case studies · Prediction',
    question: 'How many minutes of safety do we add to each promise?',
    why: 'A promise that is too short gets broken, and broken promises are refunded. A promise that is too long sends the customer to a rival app. The buffer trades one against the other, and no buffer can rescue a model that is blind.',
    picture: 'Each square is one live order: green arrived on time, red arrived late and was refunded, grey went to a rival because the promise was too long. After the month, the map shows where orders went wrong.',
    stations: ['cricket', 'colours', 'wave'],
    tutor: {
      say: 'Now the model meets orders from every hour and every distance. Compare where the red and grey fall with the red squares we saw in stage 1.',
      ask: 'Late orders cost a refund; long promises lose customers. Which is worse for this business? Who should decide the buffer?',
      mistake: { label: 'No buffer', patch: { buffer: 0 } },
      fix: { label: '4-minute buffer', patch: { buffer: 4 } },
    },
  },
]

/** Which mission stage each station belongs to, for the "where this fits" strip on the stations. */
export const stageOfStation = (stationId: string) => stages.findIndex((s) => s.stations.includes(stationId))
