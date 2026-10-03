import type { CribPenalty, TimeSheetDay } from '../../../lib/timesheet-export/legacy-types.ts'
import { collapsedDaySummary } from '../../../lib/timesheet-form/day-summary.ts'
import { digitsOnly } from '../../../lib/timesheet-form/time.ts'
import { LEAVE_TYPE_OPTIONS, SHIFT_CODE_OPTIONS, SICK_CERT_OPTIONS } from '../../lib/enumLabels.ts'
import { formatDayHeader, parseIsoDate } from '../../lib/format.ts'
import { ClockTimeField } from './ClockTimeField.tsx'
import { CollapsibleSection, DisclosureHeader } from './CollapsibleSection.tsx'
import { DurationField } from './DurationField.tsx'
import { ShiftTimesBlock } from './ShiftTimesBlock.tsx'

type Props = {
  index: number
  day: TimeSheetDay
  stations: string[]
  isCountryEmployee: boolean
  defaultShiftHours: number | null
  expanded: boolean
  onToggleExpand: () => void
  onChange: (day: TimeSheetDay) => void
}

function cribBreakRows(crib: CribPenalty | null | undefined) {
  const breaks = crib?.breaks ?? []
  let foundBlank = false
  return breaks.map((brk, j) => {
    let visible = true
    if (foundBlank) visible = false
    else if (!brk.broken && !brk.restarted) {
      foundBlank = true
      visible = true
    }
    return { brk, j, visible }
  })
}

function CribBlock({
  label,
  idPrefix,
  crib,
  onChange,
  onClear,
}: {
  label: string
  idPrefix: string
  crib: CribPenalty | null | undefined
  onChange: (c: CribPenalty) => void
  onClear: () => void
}) {
  const penalty = crib ?? { breaks: [] }
  const update = (patch: Partial<CribPenalty>) => onChange({ ...penalty, ...patch })

  return (
    <CollapsibleSection
      id={idPrefix}
      title={label}
      toggleClass="cribDropDown"
      onClear={onClear}
    >
      <div className="form-group row">
        <div className="col-12 crib-time">
          <ClockTimeField label="Started" value={penalty.started} onChange={(started) => update({ started })} />
        </div>
        {cribBreakRows(penalty).map(({ brk, j, visible }) =>
          visible ? (
            <div className="col-12" key={j}>
              <div className="row crib-break g-2">
                <div className="col-6 crib-time">
                  <ClockTimeField
                    label="Broken"
                    value={brk.broken}
                    onChange={(broken) => {
                      const breaks = [...(penalty.breaks ?? [])]
                      breaks[j] = { ...breaks[j], broken }
                      onChange({ ...penalty, breaks })
                    }}
                  />
                </div>
                <div className="col-6 crib-time">
                  <ClockTimeField
                    label="Restarted"
                    value={brk.restarted}
                    onChange={(restarted) => {
                      const breaks = [...(penalty.breaks ?? [])]
                      breaks[j] = { ...breaks[j], restarted }
                      onChange({ ...penalty, breaks })
                    }}
                  />
                </div>
              </div>
            </div>
          ) : null,
        )}
      </div>
      <div className="form-group row g-2">
        <div className="col-6">
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id={`${idPrefix}-noCrib`}
              checked={penalty.noCrib ?? false}
              onChange={(e) => update({ noCrib: e.target.checked })}
            />
            <label className="form-check-label" htmlFor={`${idPrefix}-noCrib`}>
              No Crib
            </label>
          </div>
        </div>
        <div className="col-6">
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id={`${idPrefix}-spoiltMeal`}
              checked={penalty.spoiltMealClaimed ?? false}
              onChange={(e) => update({ spoiltMealClaimed: e.target.checked })}
            />
            <label className="form-check-label" htmlFor={`${idPrefix}-spoiltMeal`}>
              Spoilt Meal Claimed
            </label>
          </div>
        </div>
      </div>
    </CollapsibleSection>
  )
}

