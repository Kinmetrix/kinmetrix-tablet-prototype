import { useCallback } from "react";
import { ParticipantAvatar } from "../../../shared/primitives/avatar/ParticipantAvatar";
import { Button } from "../../../shared/primitives/buttons/Button";
import { Callout } from "../../../shared/primitives/feedback/Callout";
import { Typography } from "../../../shared/primitives/typography/Typography";
import { AnalysisCard } from "./AnalysisCard";
import { HomeActionSplit } from "./HomeActionSplit";
import { useAppShell } from "./AppShellContext";
import type { AnalysisSummary, MemberRecord } from "../model/appShellTypes";

function initialsFor(name: string) {
  return name
    .split(" ")
    .filter((part) => part.length > 0)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function programLabel(record: MemberRecord) {
  if (!record.program) {
    return "—";
  }
  const done = record.program.groups.filter(
    (group) => group.state === "done",
  ).length;
  return `${done} of ${record.program.groups.length}`;
}

type StatsProps = {
  analysis: AnalysisSummary | undefined;
  record: MemberRecord;
};

function HomeStats({ analysis, record }: StatsProps) {
  return (
    <div className="stats">
      <div className="stat">
        <div className="stat-label">Symmetry</div>
        <div className="stat-value">{analysis?.symmetry ?? "—"}</div>
      </div>
      <div className="stat">
        <div className="stat-label">Stable weight</div>
        <div className="stat-value">{analysis?.stableWeight ?? "—"}</div>
      </div>
      <div className="stat">
        <div className="stat-label">Program</div>
        <div className="stat-value">{programLabel(record)}</div>
      </div>
    </div>
  );
}

export function MemberHomeScreen() {
  const {
    activeMember,
    memberRecordFor,
    openLatestAnalysis,
    selectMemberDestination,
  } = useAppShell();

  const handleStart = useCallback(() => {
    selectMemberDestination("start");
  }, [selectMemberDestination]);

  const handleOpenAnalysis = useCallback(() => {
    openLatestAnalysis();
  }, [openLatestAnalysis]);

  if (!activeMember) {
    return null;
  }

  const record = memberRecordFor(activeMember.id);
  const latest = record.analyses[0];
  const nextGroup = record.program?.groups.find(
    (group) => group.state === "current",
  );
  const showWaiverGate = !activeMember.waiverSigned;
  const meta = latest
    ? `${latest.dateLabel} · ${latest.kindLabel}`
    : "No analysis yet";

  const headline = nextGroup ? nextGroup.name : "Start with an assessment";
  const lead = nextGroup
    ? `Next visit for ${activeMember.name}.`
    : "Assessment comes first.";

  const footerDetail = record.program
    ? `${record.program.name}${nextGroup ? ` · ${nextGroup.name}` : ""}`
    : "No program on this account";

  return (
    <div className="member-home">
      <section className="intro" aria-label={`${activeMember.name} home`}>
        <div className="personal-copy">
          <ParticipantAvatar memberId={activeMember.id} aria-hidden="true">
            <span>{initialsFor(activeMember.name)}</span>
          </ParticipantAvatar>
          <div className="personal-story">
            <div className="personal-identity">
              <Typography
                variant="title"
                as="strong"
                className="participant-name"
              >
                {activeMember.name}
              </Typography>
              <Typography
                variant="label"
                as="span"
                className="participant-session"
              >
                {meta}
              </Typography>
            </div>
            <Typography variant="display" as="h1">
              {headline}
            </Typography>
            <Typography variant="muted">{lead}</Typography>
          </div>
        </div>
      </section>

      {showWaiverGate ? (
        <Callout tone="warning" className="member-home-callout">
          <Typography variant="body" as="strong">
            Waiver required
          </Typography>
          <Typography variant="muted">
            Signing the waiver unlocks assessment and training on this tablet.
          </Typography>
          <Button variant="outline">Sign waiver</Button>
        </Callout>
      ) : null}

      <div className="overview-grid home-stage">
        <HomeStats analysis={latest} record={record} />
        <HomeActionSplit record={record} />
        <AnalysisCard analysis={latest} onOpen={handleOpenAnalysis} />
      </div>

      <footer className="footer">
        <div className="next-copy">
          <Typography variant="title" as="strong">
            Keep your next session in sight.
          </Typography>
          <Typography variant="muted">{footerDetail}</Typography>
        </div>
        <div className="footer-actions">
          <span className="completion">{record.deviceStatus}</span>
          <Button disabled={showWaiverGate} onClick={handleStart}>
            Start exercise
          </Button>
        </div>
      </footer>
    </div>
  );
}
