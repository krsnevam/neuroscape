/** Optional introduction for a world's floor: what the world is for and how it maps to real work. */
export interface WorldIntro {
  /** Button label on the floor */
  button: string
  title: string
  /** Two or three plain sentences */
  lead: string
  /** Ordered stages; each names the stations that practise it */
  stages: { name: string; question: string; stations: string[]; roles: string; note?: string }[]
  /** Closing note shown under the stages */
  footer?: string
}

export const worldIntros: Record<string, WorldIntro> = {
  factory: {
    button: 'How this works in industry',
    title: 'From data to a model people can trust',
    lead:
      'In industry, the network itself is a small part of the job. Most of the work is choosing the data, preparing it, training carefully, judging the result honestly and watching it after launch. Each station in this world practises one stage of that work on an everyday example.',
    stages: [
      {
        name: 'Collect the right data',
        question: 'Does the data cover every situation the model will face, or only the easy ones?',
        stations: ['traffic'],
        roles: 'Data engineer, data scientist',
      },
      {
        name: 'Prepare the inputs',
        question: 'Are the inputs scaled, cleaned and turned into features that mean the same thing every time?',
        stations: ['sensor', 'doodle'],
        roles: 'Data scientist, domain engineer',
      },
      {
        name: 'Choose and train the network',
        question: 'How big a network, which training algorithm, what learning rate, and when to stop?',
        stations: ['valley'],
        roles: 'ML engineer',
      },
      {
        name: 'Judge it honestly',
        question: 'Which mistakes cost the most, and which threshold balances them?',
        stations: ['fraud'],
        roles: 'Data scientist with the business owner',
      },
      {
        name: 'Check it works on new cases',
        question: 'Is it learning the pattern or memorising the examples, and where must it not be trusted?',
        stations: ['battery'],
        roles: 'Data scientist, ML engineer',
      },
      {
        name: 'Solve the four kinds of industry problem',
        question: 'Is this a probability, a recognition, a grouping or a forecast problem? Each needs a different network and a different check.',
        stations: ['cricket', 'doodle', 'colours', 'wave'],
        roles: 'The whole team',
      },
      {
        name: 'Launch and keep watching',
        question: 'Has the world changed since the data was collected? When should the model be retrained?',
        stations: [],
        roles: 'MLOps engineer, product owner',
        note: 'No station yet. In practice teams track live error every day and retrain when it drifts, as described under "In industry" on several stations.',
      },
    ],
    footer: 'Open any station and press "In industry" under its story for a full case: the problem, how the idea is used, how it goes wrong and who does the work.',
  },
}
