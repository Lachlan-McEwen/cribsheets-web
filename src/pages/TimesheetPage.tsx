import { useEffect, useMemo, useState } from 'react'
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

export function TimesheetPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [stations, setStations] = useState<string[]>([''])
  const [doc, setDoc] = useState<TimesheetDocument | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [hasOutput, setHasOutput] = useState(false)
  const [templateVersion, setTemplateVersion] = useState('')

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

  useEffect(() => {
    if (!user) return
    const iso = toFortnightParam(selectedEnding)
    const blank = createTimesheet(selectedEnding, user)
    setHasOutput(false)
    setLastUpdated(null)
    void getTimesheet(iso)
      .then((stored) => {
        const loaded = stored.document as TimesheetDocument
        setDoc({
          ...loaded,
          fortnightEnding: iso,
          user: apiUserToTimesheetUser(user),
        })
        setLastUpdated(stored.lastUpdated)
        setHasOutput(stored.hasOutput)
      })
      .catch(() => {
        setDoc(blank)
        setLastUpdated(null)
        setHasOutput(false)
      })
  }, [selectedEnding, user])

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
      onFortnightChange={(iso) => navigate(`/?fortnightEnding=${iso}`)}
      onDocumentChange={setDoc}
      onSave={async (document) => {
        try {
          const saved = await saveTimesheet(
            document.fortnightEnding,
            document as unknown as Record<string, unknown>,
            lastUpdated,
          )
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
