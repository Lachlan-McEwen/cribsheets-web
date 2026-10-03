import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.tsx'
import { TimesheetForm } from '../components/TimesheetForm.tsx'
import type { TimesheetDocument } from '../../lib/timesheet-export/legacy-types.ts'
import {
  getCurrentFortnightEnding,
  getFortnightEndingDates,
  parseFortnightParam,
  toFortnightParam,
} from '../lib/fortnight.ts'
import { loadStationNames } from '../lib/stations.ts'
import {
  generateTimesheet,
  getTemplateVersion,
  getTimesheet,
  saveTimesheet,
  TimesheetConflictError,
  timesheetExportUrl,
} from '../lib/api.ts'
import {
  apiUserToTimesheetUser,
  createTimesheet,
  profileNeedsCompletion,
} from '../lib/timesheetModel.ts'
import { prepareLoadedTimesheet } from '../../lib/timesheet-form/normalize-document.ts'

export function TimesheetPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [stations, setStations] = useState<string[]>([''])
  const [doc, setDoc] = useState<TimesheetDocument | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [hasOutput, setHasOutput] = useState(false)
  const [templateVersion, setTemplateVersion] = useState('')
  /** Ignores in-flight GET responses older than the latest save/generate. */
  const timesheetRevision = useRef<number | null>(null)

  const casual = user?.casual ?? false
  const fortnightOptions = useMemo(() => getFortnightEndingDates(casual), [casual])

  const selectedEnding = useMemo(() => {
    const fromQuery = parseFortnightParam(searchParams.get('fortnightEnding'), casual)
    return fromQuery ?? getCurrentFortnightEnding(casual)
  }, [searchParams, casual])

  useEffect(() => {
    void loadStationNames().then(setStations)
  }, [])

  useEffect(() => {
    if (!user) return
    void getTemplateVersion(user.casual)
      .then((r) => setTemplateVersion(r.version))
      .catch(() => setTemplateVersion(''))
  }, [user])

  const fortnightIso = toFortnightParam(selectedEnding)
  const userId = user?.id

  useEffect(() => {
    if (!userId) return
    const blank = prepareLoadedTimesheet(createTimesheet(selectedEnding, user!), user!.defaultShiftCode)
    let cancelled = false
    timesheetRevision.current = null
    setHasOutput(false)
    setLastUpdated(null)
    void getTimesheet(fortnightIso)
      .then((stored) => {
        if (cancelled) return
        if (
          timesheetRevision.current != null &&
          stored.lastUpdated < timesheetRevision.current
        ) {
          return
        }
        timesheetRevision.current = stored.lastUpdated
        const loaded = stored.document as TimesheetDocument
        setDoc(
          prepareLoadedTimesheet(
            {
              ...loaded,
              fortnightEnding: fortnightIso,
              user: apiUserToTimesheetUser(user!),
            },
            user!.defaultShiftCode,
          ),
        )
        setLastUpdated(stored.lastUpdated)
        setHasOutput(stored.hasOutput)
      })
      .catch(() => {
        if (cancelled) return
        if (timesheetRevision.current != null) return
        setDoc(blank)
        setLastUpdated(null)
        setHasOutput(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when fortnight or account changes
  }, [fortnightIso, userId])

  if (!user) return null
  if (profileNeedsCompletion(user)) return <Navigate to="/profile" replace />
  if (!doc) return <p className="text-muted">Loading…</p>

  const handleConflict = () => {
    window.alert(
      'This timesheet was updated elsewhere. Reload the page to get the latest version before saving again.',
    )
  }

  return (
    <TimesheetForm
      document={doc}
      fortnightOptions={fortnightOptions}
      templateVersion={templateVersion}
      stations={stations}
      hasDownload={hasOutput}
      downloadUrl={timesheetExportUrl(doc.fortnightEnding)}
      authorisingManagerEmail={user.authorisingManagerEmail}
      defaultShiftHours={user.defaultShiftHours}
      onFortnightChange={(iso) => navigate(`/?fortnightEnding=${iso}`)}
      onDocumentChange={setDoc}
      onSave={async (document) => {
        try {
          const saved = await saveTimesheet(
            document.fortnightEnding,
            document as unknown as Record<string, unknown>,
            lastUpdated,
          )
          timesheetRevision.current = saved.lastUpdated
          setLastUpdated(saved.lastUpdated)
          setHasOutput(saved.hasOutput)
        } catch (e) {
          if (e instanceof TimesheetConflictError) {
            handleConflict()
            throw new Error('Timesheet was updated elsewhere.')
          }
          throw e
        }
      }}
      onGenerate={async (document) => {
        try {
          const result = await generateTimesheet(
            document.fortnightEnding,
            document as unknown as Record<string, unknown>,
            lastUpdated,
          )
          timesheetRevision.current = result.lastUpdated
          setLastUpdated(result.lastUpdated)
          setHasOutput(result.hasOutput)
        } catch (e) {
          if (e instanceof TimesheetConflictError) {
            handleConflict()
            throw new Error('Timesheet was updated elsewhere.')
          }
          throw e
        }
      }}
    />
  )
}
