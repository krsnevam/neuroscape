export interface World {
  id: string
  number: number
  title: string
  unit: string
  topics: string
  breakFix: string
  color: string
  path: string
}

export const worlds: World[] = [
  {
    id: 'neuron-lab',
    number: 1,
    title: 'Neuron Lab',
    unit: 'Unit 1',
    topics: 'AI basics, neuron model, architectures, Hamming, Hopfield',
    breakFix: 'Overload a Hopfield memory until recall fails',
    color: '#f472b6',
    path: '/world/neuron-lab',
  },
  {
    id: 'perceptron',
    number: 2,
    title: 'Perceptron Arena',
    unit: 'Unit 2',
    topics: 'Perceptron rule, convergence, Hebb, pseudoinverse',
    breakFix: 'The XOR room: no plane can separate it',
    color: '#fbbf24',
    path: '/world/perceptron',
  },
  {
    id: 'error-valley',
    number: 3,
    title: 'Error Valley',
    unit: 'Unit 3',
    topics: 'ADALINE, LMS, adaptive filtering, backpropagation',
    breakFix: 'Raise α until the ball flies off; add momentum',
    color: '#34d399',
    path: '/world/error-valley',
  },
  {
    id: 'competitive',
    number: 4,
    title: 'Competitive City',
    unit: 'Unit 4',
    topics: 'Hebbian, instar/outstar, competitive layers, SOM, LVQ, RBF',
    breakFix: 'Dead neurons that never win; add a conscience',
    color: '#38bdf8',
    path: '/world/competitive',
  },
  {
    id: 'factory',
    number: 5,
    title: 'Model Factory',
    unit: 'Unit 5',
    topics: 'Pre-training, training, post-training, case studies',
    breakFix: 'Biased data, overfitting and extrapolation',
    color: '#a78bfa',
    path: '/world/factory',
  },
]
