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
      choices: 'Two parameters is the most that can be drawn as a surface. Real networks have thousands, but every one of them is moving on a surface like this, in more dimensions.',
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
          say: 'Linear neuron, raw hours, α = 0.1. The panel shows the stable limit. We are above it.',
          ask: 'Each step is "learning rate times slope". Why does a big step make the error grow?',
        },
        fix: {
          say: 'Three cures: a smaller α, momentum, and scaling the input. Notice scaling changed the surface itself.',
          ask: 'Which cure changed the problem and which only changed how we walk on it?',
        },
        prove: {
          say: 'Read λ_max from the panel and have them compute the limit.',
          ask: 'Why does Levenberg-Marquardt finish the linear neuron in one or two steps?',
        },
      },
      misconceptions: [
        { wrong: 'A bigger learning rate just learns faster.', right: 'Past a limit it does not learn at all; the error grows.' },
        { wrong: 'A flat loss curve means training is finished.', right: 'It can be a plateau. Sigmoid networks have long flat stretches followed by drops.' },
        { wrong: 'There is one best algorithm.', right: 'It depends on size: second-order for small networks, gradient methods for large ones.' },
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
    ],
    tutor: {
      minutes: 15,
      opener: 'Ask: "Two students prepare for the exam. One memorises last year’s paper, one learns the method. Who scores higher on last year’s paper? On this year’s?"',
      steps: {
        explore: {
          say: 'Blue readings train the network; amber ones only test it. The yellow curve is the prediction, and the red line at 0% is a dead phone.',
          ask: 'The shaded area has no readings. How much should we trust the curve there?',
        },
        break: {
          say: 'Twenty neurons, no safeguards. Watch the small chart: blue keeps falling, amber turns up. That gap is the signature of memorising.',
          ask: 'Training error is nearly zero. Is this the best model we have had or the worst?',
        },
        fix: {
          say: 'Early stopping keeps the weights from the green line. Notice what it fixes and what it does not.',
          ask: 'The wiggle is gone. Is the evening forecast now reliable? What would make it reliable?',
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
    ],
    tutor: {
      minutes: 12,
      opener: 'Ask: "I give you 700 colours and no names. Could you sort them into groups? Did anyone tell you the right answer?"',
      steps: {
        explore: {
          say: 'Each small dot is a pixel placed at its colour. The joined balls are 64 neurons. Watch the sheet unfold to cover the dots.',
          ask: 'Nobody labelled anything. What is the network using in place of a teacher?',
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
          say: 'Sketch a twisted sheet on the board.',
          ask: 'Which error is low and which is high for that sheet?',
        },
      },
      misconceptions: [
        { wrong: 'Clustering finds the correct groups.', right: 'There is no correct answer; groups depend on inputs and scaling, and a person must interpret them.' },
        { wrong: 'A SOM is trained with backpropagation.', right: 'There is no error signal; it learns by competition.' },
        { wrong: 'More neurons give more accurate clusters.', right: 'They give a finer map, and more dead neurons if badly initialised.' },
      ],
      close: 'That is learning without a teacher. The last station adds time: predicting what comes next.',
    },
  },
  wave: {
    network: {
      architecture: 'D-8-1 behind a tapped delay line. D inputs (the last D samples of the signal), 8 hidden tansig neurons, 1 linear output (the next sample). 8D + 17 parameters.',
      forward: 'p = [y(t−1), y(t−2), …, y(t−D)]ᵀ, a¹ = tansig(W¹p + b¹), ŷ(t) = W²a¹ + b². The network itself is static; the delay line gives it memory.',
      learning: 'Mean square error between ŷ(t) and the measured y(t), using measured past values as inputs (series-parallel form), retrained with Levenberg-Marquardt on 60 recent windows several times a second.',
      choices: 'With one linear neuron in place of the hidden layer this is the ADALINE adaptive filter. Feeding predictions back into the delay line turns it into a NARX-style closed loop for looking further ahead.',
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
    ],
    tutor: {
      minutes: 12,
      opener: 'Clap a steady rhythm and stop. Ask the class to clap the next beat. Then clap an irregular one and ask again.',
      steps: {
        explore: {
          say: 'White is what happened. The amber dots to the right are the forecast, each built on the previous one. The coloured line compares earlier forecasts with what then happened.',
          ask: 'How far ahead do you trust it? What happens to the forecast when the rhythm changes?',
        },
        break: {
          say: 'One delay only. It sees a single past value.',
          ask: 'I tell you a swing is at its lowest point. Which way is it moving? What else would you need?',
        },
        fix: {
          say: 'More delays. Watch the bars: inside the dashed limits means the leftover errors have no pattern.',
          ask: 'Why not use a hundred delays to be safe?',
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
      ],
      close: 'Four problem types, four networks, four ways to check them. Now play the mission and take one model through every stage.',
    },
  },
}
