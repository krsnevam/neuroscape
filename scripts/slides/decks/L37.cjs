/** L37: Weight initialisation, training algorithms, stopping criteria. Hagan Ch. 22. */
const it = Array.from({ length: 31 }, (_, k) => k)
// error on a quadratic bowl with curvature 2: e_k = e_0 (1 - 2 alpha)^(2k); stable for alpha < 1
const curve = (alpha) => it.map((k) => Math.min(400, 10 * Math.pow(1 - 2 * alpha, 2 * k)))
const starts = [
  it.map((k) => 0.6 + 9 * Math.exp(-k / 4)),
  it.map((k) => 2.4 + 7 * Math.exp(-k / 6)),
  it.map((k) => 0.9 + 9 * Math.exp(-k / 9)),
]
const ep = Array.from({ length: 41 }, (_, k) => k * 5)
const trainE = ep.map((e) => 0.5 + 7 * Math.exp(-e / 22))
const valE = ep.map((e) => 1.4 + 6.5 * Math.exp(-e / 22) + 0.000085 * Math.max(0, e - 70) ** 2)

module.exports = {
  code: 'L37',
  date: 'Wed 2 Dec 2026',
  file: 'L37-training-choices.pptx',
  title: 'Training: where to start, how to step, when to stop',
  syllabus: 'Weight initialization · Choice of training algorithm · Stopping criteria',
  phase: 'train',
  slides: [
    { kind: 'title', section: 'Opening', notes: 'Three decisions hide inside the word "train". Each one can ruin a good data set and a good architecture.' },
    {
      kind: 'cards', title: 'Three decisions inside "train the network"',
      cards: [
        { h: 'Where to start', b: 'The first weights. A bad start can leave the network unable to learn anything at all.' },
        { h: 'How to step', b: 'The algorithm that moves the weights downhill. The choice changes training from hours to seconds.' },
        { h: 'When to stop', b: 'Too early and it has not learnt. Too late and it has memorised the training examples.' },
      ],
      note: 'Training is a walk downhill on the error surface. Today is about the first step, the stride and the last step.',
      notes: 'Draw a valley on the board. Mark a start point, a path and a stopping point.',
    },
    {
      kind: 'compare', section: 'Weight initialisation', title: 'Why not start every weight at zero?',
      left: {
        tone: 'bad', tag: 'All zero, or all equal', h: 'The hidden neurons can never differ',
        items: [
          'With zero weights every hidden output is tansig(0) = 0, so the output layer receives nothing.',
          'The slope for each hidden weight is multiplied by an output weight of zero: no update.',
          'With equal non-zero weights, every hidden neuron gets the same update and stays an identical copy. Eight neurons behave as one.',
        ],
      },
      right: {
        tone: 'good', tag: 'Small random values', h: 'Each neuron starts somewhere different',
        items: [
          'Draw each weight at random, for example between −0.5 and 0.5 when inputs are normalised to [−1, 1].',
          'Different starts break the symmetry: each neuron receives a different slope and learns a different feature.',
          'Small values keep the sigmoids in their steep region, where learning is fast.',
        ],
      },
      notes: 'Zero is a saddle point of the performance surface. Ask the class to compute the gradient of a 1-2-1 network with all weights zero.',
    },
    {
      kind: 'cards', title: 'Starting well: three more points',
      cards: [
        { h: 'Too large is also bad', tone: 'bad', b: 'Large weights push every neuron into its flat region. The slope there is nearly zero, so training crawls across a plateau.' },
        { h: 'Nguyen-Widrow method', b: 'Choose the size of the weights and spread the biases so that the active regions of the hidden neurons are distributed evenly across the input range.' },
        { h: 'Start several times', b: 'Different starts end in different valleys. Train 5 to 10 times from new random weights and keep the network with the lowest validation error.' },
      ],
      note: 'Never judge a design from a single training run.',
      notes: 'Nguyen-Widrow is the default initialisation for multilayer networks in the MATLAB toolbox. Each neuron begins by covering its own slice of the input range.',
    },
    {
      kind: 'chart', title: 'Different starts end in different places',
      type: 'line', labels: it.map(String), labelEvery: 5,
      series: starts.map((v, i) => ({ name: `Start ${i + 1}`, values: v })),
      xTitle: 'Iteration (illustrative)', yTitle: 'Training error',
      h: 'Same data, same network, three random starts',
      lines: [
        'Start 2 settles in a poor local minimum and never recovers.',
        'Starts 1 and 3 reach nearly the same error at different speeds.',
        'The error surface of a multilayer network has many valleys.',
        'Restarting is cheap insurance: keep the best on validation data.',
      ],
      notes: 'In the mission game the Train stage has a "starts" control. Three starts are noticeably safer than one.',
    },
    {
      kind: 'table', section: 'Training algorithm', title: 'The training algorithms, compared',
      head: ['Algorithm', 'How it steps', 'Good for', 'Weakness'],
      widths: [2.9, 3.6, 2.9, 2.73],
      rows: [
        ['Steepest descent', 'Straight down the slope, fixed learning rate α', 'Understanding; very large data', 'Slow; α is hard to choose'],
        ['Momentum, variable α', 'Smooths the path; adapts the rate', 'A cheap improvement', 'Still first-order'],
        ['Scaled conjugate gradient', 'Combines past directions; no line search', 'Large networks, pattern recognition', 'Slower than LM on small fits'],
        ['Levenberg-Marquardt', 'Uses curvature from the Jacobian', 'Small and medium fitting networks', 'Memory grows with weights²'],
      ],
      rowH: 0.78,
      note: 'Rule of thumb: Levenberg-Marquardt for small fitting networks, scaled conjugate gradient for large or classification networks.',
      notes: 'Resilient backpropagation (Rprop) is another common choice for pattern recognition. All of these were derived in Unit 3; today is about choosing.',
    },
    {
      kind: 'chart', title: 'The learning rate: slow, good or explosive',
      type: 'line', labels: it.map(String), labelEvery: 5,
      series: [
        { name: 'α = 0.02  too small', values: curve(0.02) },
        { name: 'α = 0.30  good', values: curve(0.3) },
        { name: 'α = 1.02  too large', values: curve(1.02) },
      ],
      options: { valAxisMaxVal: 40, valAxisMinVal: 0 },
      xTitle: 'Iteration', yTitle: 'Error',
      h: 'Steepest descent on a simple bowl',
      lines: [
        'Too small: every step is safe but tiny. Thousands of iterations.',
        'Good: fast, steady descent.',
        'Too large: each step overshoots the bottom by more than the last. The error grows without limit.',
        'The stable limit depends on the steepest curvature, which you do not know in advance.',
      ],
      notes: 'Recall from Unit 3: stable when alpha is less than 2 over the largest eigenvalue of the Hessian. This is why adaptive methods exist.',
    },
    {
      kind: 'formula', title: 'Levenberg-Marquardt in one line',
      tag: 'Weight update',
      eq: ['Δx = − [ J^{T}J + μI ]^{−1} J^{T}v'],
      eqSize: 28,
      caption: 'J: Jacobian of the errors with respect to the weights. v: vector of errors. μ: the adjustable damping.',
      h: 'One knob, μ, blends two methods',
      lines: [
        'Large μ: a small steepest-descent step. Safe when far from the minimum.',
        'Small μ: a Gauss-Newton step. Very fast near the minimum.',
        'If a step lowers the error, μ is divided; if it raises it, μ is multiplied and the step retried.',
        'It must store and invert an n × n matrix: fine for hundreds of weights, not for millions.',
        'It assumes a sum-of-squares error, so it suits fitting.',
      ],
      notes: 'Often converges in tens of iterations where steepest descent needs thousands. That is why the app uses it for the small fitting stations.',
    },
    {
      kind: 'compare', title: 'Which algorithm for which job',
      left: {
        tone: 'plain', tag: 'Levenberg-Marquardt', h: 'Small fitting networks',
        items: [
          'Up to a few hundred weights.',
          'Mean square error with a linear output.',
          'Example: a 2-8-1 network estimating delivery time from 200 orders.',
          'Fastest and most accurate in this range.',
        ],
      },
      right: {
        tone: 'plain', tag: 'Scaled conjugate gradient', h: 'Large networks and classification',
        items: [
          'Thousands of weights or more: memory grows only in step with the weights.',
          'Works with cross-entropy and softmax outputs.',
          'Example: a 64-30-10 digit recogniser with about 2,300 weights.',
          'No learning rate to tune and no line search.',
        ],
      },
      note: 'Sigmoid outputs in classification spend much of their time saturated, where the Levenberg-Marquardt approximation is poor.',
      notes: 'Count for 64-30-10: 30(65) + 10(31) = 2,260 weights. The LM matrix would be 2,260 by 2,260.',
    },
    {
      kind: 'table', section: 'Stopping criteria', title: 'Four ways training ends',
      head: ['Criterion', 'Training stops when', 'What it tells you'],
      widths: [3.0, 4.6, 4.53],
      rows: [
        ['Minimum gradient', 'The size of the gradient falls below a small threshold', 'A flat point was reached: a minimum, or a plateau'],
        ['Performance goal', 'The error falls below a target you set', 'Good enough for the purpose; no need to continue'],
        ['Maximum iterations', 'A fixed number of iterations is used up', 'A safety limit. Training may not have converged'],
        ['Early stopping', 'Validation error has risen for several checks in a row', 'Further training would only memorise. Keep the best weights'],
      ],
      rowH: 0.8,
      note: 'Always record which criterion ended the run. "Maximum iterations" means: look again.',
      notes: 'For SOM training the usual criterion is simply a fixed number of iterations. With Bayesian regularisation, train until the effective number of parameters settles.',
    },
    {
      kind: 'chart', title: 'Early stopping: let the validation set decide',
      type: 'line', labels: ep.map(String), labelEvery: 5,
      series: [{ name: 'Training error', values: trainE }, { name: 'Validation error', values: valE }],
      xTitle: 'Epoch (illustrative)', yTitle: 'Error',
      h: 'Stop at the lowest point of the validation curve',
      lines: [
        'Both errors fall together at first: the network is learning the pattern.',
        'Then training error keeps falling while validation error turns upward: it is now learning the noise.',
        'Keep the weights from the validation minimum, not the last ones.',
        'Wait a few checks before stopping, because the curve is bumpy.',
      ],
      notes: 'The validation set is used for this decision, which is exactly why it cannot also be the test set.',
    },
    {
      kind: 'demo', section: 'Live', tag: 'Break and fix', title: 'Zero start, then three learning rates',
      steps: [
        'In Colab, set every weight to zero and train. The loss does not move. Print the hidden weights: all still equal.',
        'Change to small random weights. The same network now learns.',
        'Run three learning rates side by side: one crawls, one converges, one diverges to NaN.',
      ],
      ask: 'With zero weights the code ran without any error message. How would you have known something was wrong?',
      app: 'Error Valley Race: set Starting weights to All zero, then Small random.',
      notes: 'The answer to the question: the loss curve is flat from the first iteration, and the hidden neurons are identical.',
    },
    {
      kind: 'app', section: 'Practice', title: 'Try it in NeuroScape',
      stations: [
        { name: 'Error Valley Race', do: 'Race steepest descent against Levenberg-Marquardt. Then try each Starting weights option.', see: 'How few steps LM needs, the flat error for a zero start, and the stopping reason when a run ends.' },
        { name: 'The Delivery Promise', where: 'World 5 mission', do: 'Play stage 4 (Train). Use steepest descent with α = 3, then LM with early stopping and 3 starts.', see: 'The validation line turning upward, and how the final profit changes.' },
      ],
      notes: 'Ask students to note the stopping reason for three different runs and bring them to the next class.',
    },
    {
      kind: 'quiz', title: 'Check your understanding',
      q: 'Explain weight initialisation and the stopping criteria used in training a multilayer network. Why is early stopping preferred?',
      marks: 'Typical 8 to 10 mark question',
      points: [
        'Why not zero: saddle point, symmetry. Why not large: saturation.',
        'Small random values; Nguyen-Widrow; several restarts.',
        'Algorithms: steepest descent, LM for small fitting networks, SCG for large ones.',
        'Four stopping criteria: gradient, goal, maximum iterations, validation.',
        'Early stopping sketch: training and validation curves, stop at the minimum.',
      ],
      notes: 'A labelled sketch of the two error curves is worth marks on its own.',
    },
    {
      kind: 'leave', title: 'Start random, step smart, stop on validation',
      points: [
        { h: 'Initialise', b: 'Small random weights, never zero. Try several starts.' },
        { h: 'Choose the algorithm', b: 'LM for small fitting networks. SCG for large or classification.' },
        { h: 'Know when to stop', b: 'Early stopping on the validation set, with a safety limit.' },
      ],
      next: 'II Test 3 to 5 Dec. Then L38: performance functions and post-training analysis.',
      notes: 'Revision pointer for the II Test: L35 to L37 complete the "before and during training" half of the unit.',
    },
  ],
}
