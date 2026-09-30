import type { CribPenalty } from '../../lib/timesheet-export/legacy-types.ts'

export function resetCribBreakVisibility(crib: CribPenalty): CribPenalty {
  const breaks = crib.breaks ?? []
  let foundBlank = false
  const next = breaks.map((brk) => {
    if (foundBlank) {
      return { broken: null, restarted: null, hidden: true as const }
    }
    const empty = !brk.broken && !brk.restarted
    if (empty) {
      foundBlank = true
      return { ...brk, hidden: false as const }
    }
    return { ...brk, hidden: false as const }
  })
  return { ...crib, breaks: next }
}

export type CribBreakRow = NonNullable<CribPenalty['breaks']>[number] & { hidden?: boolean }
