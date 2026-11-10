/** World 4, Competitive City: Unit IV stations, each built on an everyday example. */
import type { Lab } from './labs'

export const competitiveLabs: Lab[] = [
  {
    id: 'pavlov',
    lecture: 'Unit IV',
    title: 'Filter Coffee Reflex',
    story:
      'The smell of filter coffee makes your mouth water. Nobody taught you that. The steel tumbler it comes in means nothing at first. One neuron learns to link the two, with no teacher and no targets.',
    topics: 'Simple associative network, unsupervised Hebb rule, Hebb rule with decay',
    color: '#38bdf8',
    equation: 'a = hardlim(w⁰p⁰ + w p + b)   Hebb: w(q) = w(q−1) + α a(q) p(q)   with decay: … − γ w(q−1),  w_max = α/γ',
    steps: [
      {
        kind: 'explore',
        text: 'Tap "Empty tumbler only" on a fresh network: nothing happens. Now tap "Coffee in the tumbler" once, then the empty tumbler again. Read the weight on the chart after each tap.',
      },
      {
        kind: 'break',
        text: 'Let the college days run with no decay. Every day that smell and sight come together adds α to the weight. Watch the chart: the line never levels off.',
      },
      {
        kind: 'fix',
        text: 'Switch decay on. The weight now settles at α/γ. Then switch to "Holidays" and watch the price: with nothing presented, the weight fades and the link is forgotten.',
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
      'Your phone rings in your pocket. From the sound alone you know it is Anu, and her face comes to mind. The first half is an instar: many inputs, one neuron that recognises a vector. The second half is an outstar: one cue that recalls a whole pattern.',
    topics: 'Simple recognition network, instar rule, Kohonen rule, simple recall network, outstar rule',
    color: '#818cf8',
    equation: 'Instar: a = hardlim(w⁰p⁰ + wᵀp + b),  Δw = α a (p − w)   Outstar: a = satlins(W⁰p⁰ + w p),  Δw = α (a − w) p',
    steps: [
      {
        kind: 'explore',
        text: 'Recognise: ring Anu\'s tone with her name on the screen and watch the weight vector w swing toward the sound p. Then ring with the screen face down. Switch to Recall and teach the face in the same way.',
      },
      {
        kind: 'break',
        text: 'Use the Hebb rule with decay instead of the instar rule and let other callers ring. The neuron stays silent, yet w shrinks on every call until Anu\'s tone is forgotten.',
      },
      {
        kind: 'fix',
        text: 'Switch to the instar rule. The decay is now multiplied by a, so w changes only when the neuron is active. Other callers leave it untouched.',
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
        text: 'Switch the conscience on. A neuron that wins more than its share gets a negative bias, and a neuron that never wins gets a positive one. The dead tower starts to win and walks into the data.',
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
      'A delivery company places hubs across a city. Every address should have a hub nearby, and hubs that are neighbours on the roster should be neighbours on the ground, so riders can cover for each other. A self-organising map learns both at once.',
    topics: 'Self-organizing feature maps, improving feature maps',
    color: '#2dd4bf',
    equation: 'ᵢw(q) = ᵢw(q−1) + α(q) h(i, i*) (p − ᵢw(q−1)),  h = exp(−d²(i, i*) / 2r(q)²),  r and α shrink over time',
    steps: [
      {
        kind: 'explore',
        text: 'Watch the net of hubs unfold over the orders. Change the shape of the city, switch between a grid and a chain, or draw your own demand by dragging on the map.',
      },
      {
        kind: 'break',
        text: 'Start with a tiny neighbourhood. Each hub learns alone, so the roster order is never built. The net stays tangled and the topographic error stays high.',
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
    equation: 'a¹ = compet(−‖ᵢw¹ − p‖),  a² = W²a¹   right class: ᵢ*w¹ += α (p − ᵢ*w¹)   wrong class: ᵢ*w¹ −= α (p − ᵢ*w¹)',
    steps: [
      {
        kind: 'explore',
        text: 'Each diamond is a subclass prototype. The closest one wins. If its class matches the label it steps toward the message (green), otherwise it steps away (red). The shading shows what the network would say everywhere.',
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
    equation: 'a¹ᵢ = exp(−(‖p − ᵢw¹‖ b¹ᵢ)²),  a² = W²a¹ + b²   two stages: centres by clustering, then x* = (UᵀU + ρI)⁻¹Uᵀt',
    steps: [
      {
        kind: 'explore',
        text: 'Drag a triangle to move a centre and change the spread. Each coloured hill is one neuron times its output weight; the white curve is their sum. Then try the two training stages, and the Classify mode.',
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
        text: 'A network has centres at −1 and 1, both biases b¹ = 2, W² = [1 1] and b² = 0. Find the output at p = 0. Then explain why its second layer can be trained in one shot, and how its hidden units differ from tansig units.',
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
