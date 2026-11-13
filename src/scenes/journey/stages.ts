/**
 * The eight stops on "The Journey of a Signal", told through one industry case: predictive
 * maintenance of a factory motor. One sensor reading goes in at stop 1 and comes out as a decision
 * at stop 5; stops 6 and 7 show where the weights came from; stop 8 asks what the network has
 * really understood. Each stop carries notes for a tutor taking the class through it.
 */
export const journeyCase = {
  title: 'predictive maintenance of a motor',
  story:
    'A bottling plant runs hundreds of conveyor motors. A bearing that fails without warning stops the line for hours; replacing bearings on a fixed calendar wastes good parts. So each motor carries a small sensor module, an accelerometer and a temperature probe, the same parts found in an Arduino kit. Every few seconds it reports how hard the motor is vibrating and how hot its bearing is. A network turns each reading into one of three instructions: keep running, book a service, or stop now.',
  facts: [
    'Inputs: vibration velocity in mm/s (0 to 10) and bearing temperature in °C (40 to 110).',
    'Training data: 180 past readings, each labelled from the maintenance engineer\'s log.',
    'Why a network: "healthy" needs both readings low, "stop" needs either one very high. No single straight line separates the three.',
    'What a mistake costs: a missed "stop" destroys a motor; a false "stop" halts production for nothing.',
  ],
  honest:
    'The readings here are simulated and the limits are illustrative. A real system would also use the vibration spectrum and motor current, far more data, and mostly healthy examples.',
}

export interface JourneyStage {
  id: 'encode' | 'weights' | 'activation' | 'layer' | 'decode' | 'error' | 'learn' | 'new'
  name: string
  title: string
  /** What happens here, in plain words */
  what: string
  /** How to read the picture */
  picture: string
  /** The one sentence a student should be able to say afterwards */
  takeaway: string
  /** Things to try with the controls */
  tryIt: string[]
  tutor: { minutes: number; say: string; ask: string; wrong: string; right: string }
}

