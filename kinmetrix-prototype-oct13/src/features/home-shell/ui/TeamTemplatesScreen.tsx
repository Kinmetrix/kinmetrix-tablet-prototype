import { useCallback, useState } from 'react'
import { BreadcrumbItem, Breadcrumbs } from '../../../shared/primitives/breadcrumbs/Breadcrumbs'
import { Button } from '../../../shared/primitives/buttons/Button'
import { Typography } from '../../../shared/primitives/typography/Typography'
import { TEMPLATE_LIBRARIES, type TemplateLibraryId } from '../model/teamWorkspaceCatalog'
import { ShellNavIcon } from './ShellNavIcon'

type Library = (typeof TEMPLATE_LIBRARIES)[number]

function TemplateLibraryRow({
  library,
  onSelect,
}: {
  library: Library
  onSelect: (id: TemplateLibraryId) => void
}) {
  const handleSelect = useCallback(() => {
    onSelect(library.id)
  }, [library.id, onSelect])

  return (
    <Button variant="outline" fullWidth className="team-library-row" onClick={handleSelect}>
      <ShellNavIcon name={library.icon} />
      <span className="team-library-copy">
        <Typography variant="body" as="strong">
          {library.label}
        </Typography>
        <Typography variant="label">{library.description}</Typography>
      </span>
    </Button>
  )
}

function TemplateLibraryDetail({
  library,
  onBack,
}: {
  library: Library
  onBack: () => void
}) {
  return (
    <div className="shell-page">
      <header className="shell-page-head">
        <Breadcrumbs>
          <BreadcrumbItem onSelect={onBack}>Templates</BreadcrumbItem>
          <BreadcrumbItem current>{library.label}</BreadcrumbItem>
        </Breadcrumbs>
        <Typography variant="display" as="h1">
          {library.label}
        </Typography>
        <Typography variant="muted">{library.description}</Typography>
      </header>
    </div>
  )
}

export function TeamTemplatesScreen() {
  const [libraryId, setLibraryId] = useState<TemplateLibraryId | null>(null)
  const library = TEMPLATE_LIBRARIES.find((item) => item.id === libraryId) ?? null

  const handleBack = useCallback(() => {
    setLibraryId(null)
  }, [])

  if (library) {
    return <TemplateLibraryDetail library={library} onBack={handleBack} />
  }

  return (
    <div className="shell-page">
      <header className="shell-page-head">
        <Typography variant="display" as="h1">
          Templates
        </Typography>
        <Typography variant="muted">
          Assessments, smart sessions, and programs for this team.
        </Typography>
      </header>
      <div className="team-library-list">
        {TEMPLATE_LIBRARIES.map((item) => (
          <TemplateLibraryRow key={item.id} library={item} onSelect={setLibraryId} />
        ))}
      </div>
    </div>
  )
}
