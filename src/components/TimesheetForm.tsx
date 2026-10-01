import { useCallback, useEffect, useState } from 'react'
import type { TimesheetDocument } from '../../lib/timesheet-export/legacy-types.ts'
import { formatDateAu } from '../lib/format.ts'
import { toFortnightParam } from '../lib/fortnight.ts'
import { timesheetApprovalMailtoUrl } from '../lib/timesheetApprovalMailto.ts'
import { useToast } from '../feedback/ToastContext.tsx'
import { useSubmitPhase } from '../feedback/useSubmitPhase.ts'
import { TimesheetDayRow } from './timesheet/TimesheetDayRow.tsx'

type Props = {
  document: TimesheetDocument
  fortnightOptions: Date[]
  templateVersion: string
  stations: string[]
  onFortnightChange: (iso: string) => void
  onDocumentChange: (doc: TimesheetDocument) => void
  onSave: (doc: TimesheetDocument) => Promise<void>
  onGenerate: (doc: TimesheetDocument) => Promise<void>
  hasDownload: boolean
  downloadUrl: string
}

export function TimesheetForm({
  document,
  fortnightOptions,
  templateVersion,
  stations,
  onFortnightChange,
  onDocumentChange,
  onSave,
  onGenerate,
  hasDownload,
  downloadUrl,
}: Props) {
  const [expandedDay, setExpandedDay] = useState<number | null>(null)
  const [formChanged, setFormChanged] = useState(false)
  const toast = useToast()
  const { phase: savePhase, start: startSave, succeed: saveSucceeded, fail: saveFailed, label: saveLabel } =
    useSubmitPhase()
  const [showDownload, setShowDownload] = useState(hasDownload)
  const [generateBusy, setGenerateBusy] = useState(false)

  useEffect(() => {
    setShowDownload(hasDownload)
  }, [hasDownload, document.fortnightEnding])

  const updateDay = useCallback(
    (index: number, day: TimesheetDocument['days'][number]) => {
      setFormChanged(true)
      const days = [...document.days]
      days[index] = day
      onDocumentChange({ ...document, days })
    },
    [document, onDocumentChange],
  )

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (formChanged) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [formChanged])

  const onFortnightSelect = (value: string) => {
    onFortnightChange(value)
  }

  const save = () => {
    startSave()
    setShowDownload(false)
    void onSave(document)
      .then(() => {
        setFormChanged(false)
        saveSucceeded()
        toast.success('Timesheet saved.')
      })
      .catch((e) => {
        saveFailed()
        toast.error(e instanceof Error ? e.message : 'Could not save timesheet.')
      })
  }

  const generate = () => {
    setGenerateBusy(true)
    void onGenerate(document)
      .then(() => {
        setShowDownload(true)
        toast.success('Timesheet generated. You can download the spreadsheet.')
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Could not generate timesheet.')
      })
      .finally(() => setGenerateBusy(false))
  }

  const approvalMailto = timesheetApprovalMailtoUrl(document, hasDownload || showDownload)

  return (
    <>
      <div className="page-header mb-4">
        <h1 className="page-title">Timesheet</h1>
      </div>

      <div className="info-banner mb-4">
        Using the latest Excel spreadsheet (FRM-403 Fortnight Electronic Timesheet - INTRANET -{' '}
        {templateVersion})
      </div>

      <div className="row">
        <div className="col-lg-6 col-xl-5">
          <div className="form-card">
            <form
              id="form"
              onSubmit={(e) => e.preventDefault()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target instanceof HTMLElement && e.target.tagName !== 'TEXTAREA') {
                  e.preventDefault()
                }
              }}
            >
              <div className="form-group row fortnight-picker">
                <label className="control-label col-sm-12 fw-semibold">Fortnight ending</label>
                <div className="col-sm-12">
                  <select
                    id="FortnightEnding"
                    className="form-select"
                    value={document.fortnightEnding}
                    onChange={(e) => onFortnightSelect(e.target.value)}
                  >
                    {fortnightOptions.map((d) => {
                      const iso = toFortnightParam(d)
                      return (
                        <option key={iso} value={iso}>
                          {formatDateAu(d)}
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>
              <br />

              {document.days.map((day, i) => (
                <TimesheetDayRow
                  key={day.date}
                  index={i}
                  day={day}
                  stations={stations}
                  isCountryEmployee={document.user.isCountryEmployee ?? false}
                  expanded={expandedDay === i}
                  onToggleExpand={() => {
                    setExpandedDay((prev) => (prev === i ? null : i))
                  }}
                  onChange={(d) => updateDay(i, d)}
                />
              ))}

              {document.user.isCountryEmployee ? (
                <>
                  <div className="form-group mt-3">
                    <label className="control-label fw-semibold">Excess on-call hours claimed</label>
                    <input
                      className="form-control"
                      placeholder="00.00"
                      value={document.excessOnCallHoursClaimed ?? ''}
                      onChange={(e) => {
                        setFormChanged(true)
                        onDocumentChange({ ...document, excessOnCallHoursClaimed: e.target.value || null })
                      }}
                    />
                  </div>
                  <br />
                </>
              ) : null}
            </form>
            <br />

            <div className="action-buttons mt-3">
              <button
                type="button"
                className="btn btn-success"
                id="generateButton"
                disabled={generateBusy}
                style={{ display: showDownload ? 'none' : undefined }}
                onClick={generate}
              >
                {generateBusy ? 'Generating...' : 'Generate Timesheet'}
              </button>
              <a
                className="btn btn-outline-success"
                id="downloadButton"
                href={downloadUrl}
                style={{ display: showDownload ? undefined : 'none' }}
              >
                Download
              </a>
              <a
                className="btn btn-outline-primary"
                id="emailApprovalButton"
                href={approvalMailto}
              >
                Email for approval
              </a>
            </div>
          </div>
        </div>
      </div>

      <button
        id="save-button"
        className={`btn ${savePhase === 'saved' ? 'btn-outline-success btn-submit-saved' : 'btn-primary'}`}
        type="button"
        disabled={savePhase === 'busy'}
        onClick={save}
      >
        {saveLabel('Save')}
      </button>
    </>
  )
}
