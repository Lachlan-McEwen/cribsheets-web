import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

export type ToastVariant = 'success' | 'error' | 'info'

type ToastItem = {
  id: number
  message: string
  variant: ToastVariant
}

type ToastContextValue = {
  push: (message: string, variant: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let nextToastId = 0

const AUTO_DISMISS_MS: Record<ToastVariant, number> = {
  success: 4000,
  error: 7000,
  info: 5000,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const push = useCallback((message: string, variant: ToastVariant) => {
    const id = ++nextToastId
    setToasts((current) => [...current.slice(-4), { id, message, variant }])
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const value = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[]
  onDismiss: (id: number) => void
}) {
  return createPortal(
    <div className="cs-toast-viewport" aria-live="polite" aria-relevant="additions text">
      {toasts.map((t) => (
        <Toast key={t.id} item={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>,
    document.body,
  )
}

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, AUTO_DISMISS_MS[item.variant])
    return () => window.clearTimeout(timer)
  }, [item.id, item.variant, onDismiss])

  return (
    <div
      className={`cs-toast cs-toast--${item.variant}`}
      role={item.variant === 'error' ? 'alert' : 'status'}
    >
      <span className="cs-toast__message">{item.message}</span>
      <button type="button" className="cs-toast__dismiss" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return {
    success: (message: string) => ctx.push(message, 'success'),
    error: (message: string) => ctx.push(message, 'error'),
    info: (message: string) => ctx.push(message, 'info'),
  }
}
