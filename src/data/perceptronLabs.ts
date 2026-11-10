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
    takeaway: 'One neuron makes a yes or no decision by drawing one straight line. The weights turn the line and the bias slides it.',
    picture: [
      { mark: 'Circles', meaning: 'Students the college allows to sit the exam (target t = 1).' },
      { mark: 'Squares', meaning: 'Students the college refuses (target t = 0).' },
      { mark: 'Amber fill', meaning: 'The perceptron says this student is allowed (a = 1).', color: '#fbbf24' },
      { mark: 'Blue fill', meaning: 'The perceptron says this student is refused (a = 0).', color: '#38bdf8' },
      { mark: 'Pulsing red ring', meaning: 'The perceptron disagrees with the college for this student.', color: '#fb7185' },
      { mark: 'White line', meaning: 'The decision boundary: every point where the sum n is exactly 0.', color: '#f8fafc' },
      { mark: 'Faint amber shading', meaning: 'The side of the line where n is 0 or more, so the gate opens.' },
      { mark: '"a = 1 allowed" and "a = 0 refused" labels', meaning: 'Which side of the line gives which answer.' },
      { mark: 'Pink arrow with a ring at its tip', meaning: 'The weight vector W. Drag the ringed tip to turn it, and the line turns with it.', color: '#f472b6' },
      { mark: 'Small corner mark and "90°"', meaning: 'W always meets the line at a right angle.' },
      { mark: 'White square on the line', meaning: 'The bias handle. Drag it to slide the line without turning it; its label shows b.' },
      { mark: 'Dashed white ring and "n =" label', meaning: 'The student you tapped, with that student’s sum n.' },
      { mark: 'Small cross at the bottom left', meaning: 'The origin: 0% attendance and 0 marks.' },
      { mark: 'Red ring at the origin', meaning: 'Shown when the bias is off: the line is pinned to this point and can only turn.', color: '#fb7185' },
    ],
    industry: {
      setting: 'Banks and lenders, credit risk team',
      problem: 'Thousands of loan and credit card applications arrive every day. Each needs a quick, consistent and explainable yes or no.',
      howUsed:
        'The team builds a scorecard: each fact about the applicant (income, existing debt, years at the same address, missed payments) gets a weight, and the weighted sum is compared with a cut-off. That is exactly this neuron. The weights are learned from past loans that were repaid or not, and the cut-off is the bias, chosen from how much risk the bank accepts. Because the score is a plain weighted sum, the bank can tell a refused customer which facts counted against them.',
      goesWrong:
        'The kind of people applying changes over time, for example after a new product launch or a downturn, and a cut-off that was right last year approves too many risky loans. Teams track approval rates and repayment by month, and move the cut-off or retrain the weights when they drift. They also check that the score does not treat groups of customers unfairly.',
      roles: 'Credit risk analyst, scorecard developer (data scientist), model validator, credit policy manager.',
    },
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
        text: 'Give the bias back and slide the line off the origin. Notice that W alone sets the direction of the line, and b divided by the length of W sets how far it sits from the origin. The Line from origin readout shows that distance.',
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
    takeaway: 'The perceptron learns only from mistakes: add the input when it said no wrongly, subtract it when it said yes wrongly. It stops as soon as every example is right, even if only just.',
    picture: [
      { mark: 'Orange circles', meaning: 'Spam senders (target t = 1). In the textbook set, the t = 1 points.', color: '#fb923c' },
      { mark: 'Blue squares', meaning: 'Genuine senders (target t = 0). In the textbook set, the t = 0 points.', color: '#38bdf8' },
      { mark: 'Faint orange shading', meaning: 'The side of the line where the neuron answers 1 (spam).' },
      { mark: 'White line', meaning: 'The decision boundary. It swings each time the weights change.', color: '#f8fafc' },
      { mark: 'Grey lines through 0', meaning: 'The two axes through the origin, where the arrows start.' },
      { mark: 'Pink arrow from the origin', meaning: 'The weight vector w, with its numbers in the label.', color: '#f472b6' },
      { mark: 'Pulsing red ring', meaning: 'This sender is on the wrong side of the line right now.', color: '#fb7185' },
      { mark: 'Pulsing ring around one point', meaning: 'The sample being shown. Green means the neuron was right and nothing changes; white means a mistake.', color: '#34d399' },
      { mark: 'Dashed white arrow labelled p', meaning: 'The input vector of the sample being shown, drawn from the origin.' },
      { mark: 'Faded pink arrow with a green "+ p" or red "− p" arrow at its tip', meaning: 'The old w and the change the rule makes: p is added (green) or subtracted (red) to give the new w.' },
      { mark: 'Text banner at the top', meaning: 'The target, the answer, the error and what the rule does with it, for the sample being shown.' },
      { mark: '"nudged" label', meaning: 'The sender you pushed a tiny step across the line.' },
    ],
    industry: {
      setting: 'Email providers and messaging apps, spam and abuse team',
      problem: 'Billions of messages arrive and a small share are spam or scams. Spammers change their wording every week, so a filter set once soon falls behind.',
      howUsed:
        'Each message is turned into numbers: which words appear, how many links, the sender’s history. A linear classifier gives each of these a weight and adds them up. When a user presses "Report spam" or "Not spam", that message is a mistake the filter made, and the weights are nudged with an update very like this rule. Correct messages leave the weights alone, so the filter keeps learning cheaply all day.',
      goesWrong:
        'Users mislabel messages, for example reporting a newsletter they signed up for, and a rule that trusts every label keeps swinging. Spammers also craft messages that sit just on the safe side of the line. Teams use variants that keep a safety gap from the line and average the weights over time, wait for several reports before acting, and test each new filter on a fixed set of checked messages before release.',
      roles: 'Anti-abuse engineer, ML engineer, trust and safety analyst.',
    },
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
        text: 'Turn Auto-play off and press Next sample again and again. Predict before each press: will w change, and will p be added or subtracted? Then change the step size α (how much of p is added or subtracted on each mistake) and shuffle the order. Does it still finish?',
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
    takeaway: 'Several neurons side by side each answer their own yes or no question, so S neurons can name up to 2^S classes. Each question must still be one a straight line can answer.',
    picture: [
      { mark: 'Amber dots', meaning: 'Jalebi: sweet, not spicy. In the textbook set, class 3.', color: '#fbbf24' },
      { mark: 'Rose dots', meaning: 'Samosa: spicy, not sweet. In the textbook set, class 2.', color: '#fb7185' },
      { mark: 'Green dots', meaning: 'Chilli mango: sweet and spicy. In the textbook set, class 4.', color: '#a3e635' },
      { mark: 'Blue dots', meaning: 'Idli: neither sweet nor spicy. In the textbook set, class 1.', color: '#38bdf8' },
      { mark: 'Pink line', meaning: 'Neuron 1’s boundary, set by row 1 of W.', color: '#f472b6' },
      { mark: 'Violet line', meaning: 'Neuron 2’s boundary, set by row 2 of W.', color: '#c4b5fd' },
      { mark: 'Short arrows labelled "row 1" and "row 2"', meaning: 'Each points to the side of its line where that neuron answers 1.' },
      { mark: 'Tinted background', meaning: 'The class whose code the two neurons give at that spot, in that class’s colour.' },
      { mark: '"a = [1 0] jalebi" style labels', meaning: 'The output code of each region and the class it names.' },
      { mark: 'Pulsing white ring', meaning: 'This snack gets the wrong code right now.', color: '#f8fafc' },
      { mark: 'Large pulsing ring with "t, a, e" label', meaning: 'The snack being shown, with its target, the output and the error. Green ring means both neurons were right.', color: '#34d399' },
      { mark: 'Table at the top right', meaning: 'The numbers in W and b, one row per neuron, and each row’s error. A row lights up while it changes; a green error is +1, a red one is −1.' },
    ],
    industry: {
      setting: 'Online shops and customer-support teams, ticket and product tagging',
      problem: 'Every incoming ticket or product listing needs several labels at once, such as "billing?", "urgent?", "refund?", so it reaches the right team quickly.',
      howUsed:
        'The team trains one linear unit per label, all reading the same features of the text. Each unit answers its own yes or no, and together they give a code of tags for the ticket. The same layout sits at the end of most large text and image networks: a final layer of linear units, one per class or label, reading the features the network has learned.',
      goesWrong:
        'A label that mixes unrelated cases, such as "other" or "needs a manager", asks one unit to group things that sit on opposite sides of the map, like the opposite corners in this station. That unit never settles and tags at random. Teams split such labels into clearer ones, add better features, or use a network with a hidden layer, and they measure accuracy for each label separately.',
      roles: 'ML engineer, data scientist, support operations analyst, data annotation lead.',
    },
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
        text: 'Press Next sample and watch the table of weights at the top right. Which row lights up, and which line moves? Drag a snack into another group\'s area and see which neuron has to learn again.',
      },
      {
        kind: 'break',
        text: 'Give opposite corners the same first bit, the first number in the code. Now neuron 1 must put jalebi and samosa on one side and chilli mango and idli on the other. Watch row 1 change for ever while row 2 settles.',
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
    takeaway: 'If a straight line can split the data, the perceptron rule is sure to find one. If no line can, as with XOR, it never stops, and that is why networks need hidden layers.',
    picture: [
      { mark: 'Four lamps', meaning: 'The four switch positions: A down or up (across) and B down or up (upwards).' },
      { mark: 'Glowing amber lamp marked ON', meaning: 'The light should be on for this switch position (target t = 1).', color: '#fbbf24' },
      { mark: 'Dark lamp marked off', meaning: 'The light should be off for this switch position (target t = 0).', color: '#64748b' },
      { mark: 'Faint amber shading', meaning: 'The side of the line where the perceptron says the light is on.' },
      { mark: 'White line', meaning: 'The perceptron’s boundary right now.', color: '#f8fafc' },
      { mark: 'Green dashed line', meaning: 'One known solution x*, a line that gets every lamp right. It is missing when no such line exists.', color: '#34d399' },
      { mark: 'Pulsing red ring', meaning: 'The perceptron gets this lamp wrong right now.', color: '#fb7185' },
      { mark: 'Expanding white ring', meaning: 'The lamp that was just shown to the learning rule.' },
      { mark: 'Bar above the chart', meaning: 'Weight changes so far against the proof’s limit. Amber while running, green once training has stopped.', color: '#fbbf24' },
      { mark: 'Green curve with dots', meaning: 'The angle between the current weights and the solution x* after each change. It falls as the rule closes in.', color: '#34d399' },
      { mark: 'Red stepped line', meaning: 'Shown when no solution exists: how many lamps are wrong after each change. It never stays at 0.', color: '#fb7185' },
      { mark: 'Green dashed line at 0 in the chart', meaning: 'Where the red line would have to stay for training to stop.' },
    ],
    industry: {
      setting: 'Banks, insurers and online shops, any analytics team choosing a model',
      problem: 'Before spending weeks on a complex model, the team needs to know whether a simple linear one is good enough.',
      howUsed:
        'Teams start with a linear model as a baseline. If it cannot even fit the training data, the classes are probably not separable by a line. A typical cause is an "either but not both" pattern, such as two account signals that are harmless when both are absent or both present, but suspicious when only one appears. The fix is the one this station points to: add a combined feature by hand, or use a network with a hidden layer that can draw several lines and combine them. This limit is the reason hidden layers exist.',
      goesWrong:
        'A plain perceptron trained on data that is not separable never finishes, so code that waits for zero mistakes hangs. Teams always cap the number of passes, keep the best weights seen so far, and watch the training error. An error that stays high on the training data itself is the sign that the model is too simple, not that it needs more time.',
      roles: 'Data scientist, ML engineer, analytics lead.',
    },
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
        text: 'With "Both up", watch the green curve fall. It is the angle between the current weights and a known solution. Check that the count of weight changes stays under the proof’s limit. Drag the ON lamp towards an off lamp and read the limit again.',
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
    takeaway: 'A weight matrix can store patterns and recall them. The Hebb rule is exact only when the patterns do not overlap; the pseudoinverse rule removes the overlap whenever the patterns are independent.',
    picture: [
      { mark: 'Amber pixels', meaning: 'Ink, value +1.', color: '#fbbf24' },
      { mark: 'Dark pixels', meaning: 'Blank paper, value −1.', color: '#020617' },
      { mark: 'Grey pixels', meaning: 'Value 0: unknown, such as the covered half of a damaged icon.', color: '#334155' },
      { mark: 'Stored icons, one with a pink ring', meaning: 'The patterns kept in memory. The ringed one is the icon being recalled. Tap a pixel to redraw it.', color: '#f0abfc' },
      { mark: 'Small square "the wall W"', meaning: 'All 36 × 36 weights, one tiny brick each: amber is a positive weight, dark a negative one, grey near zero.' },
      { mark: '"p shown"', meaning: 'The icon given to the memory, clean or damaged.' },
      { mark: '"a = Wp"', meaning: 'The memory’s raw answer.' },
      { mark: '"the wanted part" (or "target t")', meaning: 'The share of the answer that is the right icon.' },
      { mark: '"cross-talk" (or "error a − t")', meaning: 'What leaks in from the other stored icons, or with the pseudoinverse rule, what is still wrong. All grey means nothing leaked.' },
      { mark: '"hardlims(a)" with a green or red frame', meaning: 'The answer with every pixel snapped to ink or paper. Green frame: it matches the stored icon. Red: some pixels are wrong.' },
      { mark: 'Blue diagonal in the table', meaning: 'Each icon compared with itself. 1.00 means it has length 1.', color: '#38bdf8' },
      { mark: 'Green 0.00 cells', meaning: 'The two icons do not overlap at all, so they cause no cross-talk.', color: '#34d399' },
      { mark: 'Red cells', meaning: 'The two icons overlap. The deeper the red, the more one leaks into the other.', color: '#f43f5e' },
    ],
    industry: {
      setting: 'Telecom equipment makers, instrument makers and analytics teams, signal processing and data fitting',
      problem: 'Several signals or causes arrive mixed together, and the team needs to pull them apart or fit the best weights to noisy measurements.',
      howUsed:
        'Fitting a line or curve by least squares solves the same equation as this station, W = T P⁺, and every spreadsheet trend line and regression package does it. In wireless receivers with several antennas, the received signals are multiplied by the pseudoinverse of the channel matrix to separate the streams that were sent together. Search and recommendation systems match a query to stored items by inner product, which is the recall step of this memory, and overlapping items cause the same cross-talk.',
      goesWrong:
        'When two inputs are almost the same, like two sensors that always move together, the pseudoinverse becomes unstable and blows small noise up into large errors. Teams add a small penalty that keeps weights small (called regularisation), remove inputs that repeat each other, and check how well the result does on fresh measurements.',
      roles: 'Signal processing engineer, RF engineer, data analyst, data scientist.',
    },
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
        text: 'With the signal flags, recall each one clean, half covered, and with flipped pixels. Check the inner-product table: every pair of different flags is 0.00. Tap pixels to redraw a flag and watch the table and the recall change.',
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
