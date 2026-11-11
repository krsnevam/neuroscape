/** World 5, the Model Factory: one hands-on station per Unit V lecture, each built on an everyday example. */
import type { Lab } from './labs'
import { factoryTheory } from './factoryTheory'
import { factoryExplain } from './factoryExplain'
import { factoryDeep } from './factoryDeep'

const stations: Lab[] = [
  {
    id: 'traffic',
    lecture: 'L35',
    title: 'Silk Board Sampler',
    story:
      'How long does it take to cross Silk Board junction? Every dot is one real trip. You decide which trips the network gets to see.',
    topics: 'Selection of data, sampling, training / validation / test sets',
    color: '#38bdf8',
    equation: 'a = W² tansig(W¹p + b¹) + b²,  p = hour of day,  a = minutes',
    words: [
      { term: 'Sample', meaning: 'The trips we actually collected, out of all the trips that happen.' },
      { term: 'Training set', meaning: 'The part of the sample used to adjust the weights.' },
      { term: 'Validation set', meaning: 'A part held back to decide when to stop training or which model to keep.' },
      { term: 'Test set', meaning: 'A part used once at the end to estimate real-world error.' },
      { term: 'Stratified sampling', meaning: 'Taking some trips from every block of the day so no period is left out.' },
      { term: 'Sampling bias', meaning: 'When the way data was collected leaves out some situations.' },
      { term: 'Extrapolation', meaning: 'Asking the network about inputs outside anything it was trained on.' },
    ],
    steps: [
      {
        kind: 'explore',
        text: 'Change the sample size and the sampling method. Drag "Ask the network" through the day and compare its answer with reality.',
      },
      {
        kind: 'break',
        text: 'Survey only at night. The training error stays tiny, so the network looks perfect. Now ask it about 6 pm.',
      },
      {
        kind: 'fix',
        text: 'Open the survey window to the whole day and use a stratified sample. Watch the real-world error fall with the same network.',
      },
      {
        kind: 'prove',
        text: 'With the night-only survey the test error was also small. Why did the test set not warn you?',
        answer:
          'The test set was drawn from the same biased sample, so it had no evening trips either. A test set can only expose what it contains. The data must span the whole range the network will be used on.',
      },
    ],
  },
  {
    id: 'sensor',
    lecture: 'L36',
    title: 'Thermistor Bench',
    story:
      'A ₹10 thermistor on an Arduino analog pin gives a number from 0 to 1023, and that number is a badly curved function of temperature. Calibrate it with a network.',
    topics: 'Data preprocessing, normalisation, choice of network architecture',
    color: '#fb923c',
    equation: 'pₙ = 2(p − p_min)/(p_max − p_min) − 1;   a = W² tansig(W¹pₙ + b¹) + b²',
    words: [
      { term: 'Calibration', meaning: 'Finding the rule that turns a raw sensor reading into the real quantity.' },
      { term: 'Normalisation', meaning: 'Rescaling inputs to the range −1 to 1 before they enter the network.' },
      { term: 'Saturation', meaning: 'When a sigmoid neuron is pushed so far that its output sits at its limit and its slope is zero.' },
      { term: 'Hidden neuron', meaning: 'A neuron between input and output; each tansig neuron adds one bend to the curve.' },
      { term: 'Parameters', meaning: 'All the weights and biases. A 1-S-1 network has 3S + 1 of them.' },
      { term: 'Levenberg-Marquardt', meaning: 'A fast training algorithm for small networks that uses curvature as well as slope.' },
    ],
    steps: [
      {
        kind: 'explore',
        text: 'Move the hotplate, watch pin A0 change, and record calibration points. Add hidden neurons and watch the curve bend to fit.',
      },
      {
        kind: 'break',
        text: 'Switch normalisation off so raw counts (0 to 1023) go straight into the tansig neurons. Every neuron saturates and learning stops.',
      },
      {
        kind: 'fix',
        text: 'Switch normalisation back on. Then find the smallest number of neurons that beats the straight-line calibration by 10 times.',
      },
      {
        kind: 'prove',
        text: 'A 1-S-1 network has how many parameters? With 12 calibration points, what is the largest S you would trust?',
        answer:
          'S(1+1) + (S+1) = 3S + 1 parameters. With 12 points you want clearly fewer parameters than points, so S = 3 (10 parameters) is the limit, and S = 2 is safer.',
      },
    ],
  },
  {
    id: 'valley',
    lecture: 'L37',
    title: 'Error Valley Race',
    story:
      'One neuron predicts whether you stay awake in the 8 am class from your hours of sleep. Its two parameters, w and b, are a position on this landscape. Height is the error.',
    topics: 'Weight initialisation, choice of training algorithm, stopping criteria',
    color: '#34d399',
    equation: 'F(w, b) = mean (t − a)²;   steepest descent: x(k+1) = x(k) − α g(k)',
    words: [
      { term: 'Error surface', meaning: 'The error F drawn as height over every possible pair of weights.' },
      { term: 'Gradient', meaning: 'The slope of the surface under the ball; it points uphill.' },
      { term: 'Learning rate α', meaning: 'How big a step is taken along the downhill direction.' },
      { term: 'Momentum γ', meaning: 'Carrying over part of the previous step, which smooths zig-zags.' },
      { term: 'Plateau', meaning: 'A flat region where the slope is almost zero and learning crawls.' },
      { term: 'Stability limit', meaning: 'For a quadratic surface, steepest descent diverges when α exceeds 2/λ_max.' },
      { term: 'Initial weights', meaning: 'Where the ball starts. Different starts can give different results.' },
    ],
    steps: [
      {
        kind: 'explore',
        text: 'Tap anywhere on the surface to choose the starting weights, then press Race. Three algorithms start from the same place.',
      },
      {
        kind: 'break',
        text: 'Switch to the linear neuron and raise α past the stability limit: steepest descent bounces higher each step and leaves the map. With the sigmoid neuron, start on a flat plateau and watch it crawl.',
      },
      {
        kind: 'fix',
        text: 'Lower α below the limit, add momentum, and normalise the input so the narrow ravine opens into a bowl.',
      },
      {
        kind: 'prove',
        text: 'For the linear neuron the app shows λ_max of the Hessian. What is the largest stable α, and why is Levenberg-Marquardt done in one or two steps here?',
        answer:
          'α < 2/λ_max. The linear neuron has a quadratic error surface, and LM with small μ is a Gauss-Newton step, which jumps straight to the minimum of a quadratic.',
      },
    ],
  },
  {
    id: 'fraud',
    lecture: 'L38',
    title: 'UPI Fraud Alarm',
    story:
      'A bank asks you to flag fraudulent UPI payments. About 6 in every 100 are fraud. Your network scores a very high accuracy on day one. Should the bank be happy?',
    topics: 'Post-training analysis, pattern recognition, confusion matrix, ROC',
    color: '#f472b6',
    equation: 'a = logsig(W²tansig(W¹p + b¹) + b²);   alarm if a ≥ threshold',
    words: [
      { term: 'Confusion matrix', meaning: 'A count of the four outcomes: caught, missed, wrongly blocked, correctly passed.' },
      { term: 'Sensitivity', meaning: 'The share of real frauds that were caught.' },
      { term: 'Specificity', meaning: 'The share of genuine payments that were passed.' },
      { term: 'Precision', meaning: 'The share of alarms that were real frauds.' },
      { term: 'Threshold', meaning: 'The output level above which the alarm rings.' },
      { term: 'ROC curve', meaning: 'Sensitivity against false alarm rate as the threshold sweeps from 1 to 0.' },
      { term: 'Class imbalance', meaning: 'When one class is far more common, so accuracy alone is misleading.' },
    ],
    steps: [
      {
        kind: 'explore',
        text: 'Drag the alarm threshold. Watch the four boxes of the confusion matrix and the dot on the ROC curve move together.',
      },
      {
        kind: 'break',
        text: 'Leave the threshold at 0.5 and read "fraud caught". The accuracy is high because saying "genuine" every time is already about 94% right.',
      },
      {
        kind: 'fix',
        text: 'Lower the threshold, then rebalance the training data. Choose the setting you would defend to the bank and to an angry customer.',
      },
      {
        kind: 'prove',
        text: 'A model that flags nothing still gets about 94% accuracy here. Which two numbers expose it immediately?',
        answer:
          'Sensitivity (fraud caught) is 0%, and the ROC operating point sits at the origin. Accuracy hides this because the classes are unequal.',
      },
    ],
  },
  {
    id: 'battery',
    lecture: 'L39',
    title: 'Battery Oracle',
    story:
      'You noted your phone battery a few times since morning. Can a network tell you when it will die tonight? Tap the chart to add your own readings.',
    topics: 'Overfitting and extrapolation, early stopping, regularisation',
    color: '#facc15',
    equation: 'F = E_D + λ E_W   (squared errors + weight decay × squared weights)',
    words: [
      { term: 'Generalisation', meaning: 'Doing well on inputs that were not used for training.' },
      { term: 'Overfitting', meaning: 'Fitting the noise in the training data, so the curve wiggles between points.' },
      { term: 'Underfitting', meaning: 'A network too small to follow even the training data.' },
      { term: 'Early stopping', meaning: 'Keeping the weights from the moment the validation error was lowest.' },
      { term: 'Weight decay', meaning: 'A penalty on large weights, which keeps the curve smooth.' },
      { term: 'Extrapolation', meaning: 'Predicting outside the range of the training data. No setting fixes it; only data does.' },
    ],
    steps: [
      {
        kind: 'explore',
        text: 'Tap to add readings. Change the number of neurons and watch the fit and the predicted time of death.',
      },
      {
        kind: 'break',
        text: 'Use 20 neurons with no safeguards. The curve passes through every reading and wiggles between them. Then look right of your last reading.',
      },
      {
        kind: 'fix',
        text: 'Turn on the validation set and early stopping, or add weight decay. The wiggle goes. The region with no readings stays unreliable until you add readings there.',
      },
      {
        kind: 'prove',
        text: 'Training error low, validation error high: which problem? Training and validation both low, but the evening prediction is absurd: which problem?',
        answer:
          'The first is overfitting, cured by early stopping, regularisation, fewer neurons or more data. The second is extrapolation: the network was never shown the evening. Only data from that region cures it.',
      },
    ],
  },
  {
    id: 'cricket',
    lecture: 'L40',
    title: 'Chase Predictor',
    story:
      'Last overs of a T20 chase. Every simulated match ends in a win or a loss, nothing in between. Yet the network learns the chance of winning.',
    topics: 'Function approximation, probability estimation',
    color: '#a78bfa',
    equation: 'a = logsig(W²tansig(W¹p + b¹) + b²),  p = [runs needed, balls left],  t ∈ {0, 1}',
    words: [
      { term: 'Target', meaning: 'The known outcome used for training: 1 for a win, 0 for a loss.' },
      { term: 'Probability estimation', meaning: 'Training on yes/no outcomes so that the output becomes the chance of yes.' },
      { term: 'Cross-entropy', meaning: 'The performance function suited to probabilities.' },
      { term: 'Simulation', meaning: 'Playing a match ball by ball with random outcomes to create data.' },
      { term: 'Function approximation', meaning: 'Learning a smooth surface from scattered examples.' },
    ],
    steps: [
      {
        kind: 'explore',
        text: 'Set runs needed and balls left, then play matches. Wins land on the top plane, losses on the floor. The surface between them is the network.',
      },
      {
        kind: 'break',
        text: 'Clear the data and train on 15 matches. The surface is confident and wrong: it has seen almost nothing.',
      },
      {
        kind: 'fix',
        text: 'Simulate a few hundred matches across the whole floor. Compare the network with 2000 fresh simulations at your chosen situation.',
      },
      {
        kind: 'prove',
        text: 'Every target is 0 or 1. Why does the output settle at a value such as 0.37?',
        answer:
          'Many matches share nearly the same input but end differently. The output that minimises the error over all of them is their average target, which is the fraction that were won: the probability.',
      },
    ],
  },
  {
    id: 'doodle',
    lecture: 'L41',
    title: 'Doodle Reader',
    story:
      'Teach a network your own handwriting. Draw a circle, a cross or a tick, tell it which one it was, and watch it start guessing before you finish the stroke.',
    topics: 'Pattern recognition case study, feature extraction, softmax',
    color: '#fb7185',
    equation: 'a = softmax(W²tansig(W¹p + b¹) + b²),  p = 64 pixels,  a = 3 probabilities',
    words: [
      { term: 'Feature extraction', meaning: 'Turning raw input (a drawing) into the numbers the network uses (64 cells).' },
      { term: 'Preprocessing', meaning: 'Cleaning up the input first, here by centring and scaling the drawing.' },
      { term: 'Class', meaning: 'One of the categories to recognise: circle, cross or tick.' },
      { term: 'Softmax', meaning: 'An output layer whose values are positive and add to 1, so they read as probabilities.' },
      { term: 'Training example', meaning: 'A drawing together with its correct label.' },
    ],
    steps: [
      {
        kind: 'explore',
        text: 'Draw a shape and watch the three bars move as you draw. Teach it a few of your own examples of each.',
      },
      {
        kind: 'break',
        text: 'Switch off "centre and scale". Now draw a small tick in a corner. The same shape in a new place is a completely different input.',
      },
      {
        kind: 'fix',
        text: 'Switch preprocessing back on. The network did not change; the features did.',
      },
      {
        kind: 'prove',
        text: 'This network has 64 inputs, 10 hidden neurons and 3 outputs. Count its parameters. Why is the output layer softmax?',
        answer:
          '10(64+1) + 3(10+1) = 683 parameters. Softmax makes the three outputs positive and sum to 1, so they can be read as the probability of each class.',
      },
    ],
  },
  {
    id: 'colours',
    lecture: 'L41',
    title: 'Colour Map',
    story:
      'Point the camera at anything, or use the Holi powder sample. No labels, no teacher: an elastic sheet of 64 neurons stretches through colour space until it fits what it sees.',
    topics: 'Clustering case study, self-organising map',
    color: '#22d3ee',
    equation: 'w_i(q) = w_i(q−1) + α h(i, i*) (p − w_i(q−1))',
    words: [
      { term: 'Clustering', meaning: 'Finding groups in data that has no labels.' },
      { term: 'Prototype', meaning: 'A neuron’s weight vector: here, the colour it stands for.' },
      { term: 'Winner', meaning: 'The neuron whose prototype is closest to the current input.' },
      { term: 'Neighbourhood', meaning: 'The neurons near the winner on the grid, which learn along with it.' },
      { term: 'Dead neuron', meaning: 'A neuron that never wins, so it never learns.' },
      { term: 'Quantisation error', meaning: 'Average distance from each input to its closest prototype.' },
      { term: 'Topographic error', meaning: 'Share of inputs whose two closest prototypes are not grid neighbours.' },
    ],
    steps: [
      {
        kind: 'explore',
        text: 'Watch the sheet unfold inside the colour cube. The palette beside it is the map: neighbouring neurons hold neighbouring colours.',
      },
      {
        kind: 'break',
        text: 'Start the weights in the black corner and switch the neighbourhood off. A few neurons win everything; the rest are dead.',
      },
      {
        kind: 'fix',
        text: 'Switch the neighbourhood on, or initialise from the data. Watch the dead-neuron count fall to zero.',
      },
      {
        kind: 'prove',
        text: 'Low quantisation error but high topographic error: what does the map look like?',
        answer:
          'The prototypes sit close to the data, so each colour is well represented, but the sheet is twisted: neurons that are neighbours on the grid hold unrelated colours.',
      },
    ],
  },
  {
    id: 'wave',
    lecture: 'L42',
    title: 'Finish My Move',
    story:
      'Move your finger up and down in a rhythm. The network watches your last few positions and draws where you are going next, before you get there.',
    topics: 'Prediction case study, tapped delay line, open and closed loop',
    color: '#4ade80',
    equation: 'a(t) = f( y(t−1), y(t−2), …, y(t−D) )',
    words: [
      { term: 'Time series', meaning: 'Values measured one after another in time.' },
      { term: 'Tapped delay line', meaning: 'A row of delays that hands the network the last D values.' },
      { term: 'One-step prediction', meaning: 'Predicting the next value from measured past values.' },
      { term: 'Closed loop', meaning: 'Feeding predictions back in as inputs to predict further ahead.' },
      { term: 'Error autocorrelation', meaning: 'How much each error resembles the errors a few steps earlier. Ideally not at all.' },
      { term: 'White error', meaning: 'Errors with no pattern left in them.' },
    ],
    steps: [
      {
        kind: 'explore',
        text: 'Keep a steady rhythm and watch the amber forecast run ahead of you. Then change rhythm and watch it relearn.',
      },
      {
        kind: 'break',
        text: 'Set the delays to 1. One past value says where you are, not which way you are moving, so the forecast is a flat line.',
      },
      {
        kind: 'fix',
        text: 'Add delays until the error bars sit inside the dashed limits. Compare the one-step trace with the one-second-ahead trace.',
      },
      {
        kind: 'prove',
        text: 'Why is the one-second-ahead trace worse than the one-step trace, although it is the same network?',
        answer:
          'One second ahead is 15 steps in closed loop: each step feeds on the previous prediction instead of a measurement, so small errors accumulate.',
      },
    ],
  },
]

export const factoryLabs: Lab[] = stations.map((lab) => ({ ...lab, ...factoryTheory[lab.id], ...factoryExplain[lab.id], ...factoryDeep[lab.id] }))
