import { journeyStages } from './stages'
import type { Phase } from './gameDraw'

/** The levels of the playable journey. Each one hands the player one more idea. */
export interface Level {
  id: 'first' | 'weights' | 'fix' | 'bend' | 'teach' | 'trust'
  name: string
  goal: string
  brief: string
  /** What the player should take away, shown when the level ends */
  lesson: string
}

export const levels: Level[] = [
  {
    id: 'first',
    name: 'First flight',
    goal: 'Launch three motors and watch each reading travel to a decision.',
    brief: 'This network is already trained. Pull the sling, let go, and follow the signal: encode, weigh, add, activate, weigh again, softmax, decode. The network fires its answer at one of three bays. A right answer knocks the crates down.',
    lesson: 'A reading becomes a decision in seven small steps, and every step is ordinary arithmetic.',
  },
  {
    id: 'weights',
    name: 'The weight workshop',
    goal: 'Take one weight in your hand. See what it does, what breaks when you move it, and how training finds its value.',
    brief: 'Every wire carries one number, its weight. Tap any wire. The valley in the middle shows the average cost over all 180 logged readings for every value that one weight could take. Drag the marker and watch the map and the score change. Then let training do what you just did by hand.',
    lesson: 'A weight has no meaning alone. Its value is simply wherever the downhill steps left it, and the right place for one weight depends on where all the others are.',
  },
  {
    id: 'fix',
    name: 'The knocked gate',
    goal: 'One hidden neuron has been knocked out of place. Repair its weights until every motor lands in the right bay.',
    brief: 'The red-ringed neuron has the wrong weights, so its line across the readings is in the wrong place and the shots miss. Use the three sliders to rotate and slide its line back to where it separates the colours, then reload the motors.',
    lesson: 'Weights and bias place one line. A single neuron in the wrong place is enough to send good readings to the wrong bay.',
  },
  {
    id: 'bend',
    name: 'No bend, no hit',
    goal: 'These shots miss however the weights are trained. Find what is missing.',
    brief: 'This network was trained properly, but its hidden neurons use the Linear activation: a = n, no curve. Launch a motor and watch stop 4 do nothing. Then change the activation function and reload.',
    lesson: 'Without the bend in the activation function the whole network is one straight-line calculation, and no straight line fences off the healthy corner.',
  },
  {
    id: 'teach',
    name: 'Teach it',
    goal: 'The weights are random. Train the network until it gets at least 90% of the logged readings right.',
    brief: 'Nobody types in weights. Launch a motor: after each shot the blame flows back and every weight shifts a little. A few shots will not be enough, so when you have seen it happen, run many passes over the whole log.',
    lesson: 'Weights come from thousands of small corrections, each one moving every weight slightly against its share of the blame.',
  },
  {
    id: 'trust',
    name: 'Do not be fooled',
    goal: 'After each shot, decide: would you act on this answer?',
    brief: 'The trained network always answers, and always sounds sure. Two of these four readings come from a faulty sensor and lie far outside anything in the log. Watch the readings on the motor before you launch, then say whether the answer can be trusted.',
    lesson: 'Confidence measures distance from the boundaries the network drew. It says nothing about readings unlike any it was trained on.',
  },
]

/** The stop of the study mode that goes with each phase of a flight, for the tutor notes. */
export const stageOfPhase: Record<Phase, number> = {
  aim: 0,
  encode: 0,
  weigh1: 1,
  sum: 1,
  activate: 2,
  weigh2: 3,
  softmax: 4,
  shot: 4,
  impact: 5,
  learn: 6,
}

export const tutorFor = (phase: Phase) => journeyStages[stageOfPhase[phase]].tutor
