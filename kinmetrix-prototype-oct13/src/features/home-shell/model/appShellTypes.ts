import type { ActivityKindLabel } from "./activityKindLabels";
import type { TeamShellDestination } from "./teamWorkspaceCatalog";

export type { ActivityKindLabel };
export { ACTIVITY_KIND_LABEL } from "./activityKindLabels";

export type AppWorkspaceMode = "team" | "member" | "kiosk";

export type { TeamShellDestination };

export const MEMBER_SHELL_NAV = [
  { destination: "home", label: "Home", icon: "home" },
  { destination: "history", label: "History", icon: "history" },
  { destination: "start", label: "Start", icon: "start" },
] as const;
export type MemberShellDestination =
  | (typeof MEMBER_SHELL_NAV)[number]["destination"]
  | "device";
export type MemberNavIcon = (typeof MEMBER_SHELL_NAV)[number]["icon"];

export type ShellDestination = TeamShellDestination | MemberShellDestination;

export type RosterMember = {
  id: string;
  name: string;
  lastAnalysisLabel: string;
  strengthScore: string;
  waiverSigned: boolean;
};

export type TeamAccount = {
  id: string;
  name: string;
  roster: readonly RosterMember[];
};

export type AnalysisKind = "assessment" | "session" | "program";

export type AnalysisSummary = {
  id: string;
  /** ISO calendar date (YYYY-MM-DD) for sorting and relative labels. */
  occurredAt: string;
  dateLabel: string;
  kind: AnalysisKind;
  /** Rail-facing label; use {@link ACTIVITY_KIND_LABEL} for standard copy. */
  kindLabel: string;
  symmetry: string;
  stableWeight: string;
  note: string | null;
  openable: boolean;
};

export type ProgramGroup = {
  id: string;
  name: string;
  detail: string;
  state: "done" | "current" | "upcoming";
};

export type MemberNote = {
  id: string;
  dateLabel: string;
  body: string;
};

export type MemberRecord = {
  analyses: AnalysisSummary[];
  program: {
    name: string;
    groups: ProgramGroup[];
  } | null;
  notes: MemberNote[];
  deviceStatus: string;
  smartSessionReady: boolean;
};