export const journeyStages: JourneyStage[] = [
  {
    id: 'encode',
    name: 'Encode',
    title: 'The motor becomes two numbers',
    what: 'A network cannot hear a motor rattle or feel it run hot. The sensor module measures two things: vibration in mm/s and bearing temperature in °C. These arrive in different units and different sizes (5 against 82), so each is rescaled to lie between −1 and 1 using its own range. That is min-max normalisation, and the neurons ahead respond best to small numbers centred on zero.',
    picture: 'Left: the network, with the two inputs lit. Right: the motor shaking and heating as you move the sliders, and each measurement sliding from the sensor\'s scale onto the −1 to 1 scale. The pair [p₁, p₂] is all the network will ever know about this motor.',
    takeaway: 'The network never meets the motor. It meets the vector p, and anything the sensors do not measure does not exist for it.',
    tryIt: [
      'Set vibration to 5 mm/s. p₁ becomes 0: the middle of the range, not "no vibration".',
      'Compare 82 °C before and after scaling. Without it, temperature would swamp vibration simply by being a bigger number.',
      'Think of a fault these two sensors cannot see, such as a loose mounting bolt or a failing winding.',
    ],
    tutor: {
      minutes: 4,
      say: 'Whatever we choose to measure is the whole world for the network. Here that is two numbers. The motor\'s age, its load and the sound it makes are not in the input, so the network cannot use them.',
      ask: 'Temperature runs from 40 to 110, vibration from 0 to 10. If we fed the raw numbers, which input would the neurons mostly react to, and why is that wrong?',
      wrong: 'The network monitors the motor.',
      right: 'It receives two scaled numbers. Choosing the sensors and the scaling is engineering done before the network starts.',
    },
  },
  {
    id: 'weights',
    name: 'Weigh',
    title: 'One neuron weighs the evidence',
    what: 'A neuron multiplies each input by a weight, adds the results, and adds a bias: n = w₁p₁ + w₂p₂ + b. A large weight means "this input matters a lot to me". A negative weight means "more of this counts against". The bias is a head start that does not depend on the input. The result n is the net input: one number saying how strongly this reading matches what the neuron looks for.',
    picture: 'Right, top: every logged reading plotted by vibration and temperature, coloured by the engineer\'s label, with your reading ringed in white. The bright line is where this neuron\'s net input is exactly zero. On the shaded side n is positive. The arrow is the weight vector: it points to the side the neuron "likes". Below: the three pieces that add up to n.',
    takeaway: 'Weights set the direction a neuron looks in; the bias slides its line; n measures how far the input is on the liked side.',
    tryIt: [
      'Drag w₁ up and down: the line rotates. Drag b: the line slides without turning.',
      'Set w₂ to 0. The neuron now ignores temperature completely, and its line stands upright: a pure vibration alarm.',
      'Double both weights and the bias. The line does not move, but n doubles.',
    ],
    tutor: {
      minutes: 7,
      say: 'This is the whole neuron: weigh, add, shift. Geometrically it draws one straight line across the plot and reports which side the reading is on and how far. A simple alarm, "trip above 7 mm/s", is exactly one such neuron.',
      ask: 'Make this neuron an over-temperature alarm that turns positive above 95 °C whatever the vibration. What must w₁, w₂ and b be? (95 °C is p₂ = 0.57.)',
      wrong: 'A weight stores a fact about motors.',
      right: 'A weight is the strength and sign of one connection. Meaning appears only in how all the weights work together.',
    },
  },
  {
    id: 'activation',
    name: 'Activate',
    title: 'The neuron decides how loudly to speak',
    what: 'The net input n could be any size. The activation function squeezes it into the neuron\'s output a. With the tan-sigmoid, a large positive n gives nearly +1, a large negative n gives nearly −1, and the region near zero is where the output changes quickly. This bend is essential: without it, layers of neurons would collapse into a single straight-line calculation, and no straight line separates healthy, service and stop.',
    picture: 'The curve is the activation function. The dot is this neuron for this reading: across is n, up is a. The shaded ends are saturation, where the curve is nearly flat and the neuron barely reacts to changes in its input.',
    takeaway: 'The activation function turns "how much evidence" into "how strongly I respond", and its bend is what lets a network draw boundaries with corners.',
    tryIt: [
      'Move the reading so the dot runs along the curve. Watch the slope fall to nearly zero at the ends.',
      'Switch to Linear, go to stop 7 and train. The network stalls near 77% right.',
      'Switch to ReLU: no upper limit, and a dead flat zero for negative n.',
    ],
    tutor: {
      minutes: 5,
      say: 'Two jobs. It limits the output, and it bends the response. The bend is the important one. Stack straight-line neurons and you still have a straight line; stack bent ones and you can box in the healthy corner.',
      ask: 'When the dot sits at the flat end, the slope is nearly zero. What will that do to learning at stop 7?',
      wrong: 'The activation function is just a way to keep numbers small.',
      right: 'Its curvature is what gives a multilayer network more power than a single alarm threshold.',
    },
  },
  {
    id: 'layer',
    name: 'Layer',
    title: 'Four neurons give four opinions',
    what: 'A layer is several neurons looking at the same reading, each with its own weights. Each draws its own line and reports its own a. Together the four outputs form a new description of the motor\'s state: not "5 mm/s and 82 °C" any more, but "which side of line 1, which side of line 2…". This is the hidden layer\'s code for the reading, written a¹. In matrix form: a¹ = f(W¹p + b¹).',
    picture: 'Right, top: the four lines, one colour per hidden neuron. Below: the four outputs for your reading. Readings in the same cell between the lines get nearly the same code.',
    takeaway: 'A hidden layer re-describes the input in its own terms, and those terms are whatever made the final answer easiest during training.',
    tryIt: [
      'With random weights the lines fall anywhere. Switch to trained weights: they move to the edges of the healthy corner and the stop region.',
      'Move the reading across one line and watch one bar swing from one sign to the other.',
      'Find two different readings with almost the same code. To the output layer they are the same motor.',
    ],
    tutor: {
      minutes: 5,
      say: 'Nobody told these neurons what to detect. After training, one has become roughly "vibration too high", another "bearing too hot". The network invented its own alarm thresholds. That is the point of a hidden layer.',
      ask: 'Why four neurons? Count the straight edges needed to fence off the healthy corner and the stop region on the plot.',
      wrong: 'Each hidden neuron is assigned a feature by the designer.',
      right: 'The designer chooses only how many. Training decides what each one responds to.',
    },
  },
  {
    id: 'decode',
    name: 'Decode',
    title: 'From scores to an instruction',
    what: 'The output layer weighs the hidden code the same way: n² = W²a¹ + b², one score per class. Scores can be any size and sign, so softmax converts them: raise e to each score, then divide by the total. The results are positive and add up to 1, so they read as probabilities. Decoding is the last step: pick the largest, name the class, and report how sure the network is. That label is what reaches the operator\'s screen.',
    picture: 'Three rows, one per class. Left bar: the raw score. Middle: e to that score. Right: its share of the total, the probability. The winner is outlined. If no class reaches your "sure" level, the honest output is "not sure", and a person should look.',
    takeaway: 'The network outputs numbers, not instructions. Softmax makes them comparable and decoding turns the largest into a label with a confidence.',
    tryIt: [
      'Put the reading on a border between two classes. Two probabilities sit near 50%.',
      'Raise the "sure" level to 90% and see how many readings become "not sure".',
      'Notice that softmax always adds to 100%, even with random weights that know nothing.',
    ],
    tutor: {
      minutes: 6,
      say: 'Three things happen here and students blur them: scoring, normalising, deciding. The first belongs to the weights. The second is fixed arithmetic. The third is a choice the plant makes, and it can be changed without retraining.',
      ask: 'The network says "Service soon, 55%" and "Stop now, 43%". What should the screen show the operator? Who should decide that rule: the engineer who built the model, or the plant manager?',
      wrong: 'A softmax output of 80% means the network is right 80% of the time.',
      right: 'It is the network\'s own estimate. Whether it deserves trust must be checked on test data.',
    },
  },
  {
    id: 'error',
    name: 'Compare',
    title: 'How wrong was it?',
    what: 'To learn, the network needs to know how far its answer was from the truth. The maintenance engineer\'s log gives the right label for this reading, coded one-of-N: 1 for the right class, 0 for the others. The error measure is cross-entropy: F = −ln(probability given to the right class). A confident right answer costs almost nothing. A confident wrong answer costs a great deal.',
    picture: 'Left: the network\'s three probabilities as solid bars, with the target drawn as an outline. Right: the cost curve. The dot shows the probability given to the true class and what it costs.',
    takeaway: 'The performance function turns "right or wrong" into one number that training can push downhill.',
    tryIt: [
      'With random weights the cost is often above 1. With trained weights it is close to 0.',
      'Change "The engineer\'s log says" to a wrong label and watch the cost jump. One mislabelled record pulls the weights this hard.',
      'Find the probability at which the cost is exactly 1 (it is about 37%).',
    ],
    tutor: {
      minutes: 4,
      say: 'Only the probability of the true class enters the cost. And the true class comes from a person\'s log entry, so the network can never be better than its labels.',
      ask: 'Cross-entropy charges the same for calling a failing motor healthy as for calling a healthy motor failing. Is that what the plant wants? Where would you put the difference in cost?',
      wrong: 'The error is the number of wrong answers.',
      right: 'It is a smooth measure of how much probability the true class received, so that small improvements can be detected.',
    },
  },
  {
    id: 'learn',
    name: 'Learn',
    title: 'Where the weights come from',
    what: 'Nobody types in the weights. They start as random numbers and are corrected, a little at a time, by backpropagation. The output error is a² − t. That blame is passed backwards through the same weights the signal came forward on, scaled by each hidden neuron\'s slope, to give every neuron a sensitivity s. Then each weight moves by −α × (sensitivity of the neuron it feeds) × (signal it carried). Repeat over all 180 logged readings, many times.',
    picture: 'On the network, amber pulses run backwards: that is the blame. Right, top: the plot coloured by what the network would answer at each point, with the logged readings on top. Below: the average cost over all readings as training runs.',
    takeaway: 'Weights are not programmed. They are whatever random numbers became after thousands of small corrections that each reduced the error a little.',
    tryIt: [
      'Press "One step on this reading" and watch which connections flash. Green grew, red shrank.',
      'Start from random weights and train. Watch the coloured regions find the healthy corner.',
      'Set the learning rate to its maximum and train again. The cost jumps about.',
      'Train with the Linear activation and compare the final score.',
    ],
    tutor: {
      minutes: 9,
      say: 'Three ideas. The error at the output is known. Each hidden neuron\'s share of the blame comes back through the weights. Each weight changes in proportion to the blame at its far end and the signal at its near end. A connection that carried nothing changes nothing.',
      ask: 'A hidden neuron is saturated, with slope near zero. How much of the blame gets through it to its own weights? What does that mean for the start of training?',
      wrong: 'Training searches through possible weights and picks the best.',
      right: 'It never searches. It takes one small downhill step after another from wherever it started, and stops where the slope runs out.',
    },
  },
  {
    id: 'new',
    name: 'New input',
    title: 'What does it understand?',
    what: 'Send the trained network a reading it has never seen. It does exactly what it did at stops 1 to 5: encode, weigh, activate, weigh again, softmax, decode. It answers well when the new reading falls among the logged ones, because the lines it learnt separate that region correctly. It has no idea what a motor is. Send it a reading no working sensor could produce, such as 20 °C from a broken probe, and it answers just as confidently.',
    picture: 'The plot now extends beyond the dashed box where every logged reading lay. Colours show the answer at each point. Tap anywhere to send a new reading and follow it through the network on the left.',
    takeaway: 'A trained network understands where an input lies relative to boundaries it drew through its training data, and nothing beyond that.',
    tryIt: [
      'Tap inside a coloured region, far from any border: a confident, correct answer.',
      'Tap near a border: the probabilities split, as they should.',
      'Press "Broken temperature probe". The network gives a firm instruction from a reading that is plainly a fault.',
    ],
    tutor: {
      minutes: 6,
      say: 'This is generalisation and its limit in one picture. Inside the box the network interpolates between logged readings and is usually right. Outside the box it extends its lines for ever. In a plant the dangerous case is a failed sensor: the model keeps issuing confident instructions about a motor it can no longer see.',
      ask: 'How would you make the system say "this reading is not like anything I was trained on"? What simple check on the two inputs would catch a broken probe?',
      wrong: 'A high confidence means the network recognises the situation.',
      right: 'Confidence only measures distance from the boundaries. Far from the data, it says nothing about being right.',
    },
  },
]

export const journeyMinutes = journeyStages.reduce((sum, s) => sum + s.tutor.minutes, 0)
