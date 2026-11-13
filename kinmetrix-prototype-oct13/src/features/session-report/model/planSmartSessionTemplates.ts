export const PLAN_SMART_SESSION_TEMPLATES = [
  {
    id: 'neck-strength-8',
    label: 'Neck strength · 8 directions',
    detail: 'Isometric · team default',
  },
  {
    id: 'neck-stability-8',
    label: 'Neck stability · 8 directions',
    detail: 'Isometric · lower load, longer holds',
  },
  {
    id: 'neck-maintenance-4',
    label: 'Maintenance · 4 directions',
    detail: 'Isometric · front, sides, and rear',
  },
] as const

export type PlanSmartSessionTemplateId = (typeof PLAN_SMART_SESSION_TEMPLATES)[number]['id']

export const DEFAULT_PLAN_SMART_SESSION_TEMPLATE_ID: PlanSmartSessionTemplateId =
  'neck-strength-8'

export function isPlanSmartSessionTemplateId(
  value: string,
): value is PlanSmartSessionTemplateId {
  return PLAN_SMART_SESSION_TEMPLATES.some((template) => template.id === value)
}

export function planSmartSessionTemplateLabel(id: PlanSmartSessionTemplateId): string {
  return (
    PLAN_SMART_SESSION_TEMPLATES.find((template) => template.id === id)?.label ?? id
  )
}
