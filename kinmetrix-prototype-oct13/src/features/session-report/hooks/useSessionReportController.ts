import { useCallback, useMemo, useRef, useState, type RefObject } from 'react'
import { flushSync } from 'react-dom'
import { buildMeasurementsCsv } from '../model/exportMeasurementsCsv'
import { createDefaultSessionReportState, normalizePersistedPlan } from '../model/sessionReportModel'
import { loadPersistedSession, savePersistedSession } from '../services/sessionReportStorage'
import type {
  ChartMode,
  CompareWith,
  ExerciseMethod,
  ForceUnit,
  MapView,
  ProgressMetric,
  ReportTabView,
  ReportView,
  ResultScenario,
  SessionContextTag,
  SessionPurpose,
  SessionReportState,
  SheetKind,
  SymmetryProfile,
} from '../model/sessionReportTypes'

export type SessionReportController = {
  state: SessionReportState
  toast: string
  setView: (view: ReportView) => void
  setCompare: (compare: CompareWith) => void
  setMapView: (mapView: MapView) => void
  setShowComparison: (show: boolean) => void
  selectDirection: (index: number) => void
  openDirectionSheet: (index: number, from?: ReportTabView) => void
  closeSheet: () => void
  openSheet: (kind: Exclude<SheetKind, 'closed' | 'direction'>, pairIndex?: number) => void
  expandDirectionSheet: () => void
  setRep: (rep: number) => void
  setChart: (chart: ChartMode) => void
  setSample: (sample: number) => void
  setMetric: (metric: ProgressMetric) => void
  notify: (message: string) => void
  applyPreviewSettings: (input: PreviewSettingsInput) => void
  savePlan: (input: PlanFormInput) => void
  saveSessionContext: (input: SessionContextInput) => void
  applySymmetrySettings: (profile: SymmetryProfile, tolerance: number) => void
  resetPrototype: () => void
  printReport: () => void
  downloadCsv: () => void
  completeHandoff: () => void
  resumeReport: () => void
  toggleClientPicker: () => void
  setClientSearch: (query: string) => void
  selectClient: (name: string) => void
  setNextSessionField: (field: 'nextPurpose' | 'nextMethod' | 'nextCount', value: string) => void
  submitNextSession: () => void
  editNextSession: () => void
  goBackFromDirection: () => void
  goToNextDirection: () => void
  sheetDialogRef: RefObject<HTMLDialogElement | null>
}

export type PreviewSettingsInput = {
  count: 4 | 8
  unit: ForceUnit
  reps: number
  method: ExerciseMethod
  purpose: SessionPurpose
  scenario: ResultScenario
}

export type PlanFormInput = {
  frequency: number
  weeks: number
  repetitions: number
  smartSessionTemplateId: SessionReportState['plan']['smartSessionTemplateId']
}

export type SessionContextInput = {
  note: string
  sessionContextTag: SessionContextTag
}

