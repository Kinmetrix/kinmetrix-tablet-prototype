export type TeamNavIcon =
  | 'overview'
  | 'activity'
  | 'members'
  | 'templates'
  | 'settings'
  | 'device'
  | 'assessments'
  | 'smart-sessions'
  | 'programs'

export type TeamCanvas =
  | { readonly kind: 'overview' }
  | { readonly kind: 'activity' }
  | { readonly kind: 'roster' }
  | { readonly kind: 'compare' }
  | { readonly kind: 'templates' }
  | { readonly kind: 'settings' }
  | { readonly kind: 'device' }

export const TEAM_COMPARE_DESTINATION = 'compare-members' as const
export type TeamCompareDestination = typeof TEAM_COMPARE_DESTINATION

type TeamNavLeaf<D extends string = string> = {
  readonly kind: 'leaf'
  readonly destination: D
  readonly label: string
  readonly icon: TeamNavIcon
  readonly canvas: TeamCanvas
}

export const TEAM_WORKSPACE_CHROME = {
  helpLabel: 'Help',
  helpBody:
    'Open Device to connect Arc. Open Templates for assessments, smart sessions, and programs.',
} as const

export const TEMPLATE_LIBRARIES = [
  {
    id: 'assessments',
    label: 'Assessments',
    icon: 'assessments',
    description: 'Protocols the team runs from this workspace.',
  },
  {
    id: 'smart-sessions',
    label: 'Smart sessions',
    icon: 'smart-sessions',
    description: 'Smart session setups shared across the roster.',
  },
  {
    id: 'programs',
    label: 'Programs',
    icon: 'programs',
    description: 'Multi-day plans assigned from the team workspace.',
  },
] as const satisfies readonly {
  id: string
  label: string
  icon: TeamNavIcon
  description: string
}[]

export type TemplateLibraryId = (typeof TEMPLATE_LIBRARIES)[number]['id']

export const TEAM_SETTINGS_SECTIONS = [
  {
    id: 'waiver',
    label: 'Waiver policy',
    description: 'When members must sign before a session.',
  },
  {
    id: 'onboarding',
    label: 'Onboarding preferences',
    description: 'Setup choices for a new clinician on this team.',
  },
] as const

export type TeamSettingsSectionId = (typeof TEAM_SETTINGS_SECTIONS)[number]['id']

export const TEAM_WORKSPACE_CATALOG = {
  nav: [
    {
      kind: 'leaf',
      destination: 'overview',
      label: 'Overview',
      icon: 'overview',
      canvas: { kind: 'overview' },
    },
    {
      kind: 'leaf',
      destination: 'activity',
      label: 'Activity',
      icon: 'activity',
      canvas: { kind: 'activity' },
    },
    {
      kind: 'leaf',
      destination: 'roster',
      label: 'Members',
      icon: 'members',
      canvas: { kind: 'roster' },
    },
    {
      kind: 'leaf',
      destination: 'templates',
      label: 'Templates',
      icon: 'templates',
      canvas: { kind: 'templates' },
    },
    {
      kind: 'leaf',
      destination: 'team-settings',
      label: 'Team settings',
      icon: 'settings',
      canvas: { kind: 'settings' },
    },
    {
      kind: 'leaf',
      destination: 'device',
      label: 'Device',
      icon: 'device',
      canvas: { kind: 'device' },
    },
  ],
} as const satisfies { nav: readonly TeamNavLeaf[] }

type CatalogNav = (typeof TEAM_WORKSPACE_CATALOG)['nav']
type CatalogLeaf = CatalogNav[number]

export type TeamShellDestination = CatalogLeaf['destination'] | TeamCompareDestination

function uniqueLeafByCanvas(kind: 'overview' | 'roster'): CatalogLeaf {
  const matches = TEAM_WORKSPACE_CATALOG.nav.filter((leaf) => leaf.canvas.kind === kind)
  if (matches.length !== 1) {
    throw new Error(`Team catalog must have exactly one ${kind} leaf`)
  }
  return matches[0]
}

export const TEAM_HOME_DESTINATION: TeamShellDestination =
  uniqueLeafByCanvas('overview').destination

export const TEAM_ROSTER_DESTINATION: TeamShellDestination =
  uniqueLeafByCanvas('roster').destination

export const TEAM_ACTIVITY_DESTINATION = 'activity' as const satisfies TeamShellDestination

export function teamCanvasFor(destination: TeamShellDestination): TeamCanvas {
  if (destination === TEAM_COMPARE_DESTINATION) {
    return { kind: 'compare' }
  }
  const leaf = TEAM_WORKSPACE_CATALOG.nav.find((item) => item.destination === destination)
  if (!leaf) {
    throw new Error(`Team catalog is missing ${destination}`)
  }
  return leaf.canvas
}

export function teamNavHighlightsDestination(
  destination: TeamShellDestination,
  navDestination: CatalogLeaf['destination'],
): boolean {
  if (destination === TEAM_COMPARE_DESTINATION) {
    return navDestination === 'roster'
  }
  return destination === navDestination
}