export function TimesheetDayRow({
  index,
  day,
  stations,
  isCountryEmployee,
  defaultShiftHours,
  expanded,
  onToggleExpand,
  onChange,
}: Props) {
  const header = formatDayHeader(parseIsoDate(day.date))
  const summary = collapsedDaySummary(day)
  const panelId = `date${index}`

  const patch = (p: Partial<TimeSheetDay>) => onChange({ ...day, ...p })

  const clearDay = () => {
    if (!confirm(`Are you sure you want to clear ${header}?`)) return
    onChange({
      ...day,
      start: null,
      end: null,
      shiftCode: 'None',
      rosteredHours: null,
      rosteredMinutes: null,
      overtimeHours: null,
      overtimeMinutes: null,
      mealsHours: null,
      mealsMinutes: null,
      leaveType: 'None',
      leaveHours: null,
      leaveMinutes: null,
      sickCertificate: 'None',
      additionalInformation: null,
      unitStation: null,
      kms: null,
      shiftChangeNotified: null,
      done: false,
      firstCribPenalty: { breaks: Array.from({ length: 10 }, () => ({})) },
      secondCribPenalty: { breaks: Array.from({ length: 10 }, () => ({})) },
    })
  }

  return (
    <div className="dateRow">
      <DisclosureHeader
        id={panelId}
        className="btn btn-secondary dateDropDown"
        expanded={expanded}
        onToggle={onToggleExpand}
        headingLevel="h5"
        trailing={
          day.done ? (
            <span className="day-tick" title="Day marked complete" aria-hidden="true">
              ✓
            </span>
          ) : null
        }
      >
        <>
          <span className="dateRow-title">{header}</span>
          {summary ? <span className="dateRow-summary">{summary}</span> : null}
        </>
      </DisclosureHeader>

      <div id={panelId} className={`collapse date${expanded ? ' show' : ''}`}>
        <div className="form-group row">
          <label className="control-label col-12" htmlFor={`shiftCode${index}`}>
            Shift Code
          </label>
          <div className="col-10">
            <select
              id={`shiftCode${index}`}
              className="form-control"
              value={day.shiftCode ?? 'None'}
              onChange={(e) => patch({ shiftCode: e.target.value as TimeSheetDay['shiftCode'] })}
            >
              {SHIFT_CODE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label || ' '}
                </option>
              ))}
            </select>
          </div>
        </div>

        <ShiftTimesBlock
          index={index}
          day={day}
          defaultShiftHours={defaultShiftHours}
          onChange={patch}
        />
        <br />

        <CribBlock
          label="1st Crib Penalty"
          idPrefix={`firstCribPenalty${index}`}
          crib={day.firstCribPenalty}
          onChange={(c) => patch({ firstCribPenalty: c })}
          onClear={() => patch({ firstCribPenalty: { breaks: Array.from({ length: 10 }, () => ({})) } })}
        />
        <CribBlock
          label="2nd Crib Penalty"
          idPrefix={`secondCribPenalty${index}`}
          crib={day.secondCribPenalty}
          onChange={(c) => patch({ secondCribPenalty: c })}
          onClear={() => patch({ secondCribPenalty: { breaks: Array.from({ length: 10 }, () => ({})) } })}
        />

        <CollapsibleSection
          id={`leave${index}`}
          title="Leave"
          toggleClass="leaveDropDown"
          onClear={() =>
            patch({
              leaveType: 'None',
              leaveHours: null,
              leaveMinutes: null,
              sickCertificate: 'None',
            })
          }
        >
          <div className="form-group row g-2">
            <div className="col-7">
              <label className="duration-field__label" htmlFor={`leaveType${index}`}>
                Leave type
              </label>
              <select
                id={`leaveType${index}`}
                className="form-control"
                value={day.leaveType ?? 'None'}
                onChange={(e) => patch({ leaveType: e.target.value as TimeSheetDay['leaveType'] })}
              >
                {LEAVE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label || ' '}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-5">
              <DurationField
                label="Leave time"
                hours={day.leaveHours}
                minutes={day.leaveMinutes}
                onHoursChange={(leaveHours) => patch({ leaveHours })}
                onMinutesChange={(leaveMinutes) => patch({ leaveMinutes })}
              />
            </div>
          </div>
          <div className="form-group row">
            <div className="checkbox col-4">
              <label className="control-label">Sick Certificate?</label>
            </div>
            <div className="checkbox col-2">
              <select
                className="form-control col-2"
                value={day.sickCertificate ?? 'None'}
                onChange={(e) =>
                  patch({ sickCertificate: e.target.value as TimeSheetDay['sickCertificate'] })
                }
              >
                {SICK_CERT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label || ' '}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          id={`shiftChange${index}`}
          title="Shift Change"
          toggleClass="shiftChangeDropDown"
          onClear={() => patch({ shiftChangeNotified: null })}
        >
          <div className="form-group row">
            <label className="control-label col-12">Notified</label>
            <div className="col-6">
              <input
                type="datetime-local"
                className="form-control"
                value={day.shiftChangeNotified ?? ''}
                onChange={(e) => patch({ shiftChangeNotified: e.target.value || null })}
              />
            </div>
          </div>
        </CollapsibleSection>

        <div className="form-group row">
          <label className="control-label col-12">Kms</label>
          <div className="col-3">
            <input
              className="form-control"
              inputMode="numeric"
              value={day.kms ?? ''}
              onInput={(e) =>
                patch({
                  kms: digitsOnly(e.currentTarget.value) ? Number(digitsOnly(e.currentTarget.value)) : null,
                })
              }
            />
          </div>
        </div>

        {isCountryEmployee ? (
          <>
            <CollapsibleSection
              id={`recallToDuty${index}`}
              title="Recall to duty"
              toggleClass="recallDropDown"
              onClear={() =>
                patch({
                  recallCaseNumber: null,
                  recallStart: null,
                  recallFinish: null,
                  recallUnitStation: null,
                  recallAdditionalInformation: null,
                })
              }
            >
              <div className="form-group row">
                <label className="control-label col-12">Case number / authorisation</label>
                <div className="col-12">
                  <input
                    className="form-control"
                    value={day.recallCaseNumber ?? ''}
                    onChange={(e) => patch({ recallCaseNumber: e.target.value || null })}
                  />
                </div>
              </div>
              <div className="form-group row g-2">
                <div className="col-6">
                  <ClockTimeField
                    label="Recall start"
                    value={day.recallStart}
                    onChange={(recallStart) => patch({ recallStart })}
                  />
                </div>
                <div className="col-6">
                  <ClockTimeField
                    label="Recall finish"
                    value={day.recallFinish}
                    onChange={(recallFinish) => patch({ recallFinish })}
                  />
                </div>
              </div>
              <div className="form-group row">
                <label className="control-label col-12">Recall station (if different from home)</label>
                <div className="col-10">
                  <select
                    className="form-control"
                    value={day.recallUnitStation ?? ''}
                    onChange={(e) => patch({ recallUnitStation: e.target.value || null })}
                  >
                    {stations.map((s) => (
                      <option key={s || 'empty'} value={s}>
                        {s || ' '}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group row">
                <label className="control-label col-12">Recall additional information</label>
                <div className="col-12">
                  <textarea
                    className="form-control"
                    rows={3}
                    value={day.recallAdditionalInformation ?? ''}
                    onChange={(e) => patch({ recallAdditionalInformation: e.target.value || null })}
                  />
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              id={`countryOnCall${index}`}
              title="Country on call"
              toggleClass="onCallDropDown"
              onClear={() =>
                patch({
                  onCallStart: null,
                  onCallFinish: null,
                  onCallUnitStation: null,
                  onCallAdditionalInformation: null,
                })
              }
            >
              <div className="form-group row g-2">
                <div className="col-6">
                  <ClockTimeField
                    label="On-call start"
                    value={day.onCallStart}
                    onChange={(onCallStart) => patch({ onCallStart })}
                  />
                </div>
                <div className="col-6">
                  <ClockTimeField
                    label="On-call finish"
                    value={day.onCallFinish}
                    onChange={(onCallFinish) => patch({ onCallFinish })}
                  />
                </div>
              </div>
              <div className="form-group row">
                <label className="control-label col-12">On-call station (if different from home)</label>
                <div className="col-10">
                  <select
                    className="form-control"
                    value={day.onCallUnitStation ?? ''}
                    onChange={(e) => patch({ onCallUnitStation: e.target.value || null })}
                  >
                    {stations.map((s) => (
                      <option key={`oncall-${s || 'empty'}`} value={s}>
                        {s || ' '}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group row">
                <label className="control-label col-12">On-call additional information</label>
                <div className="col-12">
                  <textarea
                    className="form-control"
                    rows={3}
                    value={day.onCallAdditionalInformation ?? ''}
                    onChange={(e) => patch({ onCallAdditionalInformation: e.target.value || null })}
                  />
                </div>
              </div>
            </CollapsibleSection>
          </>
        ) : null}

        <div className="form-group row">
          <label className="control-label col-12">Unit / Station (if different from home)</label>
          <div className="col-10">
            <select
              className="form-control"
              value={day.unitStation ?? ''}
              onChange={(e) => patch({ unitStation: e.target.value || null })}
            >
              {stations.map((s) => (
                <option key={`unit-${s || 'empty'}`} value={s}>
                  {s || ' '}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group row">
          <label className="control-label col-12">Additional Information</label>
          <p style={{ fontSize: 11 }}>
            (case number, overtime authorisation, spare, higher duty classification, meal allowance, shift swap etc)
          </p>
          <div className="col-12">
            <textarea
              className="form-control"
              rows={5}
              value={day.additionalInformation ?? ''}
              onChange={(e) => patch({ additionalInformation: e.target.value || null })}
            />
          </div>
        </div>
        <br />
        <span>
          <input
            type="checkbox"
            className="done-check form-check-input"
            checked={day.done ?? false}
            onChange={(e) => patch({ done: e.target.checked })}
          />{' '}
          day complete
        </span>
        <br />
        <br />
        <button className="clear-button btn btn-outline-secondary" type="button" onClick={clearDay}>
          Clear
        </button>
        <br />
        <br />
        <br />
      </div>
    </div>
  )
}
