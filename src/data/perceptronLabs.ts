/** World 2, the Perceptron Arena: five hands-on stations for Unit II, each built on an everyday example. */
import type { Lab } from './labs'

export const perceptronLabs: Lab[] = [
  {
    id: 'boundary',
    lecture: 'Unit II',
    title: 'Exam Hall Gate',
    story:
      'Who is allowed to sit the exam? The college decides from attendance and internal marks. You are the gate: one neuron with two weights and a bias. Move them until the gate agrees with the college for every student.',
    topics: 'Perceptron architecture, single-neuron perceptron, decision boundary',
    color: '#fbbf24',
    equation: 'n = Wp + b = w₁p₁ + w₂p₂ + b;   a = hardlim(n);   boundary: Wp + b = 0',
    words: [
      { term: 'Perceptron', meaning: 'A neuron that adds up weighted inputs and answers 1 or 0 with a hard limit.' },
      { term: 'Weight vector W', meaning: 'One number per input that says how much that input counts. Drawn as the pink arrow.' },
      { term: 'Bias b', meaning: 'A number added to the sum. It slides the line away from the origin without turning it.' },
      { term: 'Net input n', meaning: 'The weighted sum Wp + b, before the hard limit.' },
      { term: 'hardlim', meaning: 'The transfer function that gives 1 when n is zero or more, and 0 otherwise.' },
      { term: 'Decision boundary', meaning: 'The line where n = 0. One side answers 1, the other side answers 0.' },
      { term: 'Origin', meaning: 'The point where every input is 0. Without a bias the boundary must pass through it.' },
    ],
    steps: [
      {
        kind: 'explore',
        text: 'Drag the tip of the pink arrow to turn W, and drag the white square to slide the line. Tap a student to see that student\'s sum. Get the wrong-side count to 0.',
      },
      {
        kind: 'break',
        text: 'Remove the bias. Now try to get every student right. The line is pinned to the corner of the map and can only turn.',
      },
      {
        kind: 'fix',
        text: 'Give the bias back and slide the line off the origin. Notice that W alone sets the direction of the line and b ÷ ‖W‖ sets how far it sits from the origin.',
      },
      {
        kind: 'prove',
        text: 'A perceptron has W = [1 2] and b = −4. Is p = [2, 2] on the a = 1 side? Where does the boundary cross the two axes, and which way does W point?',
        answer:
          'n = 1·2 + 2·2 − 4 = 2 ≥ 0, so a = 1. The boundary p₁ + 2p₂ − 4 = 0 crosses the p₁ axis at 4 (p₁ = −b/w₁) and the p₂ axis at 2 (p₂ = −b/w₂). W = [1 2] is perpendicular to that line and points into the a = 1 region.',
      },
    ],
    theory: {
      idea: 'A single-neuron perceptron makes a yes or no decision by weighing its inputs. It multiplies each input by a weight, adds a bias, and answers 1 if the total is zero or more. All the points where the total is exactly zero form a straight line (a plane with three inputs), and that line is the whole decision.',
      how: [
        'Write the inputs as a vector p, for example attendance and marks.',
        'Compute the net input n = Wp + b.',
        'Apply the hard limit: a = 1 if n ≥ 0, otherwise a = 0.',
        'The boundary is the set of points with n = 0. W is perpendicular to it and points to the a = 1 side.',
        'Changing the direction of W turns the boundary; changing b moves it towards or away from the origin.',
      ],
      usedFor: [
        { where: 'Eligibility and screening rules', example: 'A loan pre-check that scores income and existing debt with fixed weights and passes or rejects the application at a threshold.' },
        { where: 'Text filtering', example: 'A linear classifier over word counts that sends an email to the inbox or to spam; each word has one weight.' },
        { where: 'The last layer of deep networks', example: 'The final unit of an image classifier is still a weighted sum of features compared with a threshold, exactly this neuron.' },
      ],
      limits: 'One neuron can only draw one straight boundary. If the two groups cannot be split by a straight line, no choice of W and b works. It also gives a bare yes or no, with no measure of how sure it is.',
    },
    complexity: {
      parameters: 'S × R weights + S biases. Here S = 1 neuron and R = 2 inputs: 2 weights + 1 bias = 3 numbers.',
      prediction: 'R multiplications, R additions and one comparison per decision: here 2 multiplications. Checking all 26 students takes 52 multiplications. The work grows in direct proportion to the number of inputs.',
      training: 'None in this station: you set the three numbers by hand. Each time you move a handle the app re-checks all 26 students, which is 52 multiplications.',
      memory: 'Only W and b: 3 numbers. The data does not need to be stored to make a decision.',
      scaling: 'With R inputs the neuron stores R + 1 numbers and each decision costs R multiplications, so even a million inputs is cheap. What does not improve with size is the shape: the boundary stays one flat line or plane however many inputs there are.',
    },
  },
  {
    id: 'learning-rule',
    lecture: 'Unit II',
    title: 'Spam Line Trainer',
    story:
      'Each dot is someone who texts you: how many links they put in an SMS and how many words in CAPITALS. The neuron sees one sender at a time and is told spam or genuine. Watch what one mistake does to the weights.',
    topics: 'Learning rules, perceptron learning rule, constructing learning rules, unified learning rule',
    color: '#fb923c',
    equation: 'e = t − a;   W_new = W_old + e pᵀ;   b_new = b_old + e',
    words: [
      { term: 'Learning rule', meaning: 'A recipe for changing the weights and bias so the network does its job better.' },
      { term: 'Supervised learning', meaning: 'Learning from examples that come with the correct answer (the target).' },
      { term: 'Target t', meaning: 'The correct answer for a sample: 1 for spam, 0 for genuine.' },
      { term: 'Error e', meaning: 't − a. It is +1 when the neuron said 0 but should say 1, −1 the other way round, and 0 when correct.' },
      { term: 'Unified rule', meaning: 'One formula, W_new = W_old + e pᵀ, that covers all three cases of e.' },
      { term: 'Pass (epoch)', meaning: 'One trip through every sample in the training set.' },
      { term: 'Convergence', meaning: 'The moment a full pass makes no mistake, so the weights stop changing.' },
    ],
    steps: [
      {
        kind: 'explore',
        text: 'Turn Auto-play off and press Next sample again and again. Predict before each press: will w change, and will p be added or subtracted? Then change the step size α and shuffle the order. Does it still finish?',
      },
      {
        kind: 'break',
        text: 'Let training finish, then nudge the sender closest to the line. A tiny step puts it on the wrong side, because the rule stopped the moment everything was barely correct.',
      },
      {
        kind: 'fix',
        text: 'Run the rule again. It repairs the mistake in a few changes, and again stops as soon as it is just correct. The rule promises a boundary that works on the training set, not a safe distance from it.',
      },
      {
        kind: 'prove',
        text: 'No bias, w = [1.0, −0.8]. Present p₁ = [1, 2] with t = 1, then p₂ = [−1, 2] with t = 0, then p₃ = [0, −1] with t = 0. Give w after each one. (Choose "Textbook 3 points" to check.)',
        answer:
          'p₁: n = 1 − 1.6 = −0.6, a = 0, e = +1, so w = [1, −0.8] + [1, 2] = [2.0, 1.2]. p₂: n = −2 + 2.4 = 0.4, a = 1, e = −1, so w = [2.0, 1.2] − [−1, 2] = [3.0, −0.8]. p₃: n = 0.8, a = 1, e = −1, so w = [3.0, −0.8] − [0, −1] = [3.0, 0.2]. Now all three are classified correctly.',
      },
    ],
    theory: {
      idea: 'The perceptron learning rule teaches the neuron from its mistakes. It shows one labelled example at a time. If the answer is right, nothing changes. If the neuron said 0 and should have said 1, the input is added to the weights; if it said 1 and should have said 0, the input is subtracted. Writing the error as e = t − a turns the three cases into one line.',
      how: [
        'Start from any weights and bias.',
        'Show one sample p and compute a = hardlim(Wp + b).',
        'Compute the error e = t − a, which is +1, −1 or 0.',
        'Update: W_new = W_old + e pᵀ and b_new = b_old + e. Adding p turns w towards p; subtracting turns it away.',
        'Repeat through the data until one full pass has e = 0 every time.',
      ],
      usedFor: [
        { where: 'Online spam and abuse filters', example: 'A linear filter that adjusts its word weights only when a user marks a message it got wrong.' },
        { where: 'Part-of-speech taggers and parsers', example: 'Averaged-perceptron taggers in language toolkits update feature weights on every mis-tagged word.' },
        { where: 'Processor branch predictors', example: 'Perceptron branch predictors in modern CPUs add or subtract the recent branch history to small weight tables after each misprediction.' },
      ],
      limits: 'It only stops if the classes can be separated by a straight line. When it does stop, the boundary may pass very close to some points, so new data near the line is easily misclassified. It also treats noisy labels as truth and keeps moving to satisfy them.',
    },
    complexity: {
      parameters: 'R weights + 1 bias for one neuron. Here R = 2: 3 numbers (2 in the textbook set, which has no bias).',
      prediction: 'R multiplications and one comparison per sample: 2 multiplications here.',
      training: 'One step is one prediction (R multiplications) and, only on a mistake, R + 1 additions: 3 here. One pass over Q samples is Q predictions: 16 for the SMS set. The number of mistakes before it stops is finite for separable data; the panel counts them live.',
      memory: 'The weights and bias (3 numbers) plus the training set while learning. No gradients or past weights are kept.',
      scaling: 'Each step grows in direct proportion to the number of inputs R, and a pass grows with Q × R. The number of passes depends on how wide the gap between the classes is, not on how many samples there are: a narrow gap means many more corrections.',
    },
  },
  {
    id: 'four-classes',
    lecture: 'Unit II',
    title: 'Canteen Sorting Line',
    story:
      'A taste panel scores every canteen snack for sweetness and spice. Two neurons sort them: one answers "is it sweet?", the other "is it spicy?". Two yes or no answers make four boxes: jalebi, samosa, chilli mango, idli.',
    topics: 'Multiple-neuron perceptron, training multiple-neuron perceptrons',
    color: '#a3e635',
    equation: 'a = hardlim(Wp + b);   e = t − a;   W_new = W_old + e pᵀ;   b_new = b_old + e   (W is S × R)',
    words: [
      { term: 'Multiple-neuron perceptron', meaning: 'Several perceptron neurons that all see the same inputs. Each has its own row of W and its own bias.' },
      { term: 'Row of W', meaning: 'The weights of one neuron, written ᵢw. Each row has its own decision boundary.' },
      { term: 'Output code', meaning: 'The list of 0s and 1s from all neurons, for example [1 0]. Each class is given one code as its target.' },
      { term: 'Region', meaning: 'An area of the map where every point gets the same output code.' },
      { term: '2^S classes', meaning: 'S neurons give S yes or no answers, so at most 2 × 2 × … (S times) different codes.' },
      { term: 'Error vector e', meaning: 't − a, one entry per neuron. Only rows whose entry is not 0 are changed.' },
    ],
    steps: [
      {
        kind: 'explore',
        text: 'Press Next sample and watch the matrix. Which row lights up, and which line moves? Drag a snack into another group\'s area and see which neuron has to learn again.',
      },
      {
        kind: 'break',
        text: 'Give opposite corners the same first bit. Now neuron 1 must put jalebi and samosa on one side and chilli mango and idli on the other. Watch row 1 change for ever while row 2 settles.',
      },
      {
        kind: 'fix',
        text: 'Go back to one bit per question. Each neuron again has a split that one straight line can make, and both rows stop.',
      },
      {
        kind: 'prove',
        text: 'W = [1 0; 0 1], b = [1; 1]. The sample p = [1, 1] has target t = [0, 0]. Find a, e, and the new W and b. (Choose "Textbook 8 points" and press Start again to check.)',
        answer:
          'n = Wp + b = [2; 2], so a = [1; 1] and e = t − a = [−1; −1]. W_new = W + e pᵀ = [1 0; 0 1] + [−1 −1; −1 −1] = [0 −1; −1 0]. b_new = b + e = [0; 0]. Both rows change because both neurons were wrong.',
      },
    ],
    theory: {
      idea: 'One perceptron neuron answers one yes or no question. Put S neurons side by side on the same inputs and you get S answers at once, one line each. The pattern of answers is a code, and S lines can give up to 2^S different codes. Each neuron learns its own row with the same perceptron rule, without looking at the others.',
      how: [
        'Give each class a target code, one bit per neuron.',
        'Show a sample and compute every neuron\'s output: a = hardlim(Wp + b).',
        'Compute the error vector e = t − a.',
        'Update every row at once with W_new = W_old + e pᵀ and b_new = b_old + e. A row with error 0 does not move.',
        'Stop when a whole pass gives e = 0 for every neuron.',
      ],
      usedFor: [
        { where: 'Sorting produce on a conveyor', example: 'Grading mangoes into ripe or unripe and large or small from colour and weight sensors: two linear tests, four bins.' },
        { where: 'Multi-label tagging', example: 'A support-ticket router where one linear unit answers "billing?" and another "urgent?", so each ticket gets a code of tags.' },
        { where: 'Output layers of classifiers', example: 'A layer of linear units, one per class or per attribute, sits at the end of most image and text classifiers.' },
      ],
      limits: 'Every neuron needs a split that a single straight line can make. If the codes ask one neuron to group classes on opposite corners, that neuron never settles, even when the four classes are well apart. Regions can also be left over with a code that belongs to no class.',
    },
    complexity: {
      parameters: 'S × R weights + S biases. Here S = 2, R = 2: 4 + 2 = 6 numbers.',
      prediction: 'S × R multiplications and S comparisons: 4 multiplications here. It grows with neurons × inputs.',
      training: 'One step is one prediction, then R + 1 additions for each neuron that was wrong: at most S × (R + 1) = 6 here. One pass over the 12 snacks is 12 steps, at most 48 multiplications and 72 additions. Each row stops after a finite number of changes if its own split is linearly separable, and never otherwise.',
      memory: 'W and b (6 numbers) and the training samples.',
      scaling: 'Adding a neuron adds one row (R + 1 numbers) and doubles the number of codes available, so 10 neurons can name up to 1024 classes. The neurons do not share work: cost grows in proportion to S × R, and one neuron with an impossible split spoils the whole code.',
    },
  },
  {
    id: 'xor-room',
    lecture: 'Unit II',
    title: 'The Corridor Light',
    story:
      'A light has two switches, A and B. A perceptron must learn when the light is on. "Both up" is easy. Then wire it like a real corridor light, on when exactly one switch is up, and see what the learning rule does.',
    topics: 'Proof of convergence, limitations of the perceptron, linear separability',
    color: '#f87171',
    equation: 'x = [w; b],  z = [p; 1]:   x_new = x_old + e z;   changes k ≤ ‖x*‖² Π / δ²,  Π = max ‖z‖²',
    words: [
      { term: 'Linearly separable', meaning: 'The two classes can be put on opposite sides of one straight line.' },
      { term: 'Solution vector x*', meaning: 'Any weights and bias that classify every sample correctly. There are many, or none.' },
      { term: 'Convergence', meaning: 'The learning rule reaches weights that make no mistakes, and stops.' },
      { term: 'δ (clearance)', meaning: 'For a chosen x*, the smallest value of |x*ᵀz| over the samples: how clearly the closest sample is on its correct side.' },
      { term: 'Bound', meaning: 'A number the count of weight changes can never go past. Here it is ‖x*‖² Π / δ².' },
      { term: 'XOR', meaning: 'Exclusive OR: true when exactly one of two inputs is true. It is the classic set that is not linearly separable.' },
      { term: 'Hidden layer', meaning: 'A layer of neurons between input and output. It lets a network combine several lines into one decision.' },
    ],
    steps: [
      {
        kind: 'explore',
        text: 'With "Both up", watch the green angle curve fall and the count of weight changes stay under the limit. Drag the ON lamp towards an off lamp and read the limit again.',
      },
      {
        kind: 'break',
        text: 'Wire the corridor light. Let it run. Try any speed. Can you find a moment when no lamp is ringed red?',
      },
      {
        kind: 'fix',
        text: 'Make the data separable: rewire to "at least one up", or drag one lamp until a line can split the two kinds. The real cure, which keeps the corridor wiring, is a hidden layer: two lines combined by a third neuron. That is World 3.',
      },
      {
        kind: 'prove',
        text: 'State what the perceptron convergence proof guarantees and what it assumes. Then show that XOR breaks the assumption.',
        answer:
          'If a solution x* exists (the classes are linearly separable), the rule starting from zero reaches a solution after at most ‖x*‖² Π / δ² weight changes. Each change raises x*ᵀx by at least δ, while ‖x‖² grows by at most Π, so the angle between x and x* must close. XOR needs b < 0 (for [0,0] off), w₁ + b ≥ 0, w₂ + b ≥ 0 and w₁ + w₂ + b < 0. Adding the middle two gives w₁ + w₂ + 2b ≥ 0, so w₁ + w₂ + b ≥ −b > 0, which contradicts the last. No x* exists, so nothing is guaranteed.',
      },
    ],
    theory: {
      idea: 'The perceptron rule comes with a guarantee: if some straight line separates the two classes, the rule will find one in a limited number of corrections. The proof watches the angle between the current weights and any solution; every correction closes it a little. The guarantee has a price: when no line exists, as with XOR, the rule never stops.',
      how: [
        'Stack weights and bias into one vector x = [w; b], and each input into z = [p; 1].',
        'Assume a solution x* exists that puts every sample on its correct side with clearance at least δ.',
        'Each correction adds ±z to x. This raises x*ᵀx by at least δ, so after k corrections it is at least kδ.',
        'The same correction raises ‖x‖² by at most Π = max ‖z‖², so ‖x‖² is at most kΠ.',
        'Together these force k ≤ ‖x*‖² Π / δ². If no x* exists, there is no bound and the weights cycle.',
      ],
      usedFor: [
        { where: 'Deciding whether a linear model is enough', example: 'Before building a deep network for a sensor alarm, an engineer checks whether a single linear unit already separates faulty from healthy readings.' },
        { where: 'Margin-based classifiers', example: 'Support vector machines used in document classification choose the solution with the largest clearance δ, the quantity this proof depends on.' },
        { where: 'Explaining why deep networks have hidden layers', example: 'Parity checks and "either but not both" rules in fraud logic need a hidden layer, for the same reason XOR does.' },
      ],
      limits: 'A single-layer perceptron fails on every problem that is not linearly separable, and the rule gives no warning: it just keeps changing the weights. The bound can also be enormous when the classes nearly touch, and you cannot compute it in advance without already knowing a solution.',
    },
    complexity: {
      parameters: 'R + 1 for one neuron. Here R = 2: 2 weights + 1 bias = 3 numbers.',
      prediction: 'R multiplications and one comparison: 2 multiplications per lamp, 8 for all four lamps.',
      training: 'One correction is R + 1 = 3 additions. On separable data the number of corrections is at most ‖x*‖² Π / δ², shown live in the panel (51 for "both up" with x* = [1, 1, −1.5]). On non-separable data the number of corrections has no limit.',
      memory: 'Three numbers. The rule keeps no history, which is why it cannot notice that it is going round in circles.',
      scaling: 'The bound does not depend on how many samples there are. It grows with the size of the inputs (Π) and blows up as 1/δ² when the gap between classes narrows: halving the clearance allows four times as many corrections. Checking in advance whether any line exists is itself a harder computation than running the rule.',
    },
  },
  {
    id: 'memory-wall',
    lecture: 'Unit II',
    title: 'The Memory Wall',
    story:
      'A wall of 36 × 36 weights remembers small pixel icons. Show it an icon, even half covered, and it answers with the icon it has stored. Store icons that look alike and its answers smear together.',
    topics: 'Linear associator, the Hebb rule, performance analysis, pseudoinverse rule',
    color: '#f0abfc',
    equation: 'a = Wp;   Hebb: W = T Pᵀ = Σ t_q p_qᵀ;   a = t_k (p_kᵀp_k) + Σ_{q≠k} t_q (p_qᵀp_k);   pseudoinverse: W = T P⁺,  P⁺ = (PᵀP)⁻¹Pᵀ',
    words: [
      { term: 'Linear associator', meaning: 'A layer with a linear transfer function, a = Wp. It links each input pattern to an output pattern.' },
      { term: 'Hebb rule', meaning: 'Strengthen a weight when its input and its output are active together. In matrix form W = T Pᵀ.' },
      { term: 'Autoassociative memory', meaning: 'A memory whose target is the input itself, so a damaged pattern recalls the whole one.' },
      { term: 'Inner product', meaning: 'p_qᵀp_k: multiply two patterns pixel by pixel and add. It measures how alike they are.' },
      { term: 'Orthonormal', meaning: 'Every pattern has length 1 and every pair has inner product 0.' },
      { term: 'Cross-talk', meaning: 'The unwanted part of the answer that leaks in from the other stored patterns.' },
      { term: 'Pseudoinverse P⁺', meaning: 'The matrix (PᵀP)⁻¹Pᵀ. It undoes P for linearly independent patterns: P⁺P = I.' },
    ],
    steps: [
      {
        kind: 'explore',
        text: 'With the signal flags, recall each one clean, half covered, and with flipped pixels. Check the table: every pair is 0.00. Tap pixels to redraw a flag and watch the table and the recall change.',
      },
      {
        kind: 'break',
        text: 'Store the four emoji faces with the Hebb rule. They share eyes and blank paper, so the inner products are large. Look at the cross-talk picture and count the wrong pixels.',
      },
      {
        kind: 'fix',
        text: 'Switch to the pseudoinverse rule. The same faces now come back exactly. Then cover the lower half: which rule copes better with damage, and why is that a different question?',
      },
      {
        kind: 'prove',
        text: 'p₁ = [1, −1, −1]ᵀ with t₁ = −1 and p₂ = [1, 1, −1]ᵀ with t₂ = 1. Find W by the pseudoinverse rule and check both recalls. Why does plain Hebb not give exact recall here?',
        answer:
          'PᵀP = [3 1; 1 3], its inverse is (1/8)[3 −1; −1 3], so P⁺ = [0.25 −0.5 −0.25; 0.25 0.5 −0.25]. W = T P⁺ = [−1 1] P⁺ = [0 1 0]. Then Wp₁ = −1 and Wp₂ = 1, both exact. Hebb is not exact because p₁ᵀp₂ = 1 ≠ 0: the patterns are not orthogonal, so each recall picks up cross-talk from the other.',
      },
    ],
    theory: {
      idea: 'A linear associator stores pairs of patterns in one weight matrix, so that showing an input brings back its partner. The Hebb rule builds the matrix in one pass by adding up output × input for every pair. It is exact only when the inputs do not overlap; when they do, each answer is mixed with the others. The pseudoinverse rule removes that mixing whenever the inputs are linearly independent.',
      how: [
        'Write each input as a column of P and each target as a column of T.',
        'Hebb: add t_q p_qᵀ for every pair, which is W = T Pᵀ.',
        'Recall with a = Wp. For a stored input this equals t_k (p_kᵀp_k) plus cross-talk Σ t_q (p_qᵀp_k).',
        'Performance analysis: if the inputs are orthonormal the cross-talk is 0 and recall is exact; otherwise the inner-product table tells you how big the error is.',
        'Pseudoinverse: use W = T P⁺ with P⁺ = (PᵀP)⁻¹Pᵀ. Then WP = T exactly.',
      ],
      usedFor: [
        { where: 'Linear regression and curve fitting', example: 'Fitting a calibration line to sensor readings by least squares solves the same pseudoinverse equation, W = T P⁺.' },
        { where: 'Wireless receivers', example: 'A zero-forcing MIMO receiver multiplies the antenna signals by the pseudoinverse of the channel matrix to separate the transmitted streams.' },
        { where: 'Recommendation and retrieval by similarity', example: 'Matching a query to stored item vectors by inner product is the recall step of an associative memory; overlap between items causes the same cross-talk.' },
      ],
      limits: 'Hebb recall is wrong whenever stored inputs overlap, and it gets worse with every extra pattern. The pseudoinverse needs linearly independent inputs, so at most R patterns for R pixels, and it can amplify noise when patterns are nearly dependent. Being linear, the memory cannot clean up its own answer; that needs a nonlinearity such as hardlims.',
    },
    complexity: {
      parameters: 'S × R weights and no bias. Here S = R = 36 pixels: 36 × 36 = 1296 weights.',
      prediction: 'S × R multiplications for one recall: 1296 here. It grows with outputs × inputs.',
      training: 'Hebb is one pass with no repeats: S × R multiplications per pattern, so Q × S × R in total (3 × 1296 = 3888 for three icons). The pseudoinverse also builds the Q × Q table PᵀP (Q² × R multiplications), inverts it (about Q³ operations) and multiplies back, roughly Q² × R + Q³ + Q × S × R. The panel shows the live counts as you change Q.',
      memory: 'The matrix W: 1296 numbers, the same size however many icons are stored. Hebb can add a new icon later without keeping the old ones; the pseudoinverse has to keep all patterns and recompute.',
      scaling: 'W grows with the square of the picture size: a 100 × 100 image needs 10⁴ × 10⁴ = 10⁸ weights. Exact recall is possible for at most R patterns (36 here), and only if they are orthogonal for Hebb or independent for the pseudoinverse. The Q³ inverse is the practical limit when thousands of patterns are stored.',
    },
  },
]
