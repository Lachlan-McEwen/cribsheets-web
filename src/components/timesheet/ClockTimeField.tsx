type Props = {
  id?: string
  label: string
  value: string | null | undefined
  onChange: (value: string | null) => void
  disabled?: boolean
}

/** Native time-of-day control (24h); value stored as `HH:mm`. */
export function ClockTimeField({ id, label, value, onChange, disabled }: Props) {
  const inputValue = value?.trim() ? value.slice(0, 5) : ''

  return (
    <div className="native-time-field">
      <label className="native-time-field__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="time"
        className="form-control native-time-field__input"
        step={60}
        disabled={disabled}
        value={inputValue}
        onChange={(e) => onChange(e.target.value ? e.target.value.slice(0, 5) : null)}
      />
    </div>
  )
}
