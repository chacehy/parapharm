'use client'
import { useState, useCallback, createContext, useContext, useEffect } from 'react'
import { X, CheckCircle, AlertCircle } from 'lucide-react'

interface Toast { id: string; message: string; type: 'success' | 'error' }
interface ToastCtx { success: (msg: string) => void; error: (msg: string) => void }

const ToastContext = createContext<ToastCtx>({ success: () => {}, error: () => {} })

export function useToast() { return useContext(ToastContext) }

export function ToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const add = useCallback((message: string, type: Toast['type']) => {
    const id = crypto.randomUUID()
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => remove(id), 4000)
  }, [remove])

  // Expose globally
  useEffect(() => {
    (window as any).__toast = { success: (m: string) => add(m, 'success'), error: (m: string) => add(m, 'error') }
  }, [add])

  return (
    <ToastContext.Provider value={{ success: (m) => add(m, 'success'), error: (m) => add(m, 'error') }}>
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type === 'error' ? 'toast-error' : ''}`}>
            {t.type === 'success' ? <CheckCircle size={16} color="#4ade80" /> : <AlertCircle size={16} color="#f87171" />}
            <span style={{ fontSize: '0.875rem', flex: 1 }}>{t.message}</span>
            <button onClick={() => remove(t.id)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// Utility for imperative usage outside React tree
export const toast = {
  success: (msg: string) => (window as any).__toast?.success(msg),
  error: (msg: string) => (window as any).__toast?.error(msg),
}
