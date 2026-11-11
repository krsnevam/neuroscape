/** L36: Choice of network architecture, introduction to training. Hagan Ch. 22. */
const neurons = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20]
const trainErr = [9.1, 6.2, 4.3, 3.1, 2.6, 2.3, 2.0, 1.7, 1.4, 0.9, 0.5]
const testErr = [9.4, 6.6, 4.8, 3.6, 3.1, 2.9, 2.8, 3.0, 3.5, 4.6, 6.1]

module.exports = {
  code: 'L36',
  date: 'Mon 30 Nov 2026',
  file: 'L36-network-architecture.pptx',
  title: 'Which network, and how big?',
  syllabus: 'Choice of network architecture · Training the network',
  phase: 'pre',
  slides: [
    { kind: 'title', section: 'Opening', notes: 'Last hour the data. This hour: the network that will learn from it.' },
    {
      kind: 'flow', phase: 'all', title: 'Where we are in the design flow',
      steps: [
        { h: 'Prepare the data', b: 'L35: selection, division, preprocessing.' },
        { h: 'Choose the network', b: 'Type, layers, neurons, output function.', on: true },
        { h: 'Train', b: 'Starting weights, algorithm, when to stop.' },
        { h: 'Analyse', b: 'Is it good enough? If not, what is wrong?' },
        { h: 'Use and watch', b: 'Deploy, track live error, retrain.' },
      ],
      note: 'The problem fixes the inputs and outputs. Everything in between is our choice.',
      notes: 'One-minute recall: ask a student to name the three data sets and their jobs.',
    },
    {
      kind: 'table', section: 'Task type', title: 'First question: what kind of problem is it?',
      head: ['Task', 'The question it answers', 'Everyday example', 'Targets'],
      widths: [2.3, 3.5, 3.9, 2.43],
      rows: [
        ['Fitting', 'What number goes with this input?', 'Minutes of battery left from voltage and screen time', 'Numbers'],
        ['Pattern recognition', 'Which class is this?', 'Is this UPI payment fraud? Which digit is this?', 'Class labels'],
        ['Clustering', 'Which examples are alike?', 'Grouping customers by how they recharge', 'None'],
        ['Prediction', 'What comes next in this sequence?', "Tomorrow's 7 pm electricity demand", 'Future values'],
      ],
      rowH: 0.78,
      note: 'Name the task first. It decides the network, the output layer and the error measure.',
      notes: 'Ask students to classify: spam filter, house-price estimate, music playlists grouped by taste, rainfall for tomorrow.',
    },
    {
      kind: 'table', title: 'The table to remember: task, network, output',
      head: ['Task', 'Network', 'Output layer', 'Performance function'],
      widths: [2.3, 4.2, 3.0, 2.63],
      rows: [
        ['Fitting', 'Multilayer perceptron (tansig hidden layer), or RBF network', 'Linear', 'Mean square error'],
        ['Pattern recognition', 'Multilayer perceptron; also RBF, LVQ', 'Softmax (or sigmoid)', 'Cross-entropy'],
        ['Clustering', 'Self-organising map (competitive layer)', 'A grid of neurons; the winner is the cluster', 'None: unsupervised'],
        ['Prediction', 'Dynamic network: focused time-delay network, NARX', 'Linear', 'Mean square error'],
      ],
      rowH: 0.82,
      note: 'If in doubt, start with a multilayer perceptron with one hidden layer.',
      notes: 'This table is the main takeaway of the hour. Students should be able to reproduce it from memory.',
    },
    {
      kind: 'diagram', section: 'Architecture', title: 'The workhorse: the multilayer perceptron',
      draw: ({ pres, slide, box, C, txt, drawNetwork }) => {
        drawNetwork(pres, slide, { x: box.x + 0.6, y: box.y + 0.1, w: box.w - 1.2, h: box.h - 0.9 }, [
          { n: 2, label: 'Inputs p', fill: C.amber },
          { n: 5, label: 'Hidden layer: tansig', fill: C.teal },
          { n: 1, label: 'Output: linear', fill: C.navy },
        ], { d: 0.5 })
        txt(slide, 'a² = purelin( W² tansig( W¹ p + b¹ ) + b² )', { x: box.x, y: box.y + box.h - 0.5, w: box.w, h: 0.45, fontSize: 18, bold: true, align: 'center', fontFace: 'Cambria' })
      },
      h: 'One hidden layer of sigmoids, one linear output',
      lines: [
        'Each hidden neuron contributes one smooth step. The output adds the steps together.',
        'With enough hidden neurons it can approximate any smooth function.',
        'For classes, replace the linear output with softmax.',
        'It is the standard first choice for fitting and pattern recognition.',
      ],
      notes: 'Remind them of Unit 3: this is the 1-S-1 function approximator. "Universal approximator" says a solution exists; it does not say training will find it.',
    },
    {
      kind: 'cards', title: 'The other networks, one line each',
      cards: [
        { h: 'RBF network', tag: 'R', b: 'Hidden neurons respond only near their own centre. Trains fast and stays quiet far from data, but needs many neurons when there are many inputs.' },
        { h: 'LVQ', tag: 'L', b: 'A competitive layer of prototypes, each carrying a class label. Winners are pulled towards examples of their class and pushed from others.' },
        { h: 'Self-organising map', tag: 'S', b: 'A grid of neurons. Neighbours on the grid learn similar inputs, so the map shows which groups lie close together.' },
        { h: 'NARX and time-delay', tag: 'N', b: 'A multilayer network fed with delayed inputs, and for NARX its own past outputs. It has memory, so it can predict.' },
      ],
      notes: 'These were all met in Units 3 and 4. The point today is when to pick each, not how they learn.',
    },
    {
      kind: 'cards', title: 'How many layers, how many neurons?',
      cards: [
        { h: 'Layers', b: 'Start with one hidden layer. Add a second only if one cannot reach the accuracy you need. Deep networks are for images, speech and text.' },
        { h: 'Output neurons', b: 'Fixed by the problem: one per value to predict, or one per class.' },
        { h: 'Hidden neurons', b: 'Not known in advance. It depends on how many bends the true function has. Start generous, then control it with early stopping or regularisation.' },
      ],
      note: 'More neurons than needed is safe only if you stop training at the right time.',
      notes: 'Hagan: start with more neurons than you think you need, and use early stopping or Bayesian regularisation to prevent overfitting.',
    },
    {
      kind: 'chart', title: 'Too few, about right, too many',
      type: 'line', labels: neurons.map(String), labelEvery: 1,
      series: [{ name: 'Training error', values: trainErr }, { name: 'Test error', values: testErr }],
      xTitle: 'Hidden neurons (illustrative figures)', yTitle: 'RMS error, minutes',
      h: 'Training error always falls. Test error turns back up',
      lines: [
        'Left: too few neurons. Both errors are high. The network cannot bend enough.',
        'Middle: both errors are low and close together.',
        'Right: training error keeps falling, test error rises. The network is memorising.',
        'Choose the size from the test curve, never from the training curve.',
      ],
      notes: 'The figures are illustrative. Students can produce the real curve in the Thermistor Bench or Battery Oracle stations by changing the neuron count.',
    },
    {
      kind: 'formula', title: 'Count the weights before you train',
      tag: 'R - S¹ - S² network',
      eq: ['weights = S^{1}(R + 1) + S^{2}(S^{1} + 1)', '2-8-1:   8(3) + 1(9) = 33', '2-20-1:  20(3) + 1(21) = 81'],
      eqSize: 24,
      caption: 'R inputs, S¹ hidden neurons, S² outputs. The "+1" in each bracket is the bias.',
      h: 'Compare the count with your training examples',
      lines: [
        '33 weights against 140 training orders: about four examples per weight. Reasonable.',
        '81 weights against 42 training orders: the network can memorise every order.',
        'Too many weights for the data is the usual cause of overfitting.',
        'Fewer inputs (L35: features, PCA) also means fewer weights.',
      ],
      notes: 'Work 3-5-2 on the board with the class: 5(4) + 2(6) = 32.',
    },
    {
      kind: 'table', title: 'Choosing the output transfer function',
      head: ['Output function', 'Range', 'Use it when', 'Example'],
      widths: [2.6, 2.3, 4.0, 3.23],
      rows: [
        ['Linear (purelin)', 'Any value', 'Fitting and prediction', 'Delivery time in minutes'],
        ['Log-sigmoid', '0 to 1', 'One yes / no probability', 'Chance this payment is fraud'],
        ['Softmax', '0 to 1, outputs sum to 1', 'One class out of N', 'Which of ten digits'],
        ['Tan-sigmoid', '−1 to 1', 'Class codes of ±1 (older practice)', 'Two-class problems with MSE'],
      ],
      rowH: 0.72,
      note: 'A sigmoid output on a fitting problem cannot reach values outside its range. Use linear.',
      notes: 'Softmax: a_i = exp(n_i) / sum of exp(n_j). Every output depends on all net inputs, which is why they sum to 1.',
    },
    {
      kind: 'cards', title: 'Which inputs deserve a place?',
      cards: [
        { h: 'Start from the problem', b: 'List what could physically affect the answer: for delivery time, the hour, distance, rain and the restaurant. Leave out what cannot.' },
        { h: 'Test after training', b: 'Sensitivity analysis: measure how much the error changes when each input changes. Inputs with almost no effect are candidates to remove.' },
        { h: 'Remove and retrain', b: 'Drop the weak input, train again and compare the test error. If it does not get worse, the smaller network is the better one.' },
      ],
      note: 'An input that adds nothing still adds weights, and weights need data.',
      notes: 'Hagan describes sensitivity analysis as the derivative of the performance with respect to each input element, summed over the data set.',
    },
    {
      kind: 'flow', section: 'Training', phase: 'train', title: 'Training in one picture',
      steps: [
        { h: 'Forward', b: 'Feed an input p through the layers to get the output a.' },
        { h: 'Compare', b: 'Error e = t − a. Average the squared errors over the data.' },
        { h: 'Backward', b: 'Backpropagation gives the slope of the error for every weight.' },
        { h: 'Update', b: 'Move each weight a small step downhill. Repeat.' },
      ],
      note: 'Batch training uses all examples for each step. Incremental training updates after every example.',
      notes: 'This is a recap of Unit 3 backpropagation. L37 covers the three choices hidden in this loop: where to start, how to step, when to stop.',
    },
    {
      kind: 'demo', section: 'Live', tag: 'Demo', title: 'Watch a boundary bend as the network grows',
      steps: [
        'Open TensorFlow Playground. Choose the circle data set with one neuron and train: a straight line, a poor result.',
        'Add neurons one at a time up to four. The boundary closes around the circle.',
        'Switch to the spiral. Add a second layer and more neurons. Watch the test loss, not only the training loss.',
      ],
      ask: 'How many neurons did the circle need, and why about that many? What happened to the test loss when we kept adding?',
      app: 'Thermistor Bench: change the hidden neurons from 1 to 12 and compare the fits.',
      notes: 'Three or four straight-ish edges enclose a circle, which is why three to four neurons are enough.',
    },
    {
      kind: 'app', section: 'Practice', title: 'Try it in NeuroScape',
      stations: [
        { name: 'The Delivery Promise', where: 'World 5 mission', do: 'Play stage 3 (Design). Try 2, 8 and 20 neurons on 60 records, then on 200.', see: 'The bar comparing the number of weights with the number of training orders.' },
        { name: 'Thermistor Bench', do: 'Fit the sensor curve with 1, 3 and 12 hidden neurons.', see: 'One neuron gives one bend. Too many gives wiggles between the points.' },
        { name: 'Worlds 3 and 4', where: 'Earlier worlds', do: 'Revisit the RBF, LVQ and SOM stations for two minutes each.', see: 'How each network differs from the multilayer perceptron.' },
      ],
      notes: 'The earlier worlds give a quick refresher on RBF, LVQ and SOM if students have forgotten them.',
    },
    {
      kind: 'quiz', title: 'Check your understanding',
      q: 'How do you choose the network architecture for a given problem? Discuss the type of network, number of layers and neurons, and the output function.',
      marks: 'Typical 8 to 10 mark question',
      points: [
        'Identify the task: fitting, pattern recognition, clustering or prediction.',
        'Network for each: MLP or RBF; MLP, RBF or LVQ; SOM; time-delay or NARX.',
        'Layers and neurons: one hidden layer first; size set by complexity, controlled by early stopping.',
        'Output function: linear for fitting, softmax or sigmoid for classes.',
        'Input selection by sensitivity analysis; count weights against data.',
      ],
      notes: 'Reproducing the task-network-output table earns most of the marks.',
    },
    {
      kind: 'leave', title: 'Name the task, then pick the network',
      points: [
        { h: 'Four task types', b: 'Fitting, pattern recognition, clustering, prediction.' },
        { h: 'One table', b: 'Task, suitable network, output function, error measure.' },
        { h: 'Size with care', b: 'Count weights against examples. Judge on test error.' },
      ],
      next: 'L37: where to start the weights, which algorithm, and when to stop.',
      notes: 'Remind the class that the II Test falls on 3 to 5 December, after L37.',
    },
  ],
}
