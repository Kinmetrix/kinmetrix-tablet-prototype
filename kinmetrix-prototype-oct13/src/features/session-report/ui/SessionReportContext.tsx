import { createContext, useContext, type ReactNode } from 'react'
import {
  useSessionReportController,
  type SessionReportController,
} from '../hooks/useSessionReportController'

const SessionReportContext = createContext<SessionReportController | null>(null)

type Props = {
  children: ReactNode
}

export function SessionReportProvider({ children }: Props) {
  const controller = useSessionReportController()
  return (
    <SessionReportContext.Provider value={controller}>
      {children}
    </SessionReportContext.Provider>
  )
}

export function useSessionReport(): SessionReportController {
  const context = useContext(SessionReportContext)
  if (!context) {
    throw new Error('useSessionReport must be used within SessionReportProvider')
  }
  return context
}
