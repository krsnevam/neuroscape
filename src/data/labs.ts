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
