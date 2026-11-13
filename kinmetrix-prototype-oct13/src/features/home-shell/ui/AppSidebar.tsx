import jordanHalePhoto from "../../../assets/jordan-hale-profile.png";
import { ParticipantAvatar } from "../../../shared/primitives/avatar/ParticipantAvatar";
import { Typography } from "../../../shared/primitives/typography/Typography";
import { useAppShell } from "./AppShellContext";
import { MEMBER_SHELL_NAV } from "../model/appShellTypes";
import { ShellNavLeaf } from "./ShellNavItem";
import { TeamSidebar } from "./TeamSidebar";

const MEMBER_PHOTOS: Record<string, string> = {
  jordan: jordanHalePhoto,
};

export function AppSidebar() {
  const {
    workspaceMode,
    shellDestination,
    activeMember,
    selectMemberDestination,
  } = useAppShell();

  if (workspaceMode === "team") {
    return <TeamSidebar />;
  }

  return (
    <aside className="app-sidebar">
      <nav className="shell-nav" aria-label="App sections">
        {MEMBER_SHELL_NAV.map((item) => (
          <ShellNavLeaf
            key={item.destination}
            destination={item.destination}
            label={item.label}
            icon={item.icon}
            active={shellDestination === item.destination}
            onSelect={selectMemberDestination}
          />
        ))}
      </nav>
      {activeMember ? (
        <div className="team-sidebar-footer">
          <MemberAccount
            memberId={activeMember.id}
            name={activeMember.name}
            photoUrl={MEMBER_PHOTOS[activeMember.id]}
          />
        </div>
      ) : null}
    </aside>
  );
}

function initialsFor(name: string): string {
  const parts = name.split(" ").filter((part) => part.length > 0);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return `${first}${second}`.toUpperCase();
}

function MemberAccount({
  memberId,
  name,
  photoUrl,
}: {
  memberId: string;
  name: string;
  photoUrl?: string;
}) {
  return (
    <div className="member-account">
      <ParticipantAvatar memberId={memberId} aria-hidden="true">
        <span>{initialsFor(name)}</span>
        {photoUrl ? <img src={photoUrl} alt="" /> : null}
      </ParticipantAvatar>
      <Typography variant="body" as="span" className="team-switcher-name">
        {name}
      </Typography>
    </div>
  );
}
