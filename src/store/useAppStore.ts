import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Quality = 'low' | 'high'

interface AppState {
  /** Render quality; 'low' targets cheap Android phones */
  quality: Quality
  setQuality: (q: Quality) => void
  /** World currently hovered/focused in the hub */
  focusedWorld: string | null
  setFocusedWorld: (id: string | null) => void
  /** Worlds the student has entered at least once */
  visited: string[]
  markVisited: (id: string) => void
  /** Factory stations whose Prove step the student has completed */
  doneLabs: string[]
  markLabDone: (id: string) => void
  /** Best monthly profit reached in the Model Factory mission, in rupees */
  missionBest: number | null
  recordMission: (profit: number) => void
  /** Tutor mode shows presenter notes on every station and in the mission */
  tutorMode: boolean
  setTutorMode: (on: boolean) => void
}

const defaultQuality = (): Quality => {
  if (typeof navigator === 'undefined') return 'high'
  const mobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
  const cores = navigator.hardwareConcurrency ?? 4
  return mobile && cores <= 8 ? 'low' : 'high'
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      quality: defaultQuality(),
      setQuality: (quality) => set({ quality }),
      focusedWorld: null,
      setFocusedWorld: (focusedWorld) => set({ focusedWorld }),
      visited: [],
      markVisited: (id) =>
        set((s) => (s.visited.includes(id) ? s : { visited: [...s.visited, id] })),
      doneLabs: [],
      markLabDone: (id) =>
        set((s) => (s.doneLabs.includes(id) ? s : { doneLabs: [...s.doneLabs, id] })),
      tutorMode: false,
      setTutorMode: (tutorMode) => set({ tutorMode }),
      missionBest: null,
      recordMission: (profit) =>
        set((s) => (s.missionBest === null || profit > s.missionBest ? { missionBest: profit } : s)),
    }),
    {
      name: 'neuroscape',
      partialize: (s) => ({ quality: s.quality, visited: s.visited, doneLabs: s.doneLabs, missionBest: s.missionBest, tutorMode: s.tutorMode }),
    },
  ),
)
