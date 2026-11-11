import type { LabNetwork, LabNuance, LabTutor } from './labs'

/**
 * Depth for the Model Factory stations, keyed by station id: the network inside each one,
 * the finer points worth knowing, and notes for a tutor presenting it to a class.
 */
export const factoryDeep: Record<string, { network: LabNetwork; nuances: LabNuance[]; tutor: LabTutor }> = {
  traffic: {
    network: {
      architecture: '1-8-1. One input (hour of day), 8 hidden tansig neurons, 1 linear output (minutes). 25 weights and biases.',
      forward: 'a¹ = tansig(W¹p + b¹), then a² = W²a¹ + b². Here p is the hour scaled to −1…1 and a² is the scaled delivery time. Each hidden neuron draws one S-shaped step; the output adds the eight steps.',
      learning: 'Mean square error over the training trips, reduced by backpropagation with momentum (α = 0.08, γ = 0.9), 25 steps every frame. The validation and test trips never touch the weights.',
      choices: 'A curve with two rush-hour bumps needs several bends, so one hidden layer of a few tansig neurons is enough. A linear neuron (ADALINE) could only draw a straight line through the day.',
    },
    nuances: [
      {
        point: 'The test set shares the bias of the sample',
        detail: 'Training, validation and test trips are all drawn from the same survey. If the survey missed the evening, so did the test set, and its error looks fine. A test set proves fit on data like itself, nothing more.',
        tryIt: 'Press the Break button and compare "Test" with "All real trips".',
      },
      {
        point: 'A split of a sorted file is not random',
        detail: 'Log files are usually stored in time order. Cutting the last 15% off as a test set tests only the latest hours, and trains on none of them.',
        tryIt: 'Switch off "Shuffle before splitting" and see where the rose test dots sit.',
      },
      {
        point: 'More data of the same kind does not fix missing kinds',
        detail: 'A thousand night trips teach nothing about 6 pm. Coverage of the input range matters before quantity.',
        tryIt: 'Survey 10 pm to 6 am, then raise the sample size to the maximum. The 6 pm answer does not improve.',
      },
      {
        point: 'Stratified sampling protects rare situations',
        detail: 'A random sample of 20 trips can easily contain no early-morning trip. Taking a few from every block of the day guarantees each is represented.',
        tryIt: 'Set the sample to 16 trips and press "Draw a new sample" a few times with Random, then with Stratified.',
      },
      {
        point: 'Noise sets a floor under the error',
        detail: 'Two trips at the same hour take different times. No network can predict that scatter, so an error near 2 to 3 minutes here is as good as it gets. An error far below the noise means memorising.',
      },
      {
        point: '70 / 15 / 15 is a starting point, not a rule',
        detail: 'About 70% of the records train the weights, 15% decide when to stop (validation) and 15% give the final honest estimate (test). With very little data the split costs too much and regularisation is used instead; with a great deal, 1% for testing may be plenty.',
      },
      {
        point: 'You learn afterwards whether the data was enough',
        detail: 'No formula gives the amount of data in advance. It depends on how many bends the true curve has and how noisy the readings are. The check comes after training: low training error with high test error says the data was too little for the network.',
        tryIt: 'Set the sample to its smallest size, train, and compare the training and test errors.',
      },
      {
        point: 'Missing values need a decision, not a default',
        detail: 'A trip with no recorded time, or no hour, is common in real logs. With plenty of data, drop the record. If an input is missing, fill it with the mean and add a 0/1 input that says "this was missing". If the target is missing, keep the record out of the error. First check that the gaps are not all from one part of the day.',
      },
    ],
    tutor: {
      minutes: 12,
      opener: 'Ask: "A model is 98% right on its test set and useless in real life. How is that possible?" Take two or three answers before showing the screen.',
      steps: {
        explore: {
          say: 'Every grey dot is a real trip. The coloured ones are the trips we chose to show the network. Drag "Ask the network" and compare its answer with reality.',
          ask: 'Which hour is hardest for the network? Why there?',
        },
        break: {
          say: 'We survey only at night. Look at the errors on the right: training and test are both small. The model looks finished.',
          ask: 'Before I move the slider to 6 pm: what will it say, and how wrong will it be?',
        },
        fix: {
          say: 'Same network, same training. Only the data changed: the whole day, a few trips from every block.',
          ask: 'What did we change about the network? What does that tell you about where the problem was?',
        },
        prove: {
          say: 'Give them one minute to write an answer before revealing it.',
          ask: 'Why did the test set not warn us?',
        },
      },
      misconceptions: [
        { wrong: 'A low test error means the model is good.', right: 'It means the model fits data like the test data. If the sample is biased, so is the test.' },
        { wrong: 'More data always helps.', right: 'Only data from the situations that are missing helps.' },
        { wrong: 'The validation set and the test set do the same job.', right: 'Validation guides training decisions; the test set is touched once, at the end.' },
      ],
      close: 'Data selection comes before any network choice. Next we prepare that data so the network can actually use it.',
    },
  },
  sensor: {
    network: {
      architecture: '1-S-1. One input (the pin reading), S hidden tansig neurons that you choose, 1 linear output (temperature). 3S + 1 parameters.',
      forward: 'pₙ = 2(p − p_min)/(p_max − p_min) − 1 scales the reading. Then a¹ = tansig(W¹pₙ + b¹) and a² = W²a¹ + b². The output is scaled back to °C.',
      learning: 'Mean square error on the calibration points, minimised with Levenberg-Marquardt: Δx = −[JᵀJ + μI]⁻¹Jᵀv. It reaches a good fit in tens of iterations because the problem is small.',
      choices: 'The sensor curve is smooth with one strong bend, so two to four tansig neurons suffice. A polynomial or a lookup table would also work; a network is compact enough to store in a microcontroller.',
    },
    nuances: [
      {
        point: 'Saturation is why scaling matters',
        detail: 'tansig is nearly flat beyond about ±3. With a raw reading of 800 and a weight of 0.5, the net input is 400: the slope there is zero, so backpropagation passes no correction to that weight.',
        tryIt: 'Switch normalisation off and watch every bar turn red.',
      },
      {
        point: 'Scaling constants come from the training data only',
        detail: 'p_min and p_max are computed from the recorded points and then frozen. The same constants are applied to every later reading, or the network would see shifted inputs.',
      },
      {
        point: 'Count parameters against calibration points',
        detail: 'With 12 points, S = 4 gives 13 parameters: already more unknowns than equations. The fit passes through the points but can bend between them.',
        tryIt: 'Clear, record only 5 points, then set S to 10 and look between the points.',
      },
      {
        point: 'Where you calibrate matters as much as how many',
        detail: 'Points bunched at room temperature leave the hot end to guesswork. Spread points across the whole range, with extra where the curve bends most.',
        tryIt: 'Clear, record five points between 20 and 40 °C, then move the hotplate to 90 °C.',
      },
      {
        point: 'Targets are scaled too',
        detail: 'The linear output could produce 0 to 100 directly, but scaling targets to about −1…1 keeps the error surface well shaped and the gradients of all layers comparable.',
      },
      {
        point: 'Two standard ways to normalise',
        detail: 'Min-max: pⁿ = 2(p − pmin)/(pmax − pmin) − 1 maps each input to [−1, 1]. Mean and standard deviation: pⁿ = (p − mean)/std gives mean 0 and spread 1, and is safer when a few extreme readings would stretch the range. Either way the constants come from the training set and are stored with the network.',
      },
      {
        point: 'A good transform does part of the network\'s work',
        detail: 'For a thermistor, 1/T is almost a straight line in ln R. Feeding ln R instead of R turns a sharply curved problem into a nearly straight one that very few neurons can fit. Taking the log of a price, or coding the hour as sine and cosine, are the same idea: use what you know before asking the network to discover it.',
      },
      {
        point: 'PCA removes inputs that repeat each other',
        detail: 'When a product has many sensors that rise and fall together, principal component analysis rotates them into uncorrelated components and keeps those that carry most of the variance. Fewer inputs means fewer weights for the same calibration data. It is linear and ignores the target, so confirm the test error has not got worse.',
      },
      {
        point: 'Name the task before choosing the network',
        detail: 'Calibration is fitting: a number out, so a tansig hidden layer with a linear output, trained on mean square error. A yes/no decision is pattern recognition (sigmoid or softmax output, cross-entropy). Grouping unlabelled readings is clustering (a self-organising map). Forecasting the next reading is prediction (a time-delay or NARX network).',
      },
      {
        point: 'An RBF network could fit this curve too',
        detail: 'Radial basis neurons respond only near their own centre, so the fit is built from local bumps. It trains quickly and returns to a constant away from the data instead of saturating. The cost is the number of neurons, which grows fast as inputs are added. For one or two inputs, as here, either network is a sound choice.',
      },
      {
        point: 'Sensitivity analysis shows which inputs earn their place',
        detail: 'After training, measure how much the error changes when each input changes. An input with almost no effect can be removed and the network retrained. If the test error does not rise, the smaller network is the better one.',
      },
    ],
    tutor: {
      minutes: 12,
      opener: 'Hold up any cheap sensor, or name one from the lab. Ask: "The reading is not the temperature. How does the device know the temperature?"',
      steps: {
        explore: {
          say: 'The grey curve is the real sensor. Orange dots are our calibration points. The violet curve is the network; the dashed line is the straight-line calibration a beginner would use.',
          ask: 'Where is the straight line worst? What would that mean for a product?',
        },
        break: {
          say: 'I switch scaling off. The reading now enters as a number like 830. Watch the bars: red means the neuron is stuck flat.',
          ask: 'The network has not changed. Why can it no longer learn?',
        },
        fix: {
          say: 'Scaling back on. Now find the smallest network that beats the straight line by ten times.',
          ask: 'With 12 calibration points, how many neurons would you trust? Count the parameters.',
        },
        prove: {
          say: 'Have them compute 3S + 1 for S = 2, 3 and 4 before revealing.',
          ask: 'What is the largest S you would trust with 12 points?',
        },
      },
      misconceptions: [
        { wrong: 'Normalisation is a nicety.', right: 'Without it sigmoid networks often do not train at all.' },
        { wrong: 'More neurons always fit better.', right: 'They fit the calibration points better, and behave worse between them.' },
        { wrong: 'The network works for any temperature.', right: 'Only inside the calibrated range.' },
      ],
      close: 'Two decisions so far: which data, and how it is prepared. Next, how the weights are actually found.',
    },
  },
  valley: {
    network: {
      architecture: '1-1. A single neuron with one input (hours of sleep): one weight w and one bias b. Sigmoid (logsig) or linear (purelin), your choice.',
      forward: 'n = wp + b, then a = logsig(n) = 1/(1 + e⁻ⁿ), read as "how likely to stay awake". With purelin, a = n.',
      learning: 'F(w, b) = mean (t − a)². Steepest descent: x ← x − αg. Momentum: Δx ← γΔx − (1 − γ)αg. Levenberg-Marquardt: Δx = −[JᵀJ + μI]⁻¹Jᵀv.',
      choices: 'Two parameters is the most that can be drawn as a surface. Real networks have thousands, but every one of them is moving on a surface like this, in more dimensions. The "Starting weights" view therefore uses a real 1-6-1 network (tansig hidden layer, linear output, 19 parameters) trained by steepest descent with momentum on quiz marks against hours of sleep.',
    },
    nuances: [
      {
        point: 'The linear neuron has a bowl; the sigmoid neuron has plateaus',
        detail: 'With purelin the error is exactly quadratic: one minimum, and a learning-rate limit you can compute. With logsig the surface flattens wherever the neuron saturates, and the gradient nearly vanishes.',
        tryIt: 'Switch between the two neurons and compare the shape.',
      },
      {
        point: 'The stable learning rate is set by the steepest direction',
        detail: 'For a quadratic surface, steepest descent is stable only when α < 2/λ_max, the largest eigenvalue of the Hessian. The shallow direction then crawls, because α was capped by the steep one.',
        tryIt: 'Linear neuron: raise α just past "Stable while α <".',
      },
      {
        point: 'Unscaled inputs make a ravine',
        detail: 'Raw hours (2 to 9) make the surface far steeper along w than along b. The eigenvalues become very unequal, the limit on α drops, and the path zig-zags.',
        tryIt: 'Linear neuron: toggle "Normalise hours of sleep" and watch the limit change.',
      },
      {
        point: 'Momentum is a low-pass filter on the steps',
        detail: 'It averages recent gradients, so the back-and-forth across a ravine cancels while the steady drift along it adds up.',
        tryIt: 'Raise γ to 0.9 and race again from the same start.',
      },
      {
        point: 'Second-order methods trade cost per step for number of steps',
        detail: 'Levenberg-Marquardt uses curvature and arrives in a handful of iterations, but each needs an n × n matrix. Practical for thousands of weights, impossible for millions.',
      },
      {
        point: 'The start decides the finish',
        detail: 'On a surface with plateaus, some starting weights never reach the valley in reasonable time. This is why training is run from several random starts.',
        tryIt: 'Press "Random start" several times with the sigmoid neuron.',
      },
      {
        point: 'All-zero weights switch the hidden layer off for good',
        detail: 'With every weight at 0, each hidden neuron outputs tansig(0) = 0, so the gradient for the output weights (s² a¹) is 0. The output weights are 0, so the sensitivity passed back, s¹ = Ḟ¹(W²)ᵀs², is also 0. Only the output bias b² learns, and it settles on the mean target. Zero is a flat spot of the surface that training cannot leave.',
        tryIt: 'View "Starting weights", choose "All zero". Read the weight table (all rows stay 0.000) and "Why it stopped".',
      },
      {
        point: 'Equal weights make six neurons behave as one',
        detail: 'Neurons that start identical see the same input and receive the same sensitivity, so every update is identical too. They stay copies for ever, and a 1-6-1 network has the power of a 1-1-1. Random starting values exist to break this symmetry, not to be clever guesses.',
        tryIt: 'Choose "All equal" and compare "Distinct neurons" (1 of 6) with "Small random" (6 of 6).',
      },
      {
        point: 'Small, but not too small, and matched to the input scale',
        detail: 'Large starting weights push sigmoids into saturation, where the slope and so the gradient is nearly zero. Very small ones leave every neuron on the same straight middle section. Nguyen-Widrow sets each hidden weight to size 0.7·S^(1/R) and spreads the biases across ±that size, so with inputs normalised to [−1, 1] the S sigmoids each cover a different slice of the input range from the first iteration.',
        tryIt: 'Run "Small random", then "Nguyen-Widrow". Compare the middle strip at the start of each run and the iteration count at the end.',
      },
      {
        point: 'Four ways to stop, and each says something different',
        detail: 'Goal met: the error is as low as you asked for. Minimum gradient: the ground is flat, which may be a minimum or a plateau. Maximum iterations: a time limit, no claim about quality. Validation stopped improving: more training would only memorise, so the earlier weights are kept. Always record which one ended a run.',
        tryIt: 'In "When to stop", set "Error goal" to 8 marks; then set it to off and "Maximum iterations" to 500; then switch "Early stopping" off. Read "Why it stopped" each time.',
      },
      {
        point: 'Match the algorithm to the size and the task',
        detail: 'Levenberg-Marquardt is the fastest choice for function fitting with up to a few hundred weights, because it stores an n × n matrix and assumes squared error. Scaled conjugate gradient needs only gradients and no line search, so it suits large networks and pattern recognition with a cross-entropy performance function. Steepest descent with momentum is the fallback for very large networks and for training one sample at a time.',
      },
    ],
    tutor: {
      minutes: 15,
      opener: 'Ask someone to describe finding the lowest point of a hilly field blindfolded. What do you feel for? How big a step do you take?',
      steps: {
        explore: {
          say: 'Height is error. Every point on the surface is one choice of weight and bias. Training is a ball rolling down. Three algorithms start from the same place.',
          ask: 'Which ball do you expect to win, and why?',
        },
        break: {
          say: 'Linear neuron, raw hours, α = 0.1. The panel shows the stable limit. We are above it. Then switch View to "Starting weights" and press the button again: every weight starts at zero. The fit is a flat line at the class average and the table of weights never changes.',
          ask: 'Each step is "learning rate times slope". Why does a big step make the error grow? And with all weights zero: six neurons, yet a flat line. Which single parameter moved, and why only that one?',
        },
        fix: {
          say: 'Three cures: a smaller α, momentum, and scaling the input. Notice scaling changed the surface itself. In "Starting weights" the cure is a small random start: the six curves in the middle strip separate and the fit follows the rise and the dip. Try "All equal" on the way to show that different from zero is not enough; they must differ from each other.',
          ask: 'Which cure changed the problem and which only changed how we walk on it? For the starting weights: why random, and why small?',
        },
        prove: {
          say: 'Read λ_max from the panel and have them compute the limit. Then list the four stopping criteria on the board and have them match each to "Why it stopped" in three runs.',
          ask: 'Why does Levenberg-Marquardt finish the linear neuron in one or two steps? A run ends on "maximum iterations": is the network trained?',
        },
      },
      misconceptions: [
        { wrong: 'A bigger learning rate just learns faster.', right: 'Past a limit it does not learn at all; the error grows.' },
        { wrong: 'A flat loss curve means training is finished.', right: 'It can be a plateau. Sigmoid networks have long flat stretches followed by drops.' },
        { wrong: 'There is one best algorithm.', right: 'It depends on size: second-order for small networks, gradient methods for large ones.' },
        { wrong: 'Starting from zero is the neutral, fair choice.', right: 'Zero is a flat spot: hidden neurons get no gradient. Equal values are no better, because the neurons stay copies.' },
        { wrong: 'Training stopped, so it converged.', right: 'Ask which criterion stopped it. A time limit or a plateau is not convergence.' },
      ],
      close: 'We now have weights. The next question is whether they are any good, and that needs more than one number.',
    },
  },
  fraud: {
    network: {
      architecture: '2-6-1. Two inputs (amount on a log scale, how close the time is to 2:30 am), 6 hidden tansig neurons, 1 logsig output between 0 and 1. 25 parameters.',
      forward: 'a¹ = tansig(W¹p + b¹), a² = logsig(W²a¹ + b²). The output is a score: near 1 means "looks like fraud". The alarm rings when a² is above your threshold.',
      learning: 'Cross-entropy, F = −[t ln a + (1 − t) ln(1 − a)], with targets 1 for fraud and 0 for genuine. With a logsig output the sensitivity of the last layer is simply a − t. Trained by momentum on mini-batches of 160.',
      choices: 'The fraud region is a curved patch (large and late), which a single straight boundary cannot enclose, so a hidden layer is needed. Time of day is fed as a cosine because 11 pm and 1 am are close, though 23 and 1 are not.',
    },
    nuances: [
      {
        point: 'The network gives a score; the threshold makes the decision',
        detail: 'Training fixes the scores. The threshold is chosen afterwards from the cost of each mistake, and can be changed without retraining.',
        tryIt: 'Drag the threshold and watch the confusion matrix change while the dots stay put.',
      },
      {
        point: 'Accuracy rewards ignoring the rare class',
        detail: 'With 6% fraud, saying "genuine" every time is 94% accurate. A network trained on unbalanced data leans the same way, because that is where most of the error is.',
        tryIt: 'Note "Fraud caught" at threshold 0.5, then switch on "Rebalance the training data".',
      },
      {
        point: 'Rebalancing changes what the scores mean',
        detail: 'After oversampling fraud, the outputs are no longer honest probabilities for real traffic; they are too high. The ranking is still useful, but the threshold must be chosen again.',
      },
      {
        point: 'Precision collapses when the event is rare',
        detail: 'Even a good detector raises many false alarms when genuine payments outnumber fraud 16 to 1. That is the base-rate effect, and it is why "Real alarms" can be low while specificity is high.',
        tryIt: 'Lower the threshold to about 0.1 and read "Real alarms".',
      },
      {
        point: 'The ROC curve does not depend on the threshold',
        detail: 'It shows every threshold at once. Its area summarises how well the scores rank fraud above genuine, which is the quality of the network itself.',
      },
      {
        point: 'How an input is coded is part of the model',
        detail: 'Feeding the hour as a plain number would tell the network that midnight (0) and 11 pm (23) are far apart. A circular coding fixes that before training starts.',
      },
      {
        point: 'Cross-entropy punishes confident mistakes',
        detail: 'A score of 0.02 for a payment that is fraud costs −ln 0.02 ≈ 3.9 under cross-entropy and only 0.96 under squared error. Squared error can never charge more than 1, so the network learns slowly from its worst misses. This is why classifiers are trained on cross-entropy with a sigmoid or softmax output.',
      },
      {
        point: 'Large classifiers are trained with scaled conjugate gradient',
        detail: 'Levenberg-Marquardt is built for sum-of-squares errors and small networks. A fraud model in a bank has hundreds of inputs and thousands of weights, trained on cross-entropy, so scaled conjugate gradient (or a stochastic gradient method) is used. The small network here uses momentum for the same reason.',
      },
      {
        point: 'A committee steadies the score',
        detail: 'Train several networks from different random starts and average their scores. Each one draws the edge of the fraud region slightly differently; the average is smoother and usually ranks payments better than any single member. Where the members disagree strongly, the payment is unlike the training data and deserves a person\'s attention.',
      },
    ],
    tutor: {
      minutes: 15,
      opener: 'Write "98% accurate" on the board. Ask who would buy this fraud detector. Then ask what else they would want to know.',
      steps: {
        explore: {
          say: 'Each dot is a payment: amount across, time of day up. Red dots are fraud. The red area is where the alarm rings.',
          ask: 'Where does fraud cluster? Which frauds will be hardest to catch?',
        },
        break: {
          say: 'Threshold 0.5, the default. Accuracy is very high. Now read "Fraud caught" and count the pulsing rings.',
          ask: 'A model that never rings the alarm scores about 94% here. How would you expose it?',
        },
        fix: {
          say: 'Two levers: move the threshold, or retrain on balanced data. Both catch more fraud, and both block more genuine customers.',
          ask: 'You are the bank. Which costs more, a missed fraud or a blocked customer? Where do you set it?',
        },
        prove: {
          say: 'Let them name the two numbers before revealing.',
          ask: 'Which measures does a "flag nothing" model fail?',
        },
      },
      misconceptions: [
        { wrong: 'Higher accuracy means a better classifier.', right: 'Not when classes are unequal. Look at sensitivity and precision.' },
        { wrong: 'The threshold must be 0.5.', right: 'It is a business choice set from the costs of the two mistakes.' },
        { wrong: 'A missed fraud and a false alarm are equally bad.', right: 'They cost very different amounts, and the right balance differs by application.' },
      ],
      close: 'Post-training analysis for classification means the confusion matrix and the ROC curve. Next: how to tell whether a model will hold up on new cases.',
    },
  },
  battery: {
    network: {
      architecture: '1-S-1. One input (hours since full charge), S hidden tansig neurons, 1 linear output (battery %). 3S + 1 parameters.',
      forward: 'a¹ = tansig(W¹p + b¹), a² = W²a¹ + b², with the hours scaled to about −1…1 and the percentage scaled back at the end.',
      learning: 'F = E_D + λE_W: the sum of squared errors plus weight decay λ times the sum of squared weights. Minimised with Levenberg-Marquardt. With early stopping, the weights kept are those with the lowest validation error.',
      choices: 'Battery drain is smooth and nearly straight over a morning, so two neurons are plenty. Twenty neurons give the network 61 parameters to fit about 8 readings, which is the point of the Break.',
    },
    nuances: [
      {
        point: 'Overfitting and extrapolation are different failures',
        detail: 'Overfitting happens between the readings: the curve wiggles through noise. Extrapolation happens beyond them: the network was never told anything there. Regularisation cures the first and does nothing for the second.',
        tryIt: 'Press Break, then switch on early stopping. The wiggle goes; the evening forecast is still a guess.',
      },
      {
        point: 'The validation error is slightly optimistic',
        detail: 'Early stopping chooses the weights that look best on the validation readings, so those readings have been used. An honest final number needs a third, untouched set.',
      },
      {
        point: 'Weight decay smooths by keeping weights small',
        detail: 'A tansig neuron with small weights works on its nearly straight middle section. Large weights give sharp steps. Penalising weight size therefore penalises wiggles.',
        tryIt: 'With 20 neurons and no early stopping, move "Weight decay" from off to 0.01.',
      },
      {
        point: 'Effective parameters matter, not the count',
        detail: 'A regularised 20-neuron network may behave like one with a handful of free parameters. This is why large networks can generalise when trained with care.',
      },
      {
        point: 'With little data, a validation set is expensive',
        detail: 'Holding back every third reading leaves fewer to train on. Bayesian regularisation and cross-validation exist to avoid that cost on small data sets.',
        tryIt: 'Switch "Hold back a validation set" off and see the fit change with the same readings.',
      },
      {
        point: 'Sigmoid networks flatten outside the data',
        detail: 'Far from the readings every tansig neuron saturates, so the output tends to a constant. Here that can look like a battery that stops draining.',
        tryIt: 'Use "Morning only" readings and look at 12 to 14 hours.',
      },
      {
        point: 'The regression plot shows what one error number hides',
        detail: 'Plot the network output a against the target t for every reading and fit a line a = mt + c. A good network gives m near 1, c near 0 and R near 1. Dots that bend away at one end mean the network is poor for low or high values only, which an average error would never show. Draw it separately for training and validation: a high R on training with a lower R on validation is overfitting seen from another angle.',
        tryIt: 'Press Break, wait for training to finish, then set Chart to "Regression plot" and compare "R, training" with "R, validation".',
      },
      {
        point: 'R says how well, not where',
        detail: 'R is computed only from the readings you have. A network with R = 0.99 on morning readings has told you nothing about the evening. Read R together with the range the data covers.',
        tryIt: 'With "Morning only" readings and 2 neurons, note the high R, then look at what the curve says for 12 hours.',
      },
      {
        point: 'Novelty detection: teach the system to say "I have not seen this"',
        detail: 'A network always returns a number, with the same confidence everywhere. A novelty detector is a separate check on the input: is it close to anything in the training set? Here the rule is "a training reading within 1 hour". With many inputs, teams use the distance to the nearest training points or a second network (an RBF layer, a SOM or an autoassociative network) trained on the inputs alone.',
        tryIt: 'Slide "Battery at hour" from 3 to 12 and watch the message change to "Outside training data: do not trust". Then press "Add evening readings".',
      },
      {
        point: 'A committee of networks beats its average member',
        detail: 'Train several networks from different starting weights or different splits of the data and average their outputs. Their individual errors partly cancel, so the committee is usually better than a typical member, and the spread between members is a free warning sign: where they disagree widely, the data did not pin the answer down.',
        tryIt: 'Press "Restart training" several times with 20 neurons and watch the right-hand side of the curve change each time. That spread is what a committee would measure.',
      },
    ],
    tutor: {
      minutes: 15,
      opener: 'Ask: "Two students prepare for the exam. One memorises last year’s paper, one learns the method. Who scores higher on last year’s paper? On this year’s?"',
      steps: {
        explore: {
          say: 'Blue readings train the network; amber ones only test it. The yellow curve is the prediction, and the red line at 0% is a dead phone. Open "Regression plot" once: every dot near the dashed line means output equals target, and R sums that up in one number.',
          ask: 'The red stretch has no readings and the curve turns dashed there. How much should we trust it? Does a high R help us there?',
        },
        break: {
          say: 'Twenty neurons, no safeguards. Watch the small chart: blue keeps falling, amber turns up. That gap is the signature of memorising.',
          ask: 'Training error is nearly zero. Is this the best model we have had or the worst?',
        },
        fix: {
          say: 'Early stopping keeps the weights from the green line. Notice what it fixes and what it does not. Slide "Battery at hour" into the evening: the network still answers, and the novelty check says do not trust it. Then add evening readings and ask again.',
          ask: 'The wiggle is gone. Is the evening forecast now reliable? What would make it reliable? Who should raise the warning: the network or something beside it?',
        },
        prove: {
          say: 'Put the two error patterns on the board and have them name each.',
          ask: 'Which pattern is overfitting and which is extrapolation?',
        },
      },
      misconceptions: [
        { wrong: 'Zero training error is the goal.', right: 'The goal is low error on new data. Zero training error on noisy data means memorising.' },
        { wrong: 'Early stopping fixes bad predictions everywhere.', right: 'Only inside the range of the data.' },
        { wrong: 'Big networks always overfit.', right: 'Not if they are regularised or have enough data.' },
        { wrong: 'R = 0.99 means the model is right.', right: 'It means outputs track targets on the data you tested. It is silent about inputs outside that data.' },
        { wrong: 'The network knows when it is unsure.', right: 'It gives a number with equal confidence everywhere. A separate novelty check or a committee has to raise the flag.' },
      ],
      close: 'Generalisation is the only goal; training error is the means. The remaining stations apply the whole pipeline to the kinds of problem industry brings.',
    },
  },
  cricket: {
    network: {
      architecture: '2-8-1. Two inputs (runs needed, balls left), 8 hidden tansig neurons, 1 logsig output between 0 and 1. 33 parameters.',
      forward: 'a¹ = tansig(W¹p + b¹), a² = logsig(W²a¹ + b²). The output a² is read as the probability of winning from this situation.',
      learning: 'Cross-entropy with targets of 1 (won) or 0 (lost), trained by momentum on the most recent matches. No match is ever labelled "37%"; the network arrives at that on its own.',
      choices: 'Any function approximator trained on 0/1 targets estimates a probability. logsig keeps the output between 0 and 1; with more than two outcomes the output layer would be softmax.',
    },
    nuances: [
      {
        point: 'Why 0/1 targets give a probability',
        detail: 'Where 37 of 100 similar matches were won, the output that minimises the total error over all 100 is 0.37. The network cannot pass through both 0 and 1 at one input, so it settles at the average.',
        tryIt: 'Fix a situation and press "Play this match" ten times. Count the wins, then compare with the network.',
      },
      {
        point: 'A probability cannot be checked on one match',
        detail: 'A 30% forecast is not wrong because the team won. It is checked over many 30% forecasts: about 3 in 10 should come true. That check is called calibration.',
        tryIt: 'Press "Check with 2000 simulations" and compare.',
      },
      {
        point: 'Cross-entropy suits probabilities better than squared error',
        detail: 'When the output is confidently wrong, the logsig slope is near zero and squared error learns slowly. With cross-entropy the correction is a − t, which stays large.',
      },
      {
        point: 'Few examples make a confident, wrong surface',
        detail: 'With 15 matches the network draws a sharp cliff between its few wins and losses. Probabilities near the middle need many matches per situation.',
        tryIt: 'Press "Clear, keep 15" and read the percentage; then "Simulate 300 more".',
      },
      {
        point: 'The network is a compressed table',
        detail: '33 numbers replace a table of 2160 situations, and the network shares strength between neighbours: a match needing 24 off 12 also informs 25 off 12.',
      },
    ],
    tutor: {
      minutes: 12,
      opener: 'Ask: "The screen says CSK have a 37% chance. They win. Was the prediction wrong?"',
      steps: {
        explore: {
          say: 'Wins land on the top plane with target 1, losses on the floor with target 0. The surface in between is the network.',
          ask: 'No match was ever labelled 37%. Where does that number come from?',
        },
        break: {
          say: 'Fifteen matches only. Look how steep and sure the surface is.',
          ask: 'Why is a model more confident with less data? Is that confidence worth anything?',
        },
        fix: {
          say: 'Hundreds of matches across the whole floor. Now check one situation against 2000 fresh simulations.',
          ask: 'How would you check a weather forecaster who says 70% rain?',
        },
        prove: {
          say: 'Do the small calculation on the board: 7 wins and 3 losses, minimise 7(1 − a)² + 3a².',
          ask: 'What output minimises the error, and what is that number?',
        },
      },
      misconceptions: [
        { wrong: 'A network outputs the answer.', right: 'For uncertain outcomes it outputs the chance of each answer.' },
        { wrong: 'If the favourite loses, the model was wrong.', right: 'A single outcome cannot test a probability.' },
        { wrong: 'Probabilities need probability targets.', right: 'Plain 0 and 1 outcomes are enough.' },
      ],
      close: 'That is function approximation and probability estimation with one network. Recognition, grouping and forecasting follow, each with its own output and its own check.',
    },
  },
  doodle: {
    network: {
      architecture: '64-10-3. 64 inputs (an 8 × 8 grid of on or off cells), 10 hidden tansig neurons, 3 outputs passed through softmax. 683 parameters.',
      forward: 'a¹ = tansig(W¹p + b¹), n² = W²a¹ + b², aᵢ = exp(n²ᵢ)/Σⱼ exp(n²ⱼ). The three outputs are positive and add to 1: circle, cross, tick.',
      learning: 'Cross-entropy with 1-of-3 targets. With softmax the sensitivity of the output layer is a − t. Trained by momentum on all examples each step.',
      choices: 'Softmax because the classes exclude each other. The hidden layer is small because the features are already tidy; on raw 28 × 28 images a convolutional network would do the feature extraction instead.',
    },
    nuances: [
      {
        point: 'Preprocessing builds in what should not matter',
        detail: 'A tick is a tick wherever it is drawn. Centring and scaling makes the input identical in those cases, so the network need not learn it from examples.',
        tryIt: 'Switch preprocessing off and draw the same small tick in two corners.',
      },
      {
        point: 'The network sees a list of numbers, not a picture',
        detail: 'A fully connected layer has no idea which cells are neighbours. Shuffling the 64 cells the same way every time would train just as well. Convolutional networks exist to restore that knowledge.',
      },
      {
        point: 'Softmax always answers',
        detail: 'The outputs add to 1 even for something it has never seen. A square is given to circle, cross or tick, often confidently. Knowing "none of these" needs an extra class or a check on the input.',
        tryIt: 'Draw a square or a letter and read the bars.',
      },
      {
        point: 'The first layer holds almost all the weights',
        detail: '650 of the 683 parameters connect inputs to hidden neurons. Input size, not class count, drives the cost.',
      },
      {
        point: 'It learns the teacher',
        detail: 'Trained on one person’s strokes, it does worse on another’s. Training data must come from the people who will use it.',
        tryIt: 'Have a second student draw without teaching it first, and count how many it gets right.',
      },
      {
        point: 'One output per class, never one number for the class',
        detail: 'The targets are one-of-N: for three shapes, [1 0 0], [0 1 0] and [0 0 1]. Coding the classes as 1, 2 and 3 on a single neuron would tell the network that shape 2 lies between shapes 1 and 3, and that confusing 1 with 3 is twice as bad as confusing 1 with 2. Neither is true.',
      },
      {
        point: 'A different hand is a different data set',
        detail: 'A network taught by one person scores well on that person and worse on everyone else: slant, size and stroke order differ. This is domain shift. The cure is examples from the people who will use it, and the same preprocessing at use as in training.',
        tryIt: 'Teach the shapes yourself, then hand the device to a neighbour and watch the confusion matrix.',
      },
      {
        point: 'With little data, features beat raw pixels',
        detail: 'A small grid of features gives tens of inputs; raw pixels would give thousands, each needing its own weights and far more examples. Classical pattern recognition puts the knowledge into the features and lets a small network draw the boundary. Deep networks learn the features too, at the price of very large data sets.',
      },
      {
        point: 'Read the confusion matrix by rows',
        detail: 'Overall accuracy hides which shapes are confused. Each row shows where one true shape went. Two rows that leak into each other point to two shapes that look alike in feature space: fix it with a better feature or more examples of exactly those two.',
      },
    ],
    tutor: {
      minutes: 12,
      opener: 'Draw a tick on the board, large in the middle, then tiny in a corner. Ask: "Same or different?" Then: "To a computer?"',
      steps: {
        explore: {
          say: 'The small grid shows what the network actually receives: 64 cells. The bars are its three probabilities, updating as I draw.',
          ask: 'It guesses before I finish. What is it using?',
        },
        break: {
          say: 'Preprocessing off. I draw a small tick in the corner. Look at the grid: different cells light up.',
          ask: 'Did the network get worse, or did its input change?',
        },
        fix: {
          say: 'Preprocessing on. Same weights as a moment ago.',
          ask: 'What else could we remove by preprocessing? Rotation? Stroke thickness?',
        },
        prove: {
          say: 'Have them count 10 × 65 and 3 × 11.',
          ask: 'Why softmax and not three separate sigmoid outputs?',
        },
      },
      misconceptions: [
        { wrong: 'The network understands shapes.', right: 'It maps 64 numbers to 3; neighbouring cells mean nothing special to it.' },
        { wrong: 'A confident output means a correct answer.', right: 'Softmax is confident even on things outside its classes.' },
        { wrong: 'A bigger network would fix the corner problem.', right: 'Better features fix it with no change to the network.' },
      ],
      close: 'Pattern recognition is mostly feature work. Next, a network that learns with no labels at all.',
    },
  },
  colours: {
    network: {
      architecture: 'A self-organising map: 64 neurons on an 8 × 8 grid, each with 3 weights (red, green, blue). One competitive layer, no hidden layer, no biases. 192 weights.',
      forward: 'Each neuron’s net input measures closeness: nᵢ = −‖wᵢ − p‖. The transfer function is compet: the closest neuron outputs 1, all others 0.',
      learning: 'No targets and no error to push back. Kohonen rule: wᵢ ← wᵢ + α h(i, i*)(p − wᵢ) for the winner i* and its grid neighbours, with α and the neighbourhood both shrinking over time.',
      choices: 'A plain competitive layer would also find 64 colours, but in no order. The neighbourhood is what makes nearby neurons hold similar colours, so the map can be read.',
    },
    nuances: [
      {
        point: 'The neighbourhood creates the order',
        detail: 'Because neighbours are dragged along with each winner, neurons that are close on the grid end up close in colour. Without it you get a good palette with no layout.',
        tryIt: 'Switch "Neighbourhood" off, restart, and compare the palette.',
      },
      {
        point: 'Two phases: ordering, then fine-tuning',
        detail: 'A large neighbourhood and learning rate first untangle the sheet. Small ones then let each neuron settle on its own patch. Shrink too fast and a twist is frozen in.',
      },
      {
        point: 'Dead neurons come from bad starts',
        detail: 'A neuron that begins far from all the data never wins, so it never moves. Starting from data points, a neighbourhood, or a conscience that handicaps frequent winners all prevent it.',
        tryIt: 'Choose "Black corner" with the neighbourhood off and read "Dead neurons".',
      },
      {
        point: 'Distances mean something only after scaling',
        detail: 'Here red, green and blue share one scale. With mixed inputs such as rupees and kilometres, the larger unit would decide every winner unless inputs are normalised.',
      },
      {
        point: 'Two different quality measures',
        detail: 'Quantisation error asks how close prototypes are to the data. Topographic error asks whether the sheet is untwisted. A map can pass one and fail the other.',
      },
      {
        point: 'The map follows the density of the data',
        detail: 'Colours that fill more of the picture get more neurons. The map is a picture of the data, not of colour space.',
        tryIt: 'Load a photo that is mostly one colour and look at the palette.',
      },
      {
        point: 'The distance map shows clusters without knowing the inputs',
        detail: 'With three inputs we can paint each neuron in its own colour. With thirty inputs we cannot. The distance map (U-matrix) works for any number: shade each neuron by the mean distance ‖wᵢ − wⱼ‖ to its grid neighbours. Light patches are groups of similar neurons, the clusters; dark bands are the borders between them.',
        tryIt: 'Set "Map view" to "Distance map" with the Holi sample, find the darkest band, then switch to "Colours" to see which two groups it separates.',
      },
      {
        point: 'The hit histogram tells you where the data lives',
        detail: 'Count the inputs each neuron wins. A patch with many hits is a large cluster; neurons with 0 hits are dead or sit on a border where no data falls. A map where a few neurons take nearly all the hits is too coarse there or badly initialised.',
        tryIt: 'Set "Map view" to "Hits". Then press Break and look at the histogram again.',
      },
      {
        point: 'Weight planes show which input does the separating',
        detail: 'Draw the map once per input, shaded by that input’s weight. Two planes that look alike mean the two inputs are strongly related and one may be dropped. A plane that is nearly uniform means that input does not help to tell the clusters apart.',
        tryIt: 'Set "Map view" to "Weight planes" and find the patch that is bright on red and dark on green and blue.',
      },
      {
        point: 'Read all three together before naming a cluster',
        detail: 'Analysts use the distance map to find the borders, the hit histogram to size each group, and the weight planes to describe it in words ("high red, low blue"). Only then does a person give the group a name.',
      },
    ],
    tutor: {
      minutes: 12,
      opener: 'Ask: "I give you 700 colours and no names. Could you sort them into groups? Did anyone tell you the right answer?"',
      steps: {
        explore: {
          say: 'Each small dot is a pixel placed at its colour. The joined balls are 64 neurons. Watch the sheet unfold to cover the dots. Then walk through "Map view": colours, distance map, hits, weight planes. Say that with thirty inputs only the last three views would exist.',
          ask: 'Nobody labelled anything. What is the network using in place of a teacher? On the distance map, where are the clusters: the light cells or the dark ones?',
        },
        break: {
          say: 'All neurons start in the black corner, and I switch the neighbourhood off. Only winners learn.',
          ask: 'A few neurons win everything. Why can the others never catch up?',
        },
        fix: {
          say: 'Neighbourhood on. Now every win drags the neighbours out of the corner too.',
          ask: 'What other fix can you think of for a neuron that never wins?',
        },
        prove: {
          say: 'Sketch a twisted sheet on the board. Then show the distance map and hit histogram side by side.',
          ask: 'Which error is low and which is high for that sheet? From the distance map and hits alone, how many kinds of powder are there and which is the biggest pile?',
        },
      },
      misconceptions: [
        { wrong: 'Clustering finds the correct groups.', right: 'There is no correct answer; groups depend on inputs and scaling, and a person must interpret them.' },
        { wrong: 'A SOM is trained with backpropagation.', right: 'There is no error signal; it learns by competition.' },
        { wrong: 'More neurons give more accurate clusters.', right: 'They give a finer map, and more dead neurons if badly initialised.' },
        { wrong: 'Each neuron is one cluster.', right: 'A cluster is a patch of many neurons. The distance map shows where one patch ends and the next begins.' },
        { wrong: 'A neuron with zero hits is always a fault.', right: 'On the border between two well-separated clusters it is expected: no data falls there.' },
      ],
      close: 'That is learning without a teacher. The last station adds time: predicting what comes next.',
    },
  },
  wave: {
    network: {
      architecture: 'D-8-1 behind a tapped delay line. D inputs (the last D samples of the signal), 8 hidden tansig neurons, 1 linear output (the next sample). 8D + 17 parameters.',
      forward: 'p = [y(t−1), y(t−2), …, y(t−D)]ᵀ, a¹ = tansig(W¹p + b¹), ŷ(t) = W²a¹ + b². The network itself is static; the delay line gives it memory.',
      learning: 'Mean square error between ŷ(t) and the measured y(t), using measured past values as inputs (series-parallel form), retrained with Levenberg-Marquardt on 60 recent windows several times a second.',
      choices: 'With one linear neuron in place of the hidden layer this is the ADALINE adaptive filter. Feeding predictions back into the delay line turns it into a NARX-style closed loop for looking further ahead. "Beat the model" uses a 24-5-1 network of the same kind (131 parameters) trained once on two weeks of hourly campus load and tested on the following week.',
    },
    nuances: [
      {
        point: 'One-step and multi-step prediction are different problems',
        detail: 'One step ahead always starts from real measurements. Further ahead, each step feeds on the last guess, so a small error is carried forward and grows.',
        tryIt: 'Switch between "One step ahead" and "One second ahead" and compare the two error figures.',
      },
      {
        point: 'The delays must span the pattern',
        detail: 'With one delay the network knows position but not direction. It needs enough past samples to see slope and curvature, and ideally a good part of one cycle.',
        tryIt: 'Set the delays to 1, then 2, then 6.',
      },
      {
        point: 'Sampling rate and delay count trade off',
        detail: 'Sampled too fast, neighbouring delays are nearly equal and add little. The same number of delays at a slower rate covers a longer stretch of the signal.',
      },
      {
        point: 'White errors mean nothing predictable is left',
        detail: 'If the errors are correlated with their own past, part of the signal is still unexplained and the model can be improved, usually with more delays.',
        tryIt: 'Watch the bars at 1 delay and again at 8.',
      },
      {
        point: 'Online learning adapts and forgets',
        detail: 'Retraining on recent data lets the network follow a change of rhythm. It also means it forgets the old rhythm. That balance is set by how much history it trains on.',
        tryIt: 'Use "My finger", hold a steady rhythm, then double the speed.',
      },
      {
        point: 'Never shuffle a time series before splitting',
        detail: 'A random split puts samples from the future into the training set. The test must come after the training data in time.',
      },
      {
        point: 'NARX: add the outside causes',
        detail: 'This station predicts y(t) from its own past only (a nonlinear autoregressive model). A NARX network adds a second tapped delay line for an outside input u(t), such as temperature for electricity load: y(t) = f(y(t−1), …, y(t−D_y), u(t−1), …, u(t−D_u)). It is the standard network for the prediction case study.',
      },
      {
        point: 'Train series-parallel, forecast parallel',
        detail: 'During training the true past outputs are known, so they are fed to the delay line (series-parallel, open loop). The network is then static and ordinary backpropagation or Levenberg-Marquardt works. To look many steps ahead the loop is closed and the network’s own outputs are fed back (parallel form). Always test in the form you will use.',
        tryIt: 'Compare "One step ahead" (open loop) with "One second ahead" (closed loop).',
      },
      {
        point: 'Two correlation tests, two different questions',
        detail: 'Error autocorrelation asks whether the errors resemble their own past. Input-error cross-correlation asks whether the errors resemble the inputs at earlier times. Both should stay within ±2/√Q at every lag except autocorrelation at lag 0. A bar outside in either means more delays, more neurons or a missing input.',
        tryIt: 'Set the delays to 1 and read both small charts; then set 8 and read them again.',
      },
      {
        point: 'Compare with a simple baseline and with people',
        detail: 'A forecast is only good relative to something. "Same as the last hour" and "same as this hour yesterday" cost nothing; a network must beat both. People are good at steady shapes and calendar knowledge, and poor at weighing 24 numbers consistently.',
        tryIt: 'Set Mode to "Beat the model" and play 10 rounds. Notice which hours you win: a steady climb, or a jump at the start of a working day?',
      },
      {
        point: 'Concept drift: the world moves after training',
        detail: 'A model trained on last term’s load is wrong after a new hostel opens or exams begin. The inputs look ordinary; the relation between input and output has changed. Teams track live error daily, keep a baseline alongside, and retrain on recent data when the error drifts up.',
        tryIt: 'In "Live forecast" with "My finger", hold a rhythm until the errors are small, then change it and watch the one-second error jump and recover.',
      },
    ],
    tutor: {
      minutes: 12,
      opener: 'Clap a steady rhythm and stop. Ask the class to clap the next beat. Then clap an irregular one and ask again.',
      steps: {
        explore: {
          say: 'White is what happened. The amber dots to the right are the forecast, each built on the previous one. The coloured line compares earlier forecasts with what then happened. Then switch Mode to "Beat the model": the whole class calls out a number for the next hour of campus load, you enter the average, and the network answers. Play at least five rounds and keep the score on screen.',
          ask: 'How far ahead do you trust it? What happens to the forecast when the rhythm changes? In the game: what did you use to guess that the network cannot see, and what does it use that you cannot hold in your head?',
        },
        break: {
          say: 'One delay only. It sees a single past value.',
          ask: 'I tell you a swing is at its lowest point. Which way is it moving? What else would you need?',
        },
        fix: {
          say: 'More delays. Watch both sets of bars: error autocorrelation on the left, input-error cross-correlation on the right. Inside the dashed limits means the leftover errors have no pattern and owe nothing to the inputs.',
          ask: 'Why not use a hundred delays to be safe? If only the cross-correlation bars were red, what would you add?',
        },
        prove: {
          say: 'Point at the two error numbers in the panel.',
          ask: 'Same network. Why is one second ahead so much worse than one step?',
        },
      },
      misconceptions: [
        { wrong: 'A good one-step predictor is a good forecaster.', right: 'Closed-loop errors accumulate; test at the horizon you need.' },
        { wrong: 'Prediction needs a recurrent network.', right: 'A static network with a tapped delay line already has memory of the recent past.' },
        { wrong: 'More delays are always better.', right: 'They add parameters, need more data and slow the response to change.' },
        { wrong: 'A small error is enough to accept a forecaster.', right: 'Also check that the errors are white and uncorrelated with the inputs, and that it beats a simple baseline.' },
        { wrong: 'Once trained, a forecaster stays good.', right: 'The pattern drifts. Error must be watched after launch and the model retrained.' },
      ],
      close: 'Four problem types, four networks, four ways to check them. Now play the mission and take one model through every stage.',
    },
  },
}
