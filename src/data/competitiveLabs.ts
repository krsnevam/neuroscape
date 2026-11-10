/** World 4, Competitive City: Unit IV stations, each built on an everyday example. */
import type { Lab } from './labs'

export const competitiveLabs: Lab[] = [
  {
    id: 'pavlov',
    lecture: 'Unit IV',
    title: 'Filter Coffee Reflex',
    story:
      'The smell of filter coffee makes your mouth water. Nobody taught you that. The steel tumbler it comes in means nothing at first. One neuron learns to link the two, with no teacher telling it the right answer.',
    topics: 'Simple associative network, unsupervised Hebb rule, Hebb rule with decay',
    color: '#38bdf8',
    takeaway: 'A Hebbian weight grows when its input and the neuron’s output are active together. Without decay it grows forever; with decay it levels off, but the link fades when the pairing stops.',
    picture: [
      { mark: 'Coffee cup in an amber circle', meaning: 'The smell of coffee, p⁰. The circle lights up on trials where the smell is present.', color: '#fbbf24' },
      { mark: 'Steel tumbler in a blue circle', meaning: 'The sight of the tumbler, p. The circle lights up on trials where the tumbler is seen.', color: '#38bdf8' },
      { mark: 'Amber wire', meaning: 'The fixed weight w⁰ from the smell. It is always 1 and never changes.', color: '#fbbf24' },
      { mark: 'Blue wire', meaning: 'The learned weight w from the sight of the tumbler. It gets thicker as w grows and is dashed while w is 0.', color: '#38bdf8' },
      { mark: 'White dot moving along a wire', meaning: 'A stimulus travelling to the neuron on the trial just presented.' },
      { mark: 'Circle with Σ', meaning: 'The neuron. It adds up its inputs and glows orange when it fires.', color: '#fb923c' },
      { mark: 'Blue drops on the right', meaning: 'The response: they fall when the neuron fires (a = 1) and the mouth waters.', color: '#7dd3fc' },
      { mark: 'Light blue line in the chart', meaning: 'The weight w after every trial.', color: '#7dd3fc' },
      { mark: 'Orange and grey dots on the line', meaning: 'Orange means the neuron fired on that trial; grey means it stayed silent.', color: '#fb923c' },
      { mark: 'Orange dashed line at 0.5', meaning: 'Once w is above this line the tumbler alone makes the neuron fire.', color: '#fb923c' },
      { mark: 'Green dashed line', meaning: 'The limit α/γ that the weight cannot pass. It appears only when decay is on.', color: '#34d399' },
      { mark: 'Small coloured marks under the chart', meaning: 'What was presented on each trial: green for coffee in the tumbler, blue for the tumbler only, amber for smell only, grey for nothing.' },
      { mark: 'Pulsing white dot', meaning: 'The current value of the weight w.' },
    ],
    industry: {
      setting: 'Neuroscience research labs and neuromorphic chip teams',
      problem: 'Researchers want to understand how the brain links two things in memory. Chip designers want hardware that can learn on the device using very little power.',
      howUsed:
        'Hebbian learning is used mostly in these two places, not in everyday business software. Neuroscientists fit Hebb rules with decay to conditioning experiments and check whether the model forgets at the same rate the animals do. Neuromorphic chips change each connection using only the two signals that meet at it, which is the Hebb idea, so no central computer has to calculate an error.',
      goesWrong:
        'Plain Hebb weights keep growing until they hit the hardware limit, and unrelated inputs that happen to be active together get linked. Teams add decay or a cap on each weight, and they normalise the weights of a neuron so the total stays fixed.',
      roles: 'Computational neuroscientist, neuromorphic hardware engineer, research scientist.',
    },
    equation: 'a = hardlim(w⁰p⁰ + w p + b)   Hebb: w(q) = w(q−1) + α a(q) p(q)   with decay: … − γ w(q−1),  w_max = α/γ',
    steps: [
      {
        kind: 'explore',
        text: 'Tap "Forget everything", then "Empty tumbler only": nothing happens. Now tap "Coffee in the tumbler" once, then the empty tumbler again. Read the weight on the chart after each tap.',
      },
      {
        kind: 'break',
        text: 'Let the college days run with no decay. Every day that smell and sight come together adds the learning rate α, a fixed step, to the weight. Watch the chart: the line never levels off.',
      },
      {
        kind: 'fix',
        text: 'Switch decay on. The weight now settles at α/γ. Then switch to "Holidays" and watch the cost: with nothing presented, the weight fades and the link is forgotten.',
      },
      {
        kind: 'prove',
        text: 'With α = 1 and γ = 0.1, coffee is served in the tumbler on every trial. What value does w approach, and how many holiday trials does it then take to fall below 0.5?',
        answer:
          'At the limit the growth equals the decay: α·a·p = γ·w, so w = α/γ = 1/0.1 = 10. On a holiday a = 0, so w(q) = (1 − γ) w(q−1) = 0.9 w(q−1). We need 10 × 0.9ᵏ < 0.5, so k > ln(0.05)/ln(0.9) = 28.4. After 29 holidays the tumbler alone no longer works.',
      },
    ],
    theory: {
      "idea": "A Hebbian neuron strengthens a connection whenever its input and its output are active together. The smell of coffee already makes the neuron fire. If the sight of the tumbler keeps arriving at the same moment, that weight grows until sight alone is enough. No teacher and no target are involved.",
      "how": [
        "Present the stimuli for one trial: p0 (smell) and p (sight).",
        "Compute n = w0 p0 + w p + b and a = hardlim(n).",
        "Update the learned weight: w = w + α a p − γ w. With γ = 0 this is the plain Hebb rule.",
        "Repeat. The weight grows only on trials where sight and response happen together.",
        "With decay the weight stops at α/γ and fades when the pairing stops."
      ],
      "usedFor": [
        {
          "where": "Recommendation feeds",
          "example": "A shopping app strengthens the link between two items that are often bought together, and slowly weakens links that stop being used"
        },
        {
          "where": "Neuromorphic chips",
          "example": "Hardware that learns on the device by changing a connection using only the two signals that meet at it"
        },
        {
          "where": "Neuroscience models",
          "example": "Models of how a place cell and a smell cell become linked in memory after being active together"
        }
      ],
      "limits": "The plain Hebb rule only grows weights, so they can increase without limit. Decay fixes that but makes the network forget. It learns correlation, not cause, and it cannot be told what the right output is."
    },
    complexity: {
      "parameters": "Weights = number of inputs R (plus the bias). This station: w0, w and b = 3 values, of which only w is learned.",
      "prediction": "One multiply and one addition per input, about R multiplications. This station: 2.",
      "training": "One step updates each weight once: about R operations per trial, with no search over other neurons. A run is trials × R, so work grows in a straight line with the number of trials.",
      "memory": "Only the weights are kept: R numbers per neuron. No history of past trials is needed.",
      "scaling": "Cost grows in step with the number of inputs and neurons (S × R weights). The limit is not speed but quality: with many inputs, unrelated inputs that happen to be active together get linked too."
    },
    words: [
      { term: 'Unconditioned stimulus p⁰', meaning: 'An input that already causes the response through a fixed weight w⁰. Here: the smell of coffee.' },
      { term: 'Conditioned stimulus p', meaning: 'An input that means nothing at first and has a weight w that is learned. Here: the sight of the tumbler.' },
      { term: 'Associative network', meaning: 'A network that learns to link one stimulus to another, so that the second can stand in for the first.' },
      { term: 'Unsupervised Hebb rule', meaning: 'Raise a weight whenever its input and the neuron output are active together. It uses the actual output a, not a target t.' },
      { term: 'Decay rate γ', meaning: 'The share of the weight lost on every trial. It stops unlimited growth but also makes the network forget.' },
      { term: 'hardlim', meaning: 'A step function: output 1 if the net input n is 0 or more, otherwise 0.' },
    ],
  },
  {
    id: 'instar-outstar',
    lecture: 'Unit IV',
    title: 'Ringtone and Face',
    story:
      'Your phone rings in your pocket. From the sound alone you know it is Anu, and her face comes to mind. The first half is an instar: many inputs, one neuron that recognises one pattern of inputs. The second half is an outstar: one cue that recalls a whole pattern.',
    topics: 'Simple recognition network, instar rule, Kohonen rule, simple recall network, outstar rule',
    color: '#818cf8',
    takeaway: 'An instar moves its weights toward an input only while it is active, so other inputs cannot wear its memory away. An outstar lets one cue bring back a whole stored pattern.',
    picture: [
      { mark: 'Dashed circle', meaning: 'Every sound of length 1. Bass is measured across and treble upwards, so each ringtone is a point on this circle.' },
      { mark: 'Grey dots named Anu, Mum and Unknown number', meaning: 'Where each caller’s ringtone sits on the circle.', color: '#64748b' },
      { mark: 'Amber arrow p', meaning: 'The ringtone that will ring next. Drag it around the circle to choose another sound.', color: '#fbbf24' },
      { mark: 'Amber ripples', meaning: 'The tone that has just rung.', color: '#fbbf24' },
      { mark: 'Indigo arrow w', meaning: 'The neuron’s weight vector: the sound it has learned to expect.', color: '#818cf8' },
      { mark: 'Grey dashed line', meaning: 'The gap p − w between the old weights and the tone that rang.' },
      { mark: 'Green arrow', meaning: 'The step the weights just took. With the instar rule it points toward p.', color: '#34d399' },
      { mark: 'Green wedge', meaning: 'Tones that now fire the neuron on their own, without the name on screen.', color: '#34d399' },
      { mark: 'Phone at the top left', meaning: 'Shows "Anu calling" in an amber frame when the name is on screen (p⁰ = 1), and stays dark when it is face down.' },
      { mark: 'Lamp at the top right', meaning: 'The neuron’s output. Green means a = 1, "It is Anu"; grey means silent.', color: '#34d399' },
      { mark: 'Recall: amber grid on the left', meaning: 'The face your eyes see, p⁰. It fades after a moment.', color: '#fbbf24' },
      { mark: 'Recall: indigo grid in the middle', meaning: 'The 49 weights leaving the cue. Bright squares are the parts of the face it has stored.', color: '#818cf8' },
      { mark: 'Recall: white grid on the right', meaning: 'The picture that comes to mind, a.', color: '#f8fafc' },
      { mark: 'Recall: indigo circle with lines above', meaning: 'The cue, Anu’s tone, fanning out to every weight. It glows when the tone rings (p = 1).', color: '#818cf8' },
    ],
    industry: {
      setting: 'Phone and laptop makers, biometrics team for face and voice unlock',
      problem: 'A user’s face and voice change slowly: new glasses, a beard, a cold. A stored template that never changes starts to reject its own owner.',
      howUsed:
        'The device keeps a template for the owner, like the weight vector w. After an unlock that matched with high confidence, the template is moved a small fraction toward the new sample. When the match is weak, nothing changes. That is the instar idea: learn only when the neuron is active. Once the owner is recognised, the device loads that person’s whole profile from one cue, which is the outstar idea. Real products use many more features than two, but the update has the same shape.',
      goesWrong:
        'If the template is updated on doubtful matches it can drift slowly toward someone else, such as a sibling who looks alike. Teams update only after a very confident match or a correct PIN, keep the original enrolment template, and limit how far the template may move from it.',
      roles: 'Biometrics engineer, embedded ML engineer, security engineer.',
    },
    equation: 'Instar: a = hardlim(w⁰p⁰ + wᵀp + b),  Δw = α a (p − w)   Outstar: a = satlins(W⁰p⁰ + w p),  Δw = α (a − w) p',
    steps: [
      {
        kind: 'explore',
        text: 'Recognise: ring Anu\'s tone with her name on the screen and watch the arrow w, the neuron\'s weights, swing toward the arrow p, the sound. Then ring with the screen face down. Switch to Recall and teach the face in the same way.',
      },
      {
        kind: 'break',
        text: 'Use the Hebb rule with decay instead of the instar rule and let other callers ring. The neuron stays silent, yet w shrinks on every call until Anu\'s tone is forgotten.',
      },
      {
        kind: 'fix',
        text: 'Switch to the instar rule. The forgetting part is now multiplied by the output a, so w changes only when the neuron is active. Other callers leave it untouched.',
      },
      {
        kind: 'prove',
        text: 'An instar has w = [0.6, 0.8], w⁰ = 2, b = −0.9 and α = 0.5. The input p = [1, 0] arrives with p⁰ = 1. Find a and the new w. Why is the Kohonen rule called a special case?',
        answer:
          'n = 2·1 + (0.6·1 + 0.8·0) − 0.9 = 1.7, so a = hardlim(1.7) = 1. Δw = α a (p − w) = 0.5 × ([1, 0] − [0.6, 0.8]) = [0.2, −0.4], so w = [0.8, 0.4]. It moved half-way to p. The Kohonen rule is w(q) = w(q−1) + α (p − w(q−1)) for neurons chosen in some other way, for example the winner of a competition. It is the instar rule with a set to 1 for those neurons.',
      },
    ],
    theory: {
      "idea": "An instar is one neuron that learns to recognise one input vector: its weight vector turns toward the input whenever the neuron is active. An outstar is the opposite view: one cue fans out to many outputs and learns to recall a whole pattern. Together they recognise a sound and recall a face.",
      "how": [
        "Instar: compute n = w0 p0 + wᵀp + b and a = hardlim(n).",
        "If the neuron is active, move the weight vector toward the input: w = w + α a (p − w).",
        "When wᵀp is large enough the input alone fires the neuron.",
        "Outstar: when the cue p is active, move the outgoing weights toward the output pattern: w = w + α (a − w) p.",
        "Later the cue alone produces the stored pattern through satlins."
      ],
      "usedFor": [
        {
          "where": "Prototype matching",
          "example": "A keyword-spotting unit on a phone moves its template toward each confirmed utterance of the wake word"
        },
        {
          "where": "Memory recall",
          "example": "A device that recalls a stored thumbnail or settings profile from a short cue such as a user ID"
        },
        {
          "where": "Competitive learning",
          "example": "The Kohonen rule is the instar rule applied to the winner, which is how clustering networks move their prototypes"
        }
      ],
      "limits": "An instar learns only one pattern per neuron and only while it is active. An outstar recalls cleanly only if cues are separate. With overlapping inputs, patterns blur into an average. Inputs are best normalised to length 1."
    },
    complexity: {
      "parameters": "Instar: R weights + bias (+ fixed w0). Outstar: S outgoing weights per cue. This station: instar 2 learned weights; outstar 49 learned weights for the 7 × 7 face.",
      "prediction": "Instar: about R multiplications. Outstar: one multiply and add per output, about S. This station: 2 and 49.",
      "training": "One step moves each weight once: about R (instar) or S (outstar) operations, and the instar step changes nothing when a = 0. A run is trials × weights.",
      "memory": "Instar: R numbers per neuron. Outstar: S numbers per cue. Nothing else is stored.",
      "scaling": "Cost grows with the number of inputs or outputs. The practical limit is capacity: each instar holds one pattern, so recognising many patterns needs many neurons, which leads to competitive layers."
    },
    words: [
      { term: 'Instar', meaning: 'A neuron seen from its input side: a vector of inputs comes in, one output says "this is the pattern I know".' },
      { term: 'Instar rule', meaning: 'Move the weight vector a fraction α of the way toward the input, but only when the neuron is active.' },
      { term: 'Kohonen rule', meaning: 'The same move toward the input, applied to neurons picked by some other test, such as winning a competition.' },
      { term: 'Outstar', meaning: 'A neuron seen from its output side: one input fans out to many outputs and recalls a whole pattern.' },
      { term: 'Outstar rule', meaning: 'Move the weights leaving an active cue a fraction α of the way toward the current output pattern.' },
      { term: 'Normalised vector', meaning: 'A vector scaled to length 1, so only its direction matters. All such vectors lie on a circle.' },
      { term: 'satlins', meaning: 'A linear function clipped to the range −1 to 1.' },
    ],
  },
  {
    id: 'competition',
    lecture: 'Unit IV',
    title: 'Hostel Body Clocks',
    story:
      'Every dot is one hostel student: when they sleep and when they wake. Nobody has labelled them. A few neurons compete for each student, and only the closest one learns. Each tower ends up standing in the middle of one group.',
    topics: 'Hamming network, competitive layer, competitive learning, problems with competitive layers',
    color: '#22d3ee',
    takeaway: 'In a competitive layer only the closest neuron learns, so each neuron drifts to the centre of one group. A neuron that never wins never learns.',
    picture: [
      { mark: 'Floor', meaning: 'Bedtime runs across, from 10 pm to 4 am. Wake-up time runs into the screen, from 5 am to 11 am.' },
      { mark: 'Small white dots on the floor', meaning: 'Students, one dot each, placed by when they sleep and wake.', color: '#e2e8f0' },
      { mark: 'Coloured towers', meaning: 'The neurons, one colour each. A tower stands at its neuron’s weights, and its height is the share of students it has won.' },
      { mark: 'Label above each tower', meaning: 'The neuron’s number, its wins and its share of wins.' },
      { mark: 'Grey tower with a pink "dead: 0 wins" label', meaning: 'A dead neuron that has not won a single student.', color: '#475569' },
      { mark: 'Tinted floor areas', meaning: 'Each patch takes a dim shade of the tower that would win a student standing there.' },
      { mark: 'White ball with a thin white beam', meaning: 'The student being shown to the neurons right now.', color: '#ffffff' },
      { mark: 'White line from the ball to a tower', meaning: 'Joins the student to the winning neuron, which steps toward the student.' },
      { mark: 'Bars in the box at the top left', meaning: 'Each neuron’s distance to the current student. The shortest bar wins and gets a ★. With the conscience on, the bias is shown next to it.' },
    ],
    industry: {
      setting: 'Retailers and telecom operators, customer analytics team',
      problem: 'There are millions of customers and no labels saying what kind each one is. Marketing wants a few groups it can plan offers for.',
      howUsed:
        'Each customer is described by a few scaled numbers, such as visits per month, average spend and share of purchases made on discount. A clustering method such as k-means, a batch form of this competitive learning, places a fixed number of centres. Every customer belongs to the nearest centre, and analysts name each group from its centre ("frequent small baskets"). Image tools use the same idea to cut a photo down to a few colours.',
      goesWrong:
        'Results depend on the starting centres and on the number of groups chosen, and some centres end up with almost no customers, like a dead neuron. Teams run the method from several starts, compare a few group counts, move empty centres onto real customers, and check the groups with the business before using them.',
      roles: 'Data scientist, marketing analyst, CRM manager.',
    },
    equation: 'a = compet(n),  nᵢ = −‖ᵢw − p‖ + bᵢ   winner i*: ᵢ*w(q) = ᵢ*w(q−1) + α (p − ᵢ*w(q−1))',
    steps: [
      {
        kind: 'explore',
        text: 'Watch one student light up at a time. The closest tower wins, rises and takes a step toward that student. Change the number of neurons, and tap the floor to add a new group of students.',
      },
      {
        kind: 'break',
        text: 'Start one neuron far from every student. It is never the closest, so it never wins and never moves: a dead neuron. Its win count stays at 0.',
      },
      {
        kind: 'fix',
        text: 'Switch the conscience on. A neuron that wins more than its share gets a handicap (a negative bias), and a neuron that never wins gets a boost (a positive bias). The dead tower starts to win and walks into the data.',
      },
      {
        kind: 'prove',
        text: 'Weights ₁w = [0.7071, −0.7071], ₂w = [0.7071, 0.7071], ₃w = [−1, 0]. The input p = [−0.1961, 0.9806] is presented with α = 0.5. Which neuron wins and what is its new weight? Name two problems of competitive layers.',
        answer:
          'For unit-length vectors the closest neuron has the largest inner product: Wp = [−0.832, 0.555, 0.196], so neuron 2 wins. ₂w = [0.7071, 0.7071] + 0.5 × ([−0.1961, 0.9806] − [0.7071, 0.7071]) = [0.2555, 0.8438]. Problems: (1) dead neurons that start far from the data and never win; (2) the number of neurons fixes the number of clusters, so too few merge groups and too many split them; also a large α learns fast but never settles, and close clusters can be shared by one neuron.',
      },
    ],
    theory: {
      "idea": "A competitive layer has several neurons, each holding a prototype vector. For every input the closest prototype wins and only the winner moves toward the input, by the Kohonen rule. Over time each prototype settles at the centre of a group of similar inputs, with no labels.",
      "how": [
        "Show an input p to every neuron.",
        "Net input is n = −‖w − p‖ + b. The largest wins and compet gives it 1.",
        "The winner moves toward p: w = w + α (p − w).",
        "Repeat for many inputs. Prototypes drift to the cluster centres.",
        "Optionally add a conscience bias so neurons that win too often are handicapped and dead neurons get a chance."
      ],
      "usedFor": [
        {
          "where": "Customer segmentation",
          "example": "A retailer groups shoppers by basket contents with no labels, then names the groups afterwards"
        },
        {
          "where": "Image colour reduction",
          "example": "Compressing a photo to 16 colours by finding 16 prototype colours and replacing each pixel with its nearest"
        },
        {
          "where": "Sensor grouping",
          "example": "A factory groups machine vibration readings into a few normal modes, so an unusual reading stands out"
        }
      ],
      "limits": "The number of neurons fixes the number of clusters. A neuron that starts far from the data never wins and stays dead. A large α keeps prototypes jumping. Results depend on the starting weights and the order of the data, and clusters of very different size or shape are handled badly."
    },
    complexity: {
      "parameters": "S × R weights (S neurons, R inputs), plus S conscience biases if used. This station: S × 2, for example 3 × 2 = 6 weights.",
      "prediction": "Compare the input with all S prototypes: about S × R operations, then pick the largest. This station: 3 × 2 = 6 for S = 3.",
      "training": "One step does the same S × R comparison and then updates only the winner, R more operations. A run is trials × S × R, with no gradients.",
      "memory": "S × R weights, plus S win counts for the conscience.",
      "scaling": "Cost grows in a straight line with neurons, inputs and data. The practical limits are choosing S and the starting positions, and that distance becomes less useful when the number of inputs is large."
    },
    words: [
      { term: 'Prototype', meaning: 'The weight vector of a neuron. It stands for the centre of the group of inputs that the neuron wins.' },
      { term: 'Hamming network', meaning: 'A layer that scores the input against stored prototypes, followed by a layer where neurons suppress each other until one is left.' },
      { term: 'Lateral inhibition', meaning: 'Each neuron pushes the others down. The strongest survives: winner take all.' },
      { term: 'compet', meaning: 'The transfer function that gives 1 to the neuron with the largest net input and 0 to all the others.' },
      { term: 'Competitive learning', meaning: 'Only the winner learns. It moves toward the input by the Kohonen rule.' },
      { term: 'Dead neuron', meaning: 'A neuron whose prototype is so far from the data that it never wins, so it never learns.' },
      { term: 'Conscience', meaning: 'A bias that handicaps neurons that win often and helps neurons that rarely win, so every neuron gets used.' },
    ],
  },
  {
    id: 'feature-map',
    lecture: 'Unit IV',
    title: 'Delivery Hub Map',
    story:
      'A delivery company places hubs across a city. Every address should have a hub nearby. The hubs are also numbered on a roster, a grid of who works next to whom, and roster neighbours should be neighbours on the ground, so riders can cover for each other. A self-organising map learns both at once.',
    topics: 'Self-organizing feature maps, improving feature maps',
    color: '#2dd4bf',
    takeaway: 'A feature map moves the winner’s grid neighbours too, so neighbouring neurons end up covering neighbouring data. Start with a wide neighbourhood and shrink it slowly.',
    picture: [
      { mark: 'Dark square with faint streets', meaning: 'The city, 10 km by 10 km. West to east runs across, south to north runs up.' },
      { mark: 'Faint amber dots', meaning: 'Addresses that orders come from: the data.', color: '#fbbf24' },
      { mark: 'Coloured dots', meaning: 'The hubs (neurons), placed at their weights. The colour shows each hub’s place on the roster, so a twist shows up as mixed colours.' },
      { mark: 'White lines between hubs', meaning: 'Links between roster neighbours. Crossed white lines mean the map is twisted there.' },
      { mark: 'Pulsing amber dot with a white line and ring', meaning: 'The order just placed, joined to its winning hub, which has the white ring.', color: '#fbbf24' },
      { mark: 'Teal glow around hubs', meaning: 'The winner’s neighbours that learn along with it. A larger glow means a larger step.', color: '#2dd4bf' },
      { mark: 'Teal bar at the top left', meaning: 'The neighbourhood radius r. It shrinks as training goes on.', color: '#2dd4bf' },
      { mark: 'Amber bar at the top right', meaning: 'The learning rate α. It shrinks too when "Reduce α over time" is on.', color: '#fbbf24' },
      { mark: 'Small "roster" grid at the bottom right', meaning: 'The same hubs laid out in their real grid or chain. Bright cells are the hubs learning from this order.' },
    ],
    industry: {
      setting: 'Factories, power plants and analytics teams, condition monitoring and exploratory analysis',
      problem: 'Machines produce hundreds of readings a second, and analysts face tables with thousands of rows and dozens of columns. People need a picture they can read to spot what is normal and what is not.',
      howUsed:
        'Engineers train a map on months of readings from healthy running. Each region of the map is labelled by its operating state, such as start-up, full load or idling. The live state is shown as a point moving across the map, and a reading whose closest neuron is far away raises an alert for inspection. Analysts use the same kind of map to lay out customer or survey records so that similar records sit side by side.',
      goesWrong:
        'A map trained on too short a period misses normal states it never saw, such as winter running, and then raises false alarms. Teams train on data that covers every season and operating mode, review each alert with the operators, and retrain when the plant changes.',
      roles: 'Reliability engineer, condition monitoring analyst, data scientist.',
    },
    equation: 'ᵢw(q) = ᵢw(q−1) + α(q) h(i, i*) (p − ᵢw(q−1)),  h = exp(−d²(i, i*) / 2r(q)²),  r and α shrink over time',
    steps: [
      {
        kind: 'explore',
        text: 'Watch the net of hubs unfold over the orders. Change the shape of the city, switch between a grid and a chain, or draw your own demand by dragging on the map.',
      },
      {
        kind: 'break',
        text: 'Start with a tiny neighbourhood. Each hub learns alone, so roster neighbours never learn to sit near each other. The net stays tangled and the topographic error stays high.',
      },
      {
        kind: 'fix',
        text: 'Start with a large neighbourhood and shrink it slowly. First the whole net is pulled into rough order, then each hub fine-tunes. The crossings disappear.',
      },
      {
        kind: 'prove',
        text: 'Name the two phases of feature-map training and three ways to improve a feature map. What does a topographic error of 30% tell you?',
        answer:
          'Ordering phase: large neighbourhood and large α, so neighbouring neurons move together and the map untwists. Convergence phase: small neighbourhood and small α, so each prototype settles on its own region. Improvements: (1) shrink the neighbourhood during training; (2) reduce the learning rate over time; (3) give the winner a larger learning rate than its neighbours (here the Gaussian h does that). Hagan also suggests using the inner product as net input with normalised vectors. A topographic error of 30% means that for 30% of inputs the closest and second-closest neurons are not neighbours on the grid: the map is folded or twisted there.',
      },
    ],
    theory: {
      "idea": "A self-organising feature map is a competitive layer whose neurons sit on a grid. When a neuron wins, its grid neighbours also move toward the input. This pulls neighbouring neurons to neighbouring places, so the map unfolds over the data and keeps its layout.",
      "how": [
        "Place neurons on a grid (a line or a sheet) with random weights.",
        "Show an input and find the winner, the neuron with the closest weights.",
        "Move the winner and its grid neighbours toward the input: w = w + α h (p − w), where h falls with grid distance.",
        "Shrink the neighbourhood radius and α over time.",
        "Ordering phase: a wide neighbourhood untangles the map. Convergence phase: a small one fine-tunes it."
      ],
      "usedFor": [
        {
          "where": "Data exploration",
          "example": "A bank lays thousands of customer records on a 2D map so analysts can see which groups sit next to each other"
        },
        {
          "where": "Facility placement",
          "example": "Choosing delivery hub positions that cover a city while keeping neighbouring hubs on neighbouring routes"
        },
        {
          "where": "Anomaly monitoring",
          "example": "Mapping normal machine states, then flagging a reading whose closest neuron is far away"
        }
      ],
      "limits": "A neighbourhood that starts too small, or shrinks too fast, leaves a twisted map. A grid that does not match the shape of the data folds or leaves empty neurons. The map is a picture of the data, not proof of structure, and the settings need tuning."
    },
    complexity: {
      "parameters": "S × R weights for a grid of S neurons and R inputs. This station: 7 × 7 grid = 49 neurons × 2 = 98 weights; the chain has 30 × 2 = 60.",
      "prediction": "Find the closest of S prototypes: about S × R operations. This station: 98.",
      "training": "One step finds the winner (S × R) and then updates every neuron inside the neighbourhood: up to S × R more operations early on, about R at the end. A run is trials × S × R.",
      "memory": "S × R weights and the grid positions. The data does not need to be kept.",
      "scaling": "Cost grows with the number of neurons and trials. Larger maps need more trials to order, and the early wide neighbourhood is the expensive part. Mapping many inputs onto a 2D grid loses information."
    },
    words: [
      { term: 'Feature map', meaning: 'A competitive layer whose neurons sit on a grid, trained so that neighbours on the grid respond to nearby inputs.' },
      { term: 'Neighbourhood', meaning: 'The neurons within grid distance r of the winner. They learn along with the winner.' },
      { term: 'Topology', meaning: 'Who is next to whom. A good map keeps it: close inputs go to close neurons.' },
      { term: 'Quantisation error', meaning: 'Average distance from an input to its closest prototype. Small means every address has a hub nearby.' },
      { term: 'Topographic error', meaning: 'Share of inputs whose two closest prototypes are not grid neighbours. Small means the map is not twisted.' },
      { term: 'Ordering and convergence', meaning: 'The two phases of training: first untangle with a large neighbourhood, then fine-tune with a small one.' },
    ],
  },
  {
    id: 'lvq',
    lecture: 'Unit IV',
    title: 'Two Kinds of Spam',
    story:
      'Spam is not one thing. Promotions are full of links. Scams SHOUT in capitals. Genuine mail also comes in two kinds. Each message is a dot: links on one axis, share of capitals on the other. This time every dot has a label, and the network uses it.',
    topics: 'Learning vector quantization, LVQ learning',
    color: '#60a5fa',
    takeaway: 'LVQ uses labels: the closest prototype moves toward a message of its own class and away from one of the other class. A class made of several separate groups needs several prototypes.',
    picture: [
      { mark: 'Axes', meaning: 'Number of links in the message (across) and share of capital letters (up).' },
      { mark: 'Blue dots', meaning: 'Genuine messages.', color: '#38bdf8' },
      { mark: 'Rose dots', meaning: 'Spam messages.', color: '#fb7185' },
      { mark: 'Faint group names', meaning: 'The four kinds of mail: friends and newsletters are genuine, promotions and scams are spam.' },
      { mark: 'Numbered diamonds', meaning: 'The prototypes, one per subclass, in the colour of the class they belong to.' },
      { mark: 'Blue and rose shading', meaning: 'The answer the network gives for a message at that spot: genuine or spam.' },
      { mark: 'White ring', meaning: 'The labelled message being shown right now.', color: '#f8fafc' },
      { mark: 'Dashed white line', meaning: 'Joins the message to the closest prototype, the winner.' },
      { mark: 'Green arrow', meaning: 'The winner’s class matches the label, so it steps toward the message.', color: '#34d399' },
      { mark: 'Red arrow', meaning: 'The winner’s class is wrong, so it steps away from the message.', color: '#f87171' },
      { mark: 'Dashed green arrow', meaning: 'LVQ2 only: the closest prototype of the right class is also pulled toward the message.', color: '#34d399' },
      { mark: 'W² table at the top right', meaning: 'Which subclass belongs to which class. A 1 means "this prototype counts as this class".' },
    ],
    industry: {
      setting: 'Medical device makers, banks and insurers, teams whose models must be easy to inspect',
      problem: 'Doctors, auditors and regulators want to see why a model gave its answer, not just the answer.',
      howUsed:
        'The classifier keeps a small number of labelled prototypes per class, and a new case gets the class of its nearest prototype. Each prototype is a typical case that an expert can look at, such as a typical normal heartbeat or two typical kinds of abnormal beat. The explanation for any decision is simple: it looked most like this prototype. A small device can also store a few prototypes far more cheaply than thousands of examples.',
      goesWrong:
        'Distance treats every input the same, so an input measured in large numbers swamps the others, and a class with more kinds than prototypes is partly misclassified. Teams scale every input first, give each known subtype its own prototypes, and have a domain expert check that each prototype looks like a real case.',
      roles: 'Data scientist, clinical or domain expert, model validation analyst.',
    },
    equation: 'a¹ = compet(−‖ᵢw¹ − p‖),  a² = W²a¹   right class: ᵢ*w¹ += α (p − ᵢ*w¹)   wrong class: ᵢ*w¹ −= α (p − ᵢ*w¹)',
    steps: [
      {
        kind: 'explore',
        text: 'Each diamond is a prototype: a point that stands for one subclass of mail. The closest one wins. If its class matches the label it steps toward the message (green), otherwise it steps away (red). The shading shows what the network would say everywhere.',
      },
      {
        kind: 'break',
        text: 'Give each class a single prototype. One point cannot sit in two separate clusters, so each prototype ends up in the middle, where there is no mail of its class at all.',
      },
      {
        kind: 'fix',
        text: 'Give each class two subclasses. The second layer W² joins them back into one class. Then try "Bad start": one prototype is stuck behind the wrong class, and LVQ2 rescues it.',
      },
      {
        kind: 'prove',
        text: 'Prototypes ₁w = [−0.543, 0.840], ₂w = [−0.969, −0.249] (class 1), ₃w = [0.997, 0.094], ₄w = [0.456, 0.954] (class 2). The input p = [1, −1] of class 2 is presented with α = 0.5. Find the winner and its new weight. What if p had been class 1?',
        answer:
          'Distances: 2.40, 2.11, 1.09, 2.03, so neuron 3 wins. a² = W²a¹ gives class 2, which is correct, so it moves toward p: ₃w = [0.997, 0.094] + 0.5 × ([1, −1] − [0.997, 0.094]) = [0.998, −0.453]. If p had been class 1 the winner would be wrong and would move away: ₃w = [0.997, 0.094] − 0.5 × [0.003, −1.094] = [0.996, 0.641]. LVQ2 would in addition move the closest class 1 prototype (neuron 2) toward p.',
      },
    ],
    theory: {
      "idea": "Learning vector quantization adds labels to a competitive layer. Each prototype belongs to a class. The closest prototype wins and moves toward the input if its class is right, or away if it is wrong. A class with several separate clusters gets several prototypes.",
      "how": [
        "Layer 1 holds subclass prototypes; the fixed matrix W² joins subclasses into classes.",
        "Find the closest prototype to the labelled input.",
        "Read its class through W².",
        "If correct: w = w + α (p − w). If wrong: w = w − α (p − w).",
        "LVQ2 also pulls the closest prototype of the right class toward the input when the winner is wrong."
      ],
      "usedFor": [
        {
          "where": "Spam and fraud screening",
          "example": "Prototypes for several distinct kinds of scam message, each labelled as spam, so a new message is judged by its nearest one"
        },
        {
          "where": "Medical signal classes",
          "example": "Classifying heartbeat traces into normal and abnormal types using a handful of prototype traces"
        },
        {
          "where": "Compact classifiers",
          "example": "Replacing thousands of stored examples by a few prototypes so a small device can classify by nearest match"
        }
      ],
      "limits": "You must choose how many prototypes each class gets. A prototype that starts in the wrong place can get stuck. Classes that overlap heavily are only partly separable, and distance on raw inputs needs scaling to be meaningful."
    },
    complexity: {
      "parameters": "S¹ × R learned weights; W² (S² × S¹) is fixed 0/1. This station: 4 × 2 = 8 learned weights at two subclasses per class.",
      "prediction": "Distance to each of S¹ prototypes, about S¹ × R operations, then a lookup through W². This station: 8.",
      "training": "One step does the S¹ × R comparison and moves one prototype (R operations), or two with LVQ2. A run is trials × S¹ × R.",
      "memory": "S¹ × R prototype values and the class of each prototype.",
      "scaling": "Cost grows in a straight line with prototypes and inputs. Accuracy needs enough prototypes per class to cover each separate region of that class; more regions mean more prototypes."
    },
    words: [
      { term: 'LVQ', meaning: 'Learning vector quantization: a competitive layer followed by a linear layer, trained with labelled data.' },
      { term: 'Subclass', meaning: 'One neuron of the first layer. It covers one cluster. A class can own several subclasses.' },
      { term: 'W²', meaning: 'A fixed matrix of 0s and 1s that says which subclass belongs to which class.' },
      { term: 'Decision region', meaning: 'The area of the input space in which the network gives the same answer.' },
      { term: 'Supervised', meaning: 'Learning that uses a target t for every input. Hebb, competitive layers and feature maps do not; LVQ does.' },
      { term: 'LVQ2', meaning: 'An improved rule: when the winner is wrong, also pull the closest prototype of the right class toward the input.' },
    ],
  },
  {
    id: 'rbf-hills',
    lecture: 'Unit IV',
    title: 'Power Demand Hills',
    story:
      'The hostel\'s power demand rises in the morning, dips in the afternoon and peaks at night. A radial basis network builds that curve out of hills. Each hidden neuron is one hill around its centre, and the output adds the hills up.',
    topics: 'Radial basis network, function approximation, pattern classification, training RBF networks, clustering',
    color: '#a78bfa',
    takeaway: 'An RBF network builds a curve by adding up local hills. Choose the spread so neighbouring hills overlap: too narrow fails between the data, too wide loses the detail.',
    picture: [
      { mark: 'Thick grey curve', meaning: 'The real power demand through the day, which the network should match.', color: '#94a3b8' },
      { mark: 'Orange dots', meaning: 'Meter readings: the training data. There are more of them around the morning and night peaks.', color: '#fb923c' },
      { mark: 'Coloured shaded hills', meaning: 'One hidden neuron each, multiplied by its output weight. A hill below the zero line has a negative weight.' },
      { mark: 'Dashed light line', meaning: 'The output bias b², which lifts or lowers the whole sum.' },
      { mark: 'Glowing white curve', meaning: 'The network’s output: all the hills added up, plus the bias.', color: '#f5f3ff' },
      { mark: 'Triangles under the chart', meaning: 'The centres, one per hill in the same colour. Drag one to move its hill.' },
      { mark: 'White outline and white bar on one hill', meaning: 'The picked hill: the bar shows its spread either side of the centre, and the label gives its weight.' },
      { mark: 'Red message at the top', meaning: 'The hills have huge weights that cancel each other and have left the chart.', color: '#fb7185' },
      { mark: 'Classify: green dots', meaning: 'Spots on the hostel floor with a strong phone signal.', color: '#34d399' },
      { mark: 'Classify: red dots', meaning: 'Spots with a weak signal, in a ring around the router.', color: '#fb7185' },
      { mark: 'Classify: green and red shading', meaning: 'The network’s answer at each spot. Deeper shading means a larger output.' },
      { mark: 'Classify: coloured dots with dashed circles', meaning: 'The centres seen from above. The circle’s radius is the spread and the number above is the output weight w².' },
    ],
    industry: {
      setting: 'Engineering firms and control teams, plus data science teams that use kernel methods',
      problem: 'Engineers need a smooth, fast model of a measured relationship, such as an engine’s response to its settings, from a limited number of costly tests.',
      howUsed:
        'Design teams fit an RBF model to the results of a few dozen expensive tests or simulations, then search that cheap model for good settings before running the next test. Control engineers add Gaussian basis functions to a controller so it can learn a correction for effects such as friction that the physics model misses. The same Gaussian hill is the most common kernel in support vector machines and Gaussian process models.',
      goesWrong:
        'A spread chosen by eye gives a model that is spiky or blurred, and the model is trusted outside the range of the tests, where every hill has faded to zero. Teams pick the spread by checking error on held-back test points and flag any request that falls outside the tested range.',
      roles: 'Control engineer, simulation engineer, data scientist.',
    },
    equation: 'a¹ᵢ = exp(−(‖p − ᵢw¹‖ b¹ᵢ)²),  a² = W²a¹ + b²   two stages: centres by clustering, then x* = (UᵀU + ρI)⁻¹Uᵀt',
    steps: [
      {
        kind: 'explore',
        text: 'Drag a triangle to move a centre, and use the slider to change the spread. Each coloured hill is one neuron times its output weight; the white curve is their sum. Then try the two training stages, and "Classify signal spots".',
      },
      {
        kind: 'break',
        text: 'Make the hills very narrow. The curve still passes through the readings, but between them it collapses. The error at the readings is small and the error between them is large.',
      },
      {
        kind: 'fix',
        text: 'Set the spread to about the gap between centres, so neighbouring hills overlap. Try a very wide spread too: the hills blur together and the fit loses its detail.',
      },
      {
        kind: 'prove',
        text: 'A network has centres at −1 and 1, both biases b¹ = 2, W² = [1 1] and b² = 0. Find the output at p = 0. Then explain why its second layer can be trained in one shot, and how its hidden units differ from the S-shaped tansig units of a multilayer network.',
        answer:
          'Each hidden neuron: n = ‖0 − (±1)‖ × 2 = 2, a¹ = exp(−2²) = exp(−4) = 0.0183. Output a² = 0.0183 + 0.0183 = 0.0366: almost zero, because these hills are too narrow to reach the middle. With centres and biases fixed, a² is linear in W² and b², so the squared error is a quadratic bowl with one minimum, found by linear least squares. A tansig neuron responds across half of the input space (global), so every weight affects the fit everywhere. A radial basis neuron responds only near its centre (local): training is fast and changes stay local, but covering a high-dimensional input needs many hills.',
      },
    ],
    theory: {
      "idea": "A radial basis network has hidden neurons that each respond to inputs near their own centre, like a hill. The output layer is a weighted sum of the hills. The curve it draws is the sum of local bumps, so training can place the hills first and then solve the weights in one step.",
      "how": [
        "Hidden neuron i computes a¹ = exp(−(‖p − w‖ b)²): 1 at its centre and near 0 far away.",
        "The output is a² = W² a¹ + b², a linear sum of the hills.",
        "Stage 1: place the centres, for example by clustering the inputs with the competitive layer.",
        "Stage 2: with centres and spreads fixed, solve W² and b² by linear least squares in one shot.",
        "For classification, use the sign of a² (or one output per class)."
      ],
      "usedFor": [
        {
          "where": "Demand forecasting",
          "example": "Fitting a smooth daily electricity demand curve to meter readings for a campus"
        },
        {
          "where": "Sensor calibration",
          "example": "Mapping a nonlinear sensor reading to a true value with a few local bumps"
        },
        {
          "where": "Pattern classification",
          "example": "Separating one class that sits inside a ring of another, which no single line can split"
        }
      ],
      "limits": "Spread too narrow gives a spiky fit that fails between data points. Spread too wide blurs the fit and needs huge cancelling weights. Too few centres cannot follow the curve. Covering many inputs needs very many centres, and the network cannot extrapolate beyond its hills."
    },
    complexity: {
      "parameters": "S × R centres + S biases b¹ + S weights W² + 1 bias b². This station: S = 6, R = 1 gives 6 + 6 + 6 + 1 = 19; the classifier with R = 2 gives 25.",
      "prediction": "S distances (S × R operations), S exponentials, S multiplications. This station: 6 hills, about 18 operations.",
      "training": "Stage 2 is one least-squares solve: about S² × Q + S³ operations, with no iterations (Q = number of readings). Stage 1 clustering costs about S × R per input shown. This station: roughly 7² × 44 ≈ 2,200 plus 7³ ≈ 340 operations.",
      "memory": "Centres, biases and weights (about S × (R + 2) numbers), plus the S × S matrix during the solve.",
      "scaling": "Cost grows with the number of hills and readings, and the S³ term bites at thousands of hills. The number of centres needed to cover the input space grows very quickly with the number of inputs, which limits RBF networks to a few inputs."
    },
    words: [
      { term: 'Radial basis function', meaning: 'A hill-shaped function of the distance from a centre: 1 at the centre, falling to 0 far away.' },
      { term: 'Centre', meaning: 'The first-layer weight vector of a hidden neuron. The neuron responds most when the input is exactly here.' },
      { term: 'Spread', meaning: 'How wide a hill is. The bias is b = 1/spread: a large bias means a narrow hill.' },
      { term: 'Two-stage training', meaning: 'First place the centres without using targets, for example by clustering. Then solve the linear output layer.' },
      { term: 'Linear least squares', meaning: 'Finding the weights of a linear layer that minimise the squared error by solving one set of equations.' },
      { term: 'Local and global', meaning: 'A hill responds only near its centre (local). A sigmoid responds over half of the input space (global).' },
    ],
  },
]
