/** Initials-avatar palettes aligned with activity-rail `faces/*.svg` prototypes. */
const MEMBER_AVATAR_THEMES = new Set(['jordan', 'alex', 'jamie', 'taylor', 'sam'])

export function memberAvatarThemeClass(memberId: string): string {
  if (MEMBER_AVATAR_THEMES.has(memberId)) {
    return `is-member-${memberId}`
  }
  return 'is-member-default'
}