export function useSessionReportController(): SessionReportController {
  const [state, setState] = useState(() => createDefaultSessionReportState(loadPersistedSession()))
  const [toast, setToast] = useState('')
  const sheetDialogRef = useRef<HTMLDialogElement>(null)
  const toastTimerRef = useRef<number | null>(null)

  const notify = useCallback((message: string) => {
    setToast(message)
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current)
    }
    toastTimerRef.current = window.setTimeout(() => setToast(''), 3200)
  }, [])

  const setView = useCallback((view: ReportView) => {
    setState((previous) => ({ ...previous, view }))
  }, [])

  const setCompare = useCallback((compare: CompareWith) => {
    setState((previous) => ({ ...previous, compare, showComparison: true }))
  }, [])

  const setMapView = useCallback((mapView: MapView) => {
    setState((previous) => ({ ...previous, mapView }))
  }, [])

  const setShowComparison = useCallback((showComparison: boolean) => {
    setState((previous) => ({ ...previous, showComparison }))
  }, [])

  const selectDirection = useCallback((index: number) => {
    setState((previous) => ({ ...previous, selected: index }))
  }, [])

  const openSheetDialog = useCallback(() => {
    const dialog = sheetDialogRef.current
    if (dialog && !dialog.open) {
      dialog.showModal()
    }
  }, [])

  const closeSheet = useCallback(() => {
    setState((previous) => ({
      ...previous,
      sheet: { kind: 'closed', pairIndex: null },
    }))
    sheetDialogRef.current?.close()
  }, [])

  const openSheet = useCallback(
    (kind: Exclude<SheetKind, 'closed' | 'direction'>, pairIndex?: number) => {
      setState((previous) => ({
        ...previous,
        sheet: { kind, pairIndex: pairIndex ?? null },
      }))
      openSheetDialog()
    },
    [openSheetDialog],
  )

  const openDirectionSheet = useCallback(
    (index: number, from: ReportTabView = 'overview') => {
      setState((previous) => ({
        ...previous,
        from,
        selected: index,
        rep: 0,
        chart: 'force',
        sample: 2.5,
        sheet: { kind: 'direction', pairIndex: null },
      }))
      openSheetDialog()
    },
    [openSheetDialog],
  )

  const expandDirectionSheet = useCallback(() => {
    closeSheet()
    setState((previous) => ({ ...previous, view: 'direction' }))
  }, [closeSheet])

  const setRep = useCallback((rep: number) => {
    setState((previous) => ({ ...previous, rep }))
  }, [])

  const setChart = useCallback((chart: ChartMode) => {
    setState((previous) => ({ ...previous, chart }))
  }, [])

  const setSample = useCallback((sample: number) => {
    setState((previous) => ({ ...previous, sample }))
  }, [])

  const setMetric = useCallback((metric: ProgressMetric) => {
    setState((previous) => ({ ...previous, metric }))
  }, [])

  const applyPreviewSettings = useCallback(
    (input: PreviewSettingsInput) => {
      setState((previous) => {
        const indices =
          input.count === 4 ? [0, 2, 4, 6] : [0, 1, 2, 3, 4, 5, 6, 7]
        const selected = indices.includes(previous.selected) ? previous.selected : 0
        return {
          ...previous,
          count: input.count,
          unit: input.unit,
          reps: input.reps,
          method: input.method,
          purpose: input.purpose,
          scenario: input.scenario,
          view: 'overview',
          rep: 0,
          chart: 'force',
          compare: 'baseline',
          selected,
        }
      })
      closeSheet()
      notify('Prototype settings applied')
    },
    [closeSheet, notify],
  )

  const savePlan = useCallback(
    (input: PlanFormInput) => {
      const plan = normalizePersistedPlan({ ...state.plan, ...input })
      savePersistedSession({
        plan,
        note: state.note,
        sessionContextTag: state.sessionContextTag,
      })
      setState((previous) => ({ ...previous, plan }))
      notify('Plan saved')
    },
    [notify, state.note, state.plan, state.sessionContextTag],
  )

  const saveSessionContext = useCallback(
    (input: SessionContextInput) => {
      savePersistedSession({
        plan: state.plan,
        note: input.note,
        sessionContextTag: input.sessionContextTag,
      })
      setState((previous) => ({
        ...previous,
        note: input.note,
        sessionContextTag: input.sessionContextTag,
      }))
      notify('Session note saved')
    },
    [notify, state.plan],
  )

  const applySymmetrySettings = useCallback(
    (profile: SymmetryProfile, tolerance: number) => {
      setState((previous) => ({
        ...previous,
        symmetry: { profile, tolerance },
      }))
      closeSheet()
      notify('Example symmetry bands updated')
    },
    [closeSheet, notify],
  )

  const resetPrototype = useCallback(() => {
    setState(createDefaultSessionReportState(loadPersistedSession()))
    closeSheet()
    notify('Example restored')
  }, [closeSheet, notify])

  const printReport = useCallback(() => {
    closeSheet()
    flushSync(() => {
      setState((previous) => {
        if (previous.view === 'direction') {
          return { ...previous, view: previous.from }
        }
        if (previous.view === 'measurements' || previous.view === 'progress') {
          return { ...previous, view: 'overview' }
        }
        return previous
      })
    })
    window.print()
  }, [closeSheet])

  const downloadCsv = useCallback(() => {
    const blob = new Blob([buildMeasurementsCsv(state)], {
      type: 'text/csv;charset=utf-8',
    })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'kinmetrix-example-measurements.csv'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000)
    notify('Example measurements downloaded')
  }, [notify, state])

  const completeHandoff = useCallback(() => {
    setState((previous) => {
      const tabView: ReportTabView =
        previous.view === 'direction'
          ? previous.from
          : previous.view === 'overview' ||
              previous.view === 'measurements' ||
              previous.view === 'progress'
            ? previous.view
            : previous.lastReportView

      return {
      ...previous,
      lastReportView: tabView,
      nextClient: 'Jordan Hale',
      pickingClient: false,
      nextReady: false,
      nextPurpose: previous.purpose,
      nextMethod: previous.method,
      nextCount: String(previous.count) as '4' | '8',
      view: 'next',
      }
    })
  }, [])

  const resumeReport = useCallback(() => {
    setState((previous) => ({
      ...previous,
      view: previous.lastReportView,
    }))
  }, [])

  const toggleClientPicker = useCallback(() => {
    setState((previous) => ({
      ...previous,
      pickingClient: !previous.pickingClient,
    }))
  }, [])

  const setClientSearch = useCallback((clientSearch: string) => {
    setState((previous) => ({ ...previous, clientSearch }))
  }, [])

  const selectClient = useCallback((name: string) => {
    setState((previous) => ({
      ...previous,
      nextClient: name,
      pickingClient: false,
      nextReady: false,
    }))
  }, [])

  const setNextSessionField = useCallback(
    (field: 'nextPurpose' | 'nextMethod' | 'nextCount', value: string) => {
      setState((previous) => ({ ...previous, [field]: value }))
    },
    [],
  )

  const submitNextSession = useCallback(() => {
    setState((previous) => ({ ...previous, nextReady: true }))
  }, [])

  const editNextSession = useCallback(() => {
    setState((previous) => ({ ...previous, nextReady: false }))
  }, [])

  const goBackFromDirection = useCallback(() => {
    setState((previous) => ({ ...previous, view: previous.from }))
  }, [])

  const goToNextDirection = useCallback(() => {
    setState((previous) => {
      const indices =
        previous.count === 4 ? [0, 2, 4, 6] : [0, 1, 2, 3, 4, 5, 6, 7]
      const currentIndex = indices.indexOf(previous.selected)
      const next = indices[(currentIndex + 1) % indices.length]!
      return { ...previous, selected: next, rep: 0 }
    })
  }, [])

  return useMemo(
    () => ({
      state,
      toast,
      setView,
      setCompare,
      setMapView,
      setShowComparison,
      selectDirection,
      openDirectionSheet,
      closeSheet,
      openSheet,
      expandDirectionSheet,
      setRep,
      setChart,
      setSample,
      setMetric,
      notify,
      applyPreviewSettings,
      savePlan,
      saveSessionContext,
      applySymmetrySettings,
      resetPrototype,
      printReport,
      downloadCsv,
      completeHandoff,
      resumeReport,
      toggleClientPicker,
      setClientSearch,
      selectClient,
      setNextSessionField,
      submitNextSession,
      editNextSession,
      goBackFromDirection,
      goToNextDirection,
      sheetDialogRef,
    }),
    [
      state,
      toast,
      setView,
      setCompare,
      setMapView,
      setShowComparison,
      selectDirection,
      openDirectionSheet,
      closeSheet,
      openSheet,
      expandDirectionSheet,
      setRep,
      setChart,
      setSample,
      setMetric,
      notify,
      applyPreviewSettings,
      savePlan,
      saveSessionContext,
      applySymmetrySettings,
      resetPrototype,
      printReport,
      downloadCsv,
      completeHandoff,
      resumeReport,
      toggleClientPicker,
      setClientSearch,
      selectClient,
      setNextSessionField,
      submitNextSession,
      editNextSession,
      goBackFromDirection,
      goToNextDirection,
    ],
  )
}
