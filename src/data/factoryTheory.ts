import type { LabComplexity, LabTheory } from './labs'

/** Theory and complexity notes for the Model Factory stations, keyed by station id. */
export const factoryTheory: Record<string, { theory: LabTheory; complexity: LabComplexity }> = {
  traffic: {
    theory: {
      idea: 'A network learns only from the examples it is shown. If the examples leave out part of the real world, the network knows nothing about that part, however well it is trained. Choosing and splitting the data is therefore the first design decision, before any network is drawn.',
      how: [
        'Decide the range of situations the network must handle, and collect data across all of it.',
        'Draw a sample. Random sampling works for large mixed data; stratified sampling guarantees every group is present.',
        'Split the sample three ways: training (adjusts the weights), validation (decides when to stop), test (used once, to estimate real-world error).',
        'Train on the training set only, and compare the three errors. Similar errors mean the sample is consistent; they do not prove it covers the real world.',
      ],
      usedFor: [
        { where: 'Map and cab apps', example: 'Travel-time models are trained on trips from every hour and every day type, because a model trained on weekdays fails on a festival day.' },
        { where: 'Medical screening', example: 'A model trained on patients from one hospital is tested on another hospital before anyone trusts it.' },
        { where: 'Election polling', example: 'Pollsters stratify by region, age and income so that a small sample still represents the whole electorate.' },
      ],
      limits: 'No split can reveal what the whole sample is missing. A test set drawn from biased data shares the bias, so its error looks fine. Only knowledge of how the data was collected can catch this.',
    },
    complexity: {
      parameters: 'A 1-S-1 network has S(1+1) + (S+1) = 3S + 1 weights and biases. Here S = 8, so 25.',
      prediction: '8 + 8 = 16 multiplications and 8 tansig evaluations. It grows in step with the number of hidden neurons.',
      training: 'One batch step runs a forward and a backward pass for every training trip, about twice the prediction work each. With 42 trips that is roughly 42 × 2 × 16 operations per step, and the station does 25 steps per frame.',
      memory: 'The 25 parameters, the same number of gradient values, and the data itself.',
      scaling: 'Sampling and splitting cost almost nothing. What grows is the need for data: you want several times more training targets than parameters. k-fold cross-validation multiplies the training time by k.',
    },
  },
  sensor: {
    theory: {
      idea: 'A cheap sensor gives a reading that is a bent function of what you want to know. A small network can learn the bend from a few calibration points. It learns well only if the inputs are first scaled to a small range, because sigmoid neurons stop responding when their input is large.',
      how: [
        'Record pairs of raw reading and true value across the working range.',
        'Scale the inputs (and targets) to about −1 to 1 using the minimum and maximum of the training data.',
        'Choose a network: one hidden layer of tansig neurons and a linear output. Each hidden neuron contributes one bend.',
        'Train, then compare against a reference instrument across the whole range, not only at the calibration points.',
        'Add neurons only until the error is good enough; every extra neuron needs more calibration points.',
      ],
      usedFor: [
        { where: 'Smart sensors', example: 'Thermistors, load cells and gas sensors are linearised in firmware by a tiny network or a fitted curve.' },
        { where: 'Phone cameras', example: 'Raw sensor values are corrected for colour and lens response by learned mappings.' },
        { where: 'Industrial plants', example: 'Soft sensors estimate a quantity that is hard to measure, such as product purity, from temperatures and pressures that are easy to measure.' },
      ],
      limits: 'It is valid only inside the calibrated range, and the sensor must not drift. Without normalisation it does not train at all. With more parameters than calibration points it fits the noise.',
    },
    complexity: {
      parameters: '3S + 1 for a 1-S-1 network. With S = 4 that is 13; with S = 12 it is 37, against only 12 calibration points.',
      prediction: '2S multiplications and S tansig evaluations: small enough for an Arduino Uno.',
      training: 'This station uses Levenberg-Marquardt. Each iteration builds an n × n matrix from the Q data points (about Q × n² operations) and solves it (about n³). With n = 13 and Q = 12 that is a few thousand operations, and it converges in tens of iterations instead of thousands.',
      memory: 'Levenberg-Marquardt stores an n × n matrix: 169 numbers here. Steepest descent would store only n.',
      scaling: 'The n² memory and n³ solve make Levenberg-Marquardt the fastest choice up to a few thousand weights and impractical beyond that. Normalisation costs two operations per input.',
    },
  },
  valley: {
    theory: {
      idea: 'Training is a search for the lowest point of the error surface. The algorithm decides how each step is chosen, the learning rate decides how long it is, and the starting weights decide which valley you end up in.',
      how: [
        'Start from small random weights, never all zero or all equal: hidden neurons that start the same stay the same. Nguyen-Widrow spreads them across the input range.',
        'Steepest descent: measure the slope (gradient) and step downhill by α times the slope.',
        'Momentum: add a share γ of the previous step, which damps zig-zags and keeps speed on flat ground.',
        'Levenberg-Marquardt: estimate the curvature too and jump towards where the bottom should be; fall back to small safe steps when the jump fails.',
        'Stop on the first of four criteria: the error goal is met, the gradient is nearly zero, the validation error has stopped improving, or the iteration limit is reached.',
      ],
      usedFor: [
        { where: 'Every trained network', example: 'Speech recognisers, translators and image models are all trained by variants of gradient descent with momentum.' },
        { where: 'Engineering curve fitting', example: 'Levenberg-Marquardt is the standard routine for fitting models to lab measurements.' },
        { where: 'Adaptive control', example: 'Controllers in drones and motor drives adjust their parameters online with small gradient steps.' },
      ],
      limits: 'A learning rate above the stable limit diverges. Flat plateaus make steepest descent crawl. Different starting points can end in different minima, so one training run proves little.',
    },
    complexity: {
      parameters: 'One neuron with one input: a weight and a bias, 2 parameters. That is why the whole error surface can be drawn.',
      prediction: 'One multiplication, one addition and one transfer function.',
      training: 'Steepest descent and momentum cost one pass over the Q = 26 students per iteration (work grows with Q × n). Levenberg-Marquardt costs about Q × n² + n³ per iteration but needs far fewer iterations: here about 4 against hundreds.',
      memory: 'Steepest descent: n numbers. Momentum: 2n (it remembers the last step). Levenberg-Marquardt: n².',
      scaling: 'Cheap steps and many of them, or expensive steps and few. For a few thousand weights the expensive steps win; for millions of weights only the cheap ones are possible.',
    },
  },
  fraud: {
    theory: {
      idea: 'A trained classifier gives a score, and a threshold turns the score into a decision. Judging it needs more than one number, because the two kinds of mistake (missing a fraud, blocking a genuine payment) cost different amounts, and because one class is rare.',
      how: [
        'Score every case in the test set.',
        'Choose a threshold and count the four outcomes: the confusion matrix.',
        'Compute sensitivity (share of positives caught) and specificity (share of negatives passed).',
        'Sweep the threshold from 1 to 0 and plot sensitivity against the false alarm rate: the ROC curve. Its area summarises the classifier without fixing a threshold.',
        'Pick the threshold from the costs of the two mistakes.',
      ],
      usedFor: [
        { where: 'Payment fraud screening', example: 'Banks tune the threshold so that most fraud is stopped without blocking so many genuine payments that customers leave.' },
        { where: 'Medical tests', example: 'A cancer screening test is set to miss very few cases, accepting more false alarms that a second test resolves.' },
        { where: 'Spam filters', example: 'The threshold is set the other way: losing a real email is worse than letting some spam through.' },
      ],
      limits: 'Accuracy misleads when classes are unequal. A threshold tuned on one population drifts when behaviour changes. The ROC curve hides how rare the positive class is, so precision must be checked too.',
    },
    complexity: {
      parameters: 'A 2-6-1 network: 6(2+1) + (6+1) = 25.',
      prediction: '12 + 6 = 18 multiplications per payment: fast enough to score every payment before it is approved.',
      training: 'One step over a mini-batch of 160 payments costs about 160 × 2 forward passes. Rebalancing by repeating fraud examples roughly doubles the training set, and the work per pass with it.',
      memory: 'The 25 parameters. The analysis needs one score per test payment.',
      scaling: 'The confusion matrix is one pass over the Q test scores. The ROC curve needs them sorted, about Q log Q operations. Both are trivial next to training.',
    },
  },
  battery: {
    theory: {
      idea: 'Generalisation means doing well on inputs that were not in the training set. A network with more freedom than the data can pin down will fit the noise as well as the pattern (overfitting). A network asked about a region it never saw can only guess (extrapolation). They look similar and need different cures.',
      how: [
        'Hold back a validation set and watch its error during training.',
        'Read the pattern: both errors high is underfitting; training low and validation high is overfitting.',
        'Cure overfitting by stopping when the validation error is lowest, by penalising large weights, by using fewer neurons, or with more data.',
        'Draw the regression plot, outputs against targets, for training and validation readings. R near 1 on both means the outputs track the targets on the data you have.',
        'Check where the new inputs lie (novelty detection). Outside the range of the training data, no setting helps: flag the answer and collect data there.',
      ],
      usedFor: [
        { where: 'Battery and range estimates', example: 'Phones and electric vehicles predict remaining time from usage so far, and are least reliable in conditions they have not seen, such as extreme cold.' },
        { where: 'Demand forecasting', example: 'A model trained on ordinary weeks overfits them and fails in a festival week unless past festivals are in the data.' },
        { where: 'Every production model', example: 'Early stopping and weight decay are switched on by default in almost all network training.' },
      ],
      limits: 'Early stopping needs data set aside, which is costly when there is little. Weight decay that is too strong causes underfitting. Nothing cures extrapolation except data from the missing region, or a warning to the user.',
    },
    complexity: {
      parameters: '3S + 1. With S = 2 that is 7; with S = 20 it is 61, to be pinned down by about 8 training readings.',
      prediction: '2S multiplications.',
      training: 'One Levenberg-Marquardt iteration costs about Q × n² + n³ operations: tiny at n = 7, about 250,000 at n = 61. Early stopping adds one pass over the validation readings per iteration; weight decay adds nothing.',
      memory: 'An n × n matrix for the training step, plus a second copy of the weights for the best-so-far snapshot.',
      scaling: 'What matters here is model complexity against data: the number of parameters compared with the number of training targets. Regularisation lowers the effective number of parameters without removing neurons.',
    },
  },
  cricket: {
    theory: {
      idea: 'When the same situation can end in different ways, a network trained on yes or no outcomes does not learn "yes" or "no". Its output settles at the average outcome for that situation, which is the probability of yes. This is how a network estimates probabilities it was never told.',
      how: [
        'Collect many cases: the situation as input, the outcome as a target of 1 or 0.',
        'Use an output that stays between 0 and 1 (logsig for two outcomes, softmax for several) and cross-entropy as the performance function.',
        'Train. Where 37 of 100 similar cases were wins, the error is smallest when the output is 0.37.',
        'Check the output against the observed fraction of wins in groups of similar cases.',
      ],
      usedFor: [
        { where: 'Sports broadcasts', example: 'The win predictor shown during a T20 chase is a model of this kind, trained on ball-by-ball records of past matches.' },
        { where: 'Weather forecasts', example: '"70% chance of rain" comes from models trained on days that either had rain or did not.' },
        { where: 'Credit scoring', example: 'A lender estimates the chance of default from past borrowers who either repaid or did not.' },
      ],
      limits: 'With few examples the surface is confident and wrong. The probabilities hold only for situations like those in the data. A single case can never confirm or refute a probability; only groups of cases can.',
    },
    complexity: {
      parameters: 'A 2-8-1 network: 8(2+1) + (8+1) = 33.',
      prediction: '16 + 8 = 24 multiplications. The direct alternative, 2000 simulated matches of up to 36 balls, is tens of thousands of random draws for one answer.',
      training: 'Each step passes over up to 500 recent matches, about 500 × 2 × 24 operations. Creating the data costs one random draw per ball.',
      memory: '33 parameters stand in for a table of 60 × 36 = 2160 situations, each of which would need hundreds of matches to fill by counting.',
      scaling: 'Adding inputs such as wickets in hand multiplies the size of a counting table but adds only 8 weights to the network. The data needed still grows, because more of the input space must be covered.',
    },
  },
  doodle: {
    theory: {
      idea: 'Pattern recognition assigns an input to one of a set of known classes. Most of the work is done before the network: turning the raw input into features that stay the same when irrelevant things change, such as where on the pad you drew.',
      how: [
        'Collect labelled examples of each class.',
        'Preprocess: centre and scale the drawing so position and size do not matter.',
        'Extract features: here an 8 × 8 grid of on or off cells, 64 inputs.',
        'Train a network with one output per class and softmax, so the outputs read as probabilities.',
        'Test on new drawings and look at which classes get confused with which.',
      ],
      usedFor: [
        { where: 'Handwriting input', example: 'Phone keyboards recognise letters drawn with a finger, in many scripts.' },
        { where: 'Cheque and form reading', example: 'Banks and post offices read handwritten digits and PIN codes automatically.' },
        { where: 'Gesture control', example: 'Smartwatches recognise a shake or a flick of the wrist from the motion sensor.' },
      ],
      limits: 'It only knows the classes it was taught: a square will be called a circle, cross or tick with confidence. Without good preprocessing it needs examples at every position and size. It learns the habits of whoever supplied the examples.',
    },
    complexity: {
      parameters: 'A 64-10-3 network: 10(64+1) + 3(10+1) = 683.',
      prediction: '640 + 30 = 670 multiplications per drawing. Almost all of the work is in the first layer, because of the 64 inputs.',
      training: 'About twice that per example per step, so a step over 21 examples is roughly 28,000 operations.',
      memory: '683 parameters, plus 64 numbers per stored example.',
      scaling: 'The first layer grows with inputs × hidden neurons. A 28 × 28 image has 784 inputs and would need 7,850 first-layer weights for the same 10 neurons. This is why feature extraction, and later convolution, matter.',
    },
  },
  colours: {
    theory: {
      idea: 'A self-organising map learns without labels. Its neurons sit on a grid, and each holds a prototype. Neurons compete for every input; the winner and its grid neighbours move towards that input. Over time the prototypes spread over the data, and neighbours on the grid end up holding similar things.',
      how: [
        'Give each neuron a starting prototype.',
        'Present one input and find the neuron whose prototype is closest: the winner.',
        'Move the winner and its neighbours a fraction α of the way towards the input (the Kohonen rule).',
        'Repeat, shrinking the neighbourhood and α so the map first orders itself, then fine-tunes.',
        'Read the result with three tools: the hit histogram (which inputs each neuron wins), the distance map (how far apart neighbouring prototypes are) and the weight planes (one picture of the map per input).',
      ],
      usedFor: [
        { where: 'Image compression', example: 'Reducing a photo to a palette of 64 or 256 representative colours is exactly this clustering.' },
        { where: 'Customer segmentation', example: 'Retailers map shoppers by buying habits with no labels, then name the regions of the map afterwards.' },
        { where: 'Machine health monitoring', example: 'Vibration readings from a healthy machine cover one part of the map; readings that land elsewhere signal a fault.' },
      ],
      limits: 'The map size and the shrinking schedule are chosen by hand. A neuron that starts far from the data may never win (a dead neuron). The map can end up twisted if the neighbourhood shrinks too fast. Clusters have no meaning until a person interprets them.',
    },
    complexity: {
      parameters: 'S neurons × R inputs, no biases: 64 × 3 = 192 weights.',
      prediction: 'Finding the winner compares the input with all 64 prototypes: 64 × 3 = 192 subtract-and-square operations.',
      training: 'One step is one winner search plus an update of the neurons in the neighbourhood, so at most a few hundred operations. There is no backward pass. A full run shows a few thousand inputs.',
      memory: 'The 192 weights. Nothing else is kept between steps.',
      scaling: 'The winner search grows with neurons × inputs, and it is repeated for every input shown. Doubling the side of the map quadruples the neurons, and a larger map also needs more training steps to order itself.',
    },
  },
  wave: {
    theory: {
      idea: 'Prediction uses the recent past of a signal to estimate its next value. A tapped delay line hands the network the last D values. Predicting one step ahead from measured values is easy; predicting many steps ahead means feeding the network its own predictions, and small errors add up.',
      how: [
        'Sample the signal at a steady rate.',
        'Form training pairs: the last D values as input, the next value as target.',
        'Train with measured values as inputs (series-parallel form), which is ordinary backpropagation.',
        'To look further ahead, feed each prediction back in as if it were a measurement (closed loop).',
        'Check that the one-step errors show no pattern: their autocorrelation, and their cross-correlation with the inputs, should stay inside the limits ±2/√Q.',
      ],
      usedFor: [
        { where: 'Electricity grids', example: 'Load for the next hours is forecast from the last days of demand so that generation can be scheduled.' },
        { where: 'Video calls', example: 'When a packet is lost, the decoder predicts the missing fraction of a second of speech from what came before.' },
        { where: 'Machine control', example: 'A controller predicts where a robot arm or a levitated magnet will be a few milliseconds ahead and acts on that.' },
      ],
      limits: 'Too few delays and the network cannot tell which way the signal is moving. Closed-loop forecasts drift as errors build up. A sudden change in the signal cannot be foreseen; the network can only relearn afterwards.',
    },
    complexity: {
      parameters: 'A D-8-1 network: 8(D+1) + (8+1) = 8D + 17. With D = 6 that is 65.',
      prediction: '8D + 8 multiplications for one step: 56 at D = 6. Looking 30 steps ahead in closed loop costs 30 forward passes.',
      training: 'The network is retrained on 60 recent windows with Levenberg-Marquardt, about Q × n² + n³ operations: roughly half a million at n = 65, several times a second.',
      memory: 'The last 12 seconds of signal and an n × n matrix.',
      scaling: 'Each extra delay adds 8 weights, and the training cost grows with the square and cube of the total. More delays capture slower patterns but need more data and time; a slower sampling rate covers the same span with fewer delays.',
    },
  },
}
