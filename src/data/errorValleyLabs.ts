/** World 3, Error Valley: Unit III. ADALINE and LMS, adaptive filtering, backpropagation and its variations. */
import type { Lab } from './labs'

export const errorValleyLabs: Lab[] = [
  {
    id: 'adaline',
    lecture: 'Unit III',
    title: 'Auto Meter Bowl',
    story:
      'An auto fare depends on how far you go and how long you wait in traffic. A linear neuron learns the meter from 44 rides, one ride at a time. Its two weights are a position in this bowl. The height of the bowl is the mean square error: how wrong the neuron is on average.',
    takeaway:
      'A linear neuron’s error is a bowl with one bottom. LMS walks down it one example at a time, and the learning rate must stay below a limit set by the steepest side of the bowl.',
    topics: 'ADALINE, mean square error, LMS algorithm, stability bound',
    color: '#34d399',
    equation: 'a = Wp + b   F(x) = E[e²] = c − 2xᵀh + xᵀRx   LMS: W(k+1) = W(k) + 2α e(k) pᵀ(k)   0 < α < 1/λ_max',
    steps: [
      {
        kind: 'explore',
        text: 'Tap the bowl to choose the starting weights and watch the yellow ball jitter down, one ride per step. Compare it with the smooth blue path, which uses all 44 rides for every step. Then switch to "Sort cheap / costly" and compare the yellow LMS line with the pink dashed perceptron line in the small plot.',
      },
      {
        kind: 'break',
        text: 'Raise α above 1/λ_max, the limit shown in the panel. Each correction now overshoots along the steep direction of the bowl and the ball climbs out and leaves the map.',
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
    picture: [
      { mark: 'Coloured bowl', meaning: 'The mean square error for every pair of weights: w₁ for distance across, w₂ for waiting into the screen. Height and colour both mean error: blue is low, orange is high.' },
      { mark: 'Faint white rings on the bowl', meaning: 'Lines of equal error, like contour lines on a map. Long, thin rings mean a long, narrow bowl.' },
      { mark: 'White pin, x* = R⁻¹h', meaning: 'The bottom of the bowl: the best possible weights.' },
      { mark: 'Pink lines through the bottom', meaning: 'The two main directions of the bowl. The short one labelled λ₂ is the steep direction; the long one labelled λ₁ is the shallow one.', color: '#f472b6' },
      { mark: 'Yellow ball and trail', meaning: 'LMS: the weights after each single ride. The trail wobbles because each ride gives only a rough idea of downhill.', color: '#facc15' },
      { mark: 'Small blue ball and trail', meaning: 'Exact steepest descent: uses all the rides for every step, so its path is smooth. Switch it off in the panel.', color: '#38bdf8' },
      { mark: '"LMS left the map" in red', meaning: 'α is too large: every step overshot more than the last and the weights flew off.' },
      { mark: 'Dots in the small plot', meaning: 'The rides, placed by distance (across) and waiting time (up). When predicting the fare, blue is a cheap ride, green average and orange costly. When sorting, orange is costly and blue is cheap.', color: '#fb923c' },
      { mark: 'Pulsing yellow glow in the small plot', meaning: 'The ride the neuron has just learned from.' },
      { mark: 'Yellow line in the small plot', meaning: 'Where the neuron’s answer is exactly average. When sorting, it is the LMS boundary between cheap and costly.', color: '#facc15' },
      { mark: 'Pink dashed line in the small plot', meaning: 'The perceptron’s boundary on the same rides, shown only when sorting.', color: '#f472b6' },
    ],
    industry: {
      setting: 'Phone, conferencing and telecom equipment makers, audio signal processing team',
      problem: 'On a speakerphone or video call, the far person’s voice comes out of your loudspeaker, bounces round the room and goes back into your microphone. Without a fix they hear themselves echo a moment later.',
      howUsed:
        'An echo canceller is an ADALINE with many weights trained by LMS. Its inputs are the last few hundred samples of sound sent to the loudspeaker, and its target is what the microphone picks up. After every sample it updates its weights, so it learns how the room changes the sound, then subtracts its guess of the echo before the signal is sent. Most products use a version of LMS that divides the step by the loudness of the input, so a loud talker does not push α past the stable limit.',
      goesWrong:
        'When both people talk at once, your own voice looks like a large error, and the filter starts to learn the wrong thing and the echo comes back. Teams add a double-talk detector that freezes learning while both sides speak, and they test with recordings of real rooms, laptops and car cabins.',
      roles: 'DSP (digital signal processing) engineer, audio firmware engineer, acoustic test engineer.',
    },
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
      'You are on a call and the hum of a nearby transformer leaks into your microphone. A second pickup, placed by the transformer, hears only the hum. A single linear neuron (an ADALINE) with a delay line learns to turn that reference into a copy of the hum at your microphone, and subtracts it.',
    takeaway:
      'An adaptive filter can only cancel what the reference can explain. Give it a recording of the noise alone, and what is left over is the clean signal.',
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
        text: 'Push α above the "Stable while α <" value in the panel and the weights blow up. Reset, then choose "No delay": with one weight the filter cannot shift the reference in time, so part of the hum always remains.',
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
    picture: [
      { mark: 'Row of boxes at the top', meaning: 'The path of the signal: reference, delay line, ADALINE, subtract, restored signal.' },
      { mark: 'Amber trace', meaning: 'What the microphone hears: the tune with the hum added.', color: '#fbbf24' },
      { mark: 'Pink trace', meaning: 'The filter’s output: its guess of the hum, built from the reference.', color: '#f472b6' },
      { mark: 'Faint thick white trace behind the pink one', meaning: 'The true hum at the microphone. When the pink trace covers it, the filter has learned.', color: '#f8fafc' },
      { mark: 'Green trace', meaning: 'The restored signal: microphone minus the filter’s guess. This is what you listen to.', color: '#34d399' },
      { mark: 'Faint thick white trace behind the green one', meaning: 'The clean tune, so you can see how much hum is still left.', color: '#f8fafc' },
      { mark: 'Blue and violet lines in the bottom chart', meaning: 'The two weights changing over time.', color: '#38bdf8' },
      { mark: 'Dashed blue and violet lines', meaning: 'The best possible value of each weight. The solid lines should settle on them.', color: '#c4b5fd' },
      { mark: '"The weights left the map" in red', meaning: 'α is too large and the weights have grown without limit.' },
    ],
    industry: {
      setting: 'Headphone makers and medical equipment makers, signal processing teams',
      problem: 'Steady noise spoils the signal people care about: engine drone in a listener’s ears, or mains interference on a heart trace (ECG) whose signal is only a thousandth of a volt.',
      howUsed:
        'In noise-cancelling headphones a small microphone on the outside of each earcup hears the noise as the reference. An adaptive filter turns it into a guess of the noise that reaches the ear, and the speaker plays the opposite of that guess, updating its weights thousands of times a second. In ECG machines the reference is taken from the mains supply itself, and a two-weight filter like this one, a sine and its shifted copy, removes the 50 Hz hum while keeping the heartbeat.',
      goesWrong:
        'If the reference also picks up some of the wanted signal, the filter removes part of it too: a heartbeat gets distorted, or a voice is thinned out. Wind on the outer microphone makes noise that does not reach the ear the same way, so the filter adds noise instead of removing it. Teams place reference sensors carefully, keep α small, detect wind and lower the cancellation, and test against recordings from real flights, streets and wards.',
      roles: 'DSP (digital signal processing) engineer, acoustic engineer, biomedical engineer, embedded firmware engineer.',
    },
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
      'A fan regulator turns from p = −2 (slowest) to p = 2 (fastest), and the fan speed follows the curve g(p) = 1 + sin(πp/4). A small network, with one input, two hidden neurons and one output, learns that curve from one reading at a time. Every learning step is a story in two halves. First the signal travels forward through the network and comes out as a guess. Then the error in that guess is turned into blame, and the blame travels backward, layer by layer, so that each weight learns how much it was at fault and changes by that much. Here is every number in one step.',
    takeaway:
      'Signals go forward to make a guess. Blame for the error goes backward, layer by layer, and every weight changes in proportion to its share of the blame.',
    topics: 'Backpropagation algorithm, chain rule, backpropagating the sensitivities, vanishing gradient',
    color: '#a3e635',
    equation: 'aᵐ⁺¹ = fᵐ⁺¹(Wᵐ⁺¹aᵐ + bᵐ⁺¹)   sᴹ = −2Ḟᴹ(nᴹ)(t − a)   sᵐ = Ḟᵐ(nᵐ)(Wᵐ⁺¹)ᵀsᵐ⁺¹   Wᵐ ← Wᵐ − α sᵐ(aᵐ⁻¹)ᵀ   bᵐ ← bᵐ − α sᵐ',
    steps: [
      {
        kind: 'explore',
        text: 'Use "Next step" to walk through the eight parts of the first learning step. Steps 1 to 3 carry the signal forward (green). Step 4 measures the error. Steps 5 and 6 carry the blame backward (pink). Steps 7 and 8 change the weights (amber). Check each number against your own calculation. Then choose "Train fast" and watch the green curve settle on the white dashed one.',
      },
      {
        kind: 'break',
        text: 'Start with large weights. Each hidden neuron is pushed to a flat end of its S-shaped curve, where its slope is almost zero. Blame is multiplied by that slope on its way back, so almost none reaches layer 1. Its weights hardly change and the green curve stays a flat line.',
      },
      {
        kind: 'fix',
        text: 'Start with small weights so each hidden neuron begins on the steep middle part of its S-shaped curve, where blame passes back easily. Train fast and compare how quickly the error falls.',
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
    picture: [
      { mark: 'Square on the left', meaning: 'The input: the regulator position p for this reading.' },
      { mark: 'Two circles with an S-shaped curve', meaning: 'The two hidden neurons. The S shape is their logsig curve, which squashes any number to between 0 and 1.' },
      { mark: 'Circle with a straight line', meaning: 'The output neuron. It is linear, so it passes its sum straight out as the guess a².' },
      { mark: 'Grey lines with numbers', meaning: 'The wires and their weights. Numbers in grey beside each neuron are its bias b.' },
      { mark: 'Green dots moving right and green numbers', meaning: 'The forward signal: n and a at each neuron as the guess is built.', color: '#34d399' },
      { mark: 't and e at the far right', meaning: 'The target t is the true fan speed in white; the error e = t − a² is in red.', color: '#fb7185' },
      { mark: 'Pink ring, pink dots moving left and pink numbers', meaning: 'The blame going backward: f′ is the slope of a neuron’s curve and s is its sensitivity, its share of the blame.', color: '#f472b6' },
      { mark: 'Wires that flash amber', meaning: 'The weights being changed in this part of the step, with their new values.', color: '#fbbf24' },
      { mark: 'White dashed curve and white dots in the plot', meaning: 'The true fan speed g(p), and the 21 regulator positions that readings are taken from.', color: '#f8fafc' },
      { mark: 'Thick green curve in the plot', meaning: 'What the network currently answers for every regulator position.', color: '#34d399' },
      { mark: 'Red vertical line in the plot', meaning: 'The error for this reading: from the pulsing white dot (the target) to the green dot (the guess).', color: '#fb7185' },
    ],
    industry: {
      setting: 'Every team that trains neural networks: photo tagging, speech to text, translation, recommendations, medical imaging',
      problem: 'A modern network has millions or billions of weights. After each batch of examples the team needs to know, for every single weight, which way to move it and by how much.',
      howUsed:
        'Engineers write only the forward pass: how the input becomes a guess. The deep learning library records each step, and when training it runs backpropagation automatically, sending blame back through every layer to give each weight its gradient. One backward pass costs about the same as one forward pass, which is why training huge networks is possible at all. Every modern network, from a phone’s face unlock to a translation system, is trained this way.',
      goesWrong:
        'In deep networks the blame can shrink to nothing or grow out of control as it passes back through many layers, so early layers stop learning or the run blows up. Teams use neuron curves that do not go flat (such as ReLU), start with carefully scaled random weights, add normalisation layers, cap the size of gradients, and plot the gradient size of each layer during training to spot the problem early.',
      roles: 'ML engineer, research engineer, deep learning framework engineer.',
    },
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
    takeaway:
      'Each hidden neuron draws one straight line. The output neuron combines the lines into shapes that no single line could make.',
    topics: 'Multilayer perceptrons, pattern classification, batch and incremental training',
    color: '#4ade80',
    equation: 'a¹ = tansig(W¹p + b¹)   a² = logsig(W²a¹ + b²)   batch: one update per pass with the average gradient   incremental: one update per pattern',
    steps: [
      {
        kind: 'explore',
        text: 'Watch two dashed lines swing into place and the orange region form between them. Try the ring and the two moons, add your own points by tapping, and add hidden neurons when the region cannot bend enough. Compare the two error curves at the bottom.',
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
    picture: [
      { mark: 'Orange dots', meaning: 'Points where the lamp should be ON. For XOR these are the two corners where exactly one switch is up.', color: '#fb923c' },
      { mark: 'Blue dots', meaning: 'Points where the lamp should be OFF.', color: '#38bdf8' },
      { mark: 'Pulsing red glow round a dot', meaning: 'A point the network currently gets wrong.', color: '#f43f5e' },
      { mark: 'Shaded background', meaning: 'The network’s answer everywhere on the plane: orange where it says ON, blue where it says OFF. Stronger shading means a surer answer; faint means close to 0.5.' },
      { mark: 'Dashed coloured lines h1, h2 and so on', meaning: 'One line per hidden neuron, where its net input is zero. Points on either side get opposite answers from that neuron.', color: '#f472b6' },
      { mark: 'Thick green curve in the bottom chart', meaning: 'Batch training: the average error over all points, after each pass.', color: '#34d399' },
      { mark: 'Thin yellow jagged curve', meaning: 'Incremental training: the error of each single point as it is shown, so it jumps up and down.', color: '#facc15' },
    ],
    industry: {
      setting: 'Manufacturers, quality inspection team on the production line',
      problem: 'Each part is measured by a few sensors, such as weight, thickness and vibration. A good part is not simply "above" or "below" one limit: a heavier part may be fine if it is also thicker, but not if it is thin. No single threshold or straight rule separates good from bad.',
      howUsed:
        'The team collects measurements of parts that inspectors have marked good or bad, and trains a small network with one hidden layer on them. The hidden neurons find the boundaries that matter and the output neuron combines them into an accept or reject region. Training uses small groups of examples per update, a middle way between the batch and incremental training shown here, with random starting weights so the hidden neurons differ.',
      goesWrong:
        'With too many hidden neurons the network draws a tight region round every mislabelled part and then rejects good parts on the line. Teams start with few hidden neurons, keep a set of parts the network never trains on to check it, and add neurons only while that check improves. They also send borderline parts to a human inspector.',
      roles: 'Quality engineer, data scientist, manufacturing or process engineer, line inspector.',
    },
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
      'You are cycling down from Nandi Hills in thick fog. You can feel the slope under your wheels but you cannot see the valley. This is the real error surface of a small network, drawn over two of its weights: flat plateaus, a steep ravine and a second valley that leads nowhere.',
    takeaway:
      'A real error surface has flat stretches, narrow ravines and false valleys. Momentum and a changing learning rate fix slow and bouncy progress, but only a different start escapes a bad valley.',
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
        text: 'Momentum and a variable learning rate cure zig-zagging and slow progress, not a bad start. Start again from (−4, −4). In practice you train from several random starting points and keep the best.',
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
    picture: [
      { mark: 'Coloured surface', meaning: 'The squared error for every value of two weights, w¹₁,₁ across and w²₁,₁ into the screen, with the other five weights fixed. Height and colour both mean error: blue is low, orange is high.' },
      { mark: 'Faint white rings on the surface', meaning: 'Lines of equal error. Rings packed close together mean steep ground; rings far apart mean a flat plateau.' },
      { mark: 'White pin, global minimum', meaning: 'The lowest point of the whole surface, at (10, 1), where the error is zero.' },
      { mark: 'Pink pin, local minimum', meaning: 'The bottom of the false valley, shown in the wide view. Its error never falls below 0.093.', color: '#fda4af' },
      { mark: 'Light green pin, start', meaning: 'The starting weights. Tap the surface to move it.', color: '#a7f3d0' },
      { mark: 'Blue ball and trail', meaning: 'SDBP, steepest descent: a step straight downhill with a fixed α.', color: '#38bdf8' },
      { mark: 'Amber ball and trail', meaning: 'MOBP, momentum: keeps part of its previous step, which smooths out a zig-zag.', color: '#fbbf24' },
      { mark: 'Pink ball and trail', meaning: 'VLBP, variable learning rate: grows α while the error falls and cuts it when a step goes too far uphill.', color: '#f472b6' },
      { mark: '"left the map" in the list', meaning: 'That rider took a step so large that its weights left the surface altogether.' },
      { mark: 'Left chart, three coloured lines', meaning: 'The error of each rider at every iteration, on a log scale: each label up the axis is a thousand times more error than the one below.' },
      { mark: 'Right chart, pink line', meaning: 'The learning rate VLBP has chosen for itself at every iteration.', color: '#f472b6' },
      { mark: 'Dashed grey line in the right chart', meaning: 'The starting learning rate, which SDBP and MOBP keep the whole time.' },
    ],
    industry: {
      setting: 'Companies that retrain models regularly: search ranking, recommendations, speech recognition, ad click prediction',
      problem: 'A training run can take hours to days on costly hardware. A run that crawls across a plateau or bounces between ravine walls wastes that time, and a run that settles in a poor valley gives a weaker model.',
      howUsed:
        'Every training run uses momentum, either plain momentum or an optimiser such as Adam that is built on the same idea. Every run also follows a learning-rate schedule: a gentle warm-up at the start, then a steady decrease, or a cut whenever the validation error stops improving, which is the same idea as VLBP. For important models teams train from several random starting weights and keep the best.',
      goesWrong:
        'A run sits on a plateau and the error curve looks flat, so someone stops it too early, or a learning rate that is too high makes the error spike and the run fails. Teams try a small range of learning rates on a short run first, watch the error curve live, and save checkpoints so that a failed run can restart from just before the spike with a lower rate.',
      roles: 'ML engineer, research engineer, MLOps engineer (runs the training infrastructure).',
    },
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
