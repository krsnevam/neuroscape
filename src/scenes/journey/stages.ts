/**
 * The eight stops on "The Journey of a Signal". One mango goes in at stop 1 and comes out as a
 * decision at stop 5; stops 6 and 7 show where the weights came from; stop 8 asks what the
 * network has really understood. Each stop carries notes for a tutor taking the class through it.
 */
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
    title: 'The mango becomes two numbers',
    what: 'A network cannot see, touch or smell. Before anything else, the thing in front of it must be turned into numbers. Here a mango is measured twice: how yellow it is and how soft it is, each on a 0 to 10 scale. Those are then rescaled to lie between −1 and 1, because the neurons ahead respond best to small numbers centred on zero.',
    picture: 'Left: the network, with the two inputs lit. Right: the mango you set with the sliders, and each measurement sliding from its 0 to 10 scale onto the −1 to 1 scale. The pair [p₁, p₂] is all the network will ever know about this mango.',
    takeaway: 'The network never meets the mango. It meets the vector p, and anything not measured does not exist for it.',
    tryIt: [
      'Slide colour to 5. p₁ becomes 0: the middle of the range, not "nothing".',
      'Set two very different-looking mangoes that give the same p. The network cannot tell them apart.',
    ],
    tutor: {
      minutes: 4,
      say: 'Hold up any object and ask what numbers describe it. Whatever we choose to measure is the whole world for the network. Smell, weight and variety are not here, so the network cannot use them.',
      ask: 'A mango is yellow because it is ripe, or because it is a yellow variety picked early. Which measurement would tell these apart? Is it in our input?',
      wrong: 'The network looks at the mango.',
      right: 'It receives two numbers. Choosing and scaling those numbers is our job, done before the network starts.',
    },
  },
  {
    id: 'weights',
    name: 'Weigh',
    title: 'One neuron weighs the evidence',
    what: 'A neuron multiplies each input by a weight, adds the results, and adds a bias: n = w₁p₁ + w₂p₂ + b. A large weight means "this input matters a lot to me". A negative weight means "more of this counts against". The bias is a head start that does not depend on the input. The result n is called the net input: a single number saying how strongly this mango matches what the neuron looks for.',
    picture: 'Right, top: every training mango plotted by colour and softness, with your mango ringed in white. The bright line is where this neuron\'s net input is exactly zero. On the shaded side n is positive. The arrow is the weight vector: it points in the direction the neuron "likes". Below: the three pieces that add up to n.',
    takeaway: 'Weights set the direction a neuron looks in; the bias slides its line; n measures how far the input is on the liked side.',
    tryIt: [
      'Drag w₁ up and down: the line rotates. Drag b: the line slides without turning.',
      'Set w₂ to 0. The neuron now ignores softness completely, and its line stands upright.',
      'Double both weights and the bias. The line does not move, but n doubles.',
    ],
    tutor: {
      minutes: 7,
      say: 'This is the whole neuron: weigh, add, shift. Geometrically it draws one straight line across the input plane and reports which side the input is on and how far. Everything a network does is built from this.',
      ask: 'If I want a neuron that fires for "soft, whatever the colour", what should w₁, w₂ and b be? Set them and check against the plot.',
      wrong: 'A weight stores a fact about mangoes.',
      right: 'A weight is the strength and sign of one connection. Meaning appears only in how all the weights work together.',
    },
  },
  {
    id: 'activation',
    name: 'Activate',
    title: 'The neuron decides how loudly to speak',
    what: 'The net input n could be any size. The activation function squeezes it into the neuron\'s output a. With the tan-sigmoid, a large positive n gives nearly +1, a large negative n gives nearly −1, and the region near zero is where the output changes quickly. This bend is essential: without it, layers of neurons would collapse into a single straight-line calculation.',
    picture: 'The curve is the activation function. The dot is this neuron for this mango: across is n, up is a. The shaded ends are saturation, where the curve is nearly flat and the neuron barely reacts to changes in its input.',
    takeaway: 'The activation function turns "how much evidence" into "how strongly I respond", and its bend is what lets a network draw curved boundaries.',
    tryIt: [
      'Move the mango so the dot runs along the curve. Watch the slope reading fall to nearly zero at the ends.',
      'Switch to Linear, go to stop 7 and train. The network cannot enclose the ripe mangoes.',
      'Switch to ReLU: no upper limit, and a dead flat zero for negative n.',
    ],
    tutor: {
      minutes: 5,
      say: 'Two jobs. It limits the output, and it bends the response. The bend is the important one. Stack straight-line neurons and you still have a straight line; stack bent ones and you can build any shape.',
      ask: 'When the dot sits at the flat end, the slope is nearly zero. What will that do to learning at stop 7?',
      wrong: 'The activation function is just a way to keep numbers small.',
      right: 'Its curvature is what gives a multilayer network more power than a single neuron.',
    },
  },
  {
    id: 'layer',
    name: 'Layer',
    title: 'Four neurons give four opinions',
    what: 'A layer is several neurons looking at the same input, each with its own weights. Each draws its own line and reports its own a. Together the four outputs form a new description of the mango: not "colour and softness" any more, but "which side of line 1, which side of line 2…". This is the hidden layer\'s code for the mango, written a¹. In matrix form: a¹ = f(W¹p + b¹).',
    picture: 'Right, top: the four lines, one colour per hidden neuron. Below: the four outputs for your mango. Mangoes in the same cell between the lines get nearly the same code.',
    takeaway: 'A hidden layer re-describes the input in its own terms, and those terms are whatever made the final answer easiest during training.',
    tryIt: [
      'With random weights the lines fall anywhere. Switch to trained weights: they move to the edges of the ripe region.',
      'Move the mango across one line and watch exactly one bar flip sign.',
      'Find two mangoes with different measurements and almost the same code.',
    ],
    tutor: {
      minutes: 5,
      say: 'Nobody told these neurons what to detect. After training, one has become roughly "too soft", another "yellow enough". The network invented its own features. That is the point of a hidden layer.',
      ask: 'Why four neurons? Look at the shape of the ripe region on the plot. How many straight edges does it have?',
      wrong: 'Each hidden neuron is assigned a feature by the designer.',
      right: 'The designer chooses only how many. Training decides what each one responds to.',
    },
  },
  {
    id: 'decode',
    name: 'Decode',
    title: 'From scores to an answer',
    what: 'The output layer weighs the hidden code the same way: n² = W²a¹ + b², one score per class. Scores can be any size and sign, so softmax converts them: raise e to each score, then divide by the total. The results are positive and add up to 1, so they read as probabilities. Decoding is the last step: pick the largest, name the class, and report how sure the network is.',
    picture: 'Three rows, one per class. Left bar: the raw score. Middle: e to that score. Right: its share of the total, the probability. The winner is outlined. If no class reaches your "sure" level, the honest answer is "not sure".',
    takeaway: 'The network outputs numbers, not words. Softmax makes them comparable and decoding turns the largest into a label with a confidence.',
    tryIt: [
      'Place the mango on a border between two classes. Two probabilities sit near 50%.',
      'Raise the "sure" level to 90% and see how many answers become "not sure".',
      'Notice that softmax always gives an answer adding to 100%, even with random weights.',
    ],
    tutor: {
      minutes: 6,
      say: 'Three things happen here and students blur them: scoring, normalising, deciding. The first belongs to the weights. The second is fixed arithmetic. The third is a choice we make, and it can be changed without retraining.',
      ask: 'The scores are 2.0, 1.9 and −3. The network says class 1. How confident should we be? What would you tell a customer?',
      wrong: 'A softmax output of 80% means the network is right 80% of the time.',
      right: 'It is the network\'s own estimate. Whether it deserves trust must be checked on test data.',
    },
  },
  {
    id: 'error',
    name: 'Compare',
    title: 'How wrong was it?',
    what: 'To learn, the network needs to know how far its answer was from the truth. A fruit seller has labelled this mango, and the label is coded one-of-N: 1 for the right class, 0 for the others. The error measure is cross-entropy: F = −ln(probability given to the right class). A confident right answer costs almost nothing. A confident wrong answer costs a great deal.',
    picture: 'Left: the network\'s three probabilities as solid bars, with the target drawn as an outline. Right: the cost curve. The dot shows the probability given to the true class and what it costs.',
    takeaway: 'The performance function turns "right or wrong" into one number that training can push downhill.',
    tryIt: [
      'With random weights the cost is usually above 1. With trained weights it is close to 0.',
      'Change "A seller says" to a wrong label and watch the cost jump.',
      'Find the probability at which the cost is exactly 1 (it is about 37%).',
    ],
    tutor: {
      minutes: 4,
      say: 'Only the probability of the true class enters the cost. The network is not rewarded for how it shares the rest among the wrong classes.',
      ask: 'Which costs more: giving the true class 10%, or giving it 1%? By how much? Why might that be a useful property?',
      wrong: 'The error is the number of wrong answers.',
      right: 'It is a smooth measure of how much probability the true class received, so that small improvements can be detected.',
    },
  },
  {
    id: 'learn',
    name: 'Learn',
    title: 'Where the weights come from',
    what: 'Nobody types in the weights. They start as random numbers and are corrected, a little at a time, by backpropagation. The output error is a² − t. That blame is passed backwards through the same weights the signal came forward on, scaled by each hidden neuron\'s slope, to give every neuron a sensitivity s. Then each weight moves by −α × (sensitivity of the neuron it feeds) × (signal it carried). Repeat over all the mangoes, many times.',
    picture: 'On the network, amber pulses run backwards: that is the blame. Right, top: the plane coloured by what the network would answer at each point, with the training mangoes on top. Below: the average cost over all mangoes as training runs.',
    takeaway: 'Weights are not programmed. They are whatever random numbers became after thousands of small corrections that each reduced the error a little.',
    tryIt: [
      'Press "One step on this mango" and watch which connections flash. Green grew, red shrank.',
      'Start from random weights and train. Watch the coloured regions find the mangoes.',
      'Set the learning rate to its maximum and train again. The cost jumps about.',
      'Train with the Linear activation and compare the final accuracy.',
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
    what: 'Give the trained network a mango it has never seen. It does exactly what it did at stops 1 to 5: encode, weigh, activate, weigh again, softmax, decode. It answers well when the new mango falls among the training mangoes, because the lines it learnt separate that region correctly. It has no idea what a mango is. Ask about a measurement no mango could have, and it answers just as confidently.',
    picture: 'The plane now extends beyond the 0 to 10 box where every training mango lay. Colours show the answer at each point. Tap anywhere to place a new mango and follow it through the network on the left.',
    takeaway: 'A trained network understands where an input lies relative to boundaries it drew through its training data, and nothing beyond that.',
    tryIt: [
      'Tap inside a coloured region, far from any border: a confident, correct answer.',
      'Tap near a border: the probabilities split, as they should.',
      'Tap far outside the dashed box. The answer is still close to 100%. Is it knowledge?',
    ],
    tutor: {
      minutes: 6,
      say: 'This is generalisation and its limit in one picture. Inside the box the network interpolates between examples and is usually right. Outside the box it extends its lines for ever and is confident about nonsense.',
      ask: 'How could we make the system say "I have never seen anything like this"? What would it need to remember about its training data?',
      wrong: 'A high confidence means the network recognises the input.',
      right: 'Confidence only measures distance from the boundaries. Far from the data, it says nothing about being right.',
    },
  },
]

export const journeyMinutes = journeyStages.reduce((sum, s) => sum + s.tutor.minutes, 0)
