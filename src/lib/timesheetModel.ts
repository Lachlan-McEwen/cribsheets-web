import type {
  CribPenalty,
  TimeSheetDay,
  TimesheetDocument,
  TimesheetUser,
} from '../../lib/timesheet-export/legacy-types.ts'
import type { ApiUser } from './api.ts'
import { toFortnightParam } from './fortnight.ts'

export function emptyCribPenalty(): CribPenalty {
  return { breaks: Array.from({ length: 10 }, () => ({})) }
}

export function createEmptyDay(date: Date): TimeSheetDay {
  return {
    date: toFortnightParam(date),
    shiftCode: 'None',
    leaveType: 'None',
    sickCertificate: 'None',
    done: false,
    firstCribPenalty: emptyCribPenalty(),
    secondCribPenalty: emptyCribPenalty(),
  }
}

export function apiUserToTimesheetUser(user: ApiUser): TimesheetUser {
  return {
    name: user.name,
    employeeNumber: user.employeeNumber,
    unitStation: user.unitStation,
    casual: user.casual,
    isCountryEmployee: user.isCountryEmployee,
  }
}

export function createTimesheet(fortnightEnding: Date, user: ApiUser): TimesheetDocument {
  const days: TimeSheetDay[] = []
  for (let i = 0; i < 14; i++) {
    const d = new Date(fortnightEnding)
    d.setDate(d.getDate() - i)
    days.push(createEmptyDay(d))
  }
  days.reverse()
  return {
    fortnightEnding: toFortnightParam(fortnightEnding),
    days,
    user: apiUserToTimesheetUser(user),
  }
}

export function profileNeedsCompletion(user: ApiUser): boolean {
  return !user.profileIsComplete
}

