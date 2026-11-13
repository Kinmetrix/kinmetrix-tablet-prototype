export type CompareMarkerShape = 'circle' | 'square' | 'triangle'

export type MemberCompareSeriesStyle = {
  stroke: string
  dasharray: string | undefined
  marker: CompareMarkerShape
}

export type MemberCompareSnapshot = {
  memberId: string
  name: string
  dateLabel: string
  forces: readonly number[]
  stabilityPercent: number
  style: MemberCompareSeriesStyle
  canOpenAnalysis: boolean
}

export type MemberCompareCandidate = {
  memberId: string
  name: string
  dateLabel: string
  hasCompareData: boolean
}
