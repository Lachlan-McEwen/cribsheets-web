import type { CribPenalty, TimeSheetDay } from '../../../lib/timesheet-export/legacy-types.ts'
import { LEAVE_TYPE_OPTIONS, SHIFT_CODE_OPTIONS, SICK_CERT_OPTIONS } from '../../lib/enumLabels.ts'
import { formatDayHeader, parseIsoDate } from '../../lib/format.ts'
import { CollapsibleSection, padTimePart, useDigitsOnly } from './CollapsibleSection.tsx'

type Props = {
  index: number
  day: TimeSheetDay
  stations: string[]
  isCountryEmployee: boolean
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
        <label className="control-label col-12">Started</label>
        <div className="col-6 crib-time">
          <input
            type="time"
            className="form-control"
            value={penalty.started ?? ''}
            onChange={(e) => update({ started: e.target.value || null })}
          />
        </div>
        <br />
        <br />
        {cribBreakRows(penalty).map(({ brk, j, visible }) =>
          visible ? (
            <div className="row crib-break" key={j}>
              <label className="control-label col-6">Broken</label>
              <label className="control-label col-6">Restarted</label>
              <div className="col-6 crib-time">
                <input
                  type="time"
                  className="form-control"
                  value={brk.broken ?? ''}
                  onChange={(e) => {
                    const breaks = [...(penalty.breaks ?? [])]
                    breaks[j] = { ...breaks[j], broken: e.target.value || null }
                    onChange({ ...penalty, breaks })
                  }}
                />
              </div>
              <div className="col-6 crib-time">
                <input
                  type="time"
                  className="form-control"
                  value={brk.restarted ?? ''}
                  onChange={(e) => {
                    const breaks = [...(penalty.breaks ?? [])]
                    breaks[j] = { ...breaks[j], restarted: e.target.value || null }
                    onChange({ ...penalty, breaks })
                  }}
                />
              </div>
            </div>
          ) : null,
        )}
      </div>
      <div className="form-group row">
        <div className="checkbox col-6">
          <input
            type="checkbox"
            className="checkbox"
            checked={penalty.noCrib ?? false}
            onChange={(e) => update({ noCrib: e.target.checked })}
          />
          <label className="control-label">No Crib</label>
        </div>
        <div className="checkbox col-6">
          <input
            type="checkbox"
            className="checkbox"
            checked={penalty.spoiltMealClaimed ?? false}
            onChange={(e) => update({ spoiltMealClaimed: e.target.checked })}
          />
          <label className="control-label">Spoilt Meal Claimed</label>
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
  expanded,
  onToggleExpand,
  onChange,
}: Props) {
  const digitsOnly = useDigitsOnly()
  const header = formatDayHeader(parseIsoDate(day.date))
  const panelId = `date${index}`

  const patch = (p: Partial<TimeSheetDay>) => onChange({ ...day, ...p })

  const hourMinPair = (
    hours: number | null | undefined,
    minutes: number | null | undefined,
    onHours: (v: string | null) => void,
    onMinutes: (v: string | null) => void,
    slot: number,
  ) => (
    <>
      <input
        className={`form-control hours hours${index}`}
        value={hours ?? ''}
        onInput={(e) => onHours(digitsOnly(e.currentTarget.value) || null)}
        onChange={(e) => {
          onHours(padTimePart(digitsOnly(e.currentTarget.value)) || null)
          const other = document.querySelectorAll<HTMLInputElement>(`.minutes${index}`)[slot]
          if (other?.value) other.value = padTimePart(other.value)
        }}
      />
      :
      <input
        className={`form-control minutes minutes${index}`}
        value={minutes ?? ''}
        onInput={(e) => onMinutes(digitsOnly(e.currentTarget.value) || null)}
        onChange={(e) => onMinutes(padTimePart(digitsOnly(e.currentTarget.value)) || null)}
      />
    </>
  )

  const clearDay = () => {
    if (!confirm(`are you aure you want to clear ${header}?`)) return
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
      <h5
        className="btn btn-secondary dateDropDown"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggleExpand}
      >
        {header} ▼
      </h5>
      {day.done ? <span className="day-tick">✔</span> : null}

      <div id={panelId} className={`collapse date${expanded ? ' show' : ''}`}>
        <div className="form-group row">
          <label className="control-label col-12">Shift Code</label>
          <div className="col-10">
            <select
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

        <div className="form-group row">
          <label className="control-label col-6">Start</label>
          <label className="control-label col-6">End</label>
          <div className="col-6">
            <input
              type="time"
              className="form-control"
              id={`rosteredStart${index}`}
              value={day.start ?? ''}
              onChange={(e) => patch({ start: e.target.value || null })}
            />
          </div>
          <div className="col-6">
            <input
              type="time"
              className="form-control"
              id={`rosteredEnd${index}`}
              value={day.end ?? ''}
              onChange={(e) => patch({ end: e.target.value || null })}
            />
          </div>
        </div>

        <div className="form-group row">
          <label className="control-label col-4">Rostered</label>
          <label className="control-label col-4">Overtime</label>
          <label className="control-label col-4">Meals (unpaid)</label>
          <div className="col-4">
            {hourMinPair(
              day.rosteredHours,
              day.rosteredMinutes,
              (v) => patch({ rosteredHours: v ? Number(v) : null }),
              (v) => patch({ rosteredMinutes: v ? Number(v) : null }),
              0,
            )}
          </div>
          <div className="col-4">
            {hourMinPair(
              day.overtimeHours,
              day.overtimeMinutes,
              (v) => patch({ overtimeHours: v ? Number(v) : null }),
              (v) => patch({ overtimeMinutes: v ? Number(v) : null }),
              1,
            )}
          </div>
          <div className="col-4">
            {hourMinPair(
              day.mealsHours,
              day.mealsMinutes,
              (v) => patch({ mealsHours: v ? Number(v) : null }),
              (v) => patch({ mealsMinutes: v ? Number(v) : null }),
              2,
            )}
          </div>
        </div>
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
          <div className="form-group row">
            <label className="control-label col-7">Leave Type</label>
            <label className="control-label col-5">Leave Time</label>
            <div className="col-7">
              <select
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
            <div className="col-4">
              {hourMinPair(
                day.leaveHours,
                day.leaveMinutes,
                (v) => patch({ leaveHours: v ? Number(v) : null }),
                (v) => patch({ leaveMinutes: v ? Number(v) : null }),
                3,
              )}
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
              value={day.kms ?? ''}
              onInput={(e) => patch({ kms: digitsOnly(e.currentTarget.value) ? Number(digitsOnly(e.currentTarget.value)) : null })}
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
              <div className="form-group row">
                <label className="control-label col-6">Recall start</label>
                <label className="control-label col-6">Recall finish</label>
                <div className="col-6">
                  <input
                    type="time"
                    className="form-control"
                    value={day.recallStart ?? ''}
                    onChange={(e) => patch({ recallStart: e.target.value || null })}
                  />
                </div>
                <div className="col-6">
                  <input
                    type="time"
                    className="form-control"
                    value={day.recallFinish ?? ''}
                    onChange={(e) => patch({ recallFinish: e.target.value || null })}
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
              <div className="form-group row">
                <label className="control-label col-6">On-call start</label>
                <label className="control-label col-6">On-call finish</label>
                <div className="col-6">
                  <input
                    type="time"
                    className="form-control"
                    value={day.onCallStart ?? ''}
                    onChange={(e) => patch({ onCallStart: e.target.value || null })}
                  />
                </div>
                <div className="col-6">
                  <input
                    type="time"
                    className="form-control"
                    value={day.onCallFinish ?? ''}
                    onChange={(e) => patch({ onCallFinish: e.target.value || null })}
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
