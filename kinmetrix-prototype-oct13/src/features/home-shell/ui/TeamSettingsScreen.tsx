import { useCallback, useState } from 'react'
import { BreadcrumbItem, Breadcrumbs } from '../../../shared/primitives/breadcrumbs/Breadcrumbs'
import { Button } from '../../../shared/primitives/buttons/Button'
import { Typography } from '../../../shared/primitives/typography/Typography'
import { TEAM_SETTINGS_SECTIONS, type TeamSettingsSectionId } from '../model/teamWorkspaceCatalog'

type Section = (typeof TEAM_SETTINGS_SECTIONS)[number]

function SettingsSectionRow({
  section,
  onSelect,
}: {
  section: Section
  onSelect: (id: TeamSettingsSectionId) => void
}) {
  const handleSelect = useCallback(() => {
    onSelect(section.id)
  }, [onSelect, section.id])

  return (
    <Button variant="outline" fullWidth className="team-library-row" onClick={handleSelect}>
      <span className="team-library-copy">
        <Typography variant="body" as="strong">
          {section.label}
        </Typography>
        <Typography variant="label">{section.description}</Typography>
      </span>
    </Button>
  )
}

function SettingsSectionDetail({ section, onBack }: { section: Section; onBack: () => void }) {
  return (
    <div className="shell-page">
      <header className="shell-page-head">
        <Breadcrumbs>
          <BreadcrumbItem onSelect={onBack}>Team settings</BreadcrumbItem>
          <BreadcrumbItem current>{section.label}</BreadcrumbItem>
        </Breadcrumbs>
        <Typography variant="display" as="h1">
          {section.label}
        </Typography>
        <Typography variant="muted">{section.description}</Typography>
      </header>
    </div>
  )
}

export function TeamSettingsScreen() {
  const [sectionId, setSectionId] = useState<TeamSettingsSectionId | null>(null)
  const section = TEAM_SETTINGS_SECTIONS.find((item) => item.id === sectionId) ?? null

  const handleBack = useCallback(() => {
    setSectionId(null)
  }, [])

  if (section) {
    return <SettingsSectionDetail section={section} onBack={handleBack} />
  }

  return (
    <div className="shell-page">
      <header className="shell-page-head">
        <Typography variant="display" as="h1">
          Team settings
        </Typography>
        <Typography variant="muted">
          Waiver policy and onboarding preferences for this team.
        </Typography>
      </header>
      <div className="team-library-list">
        {TEAM_SETTINGS_SECTIONS.map((item) => (
          <SettingsSectionRow key={item.id} section={item} onSelect={setSectionId} />
        ))}
      </div>
    </div>
  )
}
