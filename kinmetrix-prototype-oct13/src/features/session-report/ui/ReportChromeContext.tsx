import { createContext, useContext, type ReactNode } from 'react'

export type ReportChrome = {
  embedded: boolean
  onExitToHome?: () => void
}

const defaultChrome: ReportChrome = { embedded: false }

const ReportChromeContext = createContext<ReportChrome>(defaultChrome)

type Props = {
  chrome?: ReportChrome
  children: ReactNode
}

export function ReportChromeProvider({ chrome, children }: Props) {
  return (
    <ReportChromeContext.Provider value={chrome ?? defaultChrome}>
      {children}
    </ReportChromeContext.Provider>
  )
}

export function useReportChrome(): ReportChrome {
  return useContext(ReportChromeContext)
}
