import type { LeaveType, ShiftCode, SickCertificateStatus } from '../../lib/timesheet-export/legacy-types.ts'

export const SHIFT_CODE_OPTIONS: { value: ShiftCode; label: string }[] = [
  { value: 'None', label: '' },
  { value: 'Administration', label: 'Administration' },
  { value: 'Communications', label: 'Communications' },
  { value: 'Emergency', label: 'Emergency' },
  { value: 'Function', label: 'Function' },
  { value: 'RMTS', label: 'RMTS' },
  { value: 'Training', label: 'Training' },
  { value: 'CommParamedic', label: 'Comm paramedic' },
]

export const LEAVE_TYPE_OPTIONS: { value: LeaveType; label: string }[] = [
  { value: 'None', label: '' },
  { value: 'Annual', label: 'Annual' },
  { value: 'AccruedDay', label: 'Accrued Day' },
  { value: 'LongService', label: 'Long service' },
  { value: 'SickStandard', label: 'Sick (standard)' },
  { value: 'SickCOVID19', label: 'Sick (COVID 19)' },
  { value: 'SickCOVID19D', label: 'Sick (COVID 19 D)' },
  { value: 'Retention', label: 'Retention' },
  { value: 'Workcover', label: 'Workcover' },
  { value: 'UnpaidSicStandard', label: 'Unpaid Standard' },
  { value: 'UnpaidSicCOVID19', label: 'Unpaid (COVID 19)' },
  { value: 'UnpaidSicCOVID19D', label: 'Unpaid (COVID 19 D)' },
  { value: 'WithoutPay', label: 'Without Pay' },
  { value: 'SpecialLeave', label: 'Special Leave' },
  { value: 'SpecialLeaveOther', label: 'Special Leave - other' },
  { value: 'PublicHoliday', label: 'Public Holiday' },
  { value: 'SpecialRestrictUrgPres', label: 'Special-Restrict-UrgPres' },
  { value: 'PaidPartner', label: 'Paid Partner (Not SIC)' },
]

export const SICK_CERT_OPTIONS: { value: SickCertificateStatus; label: string }[] = [
  { value: 'None', label: '' },
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
]
