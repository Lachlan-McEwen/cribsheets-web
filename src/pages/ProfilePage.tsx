import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.tsx'
import { useToast } from '../feedback/ToastContext.tsx'
import { useSubmitPhase } from '../feedback/useSubmitPhase.ts'
import { profileSignatureUrl, updateProfile } from '../lib/api.ts'
import { SHIFT_CODE_OPTIONS } from '../lib/enumLabels.ts'
import { loadStationNames } from '../lib/stations.ts'

export function ProfilePage() {
  const { user, refresh } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stations, setStations] = useState<string[]>([''])
  const [showCanvas, setShowCanvas] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const [signatureTouched, setSignatureTouched] = useState(false)
  const toast = useToast()
  const { phase: savePhase, start: startSave, succeed: saveSucceeded, fail: saveFailed, label: saveLabel } =
    useSubmitPhase()

  useEffect(() => {
    void loadStationNames().then(setStations)
  }, [])

  if (!user) return null

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    startSave()
    const fd = new FormData(e.currentTarget)
    let signatureDataUrl: string | null = null
    if (showCanvas && signatureTouched && canvasRef.current) {
      signatureDataUrl = canvasRef.current.toDataURL('image/png')
    }
    try {
      await updateProfile({
        name: String(fd.get('name') ?? ''),
        employeeNumber: String(fd.get('employeeNumber') ?? ''),
        unitStation: String(fd.get('unitStation') ?? ''),
        casual: fd.get('casual') === 'on',
        isCountryEmployee: fd.get('isCountryEmployee') === 'country',
        defaultShiftHours: fd.get('defaultShiftHours')
          ? Number(fd.get('defaultShiftHours'))
          : null,
        defaultShiftCode: String(fd.get('defaultShiftCode') ?? 'None'),
        signatureDataUrl,
      })
      await refresh()
      saveSucceeded()
      toast.success('Profile saved.')
      setShowCanvas(false)
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
              <div className="form-group">
                <label className="control-label col-12">Email</label>
                <div>
                  <input value={user.email} className="form-control col-12" readOnly disabled />
                </div>
              </div>
              <br />
              <div className="form-group">
                <label className="control-label col-12">Name</label>
                <div>
                  <input defaultValue={user.name} className="form-control col-12" name="name" required />
                </div>
              </div>
              <br />
              <div className="form-group">
                <label className="control-label col-12">Employee Number</label>
                <div>
                  <input
                    defaultValue={user.employeeNumber}
                    className="form-control col-12"
                    name="employeeNumber"
                    required
                  />
                </div>
              </div>
              <br />
              <div className="form-group">
                <label className="control-label">Unit or Station</label>
                <div className="col-12">
                  <select defaultValue={user.unitStation} className="form-control col-12" name="unitStation" required>
                    {stations.map((s) => (
                      <option key={s || 'empty'} value={s}>
                        {s || ' '}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <br />
              <div className="form-group">
                <label className="control-label col-12">Default Shift Hours</label>
                <div>
                  <input
                    className="form-control col-12"
                    name="defaultShiftHours"
                    placeholder="10.5"
                    defaultValue={user.defaultShiftHours ?? ''}
                  />
                </div>
              </div>
              <br />
              <div className="form-group">
                <label className="control-label">Default Shift Code</label>
                <div className="col-12">
                  <select
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
              <div className="form-group">
                <div className="checkbox col-6">
                  <input
                    type="checkbox"
                    className="checkbox"
                    id="casual"
                    name="casual"
                    defaultChecked={user.casual}
                  />
                  <label className="control-label" htmlFor="casual">Casual</label>
                </div>
              </div>
              <br />
              <div className="form-group">
                <label className="control-label col-12">Employment location</label>
                <p className="text-muted small mb-2">
                  Choose your employment type as shown on the timesheet (Country or Metro).
                </p>
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
                <label> Signature </label>
                <br />
                {user.hasSignature ? (
                  <div className="mb-2">
                    <img src={profileSignatureUrl()} alt="Current signature" className="admin-signature-preview" />
                  </div>
                ) : null}
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowCanvas((v) => !v)}
                >
                  {user.hasSignature ? 'Replace signature' : 'Add new signature'}
                </button>
                <br />
                <div className={`collapse date${showCanvas ? ' show' : ''}`}>
                  <canvas
                    id="signatureCanvas"
                    ref={canvasRef}
                    width={500}
                    height={250}
                    onMouseDown={(e) => {
                      setSignatureTouched(true)
                      setDrawing(true)
                      const ctx = canvasRef.current?.getContext('2d')
                      if (!ctx || !canvasRef.current) return
                      const rect = canvasRef.current.getBoundingClientRect()
                      ctx.beginPath()
                      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
                    }}
                    onMouseUp={() => setDrawing(false)}
                    onMouseLeave={() => setDrawing(false)}
                    onMouseMove={(e) => {
                      if (!drawing || !canvasRef.current) return
                      const ctx = canvasRef.current.getContext('2d')
                      if (!ctx) return
                      const rect = canvasRef.current.getBoundingClientRect()
                      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
                      ctx.strokeStyle = 'black'
                      ctx.lineWidth = 2
                      ctx.stroke()
                    }}
                  />
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => {
                      const ctx = canvasRef.current?.getContext('2d')
                      ctx?.clearRect(0, 0, 500, 250)
                    }}
                  >
                    Clear
                  </button>
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
      {!user.profileIsComplete ? (
        <p className="text-muted mt-3">
          Complete your profile (including signature) to access the timesheet.{' '}
          <Link to="/">Back to timesheets</Link> once saved.
        </p>
      ) : (
        <p className="mt-3">
          <Link to="/">Back to timesheets</Link>
        </p>
      )}
    </>
  )
}
