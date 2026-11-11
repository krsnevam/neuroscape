/** L38: Choice of performance function, purpose of post-training analysis. Hagan Ch. 22. */
const { designFlow } = require('../lib.cjs')

const as = Array.from({ length: 25 }, (_, i) => 0.04 + i * 0.04)
const xs = Array.from({ length: 41 }, (_, i) => i / 40)
const truth = (x) => 20 + 12 * Math.sin(2 * Math.PI * x)
const wiggle = (x) => truth(x) + 5.5 * Math.sin(17 * x + 1) * (0.5 + 0.5 * Math.cos(9 * x))

module.exports = {
  code: 'L38',
  date: 'Mon 7 Dec 2026',
  file: 'L38-performance-functions.pptx',
  title: 'What does "good" mean? Performance functions',
  syllabus: 'Choice of performance function · Post-training analysis',
  phase: 'train',
  slides: [
    { kind: 'title', section: 'Opening', notes: 'The network minimises exactly what we tell it to. Today: choosing what to tell it, and how to check the result.' },
    {
      kind: 'cards', title: 'The network minimises what you ask it to',
      cards: [
        { h: 'It is the definition of success', b: 'Training changes the weights to make one number as small as possible. That number is the performance function.' },
        { h: 'A wrong measure, a wrong model', b: 'Ask for "fewest wrong answers" on payments where 1 in 100 is fraud, and the best answer is to call nothing fraud.' },
        { h: 'Match it to the task', b: 'Fitting, classification and noisy data each need a different function. The output layer must match it too.' },
      ],
      note: 'Choosing the performance function is choosing what the network will care about.',
      notes: 'Everyday parallel: if a delivery rider is paid only per delivery, speed wins over care. People and networks both optimise what is measured.',
    },
    {
      kind: 'formula', section: 'Performance functions', title: 'Mean square error: the default for fitting',
      tag: 'Fitting',
      eq: ['F(x) = (1/Q) Σ_{q} (t_{q} − a_{q})^{2}'],
      eqSize: 28,
      caption: 'Q examples. t: target. a: network output. Averaged over all examples and all outputs.',
      h: 'Why it is the usual choice for numbers',
      lines: [
        'Smooth and easy to differentiate, which backpropagation needs.',
        'Squaring punishes large misses far more than small ones: a 10-minute error costs 100, a 2-minute error costs 4.',
        'Pairs with a linear output neuron.',
        'Weakness: a few wild records dominate. For data with outliers use the mean absolute error instead.',
      ],
      notes: 'Hagan presents the Minkowski error with exponent K: K = 2 gives MSE, K = 1 gives mean absolute error, which is more robust to outliers.',
    },
    {
      kind: 'formula', title: 'Cross-entropy: the choice for classification',
      tag: 'Pattern recognition',
      eq: ['F(x) = − Σ_{q} Σ_{i} t_{i,q} ln a_{i,q}'],
      eqSize: 28,
      caption: 'Targets t are 0 or 1 (one-of-N). Outputs a are softmax probabilities. Only the true class contributes.',
      h: 'It scores the probability given to the right class',
      lines: [
        'Output 0.9 for the true class costs 0.11. Output 0.1 costs 2.3. Output 0.01 costs 4.6.',
        'Being confidently wrong is punished without limit.',
        'With a softmax output the gradient is simply a − t: it does not vanish when the network is badly wrong.',
        'The trained outputs can be read as probabilities.',
      ],
      notes: 'With MSE and a saturated sigmoid the gradient is nearly zero exactly when the network is confidently wrong, so it learns slowly from its worst mistakes.',
    },
    {
      kind: 'chart', title: 'The cost of being confidently wrong',
      type: 'line', labels: as.map((a) => a.toFixed(2)), labelEvery: 3,
      series: [
        { name: 'Cross-entropy: −ln a', values: as.map((a) => -Math.log(a)) },
        { name: 'Squared error: (1 − a)²', values: as.map((a) => (1 - a) ** 2) },
      ],
      xTitle: 'Output a given to the true class (target = 1)', yTitle: 'Cost',
      h: 'The true class is 1. What does each function charge?',
      lines: [
        'Squared error never charges more than 1, however wrong the output.',
        'Cross-entropy climbs steeply as the output approaches 0.',
        'So cross-entropy pushes hardest on the examples the network gets most wrong.',
        'Near a = 1 both are small: they agree when the network is right.',
      ],
      notes: 'Ask: a fraud model says 2% for a payment that is fraud. Which cost function will make it fix that fastest?',
    },
    {
      kind: 'table', title: 'Which performance function for which task',
      head: ['Task', 'Performance function', 'Output layer', 'Example'],
      widths: [3.0, 3.3, 2.6, 3.23],
      rows: [
        ['Fitting', 'Mean square error', 'Linear', 'Battery minutes remaining'],
        ['Fitting with outliers', 'Mean absolute error', 'Linear', 'Delivery times with a few broken records'],
        ['Two classes', 'Cross-entropy', 'Log-sigmoid', 'Fraud or not fraud'],
        ['N classes', 'Cross-entropy', 'Softmax', 'Which digit, which defect type'],
        ['Small or noisy data set', 'Add a regularisation term', 'As above', 'Any of the above'],
      ],
      rowH: 0.66,
      note: 'Unequal costs (a missed fraud costs more than a false alarm) are handled afterwards, by the threshold. See L39.',
      notes: 'This table extends the L36 table with one more column of reasoning. Students should be able to justify each row.',
    },
    {
      kind: 'formula', title: 'Regularisation: penalise large weights',
      tag: 'Modified performance function',
      eq: ['F(x) = β E_{D} + α E_{W}', 'E_{D} = Σ (t − a)^{2}', 'E_{W} = Σ x_{i}^{2}'],
      eqSize: 26,
      caption: 'First term: the usual sum of squared errors on the data. Second term: the sum of all squared weights.',
      h: 'Small weights give a smooth function',
      lines: [
        'A network needs large weights to make sharp bends between data points.',
        'Penalising weight size keeps the response smooth, so it follows the pattern, not the noise.',
        'The ratio α / β sets the strength: too large and the network underfits.',
        'Bayesian regularisation sets α and β automatically during training.',
        'It is an alternative to early stopping, and needs no validation set.',
      ],
      notes: 'In deep learning this is called weight decay or L2 regularisation. Hagan Chapter 13 derives the Bayesian version; here we only need the idea.',
    },
    {
      kind: 'chart', title: 'What the penalty does to the fit',
      type: 'line', labels: xs.map((x) => x.toFixed(2)), labelEvery: 5,
      series: [
        { name: 'True pattern', values: xs.map(truth) },
        { name: 'No penalty: follows the noise', values: xs.map(wiggle) },
        { name: 'With penalty', values: xs.map((x) => 20 + 11 * Math.sin(2 * Math.PI * x)) },
      ],
      colors: ['5B6380', 'D4455C', '0C9C9C'],
      xTitle: 'Input (illustrative)', yTitle: 'Output',
      h: 'Same network and data, with and without the penalty',
      lines: [
        'Without the penalty a large network threads through every noisy point.',
        'With it the curve stays close to the true pattern.',
        'The training error is slightly higher with the penalty. The test error is much lower.',
        'Too much penalty flattens the curve: check both errors.',
      ],
      notes: 'Students can reproduce this in the Battery Oracle station by adding neurons and then switching regularisation on.',
    },
    {
      kind: 'cards', title: 'Committees of networks',
      cards: [
        { h: 'Train several, not one', b: 'Train 5 to 10 networks from different random starts, or on different divisions of the data. You were going to restart anyway.' },
        { h: 'Combine their answers', b: 'For fitting, average the outputs. For classification, average the probabilities or take a vote.' },
        { h: 'Why it helps', b: 'Each network makes different mistakes. Averaging cancels part of them, so the committee usually beats its best member.' },
      ],
      note: 'Like taking a second and third medical opinion. The cost is several times the computing at run time.',
      notes: 'Disagreement among the members is also useful: where they disagree strongly, the input is probably unlike the training data.',
    },
    {
      kind: 'demo', section: 'Industry story', tag: 'Industry story', title: 'The fraud detector that was 99% accurate',
      steps: [
        'A payments team trains a network on 10,000 transactions. It reports 99% accuracy. Everyone is pleased.',
        'A month after launch, fraud losses have not fallen at all.',
        'Someone finally counts: of 100 frauds in the test data, the model caught none. It had learnt to say "genuine" every time.',
      ],
      ask: 'How can a model be 99% accurate and useless? What should the team have measured?',
      app: 'UPI Fraud Alarm: press Break to see the 99% model, then open the confusion matrix.',
      notes: 'Let the class work out the arithmetic before showing the next slide. This is a composite teaching story, not one named company.',
    },
    {
      kind: 'diagram', phase: 'post', title: 'Counting what "99% accurate" hides',
      draw: ({ pres, slide, box, C, txt, drawGrid }) => {
        txt(slide, 'Model says:', { x: box.x + 1.9, y: box.y, w: 4.4, h: 0.3, fontSize: 13, color: C.mute, align: 'center' })
        txt(slide, 'Fraud', { x: box.x + 1.9, y: box.y + 0.3, w: 2.2, h: 0.3, fontSize: 14, bold: true, align: 'center' })
        txt(slide, 'Genuine', { x: box.x + 4.1, y: box.y + 0.3, w: 2.2, h: 0.3, fontSize: 14, bold: true, align: 'center' })
        txt(slide, 'Really fraud (100)', { x: box.x, y: box.y + 1.1, w: 1.8, h: 0.8, fontSize: 14, bold: true })
        txt(slide, 'Really genuine (9,900)', { x: box.x, y: box.y + 2.75, w: 1.8, h: 0.8, fontSize: 14, bold: true })
        drawGrid(pres, slide, { x: box.x + 1.9, y: box.y + 0.7, w: 4.4, h: 3.3 }, [
          [{ v: 0, fill: C.greenSoft, label: '0 caught', color: C.ink }, { v: 1, fill: C.rose, label: '100 missed', color: C.white }],
          [{ v: 0, fill: C.amberSoft, label: '0 false alarms', color: C.ink }, { v: 1, fill: C.green, label: '9,900 passed', color: C.white }],
        ], { fontSize: 16 })
      },
      h: 'Accuracy = (0 + 9,900) / 10,000 = 99%',
      lines: [
        'Fraud caught: 0 of 100. The one number that mattered is zero.',
        'Accuracy rewards the common class. With rare events it says almost nothing.',
        'Measure what the business cares about: frauds caught, and false alarms raised.',
        'Then train so that the rare class counts: balance the data or weight its errors.',
      ],
      notes: 'This 2 by 2 table is the confusion matrix. L39 builds sensitivity, specificity and the ROC curve from it.',
    },
    {
      kind: 'flow', section: 'Post-training analysis', phase: 'all', title: 'Post-training analysis: the fourth box',
      steps: designFlow(3),
      note: 'Two questions: is the network good enough? If not, which earlier box caused it?',
      notes: 'The arrow back from Analyse can land on data, architecture or training. The next slide is how to tell which.',
    },
    {
      kind: 'table', phase: 'post', title: 'Reading the three errors',
      head: ['What you see', 'Diagnosis', 'Go back and'],
      widths: [4.3, 3.4, 4.43],
      rows: [
        ['Training, validation and test errors all high', 'Underfitting, or training stuck', 'Add neurons; restart from new weights'],
        ['Training low; validation and test much higher', 'Overfitting', 'Early stopping, regularise, fewer neurons, more data'],
        ['Training and validation low; test much higher', 'Test data lies outside the training range', 'Collect data that covers those cases'],
        ['All three low and close together', 'A sound network', 'Use it, within the range of the data'],
      ],
      rowH: 0.78,
      note: 'All three low still says nothing about situations that none of the three sets contain.',
      notes: 'This table reappears in L40 for overfitting and extrapolation. It is a frequent exam question.',
    },
    {
      kind: 'app', section: 'Practice', phase: 'post', title: 'Try it in NeuroScape',
      stations: [
        { name: 'UPI Fraud Alarm', do: 'Press Break for the "99% accurate" model. Then move the threshold and watch the four counts.', see: 'Accuracy barely moves while frauds caught goes from none to most.' },
        { name: 'Battery Oracle', do: 'Raise the neurons until it overfits. Switch on regularisation, then try early stopping.', see: 'Training error rises slightly; test error falls sharply.' },
        { name: 'The Delivery Promise', where: 'World 5 mission', do: 'Play stage 5 (Inspect) after a rushed run and after a careful run.', see: 'The three errors, and which pattern from the table each run shows.' },
      ],
      notes: 'Ask each student to bring one screenshot of an overfitted run and its fix.',
    },
    {
      kind: 'quiz', phase: 'post', title: 'Check your understanding',
      q: 'Discuss the choice of performance function for neural network training. How does regularisation improve generalisation?',
      marks: 'Typical 8 to 10 mark question',
      points: [
        'Mean square error: formula, use in fitting, sensitivity to outliers.',
        'Cross-entropy: formula, softmax output, why it suits classification.',
        'Regularisation: add the sum of squared weights to the error; small weights give smooth functions.',
        'Committees of networks: averaging several trained networks.',
        'Why the measure must match the problem: the 99% accuracy example.',
      ],
      notes: 'Marks are usually split between the formulas and the reasoning for when to use each.',
    },
    {
      kind: 'leave', title: 'Measure what matters',
      points: [
        { h: 'MSE for numbers', b: 'With a linear output. Mean absolute error when outliers are present.' },
        { h: 'Cross-entropy for classes', b: 'With softmax or sigmoid outputs that read as probabilities.' },
        { h: 'Keep weights small', b: 'Regularisation and committees both improve generalisation.' },
        { h: 'Read three errors', b: 'Their pattern tells you which design step to revisit.' },
      ],
      next: 'L39: the right analysis tool for each of the four task types.',
      notes: 'Bridge: we have one tool so far, the three errors. Next hour adds a specific tool for each task type.',
    },
  ],
}
