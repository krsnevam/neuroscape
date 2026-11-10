/**
 * Transfer functions, named as in Hagan et al., "Neural Network Design" (Table 2.1).
 * a = f(n)
 */
export type TransferName =
  | 'hardlim'
  | 'hardlims'
  | 'purelin'
  | 'satlin'
  | 'satlins'
  | 'logsig'
  | 'tansig'
  | 'poslin'

export interface TransferFn {
  name: TransferName
  label: string
  /** a = f(n) */
  f: (n: number) => number
  /** df/dn, used by backpropagation. Step functions return 0. */
  df: (n: number) => number
  /** Equation as text, Hagan notation */
  equation: string
}

const logsig = (n: number) => 1 / (1 + Math.exp(-n))
// Hagan's tansig: (e^n - e^-n)/(e^n + e^-n), identical to tanh
const tansig = (n: number) => Math.tanh(n)

export const transferFns: Record<TransferName, TransferFn> = {
  hardlim: {
    name: 'hardlim',
    label: 'Hard Limit',
    f: (n) => (n >= 0 ? 1 : 0),
    df: () => 0,
    equation: 'a = 0 if n < 0;  a = 1 if n ≥ 0',
  },
  hardlims: {
    name: 'hardlims',
    label: 'Symmetrical Hard Limit',
    f: (n) => (n >= 0 ? 1 : -1),
    df: () => 0,
    equation: 'a = −1 if n < 0;  a = +1 if n ≥ 0',
  },
  purelin: {
    name: 'purelin',
    label: 'Linear',
    f: (n) => n,
    df: () => 1,
    equation: 'a = n',
  },
  satlin: {
    name: 'satlin',
    label: 'Saturating Linear',
    f: (n) => (n < 0 ? 0 : n > 1 ? 1 : n),
    df: (n) => (n >= 0 && n <= 1 ? 1 : 0),
    equation: 'a = 0 if n < 0;  a = n if 0 ≤ n ≤ 1;  a = 1 if n > 1',
  },
  satlins: {
    name: 'satlins',
    label: 'Symmetric Saturating Linear',
    f: (n) => (n < -1 ? -1 : n > 1 ? 1 : n),
    df: (n) => (n >= -1 && n <= 1 ? 1 : 0),
    equation: 'a = −1 if n < −1;  a = n if −1 ≤ n ≤ 1;  a = 1 if n > 1',
  },
  logsig: {
    name: 'logsig',
    label: 'Log-Sigmoid',
    f: logsig,
    df: (n) => {
      const a = logsig(n)
      return a * (1 - a)
    },
    equation: 'a = 1 / (1 + e⁻ⁿ)',
  },
  tansig: {
    name: 'tansig',
    label: 'Hyperbolic Tangent Sigmoid',
    f: tansig,
    df: (n) => {
      const a = tansig(n)
      return 1 - a * a
    },
    equation: 'a = (eⁿ − e⁻ⁿ) / (eⁿ + e⁻ⁿ)',
  },
  poslin: {
    name: 'poslin',
    label: 'Positive Linear',
    f: (n) => (n < 0 ? 0 : n),
    df: (n) => (n < 0 ? 0 : 1),
    equation: 'a = 0 if n < 0;  a = n if n ≥ 0',
  },
}

export const transferNames = Object.keys(transferFns) as TransferName[]
