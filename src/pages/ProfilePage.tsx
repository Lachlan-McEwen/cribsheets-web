import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.tsx'
import { useToast } from '../feedback/ToastContext.tsx'
import { useSubmitPhase } from '../feedback/useSubmitPhase.ts'
import { profileSignatureUrl, updateProfile } from '../lib/api.ts'
import { SHIFT_CODE_OPTIONS } from '../lib/enumLabels.ts'
import { loadStationNames } from '../lib/stations.ts'

function RequiredMark() {
  return <span className="text-danger" aria-hidden="true"> *</span>
}

const SIGNATURE_CANVAS_W = 500
const SIGNATURE_CANVAS_H = 250

function canvasPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  }
}

export function ProfilePage() {
  const { user, refresh } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stations, setStations] = useState<string[]>([''])
  const [unitStation, setUnitStation] = useState('')
  const [signatureEditing, setSignatureEditing] = useState(false)
  const [signatureDraftPreview, setSignatureDraftPreview] = useState<string | null>(null)
  const [drawing, setDrawing] = useState(false)
  const [signatureTouched, setSignatureTouched] = useState(false)
  const [signatureError, setSignatureError] = useState(false)
  const [signatureSavedAt, setSignatureSavedAt] = useState(0)
  const toast = useToast()
  const { phase: savePhase, start: startSave, succeed: saveSucceeded, fail: saveFailed, label: saveLabel } =
    useSubmitPhase()
  useEffect(() => {
    void loadStationNames().then(setStations)
  }, [])

  useEffect(() => {
    setUnitStation(user?.unitStation ?? '')
  }, [user?.unitStation])

  if (!user) return null

  const stationsReady = stations.length > 1

  const serverSignatureSrc =
    user.hasSignature
      ? `${profileSignatureUrl()}${signatureSavedAt ? `?v=${signatureSavedAt}` : ''}`
      : null
  const signaturePreviewSrc =
    !signatureEditing && (signatureDraftPreview ?? serverSignatureSrc)

  function finishSignatureEdit() {
    setSignatureEditing(false)
    if (signatureTouched && canvasRef.current) {
      setSignatureDraftPreview(canvasRef.current.toDataURL('image/png'))
      return
    }
    if (!signatureTouched && !user.hasSignature) {
      setSignatureDraftPreview(null)
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    let signatureDataUrl: string | null = signatureDraftPreview
    if (!signatureDataUrl && signatureTouched && canvasRef.current) {
      signatureDataUrl = canvasRef.current.toDataURL('image/png')
    }
    const signatureOk = user.hasSignature || signatureDraftPreview != null || signatureTouched
    if (!signatureOk) {
      setSignatureError(true)
      return
    }
    setSignatureError(false)
    startSave()
    try {
      await updateProfile({
        name: String(fd.get('name') ?? ''),
        employeeNumber: String(fd.get('employeeNumber') ?? ''),
        unitStation: unitStation.trim(),
        casual: fd.get('casual') === 'casual',
        isCountryEmployee: fd.get('isCountryEmployee') === 'country',
        defaultShiftHours: fd.get('defaultShiftHours')
          ? Number(fd.get('defaultShiftHours'))
          : null,
        defaultShiftCode: String(fd.get('defaultShiftCode') ?? 'None'),
        authorisingManagerEmail: String(fd.get('authorisingManagerEmail') ?? ''),
        signatureDataUrl,
      })
      await refresh()
      if (signatureDataUrl) setSignatureSavedAt(Date.now())
      saveSucceeded()
      toast.success('Profile saved.')
      setSignatureEditing(false)
      setSignatureDraftPreview(null)
      setSignatureTouched(false)
    } catch (err) {
      saveFailed()
      toast.error(err instanceof Error ? err.message : 'Could not save profile.')
    }
  }

  return (
    <>
      <div className="page-header mb-4">
        <h1 className="page-title">Profile</h1>
        <p className="page-subtitle text-muted mb-0">Your details and signature</p>
      </div>

      <div className="row">
        <div className="col-lg-6 col-xl-5">
          <div className="form-card">
            <form id="form" onSubmit={(e) => void onSubmit(e)}>
              <p className="text-muted small mb-4">
                Fields marked with <span className="text-danger" aria-hidden="true">*</span> are required.
              </p>

              <div className="form-group">
                <label className="control-label col-12" htmlFor="profile-email">Email</label>
                <div>
                  <input
                    id="profile-email"
                    value={user.email}
                    className="form-control col-12"
                    readOnly
                    disabled
                  />
                </div>
              </div>
              <br />
              <div className="form-group">
                <label className="control-label col-12" htmlFor="profile-name">
                  Name
                  <RequiredMark />
                </label>
                <div>
                  <input
                    id="profile-name"
                    defaultValue={user.name}
                    className="form-control col-12"
                    name="name"
                    required
                  />
                </div>
              </div>
              <br />
              <div className="form-group">
                <label className="control-label col-12" htmlFor="profile-employee-number">
                  Employee Number
                  <RequiredMark />
                </label>
                <div>
                  <input
                    id="profile-employee-number"
                    defaultValue={user.employeeNumber}
                    className="form-control col-12"
                    name="employeeNumber"
                    required
                  />
                </div>
              </div>
              <br />
              <div className="form-group">
                <label className="control-label" htmlFor="profile-unit-station">
                  Unit or Station
                  <RequiredMark />
                </label>
                <div className="col-12">
                  <select
                    id="profile-unit-station"
                    className="form-control col-12"
                    name="unitStation"
                    value={unitStation}
                    onChange={(e) => setUnitStation(e.target.value)}
                    required
                    disabled={!stationsReady}
                  >
                    {stations.map((s) => (
                      <option key={s || 'empty'} value={s}>
                        {s || ' '}
                      </option>
                    ))}
                  </select>
                  {!stationsReady ? (
                    <p className="form-text text-muted mb-0 mt-1">Loading station list…</p>
                  ) : null}
                </div>
              </div>
              <br />
              <div className="form-group">
                <div className="form-check">
                  <input
                    type="radio"
                    className="form-check-input"
                    id="employmentFullTime"
                    name="casual"
                    value="fulltime"
                    defaultChecked={!user.casual}
                  />
                  <label className="form-check-label" htmlFor="employmentFullTime">Full time</label>
                </div>
                <div className="form-check">
                  <input
                    type="radio"
                    className="form-check-input"
                    id="employmentCasual"
                    name="casual"
                    value="casual"
                    defaultChecked={user.casual}
                  />
                  <label className="form-check-label" htmlFor="employmentCasual">Casual</label>
                </div>
              </div>
              <br />
              <div className="form-group">
                <div className="form-check">
                  <input
                    type="radio"
                    className="form-check-input"
                    id="employmentMetro"
                    name="isCountryEmployee"
                    value="metro"
                    defaultChecked={!user.isCountryEmployee}
                  />
                  <label className="form-check-label" htmlFor="employmentMetro">Metro</label>
                </div>
                <div className="form-check">
                  <input
                    type="radio"
                    className="form-check-input"
                    id="employmentCountry"
                    name="isCountryEmployee"
                    value="country"
                    defaultChecked={user.isCountryEmployee}
                  />
                  <label className="form-check-label" htmlFor="employmentCountry">Country</label>
                </div>
              </div>
              <br />
              <div className="form-group">
                <span className="control-label col-12 d-block" id="profile-signature-label">
                  Signature
                  <RequiredMark />
                </span>
                <br />
                {signaturePreviewSrc ? (
                  <div className="mb-2">
                    <img
                      src={signaturePreviewSrc}
                      alt="Current signature"
                      className="admin-signature-preview profile-signature-preview"
                    />
                  </div>
                ) : null}
                {!signatureEditing ? (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    aria-describedby={
                      signatureError ? 'profile-signature-label profile-signature-error' : 'profile-signature-label'
                    }
                    onClick={() => {
                      const ctx = canvasRef.current?.getContext('2d')
                      ctx?.clearRect(0, 0, SIGNATURE_CANVAS_W, SIGNATURE_CANVAS_H)
                      setSignatureTouched(false)
                      setSignatureEditing(true)
                      setSignatureError(false)
                    }}
                  >
                    Edit signature
                  </button>
                ) : null}
                {signatureError ? (
                  <p className="form-text text-danger mb-0 mt-1" id="profile-signature-error" role="alert">
                    Add a signature to continue.
                  </p>
                ) : null}
                <br />
                <div className={`collapse date${signatureEditing ? ' show' : ''}`}>
                  <canvas
                    id="signatureCanvas"
                    ref={canvasRef}
                    className="signature-canvas-editing"
                    width={SIGNATURE_CANVAS_W}
                    height={SIGNATURE_CANVAS_H}
                    aria-labelledby="profile-signature-label"
                    style={{ touchAction: 'none' }}
                    onPointerDown={(e) => {
                      if (!signatureEditing || !canvasRef.current) return
                      e.preventDefault()
                      canvasRef.current.setPointerCapture(e.pointerId)
                      setSignatureError(false)
                      setSignatureTouched(true)
                      setDrawing(true)
                      const ctx = canvasRef.current.getContext('2d')
                      if (!ctx) return
                      const { x, y } = canvasPoint(canvasRef.current, e.clientX, e.clientY)
                      ctx.beginPath()
                      ctx.moveTo(x, y)
                    }}
                    onPointerUp={(e) => {
                      canvasRef.current?.releasePointerCapture(e.pointerId)
                      setDrawing(false)
                    }}
                    onPointerLeave={() => setDrawing(false)}
                    onPointerMove={(e) => {
                      if (!signatureEditing || !drawing || !canvasRef.current) return
                      const ctx = canvasRef.current.getContext('2d')
                      if (!ctx) return
                      const { x, y } = canvasPoint(canvasRef.current, e.clientX, e.clientY)
                      ctx.lineTo(x, y)
                      ctx.strokeStyle = 'black'
                      ctx.lineWidth = 2
                      ctx.stroke()
                    }}
                  />
                  {signatureEditing ? (
                    <div className="signature-canvas-actions">
                      <button
                        className="btn btn-outline-secondary"
                        type="button"
                        onClick={() => {
                          const ctx = canvasRef.current?.getContext('2d')
                          ctx?.clearRect(0, 0, SIGNATURE_CANVAS_W, SIGNATURE_CANVAS_H)
                          setSignatureTouched(false)
                        }}
                      >
                        Clear
                      </button>
                      <button
                        className="btn btn-outline-secondary"
                        type="button"
                        onClick={() => finishSignatureEdit()}
                      >
                        Done
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <hr className="my-4" />

              <div className="form-group">
                <label className="control-label col-12" htmlFor="profile-manager-email">
                  Authorising manager email
                </label>
                <div>
                  <input
                    id="profile-manager-email"
                    type="email"
                    defaultValue={user.authorisingManagerEmail}
                    className="form-control col-12"
                    name="authorisingManagerEmail"
                    placeholder="supervisor@example.com"
                    autoComplete="email"
                  />
                </div>
                <p className="form-text text-muted mb-0 mt-1">
                  Used to pre-fill <strong>Email for approval</strong> on your timesheet.
                </p>
              </div>
              <br />
              <div className="form-group">
                <label className="control-label col-12" htmlFor="profile-default-shift-hours">
                  Default Shift Hours
                </label>
                <div>
                  <input
                    id="profile-default-shift-hours"
                    className="form-control col-12"
                    name="defaultShiftHours"
                    placeholder="10.5"
                    defaultValue={user.defaultShiftHours ?? ''}
                  />
                </div>
              </div>
              <br />
              <div className="form-group">
                <label className="control-label" htmlFor="profile-default-shift-code">
                  Default Shift Code
                </label>
                <div className="col-12">
                  <select
                    id="profile-default-shift-code"
                    className="form-control col-12"
                    name="defaultShiftCode"
                    defaultValue={user.defaultShiftCode || 'None'}
                  >
                    {SHIFT_CODE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label || ' '}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <br />
              <hr />
              <button
                type="submit"
                className={`btn ${savePhase === 'saved' ? 'btn-outline-success btn-submit-saved' : 'btn-success'}`}
                disabled={savePhase === 'busy'}
              >
                {saveLabel('Save profile')}
              </button>
            </form>
          </div>
        </div>
      </div>
      <p className="mt-3">
        <Link to="/">Back to timesheets</Link>
      </p>
    </>
  )
}
