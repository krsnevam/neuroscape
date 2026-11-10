/** World 1, the Neuron Lab: Unit I, from "what is learning" to the Hopfield memory. */
import type { Lab } from './labs'

export const neuronLabLabs: Lab[] = [
  {
    id: 'rules-vs-learning',
    lecture: 'Unit I',
    title: 'Mango Sorter',
    story:
      'A fruit seller sorts mangoes that are ready to eat from those that are not, using two things anyone can check: colour and softness. Three sorters work side by side: your hand-written rule, one neuron that learns, and a small multilayer network.',
    topics: 'AI, machine learning, deep learning and how they differ',
    color: '#f472b6',
    equation:
      'Rule: ready if colour ≥ θ₁ and softness ≥ θ₂   ·   Neuron: a = logsig(Wp + b)   ·   Network: a² = logsig(W² tansig(W¹p + b¹) + b²)',
    words: [
      {
        term: 'Artificial intelligence (AI)',
        meaning:
          'Any program that does a task we would call intelligent if a person did it. A rule written by hand, such as "ready if yellow and soft", already counts.',
      },
      {
        term: 'Machine learning (ML)',
        meaning:
          'The part of AI where the program finds its own rule from examples instead of being given the rule by a person.',
      },
      {
        term: 'Deep learning (DL)',
        meaning:
          'Machine learning with networks of several layers of neurons. The extra layers let the network build its own useful features and draw curved boundaries.',
      },
      { term: 'Feature', meaning: 'A measured property used as an input. Here: colour and softness, each from 0 to 1.' },
      { term: 'Label', meaning: 'The correct answer attached to an example by a person: ready or not ready.' },
      {
        term: 'Training',
        meaning: 'Showing labelled examples again and again and nudging the weights each time so that the errors shrink.',
      },
      { term: 'Decision boundary', meaning: 'The line or curve where a sorter changes its answer from "not ready" to "ready".' },
    ],
    takeaway:
      'A hand-written rule stays fixed until a person changes it. A learned model finds its own rule from labelled examples, and a model with more than one layer of neurons can draw a curved boundary.',
    picture: [
      { mark: 'Three square charts', meaning: 'One per sorter: your rule, one neuron, and the 2-8-1 network. Colour runs across from green to yellow, softness runs up from hard to soft.' },
      { mark: 'Mango-shaped dots', meaning: 'The 90 labelled mangoes of the crate. Each is filled green to yellow by its own colour.' },
      { mark: 'Gold ring round a mango', meaning: 'A person labelled this mango ready to eat.', color: '#fbbf24' },
      { mark: 'Dark ring round a mango', meaning: 'A person labelled this mango not ready.' },
      { mark: 'Red cross', meaning: 'This sorter gives the wrong answer for this mango.', color: '#f43f5e' },
      { mark: 'Yellow shaded area', meaning: 'Where that sorter says "ready". Brighter yellow means the learner is more sure.' },
      { mark: 'Pink dashed lines, first chart', meaning: 'Your two thresholds: the least colour θ₁ and the least softness θ₂ a mango needs to count as ready.', color: '#f472b6' },
      { mark: 'Blue line, second chart', meaning: 'The boundary the single neuron has learned. It is always straight.', color: '#38bdf8' },
      { mark: 'Violet line, third chart', meaning: 'The boundary the 2-8-1 network has learned. It can bend.', color: '#a78bfa' },
      { mark: 'White pulsing ring with a tag', meaning: 'Your test mango, the same in all three charts. The tag shows what each sorter says about it.' },
      { mark: '"wrong of 90" above each chart', meaning: 'How many mangoes that sorter gets wrong. Green is few, amber is some, red is many.' },
      { mark: 'Bars in the fourth panel (narrow screens)', meaning: 'The same wrong-answer counts as bars: pink for the rule, blue for the neuron, violet for the network.' },
    ],
    industry: {
      setting: 'Food processors and fruit exporters, quality and grading team',
      problem:
        'Fruit, vegetables and grains must be graded by ripeness and defects before packing. Hand grading is slow and graders disagree, and each new variety or season looks a little different.',
      howUsed:
        'Cameras over the conveyor measure colour, size and blemishes. Teams often start with hand rules on those measurements. Experienced graders then label thousands of items, a model is trained on those labels, and it replaces the rules where the rules kept failing. When a new variety arrives, the team collects fresh labels and retrains instead of rewriting rules.',
      goesWrong:
        'A model trained on one season or one variety misgrades a new batch, much like the Alphonso rule on Langra. Changed lighting in the shed can do the same. Teams keep a grader checking a sample every shift, watch how often the model and the grader disagree, and retrain when that number rises.',
      roles: 'Quality control engineer, machine vision engineer, data annotator (labels the examples), ML engineer.',
    },
    theory: {
      idea: 'Artificial intelligence is any program that does a task needing judgement. In classic AI a person writes the rule. In machine learning the program is given labelled examples and adjusts its own weights until its answers match the labels. Deep learning is machine learning with several layers of neurons, so the network can build its own features and draw curved boundaries.',
      how: [
        'Collect examples and have a person label each one: this mango is ready, that one is not.',
        'Choose the kind of sorter: a fixed rule, one neuron, or a network with a hidden layer.',
        'Train: show the examples, measure the error e = t − a on each, and nudge every weight a little in the direction that shrinks the error.',
        'Repeat for many passes until the error stops falling.',
        'Check the result on mangoes it has not seen. If the fruit changes, collect new labels and train again.',
      ],
      usedFor: [
        {
          where: 'Email spam filtering',
          example: 'A learned classifier scores each incoming message from its words and sender, where hand-written keyword rules were easy for spammers to dodge.',
        },
        {
          where: 'Fruit and grain grading lines',
          example: 'Cameras over a conveyor sort mangoes, tomatoes or rice grains by colour and blemishes, several items every second.',
        },
        {
          where: 'Phone photo galleries',
          example: 'A deep network groups your photos by the faces in them, although nobody could write down a rule for what a face looks like in pixels.',
        },
      ],
      limits:
        'A hand rule fails when the world changes or when the rule is too complicated to write down. A learned model is only as good as its examples: it fails on cases unlike its training data, and it cannot explain itself as plainly as a rule. One neuron fails whenever the classes cannot be split by a straight line. Deep networks need far more data and computing, so for a problem with a known exact rule, the rule is still the right tool.',
    },
    complexity: {
      parameters:
        'Hand rule: 2 thresholds, set by a person. One neuron: R + 1 = 2 + 1 = 3. The 2-8-1 network: 8(2+1) + 1(8+1) = 33.',
      prediction:
        'Rule: 2 comparisons. Neuron: 2 multiplications and one logsig. Network: 8×2 + 1×8 = 24 multiplications and 9 transfer-function evaluations. The work grows with the number of weights.',
      training:
        'The rule needs no training, only a person\'s time. For the learners, one pass over the crate computes the output and the gradient for all 90 mangoes: a few hundred multiplications for the neuron and a few thousand for the network. The station runs up to 9,000 passes, so training costs thousands of times more than one prediction.',
      memory:
        'The rule keeps 2 numbers, the neuron 3, the network 33. Training also needs the 90 labelled mangoes (180 feature values, 90 labels) and one extra number per weight for momentum.',
      scaling:
        'Prediction cost grows with the number of weights. Training cost grows with weights × examples × passes. Hand rules do not scale with features: with hundreds of features nobody can set the thresholds by eye. Present-day deep networks have millions to billions of weights, which is why they need large data sets and graphics processors.',
    },
    steps: [
      {
        kind: 'explore',
        text: 'Move the two threshold sliders, the least colour and the least softness a mango needs to count as ready, to write the best rule you can for the Alphonso crate. Then tap any chart to place a test mango and compare the three verdicts. Try all three crates.',
      },
      {
        kind: 'break',
        text: 'A crate of Langra arrives. Langra stays green when it is ripe. Your rule was written for Alphonso and nobody told it. Watch its error count, and watch the two learners redraw their boundaries on their own.',
      },
      {
        kind: 'fix',
        text: 'A hand rule is fixed by a person: drag the colour threshold down to 0 so the rule stops looking at colour. The two learners fixed themselves from the new labels. Now open the mixed crate, where overripe fruit must also be rejected: only the 2-8-1 network, with its extra layer of 8 neurons, can bend its boundary around the good ones.',
      },
      {
        kind: 'prove',
        text: 'All three sorters are AI. What exactly separates the hand rule from machine learning, and the single neuron from deep learning?',
        answer:
          'In classic AI a person writes the rule; in machine learning the rule (the weights) comes from labelled examples through training. One neuron can only draw a straight boundary. A network with a hidden layer first builds new features from the raw ones and can draw a curved boundary; stacking many such layers is deep learning.',
      },
    ],
  },
  {
    id: 'neuron',
    lecture: 'Unit I',
    title: 'Umbrella Neuron',
    story:
      'Should I carry an umbrella today? One neuron decides from the cloud cover, the humidity and the forecast. Each input is multiplied by a weight that says how much you trust it, everything is added to a bias, and a transfer function turns the sum into the answer.',
    topics: 'Biological inspiration, single-input and multiple-input neuron, transfer functions',
    color: '#e879f9',
    equation: 'n = Wp + b = w₁p₁ + w₂p₂ + … + w_R p_R + b   ·   a = f(n)',
    words: [
      { term: 'Input p', meaning: 'A number fed to the neuron. Here each input runs from 0 (none) to 1 (full).' },
      {
        term: 'Weight w',
        meaning: 'How strongly one input counts. Positive pushes towards yes, negative towards no, zero means ignored. It plays the part of a synapse.',
      },
      { term: 'Bias b', meaning: 'A number added no matter what the inputs are. It sets how easily the neuron says yes.' },
      { term: 'Net input n', meaning: 'The weighted sum plus the bias: n = Wp + b. The cell body of a real neuron does this adding.' },
      { term: 'Transfer function f', meaning: 'The rule that turns n into the output a, for example a hard yes or no, or a smooth value between 0 and 1.' },
      { term: 'Output a', meaning: 'What the neuron sends on, a = f(n). In a real neuron this travels down the axon.' },
      { term: 'Dendrite', meaning: 'A branch of a real neuron that receives signals from other neurons. The model replaces it with an input line.' },
    ],
    takeaway:
      'A neuron multiplies each input by a weight, adds them up with a bias, and passes the total through a transfer function. The weights choose what matters and the bias sets how easily it says yes.',
    picture: [
      { mark: 'Yellow circles on the left', meaning: 'The inputs p: cloud cover, humidity and forecast. A brighter circle is a larger input. Drag one up or down to change it.', color: '#fde68a' },
      { mark: 'Blue lines into the cell', meaning: 'Inputs with a positive weight, pushing towards yes. A thicker line is a larger weight.', color: '#38bdf8' },
      { mark: 'Red lines into the cell', meaning: 'Inputs with a negative weight, pushing towards no. A thicker line is a larger weight.', color: '#fb7185' },
      { mark: 'Thin grey dashed line', meaning: 'An input whose weight is 0, so the neuron ignores it.' },
      { mark: 'White dots running along the lines', meaning: 'The signal w·p each input sends. Bigger dots carry a larger signal; no dots means nothing is sent.' },
      { mark: 'Boxes on the lines ("w₁ = …")', meaning: 'The current weight of each input. Drag a box up or down to change it.' },
      { mark: 'Box above the cell ("b = …")', meaning: 'The bias, added as if from an input that is always 1. Its line is blue when positive, red when negative.' },
      { mark: 'Glowing pink circle with Σ', meaning: 'The cell body. It adds everything up and shows the net input n. It glows brighter when the output is larger.', color: '#e879f9' },
      { mark: 'Small square with a curve', meaning: 'The transfer function f you chose, drawn in miniature.' },
      { mark: 'Circle on the right', meaning: 'The output a. Green means yes, grey means no.', color: '#34d399' },
      { mark: 'Umbrella', meaning: 'The decision in plain words: green "take it" or faded "leave it".' },
      { mark: 'Labels "dendrites", "cell body", "axon"', meaning: 'Which part of a real nerve cell each piece of the model stands for.' },
      { mark: 'Line of numbers under the neuron', meaning: 'The sum written out with the live values, then the output.' },
      { mark: 'Pink curve in the lower chart', meaning: 'The transfer function: the output a for every possible net input n.', color: '#e879f9' },
      { mark: 'White dot on the curve', meaning: 'Where the neuron is right now. The dashed lines read off its n and a.' },
      { mark: 'Green dashed line', meaning: 'The yes level. An output above it reads as "take the umbrella".', color: '#34d399' },
    ],
    industry: {
      setting: 'Banks and lenders, credit risk team',
      problem:
        'Thousands of loan applications arrive each week. The bank must decide quickly and fairly who is likely to repay, and must be able to explain each decision to the customer and to the regulator.',
      howUsed:
        'A credit scorecard is often exactly one logsig neuron, called logistic regression. Inputs such as income, existing loans and missed payments each get a weight, a bias is added, and the sigmoid turns the total into a chance of default. The weights are learned from past loans. Because each weight can be read directly, analysts check that every input pushes the right way before the model is approved.',
      goesWrong:
        'An input can quietly stand in for something unfair, such as a postcode that tracks a community, or the economy can shift so past loans no longer describe new ones. Teams review every weight, test outcomes separately for different groups of customers, and re-check the model against recent loans on a fixed schedule.',
      roles: 'Credit risk analyst, data scientist, model validation analyst.',
    },
    theory: {
      idea: 'An artificial neuron is a small calculator modelled loosely on a nerve cell. It multiplies each input by a weight, adds the results and a bias to get the net input n, and passes n through a transfer function to get the output a. The weights decide what the neuron pays attention to, the bias decides how easily it says yes, and the transfer function decides the shape of the response.',
      how: [
        'Each input p arrives on its own line, as signals arrive on the dendrites of a nerve cell.',
        'Each input is multiplied by its weight w, the strength of that synapse.',
        'The summer adds the weighted inputs and the bias: n = Wp + b. This is the job of the cell body.',
        'The transfer function turns n into the output: a = f(n). A hard limit gives a yes or no; a sigmoid gives a smooth value.',
        'The output a leaves along the axon and can become an input to other neurons.',
      ],
      usedFor: [
        {
          where: 'Loan pre-screening',
          example: 'A single logsig neuron (logistic regression) turns income, existing debt and repayment history into a probability that a loan will not be repaid.',
        },
        {
          where: 'Medical risk scores',
          example: 'Age, blood pressure and cholesterol are weighted, added and passed through a sigmoid to estimate the chance of heart disease in the next ten years.',
        },
        {
          where: 'Inside every large network',
          example: 'Each of the millions of units in a speech recogniser or image classifier is this same weighted sum followed by a transfer function, most often poslin, known today as ReLU.',
        },
      ],
      limits:
        'One neuron can only split its inputs with a straight line (a flat plane in more dimensions), so it cannot compute something like exclusive-or. The hard-limit functions have zero slope, so gradient-based training cannot use them. And the model is a cartoon of biology: a real nerve cell sends spikes over time and is far richer.',
    },
    complexity: {
      parameters: 'R weights and 1 bias: R + 1. Here 3 + 1 = 4 with three inputs, and 1 + 1 = 2 for the single-input neuron.',
      prediction:
        'R multiplications, R additions and one transfer-function evaluation: 3 multiplications here. The work grows in step with the number of inputs.',
      training:
        'Nothing is trained at this station: you set the weights by hand. When a neuron is trained (next world), one update for one example costs about R multiplications to compute a and about R more to change the weights, repeated for every example on every pass.',
      memory: 'R + 1 numbers: 4 here. Nothing else needs to be kept.',
      scaling:
        'Cost grows in a straight line with the number of inputs: a neuron with 1,000 inputs needs 1,000 multiplications. More inputs never let one neuron draw anything but a flat boundary. More power comes from combining neurons into layers, which is the next station.',
    },
    steps: [
      {
        kind: 'explore',
        text: 'Drag the inputs, the weights and the bias, on the picture or with the sliders. Switch between all eight transfer functions and watch the dot move along the curve. Try the single-input neuron first.',
      },
      {
        kind: 'break',
        text: 'Set the forecast weight to zero and the bias to +8. Now move the forecast slider: nothing changes. Then set every input to zero: the neuron still says yes.',
      },
      {
        kind: 'fix',
        text: 'Give the forecast a weight again and bring the bias back below zero, so that the inputs must add up to something before the neuron says yes.',
      },
      {
        kind: 'prove',
        text: 'A neuron has W = [3 2], b = 1.2 and two inputs, p₁ = −5 and p₂ = 6 (written p = [−5 6]ᵀ). Find n, then the output a for three of the transfer functions on the buttons: hardlims, satlin and tansig.',
        answer:
          'n = 3(−5) + 2(6) + 1.2 = −1.8. hardlims gives a = −1, satlin gives a = 0 (it saturates at 0 for negative n), and tansig gives a = tanh(−1.8) = −0.9468. This is Hagan Problem P2.3.',
      },
    ],
  },
  {
    id: 'layers',
    lecture: 'Unit I',
    title: 'Canteen Network',
    story:
      'The canteen app suggests what to eat from how hungry you are, how much money you have and how much time is left. One neuron is not enough for several dishes, so neurons are arranged in layers, and layers are stacked. The weights here are random: later units teach how to learn them.',
    topics: 'A layer of neurons, multiple layers, abbreviated notation, parameter count, recurrent network',
    color: '#a78bfa',
    equation: 'a⁰ = p   ·   a^(m+1) = f^(m+1)(W^(m+1) a^m + b^(m+1))   ·   recurrent: a(t+1) = satlins(W a(t) + b)',
    words: [
      { term: 'Layer', meaning: 'S neurons that all receive the same inputs. Its weights form a matrix W with S rows and its biases a vector b.' },
      { term: 'R – S¹ – S²', meaning: 'Short notation for an architecture: R inputs, S¹ neurons in the first layer, S² in the second.' },
      { term: 'Hidden layer', meaning: 'Any layer whose outputs feed another layer instead of leaving the network.' },
      { term: 'Output layer', meaning: 'The last layer. Its outputs a^M are the answer of the network.' },
      { term: 'Parameter', meaning: 'One adjustable number: a weight or a bias. A layer has S(inputs + 1) of them.' },
      { term: 'Delay block D', meaning: 'A box that holds a value for one time step: what goes in at time t comes out at t + 1.' },
      { term: 'Recurrent network', meaning: 'A network whose output is fed back to its own input through a delay, so it changes over time.' },
    ],
    takeaway:
      'Neurons work in layers, and each layer feeds the next. Extra layers only add power when they use a curved transfer function; all-linear layers collapse into one.',
    picture: [
      { mark: 'Yellow-edged squares on the left', meaning: 'The three inputs: hunger, budget and time, each from −1 (low) to +1 (high).', color: '#fde68a' },
      { mark: 'Violet-edged circles', meaning: 'Neurons. Each column is one layer; the last column has one neuron per dish.', color: '#a78bfa' },
      { mark: 'Blue or red fill inside a circle', meaning: 'That neuron’s output: blue is positive, red is negative, and a stronger colour is a larger value.' },
      { mark: 'Blue lines between columns', meaning: 'Positive weights. A thicker line is a larger weight.', color: '#38bdf8' },
      { mark: 'Red lines between columns', meaning: 'Negative weights. A thicker line is a larger weight.', color: '#fb7185' },
      { mark: 'Glowing dots moving along the lines', meaning: 'The signal passing through one layer at a time, light blue for positive and pink for negative. A flash on a column marks the moment it arrives.' },
      { mark: 'Gold ring and ★ on a dish', meaning: 'The dish with the largest output: the app’s suggestion.', color: '#fde68a' },
      { mark: 'Heading at the top', meaning: 'The short name of the network (such as 3 – 4 – 3) and its parameter count worked out.' },
      { mark: 'Captions under each layer', meaning: 'The size of that layer’s weight matrix and bias, and how many parameters it has.' },
      { mark: 'Card at the bottom, green title', meaning: 'Multiplying the weight matrices together gives different answers from the real network, so the layers are doing real work.', color: '#34d399' },
      { mark: 'Card at the bottom, amber title', meaning: 'Every layer is linear, so the single layer shown gives exactly the same answers as the whole network.', color: '#fbbf24' },
      { mark: 'Recurrent view: loop of boxes', meaning: 'The output goes through the weights W, the adder +, and satlins, then round the loop back to the start.' },
      { mark: 'Amber box D on the loop', meaning: 'The delay block. It holds the output for one time step before feeding it back.', color: '#fbbf24' },
      { mark: 'White dot travelling round the loop', meaning: 'One trip round the loop is one time step.' },
      { mark: 'Boxes a(t) and a(t+1)', meaning: 'The two friends’ opinions now and at the next step.' },
      { mark: 'Blue line in the time chart', meaning: 'Friend 1’s opinion at each step, from −1 (mess) to +1 (canteen).', color: '#38bdf8' },
      { mark: 'Amber line in the time chart', meaning: 'Friend 2’s opinion at each step.', color: '#fbbf24' },
    ],
    industry: {
      setting: 'Food delivery, shopping and video apps, recommendations team',
      problem:
        'Each user sees only a few items on the first screen out of thousands on offer. Showing the wrong ones means fewer orders, and the answer must come back in a few milliseconds.',
      howUsed:
        'A multilayer network takes facts about the user (past orders, time of day, location) and about each item, passes them through a few hidden layers with a curved transfer function, and gives each item a score. The highest scores are shown first. Engineers choose the number of layers and neurons by counting parameters and the time per request, just as this station counts them.',
      goesWrong:
        'Teams sometimes grow the network wider and deeper for a tiny gain in accuracy, and then it is too slow or too costly to run at the busy dinner hour. They compare every large model against a smaller one on the same test, measure the time per request, and shrink the model when the extra layers do not pay for themselves.',
      roles: 'ML engineer, recommendation systems engineer, backend engineer.',
    },
    theory: {
      idea: 'A layer is a row of S neurons that all look at the same inputs, each with its own weights, so the weights form a matrix W with S rows. Feeding the outputs of one layer into the next gives a multilayer network. If an output is fed back to the input through a delay, the network becomes recurrent and its state changes from one time step to the next.',
      how: [
        'Start with the input vector: a⁰ = p.',
        'Layer 1 computes all its neurons at once: a¹ = f¹(W¹a⁰ + b¹).',
        'Each later layer does the same with the previous outputs: a^(m+1) = f^(m+1)(W^(m+1)a^m + b^(m+1)).',
        'The outputs of the last layer are the answer. Here the largest one names the dish.',
        'In a recurrent layer the output a(t) is held by the delay block for one step and used as the input for a(t+1).',
      ],
      usedFor: [
        {
          where: 'Reading handwritten digits',
          example: 'Postal and bank systems feed the pixels of a digit into a multilayer network with ten outputs, one per digit, and take the largest.',
        },
        {
          where: 'Recommendations in shopping and video apps',
          example: 'A network takes features of you and of an item through several layers and outputs a score; the items with the highest scores are shown first.',
        },
        {
          where: 'Phone keyboards',
          example: 'Recurrent networks keep a running state of the sentence typed so far and use it to suggest the next word.',
        },
      ],
      limits:
        'Layers that are all linear collapse into a single layer, so depth only helps with non-linear transfer functions. More neurons mean more parameters, which need more data to set well. With random weights, as here, the answer is meaningless until the network is trained. Recurrent networks can saturate or oscillate and are harder to analyse.',
    },
    complexity: {
      parameters:
        'Layer m has S^m(S^(m−1) + 1) parameters; add over the layers. The starting 3–4–3 network has 4(3+1) + 3(4+1) = 31. The recurrent demo with 2 neurons has 2(2+1) = 6. The station shows the live count as you resize it.',
      prediction:
        'One multiplication per weight: 4×3 + 3×4 = 24 for 3–4–3, plus 7 transfer-function evaluations. The recurrent layer costs 2×2 = 4 multiplications per time step, paid again at every step.',
      training:
        'Nothing is trained here. Backpropagation, taught later, costs about two forward passes per example: one pass forward and one backward through the same weights. A full run is that, times the number of examples, times the number of passes.',
      memory:
        'All weights and biases (31 numbers for 3–4–3), plus the outputs of each layer during a pass (3 + 4 + 3 = 10 values). A recurrent network must also keep its state a(t) between steps: 2 numbers here.',
      scaling:
        'The weights between two neighbouring layers number S^m × S^(m−1), so doubling both layers makes four times the work. Adding a layer adds its work in sequence, so depth costs time in proportion. Widening or deepening a purely linear network never gains anything.',
    },
    steps: [
      {
        kind: 'explore',
        text: 'Add and remove neurons and layers. Follow one pulse from the inputs to the dishes and check the parameter formula against the picture. Then open the recurrent view and step through time.',
      },
      {
        kind: 'break',
        text: 'Make every layer linear (purelin), so each layer only multiplies and adds, with no bend. The app multiplies the weight matrices together and shows one single layer that gives exactly the same outputs. The extra layers bought nothing.',
      },
      {
        kind: 'fix',
        text: 'Give the hidden layers a curved transfer function such as tansig. The single-layer shortcut no longer matches, so the depth now does real work.',
      },
      {
        kind: 'prove',
        text: 'Write a 3–4–2 network in matrix form and count its parameters. Why can two purelin layers always be replaced by one?',
        answer:
          'a¹ = f¹(W¹p + b¹) with W¹ 4×3, a² = f²(W²a¹ + b²) with W² 2×4. Parameters: 4(3+1) + 2(4+1) = 26. With purelin, a² = W²(W¹p + b¹) + b² = (W²W¹)p + (W²b¹ + b²), which is one layer with W = W²W¹ and b = W²b¹ + b².',
      },
    ],
  },
  {
    id: 'fruit-sorter',
    lecture: 'Unit I',
    title: 'Idli or Vada',
    story:
      'The mess kitchen has a conveyor that must send idlis one way and vadas the other. Three sensors report shape, texture and weight as +1 or −1. Three different networks solve the same problem, each in its own way.',
    topics: 'Pattern recognition problem, perceptron, Hamming network, Hopfield network',
    color: '#fb7185',
    equation:
      'Perceptron: a = hardlims(Wp + b)   ·   Hamming: a¹ = W¹p + b¹, a²(t+1) = poslin(W²a²(t))   ·   Hopfield: a(t+1) = satlins(W a(t) + b)',
    words: [
      { term: 'Prototype', meaning: 'The textbook-perfect example of a class. Vada: round, rough, light = [1 −1 −1]. Idli: round, smooth, light = [1 1 −1].' },
      { term: 'Perceptron', meaning: 'A neuron with a hard-limit output. Its weights define a flat boundary: one side is idli, the other is vada.' },
      { term: 'Decision boundary', meaning: 'The plane Wp + b = 0 where the perceptron changes its answer.' },
      { term: 'Hamming network', meaning: 'Two layers. The first scores how well the input matches each prototype; the second lets the scores fight until one is left.' },
      { term: 'Competitive layer', meaning: 'A recurrent layer in which each neuron pushes the others down. The largest one survives: winner take all.' },
      { term: 'Hopfield network', meaning: 'One recurrent layer that starts at the input and moves, step by step, until it rests on a stored prototype.' },
      { term: 'Hamming distance', meaning: 'The number of elements in which two ±1 vectors differ.' },
    ],
    takeaway:
      'Three ways to recognise a pattern: draw one boundary (perceptron), pick the closest stored example (Hamming), or let the input settle onto a stored example (Hopfield). All three struggle when the input sits exactly halfway.',
    picture: [
      { mark: 'Conveyor belt and item at the top', meaning: 'The item being sorted. Golden with dark specks and a hole looks rough like a vada; pale and plain looks smooth like an idli. Its size follows the weight reading and its shape the shape reading.' },
      { mark: 'Three glowing sensor lights', meaning: 'The readings p₁ shape, p₂ texture and p₃ weight. Blue is a positive reading, red a negative one.' },
      { mark: 'Grey cube, panel a', meaning: 'Every possible set of three readings, each from −1 to +1. Drag across the panel to turn it.' },
      { mark: 'Pink plane, panel a', meaning: 'The perceptron’s boundary, where texture is 0. Smooth side is idli, rough side is vada. It pulses when the input lies on it.', color: '#f472b6' },
      { mark: 'Pink arrow W', meaning: 'The perceptron’s weights. It points to the idli side, at right angles to the plane.', color: '#f472b6' },
      { mark: 'Amber dot', meaning: 'The vada prototype, the perfect vada.', color: '#f59e0b' },
      { mark: 'Pale grey dot', meaning: 'The idli prototype, the perfect idli.', color: '#e2e8f0' },
      { mark: 'White pulsing dot with a dashed line', meaning: 'The current input p. The dashed line drops to the plane; its length is the size of n.' },
      { mark: 'Amber and pale bars, panel b', meaning: 'The Hamming scores for vada and idli at the current step. The larger one is winning.' },
      { mark: 'Dashed white outline on the bars', meaning: 'The first-layer score a¹: how well the input matched each prototype before the competition started.' },
      { mark: 'Chart in panel b', meaning: 'Each score step by step: amber for vada, pale for idli. The loser falls to 0.' },
      { mark: 'Three bars, panel c', meaning: 'The Hopfield outputs for shape, texture and weight. Blue is positive, red is negative.' },
      { mark: '▼ and ▲ marks on those bars', meaning: 'Where the vada prototype (amber ▼) and the idli prototype (pale ▲) sit for each feature.' },
      { mark: 'Pink, green and violet lines, panel c', meaning: 'The three Hopfield outputs a₁, a₂ and a₃ step by step, until they stop on a prototype.' },
      { mark: 'Strip at the bottom of each panel', meaning: 'That network’s answer, written in amber for vada or pale grey for idli. Yellow text means still deciding, red means no answer.' },
    ],
    industry: {
      setting: 'Food and packaging plants, line automation team. The closest-match idea also lives in phone and network chips and in product search.',
      problem:
        'Items on a fast belt must be pushed to the right bin from a few noisy sensor readings, in a fraction of a second, with simple hardware.',
      howUsed:
        'Many sorting gates are a perceptron in all but name: a weighted sum of a few readings compared with a threshold, programmed into the line controller. Closest-prototype matching, the first Hamming layer, is used when there are several product types: each type is stored as a reference reading and the item goes to the nearest one. The same closest-match job decodes noisy bits in phone and wifi chips, and a version of it finds the catalogue item nearest to a shopper’s photo in product search. Hopfield-style settling is rarely used directly on lines today.',
      goesWrong:
        'An item that reads halfway between two classes, or a new product type with no prototype, is still forced into one bin with no warning. Teams add a "not sure" bin for items close to the boundary or with a weak best match, send those to a person, and add a new prototype when a new product appears.',
      roles: 'Automation and controls engineer, line controller programmer, quality engineer, search engineer.',
    },
    theory: {
      idea: 'Pattern recognition means deciding which known class an input belongs to. A perceptron draws one flat boundary between the classes. A Hamming network compares the input with every stored prototype and lets the best match win. A Hopfield network starts at the input and moves, step by step, until it rests on a stored prototype.',
      how: [
        'Describe each class by a prototype vector of +1 and −1 values: vada [1 −1 −1], idli [1 1 −1].',
        'Perceptron: compute n = Wp + b once. Its sign says on which side of the boundary the input lies.',
        'Hamming, layer 1: a¹ = W¹p + b¹ scores the match with each prototype (twice the number of agreeing elements).',
        'Hamming, layer 2: each neuron subtracts ε times the others, a²(t+1) = poslin(W²a²(t)), until only the largest is above zero.',
        'Hopfield: repeat a(t+1) = satlins(W a(t) + b) from a(0) = p until the state stops changing.',
      ],
      usedFor: [
        {
          where: 'Accept or reject gates on production lines',
          example: 'One weighted sum of a few sensor readings and a threshold decides whether each item stays on the belt.',
        },
        {
          where: 'Decoding noisy digital messages',
          example: 'A receiver picks the valid code word with the smallest Hamming distance to the noisy bits it received, the same closest-match job as the first Hamming layer.',
        },
        {
          where: 'Winner-take-all selection in larger networks',
          example: 'Self-organising maps that group customers or sensor readings use a competitive layer to pick the single best-matching neuron.',
        },
      ],
      limits:
        'All three networks here were designed by hand for two known prototypes. The perceptron can only draw a flat boundary and gives a confident answer even for nonsense input. The Hamming network needs one neuron per prototype and has no winner on an exact tie. The Hopfield network can rest on states that are not prototypes, and this hand-made design works only for this pair of classes.',
    },
    complexity: {
      parameters:
        'Perceptron: R + 1 = 3 + 1 = 4. Hamming: S×R weights and S biases in layer 1 (2×3 + 2 = 8) plus S×S = 4 lateral weights fixed by ε, 12 in all. Hopfield: S×S weights and S biases with S = R = 3, so 9 + 3 = 12.',
      prediction:
        'Perceptron: 3 multiplications, one pass. Hamming: S×R = 6 multiplications for the scores, then S² = 4 per step until one neuron is left (1 step for the squashed vada). Hopfield: S² = 9 multiplications per step until the state stops (2 steps for the squashed vada). The recurrent networks take longer when the input is close to a tie.',
      training:
        'No training passes at this station. The Hamming weights are the prototypes copied into the rows of W¹ (S×R = 6 numbers), and the perceptron and Hopfield weights were chosen by hand. Learning rules for the perceptron come in the next world.',
      memory: 'Perceptron 4 numbers, Hamming 12, Hopfield 12, plus the current state of each recurrent layer (2 and 3 numbers).',
      scaling:
        'The perceptron grows with R. The Hamming network needs S×R weights plus S² lateral ones, one neuron per prototype, and ε must stay below 1/(S−1), so more classes mean a gentler and slower competition. A Hopfield network for patterns of N elements needs N² weights and reliably holds only about 0.14 N patterns.',
    },
    steps: [
      {
        kind: 'explore',
        text: 'Pick an item or spoil the sensor readings with the sliders. Press Step and follow the numbers: the perceptron answers at once, the Hamming scores compete, and the Hopfield outputs slide, step by step, to a prototype.',
      },
      {
        kind: 'break',
        text: 'Send an item whose texture reads exactly 0: halfway between idli and vada. The perceptron sits on its boundary, the two Hamming neurons shrink together to zero, and the Hopfield outputs never move.',
      },
      {
        kind: 'fix',
        text: 'Nudge the texture reading to 0.2. A small lean is enough: the Hamming and Hopfield networks feed their outputs back in at every step, so the lean grows each time until the answer is clear.',
      },
      {
        kind: 'prove',
        text: 'An oblong vada gives p = [−1 −1 −1]ᵀ. Work out the Hamming network by hand: a¹, then a²(1) and a²(2) with ε = 0.5 (each neuron pushes the other down by half of the other’s value).',
        answer:
          'W¹ has rows [1 −1 −1] and [1 1 −1], b¹ = [3 3]ᵀ, so a¹ = [(1+1+1)+3, (−1−1+1)+3]ᵀ = [4 2]ᵀ. Then a²(1) = poslin([4 − 0.5·2, 2 − 0.5·4]ᵀ) = [3 0]ᵀ and a²(2) = [3 0]ᵀ. Only neuron 1 is left, so it is a vada. These are the numbers of Hagan Chapter 3 for the oblong orange.',
      },
    ],
  },
  {
    id: 'memory',
    lecture: 'Unit I',
    title: 'Picture Memory',
    story:
      'You recognise a friend from half a face in a blurred photo. A Hopfield network does the same with 8×8 pictures: store a few, damage one, and the network repairs it by rolling downhill in energy to the nearest thing it remembers.',
    topics: 'Hopfield network as content-addressable memory, energy, capacity',
    color: '#fdba74',
    equation: 'Store: W = (1/N) Σ p_q p_qᵀ, w_ii = 0   ·   Recall: a_i ← hardlims(Σ_j w_ij a_j)   ·   Energy: E = −½ aᵀWa',
    words: [
      { term: 'Content-addressable memory', meaning: 'A memory you search with a damaged copy of the content itself, instead of with an address or a file name.' },
      { term: 'Hebb rule', meaning: 'Strengthen the weight between two neurons that are on together. For a stored picture p this adds p pᵀ to W.' },
      { term: 'State a', meaning: 'The 64 neuron outputs, each +1 (lit) or −1 (dark). It is the picture the network is holding right now.' },
      { term: 'Energy E', meaning: 'One number computed from the state. Every update keeps it the same or lowers it, so recall is a walk downhill.' },
      { term: 'Stable state', meaning: 'A state in which no neuron wants to change: the bottom of a valley of the energy.' },
      { term: 'Spurious state', meaning: 'A stable state that is not one of the stored pictures, usually a blend of several.' },
      { term: 'Capacity', meaning: 'How many pictures can be stored before recall fails: roughly 0.14 N for N neurons, so about 9 here.' },
    ],
    takeaway:
      'A Hopfield network stores pictures as valleys in an energy landscape and repairs a damaged picture by rolling downhill. Store too many and the valleys merge into wrong blends.',
    picture: [
      { mark: 'Large 8×8 grid', meaning: 'The network’s state: 64 neurons, one per cell. Tap or drag to draw your own picture.' },
      { mark: 'Orange cells', meaning: 'Lit neurons, value +1. Dark cells are −1.', color: '#fdba74' },
      { mark: 'Red dot in a cell', meaning: 'That pixel differs from the picture you started from. Recall should clear them.', color: '#f43f5e' },
      { mark: 'White flash on a cell', meaning: 'That neuron has just flipped.' },
      { mark: 'White frame on a cell', meaning: 'The neuron being updated right now.' },
      { mark: 'Small pictures in the "Stored" card', meaning: 'Every picture held in the weights. The one closest to the grid is orange with a white frame.' },
      { mark: 'Number under each stored picture', meaning: 'How many of the 64 pixels on the grid match that picture.' },
      { mark: 'Thin bar under the "Stored" title', meaning: 'How full the memory is. Green while within capacity, red when overloaded. The white tick marks the limit of about 9.', color: '#34d399' },
      { mark: 'Orange staircase in the energy chart', meaning: 'The energy after each neuron update. It steps down when a neuron flips and never goes up.', color: '#fdba74' },
      { mark: 'White dot at the end of the staircase', meaning: 'The energy right now.' },
      { mark: 'Green dashed line', meaning: 'The energy of the clean picture you started from: the bottom of the valley recall should reach.', color: '#34d399' },
      { mark: 'Message in the energy chart', meaning: 'Once recall stops it says whether the state is a stored picture, a negative image, or a wrong blend.' },
    ],
    industry: {
      setting: 'Search, photo and language-model teams. Classic Hopfield networks are rarely deployed today; the idea of searching memory by content is everywhere.',
      problem:
        'Find the stored item that best matches a partial or noisy query, such as a cropped photo or half a sentence, without knowing where it is stored.',
      howUsed:
        'Photo and product search store each item as a list of numbers and return the stored items closest to the query, which is recall by content. Inside the language models that many apps now use, the attention step compares the current word with everything stored so far and blends the best matches. Researchers have shown that this step is the update of a modern Hopfield network with a far larger capacity than the one here.',
      goesWrong:
        'Like an overloaded Hopfield network, a memory full of very similar items can return a blend or the wrong near-match. Teams remove duplicates, keep stored items distinct, set a minimum match score below which nothing is returned, and check retrieved results against the original source.',
      roles: 'Search engineer, ML research engineer, data engineer.',
    },
    theory: {
      idea: 'A Hopfield network is a single layer in which every neuron is connected to every other one. Storing a picture carves a valley into an energy landscape. Starting from a damaged picture, the neurons update one at a time, the energy can only go down, and the state rolls into the nearest valley. You find a memory by its content, not by an address.',
      how: [
        'Write each picture as a vector p of +1 (lit) and −1 (dark) values, one per neuron.',
        'Store it with the Hebb rule: add p pᵀ / N to the weights and keep the diagonal at zero.',
        'To recall, set the state a to the damaged picture.',
        'Pick a neuron, compute its net input from all the others, and set it to the sign of that sum.',
        'Repeat until a whole sweep changes nothing. The state is then stable and the energy E = −½ aᵀWa is at a local minimum.',
      ],
      usedFor: [
        {
          where: 'Repairing noisy binary patterns',
          example: 'Small associative memories restore a smudged scanned character to the clean stored version.',
        },
        {
          where: 'Optimisation written as an energy',
          example: 'Hopfield-style networks and their hardware relatives (Ising machines, annealers) look for low-energy states that correspond to good routes or schedules.',
        },
        {
          where: 'Attention in present-day language models',
          example: 'The look-up step inside a transformer has been shown to be the update of a modern Hopfield network with a much larger capacity.',
        },
      ],
      limits:
        'Capacity is small: about 0.138 N random pictures for N neurons, and fewer if the pictures resemble each other. Beyond that the stored pictures are no longer stable and recall ends in spurious blends. The negative of every stored picture is also a valley. Recall finds the nearest valley, which need not be the picture you meant.',
    },
    complexity: {
      parameters:
        'An N×N weight matrix with a zero diagonal: N(N−1) = 64 × 63 = 4,032 weights, of which N(N−1)/2 = 2,016 are distinct because W is symmetric. No biases are used here.',
      prediction:
        'Updating one neuron costs N − 1 = 63 multiplications. One sweep over all neurons costs N(N−1) = 4,032. Recall usually settles within a few sweeps, so the work grows with N² per sweep.',
      training:
        'Storing is one shot, not repeated passes: each picture adds p_i p_j / N to every weight, about N² = 4,096 multiply-adds. Storing P pictures costs P × N²: about 12,000 for the three starting pictures.',
      memory:
        'The weight matrix (4,096 numbers, 2,016 distinct) and the state (64 values). The pictures themselves are not kept anywhere: they exist only as valleys in W.',
      scaling:
        'Weights grow with N² but capacity only with N. 64 neurons hold about 9 pictures in 4,032 weights; 1,000 neurons would hold about 138 in about a million weights. The station shows the live count of stored pictures against the limit.',
    },
    steps: [
      {
        kind: 'explore',
        text: 'Load a picture or draw your own on the grid, store it, corrupt it with the noise slider and press Recall. Watch pixels flip one at a time while the energy falls.',
      },
      {
        kind: 'break',
        text: 'Store 12 pictures in 64 neurons, well past the limit of about 9. Then try to recall the smiley. The network settles on a state that is none of the stored pictures.',
      },
      {
        kind: 'fix',
        text: 'Go back to three pictures and recall the same damaged smiley. The valleys are far apart again, so the nearest one is the right one.',
      },
      {
        kind: 'prove',
        text: 'Why can the energy never rise when one neuron is updated at a time, and what does that guarantee?',
        answer:
          'Changing neuron i by Δa_i changes the energy by ΔE = −Δa_i · n_i with n_i = Σ w_ij a_j (the weights are symmetric with zero diagonal). The rule makes a_i take the sign of n_i, so Δa_i and n_i have the same sign and ΔE ≤ 0. The energy is bounded below, so the network must stop in a stable state. It does not guarantee that the state is one of the stored pictures.',
      },
    ],
  },
]
