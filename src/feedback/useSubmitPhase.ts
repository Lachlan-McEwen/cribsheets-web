import { useCallback, useEffect, useRef, useState } from 'react'

export type SubmitPhase = 'idle' | 'busy' | 'saved'

const SAVED_MS = 2500

export function submitButtonLabel(phase: SubmitPhase, idleLabel: string): string {
  if (phase === 'busy') return 'Saving…'
  if (phase === 'saved') return 'Saved'
  return idleLabel
}

export function useSubmitPhase() {
  const [phase, setPhase] = useState<SubmitPhase>('idle')
  const savedTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (savedTimerRef.current !== null) {
        window.clearTimeout(savedTimerRef.current)
      }
    }
  }, [])

  const start = useCallback(() => {
    if (savedTimerRef.current !== null) {
      window.clearTimeout(savedTimerRef.current)
      savedTimerRef.current = null
    }
    setPhase('busy')
  }, [])

  const succeed = useCallback(() => {
    setPhase('saved')
    savedTimerRef.current = window.setTimeout(() => {
      setPhase('idle')
      savedTimerRef.current = null
    }, SAVED_MS)
  }, [])

  const fail = useCallback(() => {
    if (savedTimerRef.current !== null) {
      window.clearTimeout(savedTimerRef.current)
      savedTimerRef.current = null
    }
    setPhase('idle')
  }, [])

  const label = useCallback((idleLabel: string) => submitButtonLabel(phase, idleLabel), [phase])

  return { phase, start, succeed, fail, label }
}
