/** World 3, Error Valley: Unit III. ADALINE and LMS, adaptive filtering, backpropagation and its variations. */
import type { Lab } from './labs'

export const errorValleyLabs: Lab[] = [
  {
    id: 'adaline',
    lecture: 'Unit III',
    title: 'Auto Meter Bowl',
    story:
      'An auto fare depends on how far you go and how long you wait in traffic. A linear neuron learns the meter from 44 rides, one ride at a time. Its two weights are a position in this bowl. Height is the mean square error.',
    topics: 'ADALINE, mean square error, LMS algorithm, stability bound',
    color: '#34d399',
    equation: 'a = Wp + b   F(x) = E[e²] = c − 2xᵀh + xᵀRx   LMS: W(k+1) = W(k) + 2α e(k) pᵀ(k)   0 < α < 1/λ_max',
    steps: [
      {
        kind: 'explore',
        text: 'Tap the bowl to choose the starting weights and watch the yellow ball jitter down, one ride per step. Compare it with the smooth blue path. Then switch to "Sort cheap / costly" and compare the LMS line with the perceptron line in the small plot.',
      },
      {
        kind: 'break',
        text: 'Raise α above 1/λ_max. Each correction now overshoots along the steep direction of the bowl and the ball climbs out and leaves the map.',
      },
      {
        kind: 'fix',
        text: 'Bring α down to a tenth of the limit. The path is slower but the jitter around the minimum shrinks. Find the largest α you would trust.',
      },
      {
        kind: 'prove',
        text: 'An ADALINE has R = [1 0.8; 0.8 1]. What are the eigenvalues, the largest stable α, and why is the bowl long and narrow?',
        answer:
          'λ = 1 ± 0.8, so λ₁ = 0.2 and λ₂ = 1.8. LMS is stable for 0 < α < 1/λ_max = 1/1.8 ≈ 0.56. The curvature of F along each eigenvector is 2λ, so the bowl is 9 times steeper along the second eigenvector than along the first: the contours are ellipses stretched along the first eigenvector. α must suit the steep direction, which makes progress along the shallow one slow.',
      },
    ],
    words: [
      { term: 'ADALINE', meaning: 'A neuron with a linear transfer function: its output is simply a = Wp + b.' },
      { term: 'Mean square error', meaning: 'The average of e² over all the examples. For a linear neuron it is a bowl-shaped function of the weights.' },
      { term: 'LMS (Widrow-Hoff)', meaning: 'A learning rule that, after every single example, moves the weights by 2α·e·p, using that one error as a rough estimate of the slope.' },
      { term: 'Correlation matrix R', meaning: 'The average of p·pᵀ over the inputs. It fixes the shape of the bowl.' },
      { term: 'Eigenvalue λ', meaning: 'How steeply the bowl curves along one of its two main directions. The largest one sets the speed limit for α.' },
      { term: 'Margin', meaning: 'The distance from the decision boundary to the nearest example. A larger margin tolerates more noise.' },
      { term: 'Learning rate α', meaning: 'How big a step the weights take for a given error.' },
    ],
    theory: {
      idea: 'An ADALINE is a single neuron with no squashing: its output is a weighted sum of its inputs. Because the output is linear in the weights, the mean square error is an exact quadratic bowl with one lowest point. The LMS rule walks down that bowl using only the error of the example in front of it, so it needs no stored data and no matrix inversion.',
      how: [
        'Show the neuron one example p and compute a = Wp + b.',
        'Compare with the target: e = t − a.',
        'Move every weight a little in the direction that would have reduced this error: W ← W + 2α e pᵀ, b ← b + 2α e.',
        'Repeat with the next example. On average the steps point downhill, so the weights drift towards x* = R⁻¹h, the bottom of the bowl.',
        'Keep α below 1/λ_max, where λ_max is the largest eigenvalue of R, or the steps overshoot and grow.',
      ],
      usedFor: [
        { where: 'Telephone and video calls', example: 'Echo cancellers in phones and conferencing apps are LMS-trained linear filters that learn the echo path of the room.' },
        { where: 'Sensor calibration', example: 'A weighing scale or gas sensor is corrected by a linear combination of raw reading and temperature, fitted by least squares.' },
        { where: 'Quick forecasting baselines', example: 'Electricity demand for the next hour estimated as a weighted sum of the last few hours and the temperature.' },
      ],
      limits: 'It can only fit a straight line or flat plane. If the true relation is curved, or the classes are not linearly separable, the lowest point of the bowl is still a poor answer. Inputs on very different scales give eigenvalues that are far apart, which forces a tiny α and slow learning.',
    },
    complexity: {
      parameters: 'R weights plus 1 bias = R + 1. Here the inputs are centred, so the bias is left out: 2 weights.',
      prediction: 'One multiplication per input: R = 2 multiplications and one addition. The work grows in step with the number of inputs.',
      training: 'One LMS step costs about 2R multiplications: R for the output and R for the update (4 here). One pass over the 44 rides is 44 steps. The number of passes needed depends on α and on how far apart the eigenvalues of R are.',
      memory: 'Only the R weights. LMS does not store the examples or the matrix R, which is why it suits a stream of data.',
      scaling: 'Cost per step grows linearly with the number of inputs, so filters with thousands of weights are practical. The limit is speed of convergence, not cost: when λ_max is much larger than λ_min the bowl is a narrow trough and LMS creeps along its floor.',
    },
  },
  {
    id: 'noise-canceller',
    lecture: 'Unit III',
    title: 'Hum Remover',
    story:
      'You are on a call and the mains hum of a nearby transformer leaks into your microphone. A second pickup hears only the hum. An ADALINE with a delay line learns to turn that reference into a copy of the hum and subtracts it.',
    topics: 'Adaptive filtering, tapped delay line, adaptive noise cancellation',
    color: '#22d3ee',
    equation: 'a(k) = w₁ v(k) + w₂ v(k − D)   e(k) = t(k) − a(k) = restored signal   W(k+1) = W(k) + 2α e(k) pᵀ(k)',
    steps: [
      {
        kind: 'explore',
        text: 'Watch the pink filter output grow until it covers the grey hum, and the two weights climb to their dashed best values. Then press the two play buttons and listen to before and after.',
      },
      {
        kind: 'break',
        text: 'Push α past the limit and the weights explode. Reset, then choose "No delay": with one weight the filter cannot shift the reference in time, so part of the hum always remains.',
      },
      {
        kind: 'fix',
        text: 'Go back to a small α and one delay. Two weights can build a sine wave of any size and any phase from the reference and its delayed copy.',
      },
      {
        kind: 'prove',
        text: 'The filter minimises the mean square of e, and e contains the tune. Why does the filter not remove the tune as well?',
        answer:
          'The filter output is a weighted sum of the reference and its delayed copy, and the reference contains only the hum. The tune is uncorrelated with the reference, so no choice of weights can reproduce it. Minimising E[e²] = E[s²] + E[(m − a)²] therefore means making a equal to the hum m. The smallest possible error is the tune itself.',
      },
    ],
    words: [
      { term: 'Adaptive filter', meaning: 'A filter whose weights keep adjusting themselves while it runs.' },
      { term: 'Tapped delay line', meaning: 'A chain of delays that hands the neuron the current sample and earlier samples of a signal at the same time.' },
      { term: 'Reference input', meaning: 'A second measurement that contains the noise but not the wanted signal.' },
      { term: 'Restored signal', meaning: 'The error e = t − a. Once the filter output matches the noise, the error is what you wanted to hear.' },
      { term: 'Phase', meaning: 'How far a wave is shifted in time. The hum reaches the microphone later than it reaches the reference pickup.' },
      { term: 'Uncorrelated', meaning: 'Two signals whose product averages to zero: knowing one tells you nothing about the other.' },
    ],
    theory: {
      idea: 'Put a tapped delay line in front of an ADALINE and you have an adaptive filter: its output is a weighted sum of the present and past values of its input. In a noise canceller the input is a reference that hears only the noise, and the target is the contaminated signal. LMS can only cancel what the reference can explain, so the error that is left over is the clean signal.',
      how: [
        'Feed the reference v(k) into the delay line to get the vector p(k) = [v(k), v(k − D)].',
        'The ADALINE forms its guess of the noise: a(k) = W p(k).',
        'Subtract it from the microphone signal: e(k) = t(k) − a(k). This is the output you listen to.',
        'Use the same e(k) to adjust the weights: W ← W + 2α e(k) pᵀ(k).',
        'Repeat for every sample. The weights settle at x* = R⁻¹h and keep tracking if the noise path changes.',
      ],
      usedFor: [
        { where: 'Noise-cancelling headphones', example: 'An outside microphone hears the aircraft engine drone, an adaptive filter predicts what reaches the ear and the speaker plays its opposite.' },
        { where: 'Hospital monitors', example: 'ECG and EEG machines remove 50 Hz mains interference from signals of a few microvolts using a mains reference.' },
        { where: 'Speakerphones and video calls', example: 'The far-end voice coming out of the loudspeaker is the reference; the filter removes its echo from the microphone signal.' },
      ],
      limits: 'It needs a reference that is correlated with the noise and not with the wanted signal: if the voice leaks into the reference, the voice is cancelled too. Noise that passes through a non-linear path cannot be matched by a linear filter. A large α makes the weights chase the signal and distorts it; a tiny α cannot follow a noise path that changes.',
    },
    complexity: {
      parameters: 'One weight per tap, no bias: R weights. Here R = 2 (one delay).',
      prediction: 'R multiplications per sample for the filter output: 2 here. At 8000 samples per second that is 16 000 multiplications a second.',
      training: 'The LMS update adds about R more multiplications, so roughly 2R = 4 per sample for filtering and learning together. Training never ends: every sample is one step.',
      memory: 'The R weights plus the delay line: (R − 1)·D + 1 past samples. With D = 20 samples (100 Hz hum) that is 21 numbers.',
      scaling: 'Cost per sample grows linearly with the number of taps. One sine wave needs 2 taps; each extra harmonic needs 2 more; a room echo needs hundreds to thousands of taps. More taps also make convergence slower and tighten the limit on α.',
    },
  },
  {
    id: 'backprop',
    lecture: 'Unit III',
    title: 'Backprop, One Step at a Time',
    story:
      'A fan regulator turns from p = −2 (slowest) to p = 2 (fastest), and the speed follows the curve g(p) = 1 + sin(πp/4). A 1-2-1 network learns the curve from single readings. Here is every number inside one learning step.',
    topics: 'Backpropagation algorithm, chain rule, backpropagating the sensitivities, vanishing gradient',
    color: '#a3e635',
    equation: 'aᵐ⁺¹ = fᵐ⁺¹(Wᵐ⁺¹aᵐ + bᵐ⁺¹)   sᴹ = −2Ḟᴹ(nᴹ)(t − a)   sᵐ = Ḟᵐ(nᵐ)(Wᵐ⁺¹)ᵀsᵐ⁺¹   Wᵐ ← Wᵐ − α sᵐ(aᵐ⁻¹)ᵀ   bᵐ ← bᵐ − α sᵐ',
    steps: [
      {
        kind: 'explore',
        text: 'Use "Next step" to walk through the eight sub-steps of the first iteration and check each number against your own calculation. Then choose "Train fast" and watch the green curve settle on the white one.',
      },
      {
        kind: 'break',
        text: 'Start with large weights. The hidden neurons sit on the flat ends of the logsig curve, their derivative is almost zero, and the sensitivities s¹ that reach layer 1 vanish. The curve stays a flat line.',
      },
      {
        kind: 'fix',
        text: 'Start with small weights so each neuron begins on the steep middle part of its curve. Train fast and compare how quickly the error falls.',
      },
      {
        kind: 'prove',
        text: 'With the book values and p = 1: a¹ = [0.321; 0.368], a² = 0.446, t = 1.707. Compute s², s¹ and the new W² for α = 0.1.',
        answer:
          'e = 1.707 − 0.446 = 1.261. s² = −2·1·1.261 = −2.522. s¹ = [(1 − 0.321)(0.321)·0.09·(−2.522); (1 − 0.368)(0.368)·(−0.17)·(−2.522)] = [−0.0495; 0.0997]. W²(1) = [0.09 −0.17] − 0.1·(−2.522)·[0.321 0.368] = [0.171 −0.0772], and b²(1) = 0.48 + 0.2522 = 0.732.',
      },
    ],
    words: [
      { term: 'Forward pass', meaning: 'Computing the output layer by layer, from the input to the last layer.' },
      { term: 'Sensitivity s', meaning: 'How much the squared error changes when the net input n of one neuron changes. One number per neuron.' },
      { term: 'Chain rule', meaning: 'The calculus rule for a function of a function: multiply the derivatives along the path.' },
      { term: 'Backpropagation', meaning: 'Computing the sensitivities of a layer from those of the layer after it, starting at the output.' },
      { term: 'Transfer function derivative', meaning: 'The slope of the neuron\'s curve at its current n. For logsig it is (1 − a)·a, at most 0.25.' },
      { term: 'Saturation', meaning: 'A neuron whose n is so large or so negative that its output is stuck near 1 or 0 and its slope is nearly zero.' },
      { term: 'Vanishing gradient', meaning: 'Sensitivities that shrink towards zero as they pass back through saturated or many layers, so early layers stop learning.' },
    ],
    theory: {
      idea: 'A multilayer network is a function inside a function, so the slope of the error with respect to an early weight is a product of slopes along the path to the output. Backpropagation computes all of these products in one sweep from the output back to the input, reusing each layer\'s result for the layer before it. Every weight then moves by −α times its neuron\'s sensitivity times the signal on its wire.',
      how: [
        'Forward pass: a⁰ = p, then for each layer n = Wa + b and a = f(n). Keep every n and a.',
        'Error at the output: e = t − a.',
        'Output sensitivity: sᴹ = −2 Ḟᴹ(nᴹ) e.',
        'Go back one layer at a time: sᵐ = Ḟᵐ(nᵐ)(Wᵐ⁺¹)ᵀ sᵐ⁺¹.',
        'Update every layer: Wᵐ ← Wᵐ − α sᵐ(aᵐ⁻¹)ᵀ and bᵐ ← bᵐ − α sᵐ.',
      ],
      usedFor: [
        { where: 'Almost every trained neural network', example: 'Image classifiers, speech recognisers and language models all obtain their gradients by backpropagation.' },
        { where: 'Handwriting and document reading', example: 'Banks and post offices read handwritten digits on cheques and pin codes with networks trained this way.' },
        { where: 'Curve fitting in engineering', example: 'A small network learns a sensor or motor characteristic from measurements when no formula is available.' },
      ],
      limits: 'It only finds a gradient; it does not promise the best weights. Saturated sigmoid neurons pass back almost nothing, so learning stalls. The transfer functions must be differentiable, which rules out the hard limit. The error surface is not a bowl, so the result depends on the starting weights.',
    },
    complexity: {
      parameters: 'Layer m has Sᵐ(Sᵐ⁻¹ + 1) weights and biases. For 1-2-1: 2·(1 + 1) + 1·(2 + 1) = 7.',
      prediction: 'One multiplication per weight: 2 + 2 = 4 multiplications and 2 logsig evaluations. The work grows with the number of weights.',
      training: 'The backward pass costs about the same as the forward pass, so one iteration is roughly two forward passes plus one update per parameter (7 here). This curve needs a few thousand single-reading iterations at α = 0.1.',
      memory: 'The 7 parameters, plus the n and a of every neuron kept from the forward pass for use on the way back (3 neurons here).',
      scaling: 'Cost per example grows with the number of weights, never faster: this efficiency is why backpropagation is used. What grows badly is the number of iterations, and with many sigmoid layers the sensitivities shrink at each layer because each derivative is at most 0.25.',
    },
  },
  {
    id: 'xor-solved',
    lecture: 'Unit III',
    title: 'The Corridor Light, Solved',
    story:
      'The corridor light with two switches is back: the lamp is on when exactly one switch is up. One perceptron could not learn it. A hidden layer can: each hidden neuron draws a line and the output neuron combines them.',
    topics: 'Multilayer perceptrons, pattern classification, batch and incremental training',
    color: '#4ade80',
    equation: 'a¹ = tansig(W¹p + b¹)   a² = logsig(W²a¹ + b²)   batch: one update per pass with the average gradient   incremental: one update per pattern',
    steps: [
      {
        kind: 'explore',
        text: 'Watch two dashed lines swing into place and the orange region form between them. Try the ring and the two moons, add your own points by tapping, and add hidden neurons when the region cannot bend enough. Compare the two loss curves.',
      },
      {
        kind: 'break',
        text: 'Use one hidden neuron on XOR: one line cannot do it. Then try several neurons with "All equal" starting weights: every neuron gets the same update and they stay copies of each other.',
      },
      {
        kind: 'fix',
        text: 'Use two hidden neurons with small random starting weights. Random starts make the neurons different, so each can take a different line.',
      },
      {
        kind: 'prove',
        text: 'With Q training patterns, how many weight updates do batch and incremental training make in one pass, and why is the incremental loss curve noisy?',
        answer:
          'Batch training adds up the gradients of all Q patterns and makes 1 update per pass, along the true gradient of the mean square error, so its curve is smooth. Incremental training makes Q updates per pass, each along the gradient of a single pattern. A step that helps one pattern can hurt another, so the error jumps up and down, but on average it moves downhill. The work per pattern is the same in both.',
      },
    ],
    words: [
      { term: 'Hidden layer', meaning: 'A layer of neurons between the input and the output. Its outputs are not compared with any target directly.' },
      { term: 'Decision region', meaning: 'The part of the input plane where the network answers ON.' },
      { term: 'Linearly separable', meaning: 'Two classes that a single straight line can split. XOR is not.' },
      { term: 'Epoch', meaning: 'One pass through all the training patterns.' },
      { term: 'Batch training', meaning: 'Updating the weights once per epoch, using the gradient averaged over all patterns.' },
      { term: 'Incremental training', meaning: 'Updating the weights after every single pattern.' },
      { term: 'Symmetry breaking', meaning: 'Starting hidden neurons with different random weights so that they can learn different things.' },
    ],
    theory: {
      idea: 'A single neuron splits the plane with one straight line. A hidden layer draws several lines at once, and the output neuron combines the half-planes into bands, wedges and closed shapes. With enough hidden neurons a two-layer network can carve out any region, and backpropagation finds the lines from examples.',
      how: [
        'Each hidden neuron computes n = w·p + b. The line n = 0 is its boundary; tansig says which side a point is on.',
        'The output neuron takes a weighted sum of the hidden outputs and squashes it to a value between 0 and 1.',
        'The point is classed ON when the output is above 0.5. The set of such points is the decision region.',
        'Backpropagation moves every line a little after each pattern (incremental) or after each pass (batch) to lower the squared error.',
      ],
      usedFor: [
        { where: 'Payment fraud screening', example: 'A network scores each card or UPI payment from amount, time, place and device, where no single straight rule separates fraud from normal use.' },
        { where: 'Medical screening', example: 'Classifying a blood test panel or a heartbeat as normal or needing review from several measurements together.' },
        { where: 'Quality control on a production line', example: 'Accepting or rejecting a part from a handful of sensor readings such as weight, colour and vibration.' },
      ],
      limits: 'Training can stop in a poor solution, and the answer changes with the starting weights. Too few hidden neurons cannot form the region; too many will draw a region around every noisy point. All-equal starting weights never separate. The network gives no reason for its answer beyond the lines it drew.',
    },
    complexity: {
      parameters: 'For 2-S-1: S·(2 + 1) + (S + 1) = 4S + 1. With S = 2 that is 9; with S = 8 it is 33. The station shows the live count.',
      prediction: '2S multiplications in the hidden layer and S in the output layer: 3S = 6 for S = 2, plus S + 1 transfer function evaluations. Grows in step with S.',
      training: 'Each pattern costs about two forward passes whichever mode is used, so one epoch costs about Q × weights operations. Batch makes 1 update per epoch and incremental makes Q; the work per pattern is the same. XOR typically needs hundreds to a few thousand epochs with steepest descent.',
      memory: 'The 4S + 1 parameters and the training patterns. Batch training also holds one accumulated gradient, the same size as the parameters.',
      scaling: 'For R inputs and S hidden neurons the cost per pattern grows with S·(R + 2). Harder shapes need more hidden neurons and many more epochs, and the chance of stopping in a poor solution grows too.',
    },
  },
  {
    id: 'ravine',
    lecture: 'Unit III',
    title: 'Nandi Hills in Fog',
    story:
      'You are cycling down from Nandi Hills in thick fog. You can feel the slope under your wheels but you cannot see the valley. This is the real error surface of a small network: flat plateaus, a steep ravine and a second valley that leads nowhere.',
    topics: 'Drawbacks of backpropagation, performance surface, convergence, momentum, variable learning rate',
    color: '#2dd4bf',
    equation: 'SDBP: Δx = −α g   MOBP: Δx(k) = γΔx(k−1) − (1−γ)α g(k)   VLBP: F up by more than ζ = 4 % → reject, α ← 0.7α, γ ← 0;  F down → accept, α ← 1.05α',
    steps: [
      {
        kind: 'explore',
        text: 'Tap the surface to choose a start and watch three riders leave together. Follow the two charts: the error of each rider and the learning rate that VLBP chooses for itself. Press "α = 2.5: zig-zag" to see steepest descent bounce between the ravine walls while the other two cope.',
      },
      {
        kind: 'break',
        text: 'Start at (−4, 10). All three riders roll into the other valley and crawl towards a local minimum where the error never falls below 0.093.',
      },
      {
        kind: 'fix',
        text: 'Momentum and a variable learning rate cure oscillation and slowness, not a bad start. Start again from (−4, −4). In practice you train from several random starting points and keep the best.',
      },
      {
        kind: 'prove',
        text: 'On a flat plateau steepest descent needs a large α; in the ravine it needs a small one. How do momentum and VLBP each deal with this?',
        answer:
          'Momentum makes each step a running average of recent gradients. Across the ravine the gradients alternate in sign and cancel; along the floor they agree and add up, so a larger α can be used without oscillation. VLBP changes α itself: while the error keeps falling α grows by 5 % per step, which speeds up the plateau; when a step raises the error by more than 4 % it is thrown away, α is cut to 70 % and the momentum is cleared, which stops the bouncing in the ravine.',
      },
    ],
    words: [
      { term: 'Performance surface', meaning: 'The error drawn as a height above the weights. Training is a walk downhill on it.' },
      { term: 'Plateau', meaning: 'A nearly flat region where the gradient is tiny and progress is slow.' },
      { term: 'Ravine', meaning: 'A narrow valley with steep walls and a gently sloping floor.' },
      { term: 'Local minimum', meaning: 'A low point that is not the lowest one. Downhill steps cannot leave it.' },
      { term: 'SDBP', meaning: 'Steepest descent backpropagation: step against the gradient with a fixed α.' },
      { term: 'Momentum γ (MOBP)', meaning: 'Keeping a fraction γ of the previous step, which smooths out a zig-zag path.' },
      { term: 'Variable learning rate (VLBP)', meaning: 'Raising α while the error falls and cutting it when a step makes the error rise.' },
    ],
    theory: {
      idea: 'A multilayer network\'s error surface is not a bowl. It has flat regions, steep narrow valleys and more than one minimum, so no single learning rate suits all of it. Momentum and a variable learning rate are two inexpensive changes to steepest descent that make it faster and steadier on such a surface. Neither can tell a local minimum from the global one.',
      how: [
        'Compute the gradient g of the squared error over the whole training set by backpropagation.',
        'SDBP: move by −α g.',
        'MOBP: move by γ times the previous step plus (1 − γ) times the new steepest descent step.',
        'VLBP: try the step. If the error rose by more than 4 %, undo it, multiply α by 0.7 and set the momentum to zero for the next step.',
        'If the error fell, keep the step and multiply α by 1.05. If it rose by less than 4 %, keep the step and leave α alone.',
      ],
      usedFor: [
        { where: 'Training deep networks', example: 'Momentum is part of the standard optimisers used to train image and language models (SGD with momentum, Adam).' },
        { where: 'Learning-rate schedules', example: 'Training programs cut the learning rate when the validation error stops improving, the same idea as VLBP.' },
        { where: 'Small embedded models', example: 'A network retrained on a microcontroller uses momentum because it adds only one stored number per weight.' },
      ],
      limits: 'Both are heuristics with extra constants (γ, η, ρ, ζ) that have to be chosen. They only reduce the number of iterations: they still follow the slope, so they still end in whichever valley the start leads to. VLBP needs the error on the whole training set every step, so it suits batch training only.',
    },
    complexity: {
      parameters: 'The 1-2-1 network has 2·2 + 3 = 7 parameters. Five are fixed at their correct values here so that the surface can be drawn over the other 2.',
      prediction: '4 multiplications and 3 logsig evaluations per input.',
      training: 'One iteration is a forward and a backward pass over all 41 training points for each rider, whichever method is used. VLBP reuses the forward pass of the trial step, so a rejected step costs one extra forward pass. From (−4, −4) with α = 1, VLBP gets there in a few hundred iterations and steepest descent needs a few thousand.',
      memory: 'SDBP: the parameters. MOBP adds the previous step (one number per parameter). VLBP also keeps the previous parameters and error so that it can undo a step.',
      scaling: 'Cost per iteration is unchanged by the heuristics and grows with training points × weights. The saving is in iterations: steepest descent may need thousands in a ravine, and momentum and a variable learning rate cut that several times over. With many weights there are many more plateaus and valleys, so several random starts are the usual remedy.',
    },
  },
]
