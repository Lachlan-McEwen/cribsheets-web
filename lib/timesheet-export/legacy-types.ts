/**
 * JSON shape aligned with legacy `SAASTimesheet.Models` (Newtonsoft-serialized timesheet
 * in SQL + MVC model). `User` is `[JsonIgnore]` on `Timesheet` in C# but required at generate time.
 */

export type ShiftCode =
  | 'None'
  | 'Administration'
  | 'Communications'
  | 'Emergency'
  | 'Function'
  | 'RMTS'
  | 'Training'
  | 'CommParamedic'

export type LeaveType =
  | 'None'
  | 'Annual'
  | 'AccruedDay'
  | 'LongService'
  | 'SickStandard'
  | 'SickCOVID19'
  | 'SickCOVID19D'
  | 'Retention'
  | 'Workcover'
  | 'UnpaidSicStandard'
  | 'UnpaidSicCOVID19'
  | 'UnpaidSicCOVID19D'
  | 'WithoutPay'
  | 'SpecialLeave'
  | 'SpecialLeaveOther'
  | 'PublicHoliday'
  | 'SpecialRestrictUrgPres'
  | 'PaidPartner'

export type SickCertificateStatus = 'None' | 'Yes' | 'No'

export type CribBreak = {
  broken?: string | null
  restarted?: string | null
}

export type CribPenalty = {
  started?: string | null
  broken?: string | null
  restarted?: string | null
  noCrib?: boolean
  spoiltMealClaimed?: boolean
  breaks?: CribBreak[]
}

/** One fortnight day — mirrors `TimeSheetDay` (duration fields are hours/minutes, not TimeSpan). */
export type TimeSheetDay = {
  date: string
  done?: boolean
  start?: string | null
  end?: string | null
  mealsHours?: number | null
  mealsMinutes?: number | null
  overtimeHours?: number | null
  overtimeMinutes?: number | null
  rosteredHours?: number | null
  rosteredMinutes?: number | null
  shiftCode?: ShiftCode
  leaveType?: LeaveType
  sickCertificate?: SickCertificateStatus
  leaveHours?: number | null
  leaveMinutes?: number | null
  additionalInformation?: string | null
  unitStation?: string | null
  firstCribPenalty?: CribPenalty | null
  secondCribPenalty?: CribPenalty | null
  shiftChangeNotified?: string | null
  kms?: number | null
  recallCaseNumber?: string | null
  recallStart?: string | null
  recallFinish?: string | null
  recallAdditionalInformation?: string | null
  recallUnitStation?: string | null
  onCallStart?: string | null
  onCallFinish?: string | null
  onCallAdditionalInformation?: string | null
  onCallUnitStation?: string | null
}

/** Profile fields used when writing the workbook (legacy `User`). */
export type TimesheetUser = {
  name: string
  employeeNumber: string
  unitStation: string
  casual?: boolean
  isCountryEmployee?: boolean
}

/** Payload for generate/export (timesheet + user). */
export type TimesheetDocument = {
  fortnightEnding: string
  excessOnCallHoursClaimed?: string | null
  days: TimeSheetDay[]
  user: TimesheetUser
}
