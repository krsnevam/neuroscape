/** A station: one hands-on scene inside a world, built on an everyday example. */

export type StepKind = 'explore' | 'break' | 'fix' | 'prove'

export interface LabStep {
  kind: StepKind
  text: string
  /** Prove steps: the answer, revealed on request */
  answer?: string
}

export interface Lab {
  id: string
  /** Short tag shown before the title, e.g. 'L35' or 'Unit I' */
  lecture: string
  title: string
  /** The everyday situation this station is built on */
  story: string
  /** Syllabus topics the station covers */
  topics: string
  color: string
  steps: LabStep[]
  /** The one sentence to remember, shown in bold under the story */
  takeaway?: string
  /** A key to the picture: every mark, line and colour on the scene and what it means. Shown under "Read the picture". */
  picture?: PictureKey[]
  /** How this exact idea is used at work today. Shown under "In industry". */
  industry?: LabIndustry
  /** The neural network inside the station, spelled out. Shown under "ANN inside". */
  network?: LabNetwork
  /** Finer points that separate knowing the idea from using it well. Shown under "Nuances". */
  nuances?: LabNuance[]
  /** Notes for a tutor presenting the station to a class. Shown in tutor mode. */
  tutor?: LabTutor
  /** Terms a first-time learner needs, in plain words. Shown under "Words to know". */
  words?: { term: string; meaning: string }[]
  /** The governing equation(s) in Hagan notation, shown under the story */
  equation?: string
  /** The theory behind the station, written for a first-time learner. Shown under "Theory". */
  theory?: LabTheory
  /** What the model costs to store, run and train, and how that grows. Shown under "Complexity". */
  complexity?: LabComplexity
}

export interface LabTheory {
  /** The model or concept in two to four plain sentences */
  idea: string
  /** How it works, as three to five ordered steps */
  how: string[]
  /** Real situations where this is used today: where, and a concrete example */
  usedFor: { where: string; example: string }[]
  /** When it fails or should not be used */
  limits: string
}

export interface LabComplexity {
  /** Number of weights and biases: the formula, then the number for this station */
  parameters: string
  /** Work for one prediction (forward pass), with the count for this station */
  prediction: string
  /** Work for one training step and for a full training run */
  training: string
  /** What must be kept in memory */
  memory: string
  /** What happens as inputs, neurons or data grow, and the practical limit */
  scaling: string
}

export const stepLabels: Record<StepKind, string> = {
  explore: 'Explore',
  break: 'Break',
  fix: 'Fix',
  prove: 'Prove',
}

export interface PictureKey {
  /** The mark as the learner sees it, e.g. "Blue dots" or "Thick grey curve" */
  mark: string
  /** What it means, in one plain sentence */
  meaning: string
  /** Optional swatch colour for the mark */
  color?: string
}

export interface LabIndustry {
  /** The kind of organisation and team, e.g. "Food delivery apps, delivery-time team" */
  setting: string
  /** The everyday business problem they face */
  problem: string
  /** How this station's idea is used to solve it, step by step in prose */
  howUsed: string
  /** A realistic way it goes wrong in practice, and what the team does about it */
  goesWrong: string
  /** Job titles of the people who do this work */
  roles: string
}

export interface LabNetwork {
  /** Layers, sizes and transfer functions, e.g. "2-6-1: 2 inputs, 6 tansig neurons, 1 logsig output" */
  architecture: string
  /** One forward pass in Hagan notation, with what each symbol is here */
  forward: string
  /** The performance function and the learning rule that changes the weights */
  learning: string
  /** Why this network was chosen for this problem, and what else could do the job */
  choices: string
}

export interface LabNuance {
  /** The point, as a short statement */
  point: string
  /** Why it is true and why it matters */
  detail: string
  /** Something to do in this station that shows it */
  tryIt?: string
}

export interface LabTutor {
  /** Suggested minutes for the station in class */
  minutes: number
  /** A question or scene to open with, before touching the station */
  opener: string
  /** For each mission step: what to say and what to ask the class */
  steps: Partial<Record<StepKind, { say: string; ask: string }>>
  /** Wrong ideas students commonly hold, each with the correction */
  misconceptions: { wrong: string; right: string }[]
  /** One or two sentences to close with, linking to what comes next */
  close: string
}
