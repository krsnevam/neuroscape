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
    }),
    {
      name: 'neuroscape',
      partialize: (s) => ({ quality: s.quality, visited: s.visited }),
    },
  ),
)
