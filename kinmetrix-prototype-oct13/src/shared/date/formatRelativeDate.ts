function calendarDatePart(isoDate: string): string {
  return isoDate.split('T')[0] ?? isoDate
}

function startOfLocalDay(isoDate: string): Date {
  const [year, month, day] = calendarDatePart(isoDate).split('-').map((part) => Number(part))
  return new Date(year, month - 1, day)
}

function dayDiff(from: Date, to: Date): number {
  const msPerDay = 86_400_000
  return Math.round((startOfLocalDayFromDate(to).getTime() - startOfLocalDayFromDate(from).getTime()) / msPerDay)
}

function startOfLocalDayFromDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function shortMonthDay(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Compact relative label from `isoDate` (YYYY-MM-DD or ISO datetime) to `reference` (defaults to now). */
export function formatRelativeDate(isoDate: string, reference: Date = new Date()): string {
  const targetDay = startOfLocalDay(isoDate)
  const referenceDay = startOfLocalDayFromDate(reference)
  const sameCalendarDay = targetDay.getTime() === referenceDay.getTime()

  if (isoDate.includes('T') && sameCalendarDay) {
    const target = new Date(isoDate)
    const diffMs = reference.getTime() - target.getTime()
    if (diffMs >= 0 && diffMs < 86_400_000) {
      const hours = Math.floor(diffMs / 3_600_000)
      if (hours < 1) {
        return 'now'
      }
      return `${hours}h`
    }
  }

  const diffDays = dayDiff(targetDay, reference)

  if (diffDays <= 0) {
    return 'today'
  }
  if (diffDays < 7) {
    return `${diffDays}d`
  }
  if (diffDays < 28) {
    return `${Math.floor(diffDays / 7)}w`
  }
  return shortMonthDay(targetDay)
}

/** TL23 audit-feed copy: human-relative time from a compact `formatRelativeDate` label. */
export function formatActivityFeedWhen(timeLabel: string): string {
  if (timeLabel === 'now') {
    return 'just now'
  }
  if (timeLabel === 'today') {
    return 'today'
  }
  const hours = timeLabel.match(/^(\d+)h$/)
  if (hours) {
    return `${hours[1]}h ago`
  }
  const days = timeLabel.match(/^(\d+)d$/)
  if (days) {
    return `${days[1]}d ago`
  }
  const weeks = timeLabel.match(/^(\d+)w$/)
  if (weeks) {
    return `${weeks[1]}w ago`
  }
  return timeLabel
}
