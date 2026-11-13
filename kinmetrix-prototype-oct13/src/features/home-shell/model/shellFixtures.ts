import { ACTIVITY_KIND_LABEL } from "./activityKindLabels";
import type { MemberRecord, RosterMember, TeamAccount } from "./appShellTypes";

export const DEMO_ROSTER: RosterMember[] = [
  {
    id: "jordan",
    name: "Jordan Hale",
    lastAnalysisLabel: "Assessment · Today",
    strengthScore: "78",
    waiverSigned: true,
  },
  {
    id: "alex",
    name: "Alex Morgan",
    lastAnalysisLabel: "Smart session · Oct 16",
    strengthScore: "71",
    waiverSigned: true,
  },
  {
    id: "jamie",
    name: "Jamie Chen",
    lastAnalysisLabel: `${ACTIVITY_KIND_LABEL.rangeOfMotion} · Today`,
    strengthScore: "68",
    waiverSigned: true,
  },
  {
    id: "taylor",
    name: "Taylor Brooks",
    lastAnalysisLabel: "Smart session · Oct 12",
    strengthScore: "75",
    waiverSigned: true,
  },
  {
    id: "sam",
    name: "Sam Bennett",
    lastAnalysisLabel: "No analysis yet",
    strengthScore: "—",
    waiverSigned: false,
  },
];

function rosterMember(id: string): RosterMember {
  const member = DEMO_ROSTER.find((item) => item.id === id);
  if (!member) {
    throw new Error(`Missing fixture member ${id}`);
  }
  return member;
}

export const DEMO_TEAMS: readonly TeamAccount[] = [
  {
    id: "northridge",
    name: "Northridge Athletics",
    roster: DEMO_ROSTER,
  },
  {
    id: "eastside",
    name: "Eastside Performance",
    roster: [rosterMember("alex")],
  },
];

export const DEFAULT_TEAM_ID = DEMO_TEAMS[0].id;

/** Demo “today” for relative dates across shell fixtures. */
export const DEMO_REFERENCE_DATE = new Date(2026, 9, 23);

const JORDAN: MemberRecord = {
  smartSessionReady: true,
  deviceStatus: "Arc connected",
  notes: [
    {
      id: "n1",
      dateLabel: "Today",
      body: "Cleared for smart session after baseline.",
    },
    {
      id: "n2",
      dateLabel: "Oct 2",
      body: "Stiffness after practice. Kept load at assessment settings.",
    },
  ],
  program: {
    name: "Return to play",
    groups: [
      { id: "g1", name: "Baseline assessment", detail: "Today", state: "done" },
      { id: "g2", name: "Practice session", detail: "Oct 8", state: "done" },
      { id: "g3", name: "Return day 2", detail: "Today", state: "current" },
      {
        id: "g4",
        name: "Return day 3",
        detail: "After day 2",
        state: "upcoming",
      },
    ],
  },
  analyses: [
    {
      id: "a-today-pm",
      occurredAt: "2026-10-23T15:30:00",
      dateLabel: "Today",
      kind: "session",
      kindLabel: ACTIVITY_KIND_LABEL.smartSession,
      symmetry: "0.93",
      stableWeight: "76",
      note: null,
      openable: true,
    },
    {
      id: "a-today",
      occurredAt: "2026-10-23T09:00:00",
      dateLabel: "Today",
      kind: "assessment",
      kindLabel: ACTIVITY_KIND_LABEL.assessment,
      symmetry: "0.94",
      stableWeight: "78",
      note: "Cleared for smart session after baseline.",
      openable: true,
    },
    {
      id: "a-oct8",
      occurredAt: "2026-10-08",
      dateLabel: "Oct 8",
      kind: "session",
      kindLabel: ACTIVITY_KIND_LABEL.smartSession,
      symmetry: "0.91",
      stableWeight: "74",
      note: null,
      openable: false,
    },
    {
      id: "a-oct2",
      occurredAt: "2026-10-02",
      dateLabel: "Oct 2",
      kind: "program",
      kindLabel: ACTIVITY_KIND_LABEL.programDay,
      symmetry: "0.88",
      stableWeight: "71",
      note: "Stiffness after practice. Kept load at assessment settings.",
      openable: false,
    },
    {
      id: "a-sep22",
      occurredAt: "2026-09-22",
      dateLabel: "Sep 22",
      kind: "assessment",
      kindLabel: ACTIVITY_KIND_LABEL.firstAssessment,
      symmetry: "0.86",
      stableWeight: "69",
      note: null,
      openable: false,
    },
  ],
};

const ALEX: MemberRecord = {
  smartSessionReady: true,
  deviceStatus: "Arc connected",
  notes: [],
  program: {
    name: "In-season maintenance",
    groups: [
      { id: "g1", name: "Week 1 session", detail: "Oct 2", state: "done" },
      { id: "g2", name: "Week 2 session", detail: "Today", state: "current" },
    ],
  },
  analyses: [
    {
      id: "a-today",
      occurredAt: "2026-10-23T11:15:00",
      dateLabel: "Today",
      kind: "session",
      kindLabel: ACTIVITY_KIND_LABEL.smartSession,
      symmetry: "0.90",
      stableWeight: "71",
      note: null,
      openable: true,
    },
    {
      id: "a-today-rom",
      occurredAt: "2026-10-23T08:20:00",
      dateLabel: "Today",
      kind: "assessment",
      kindLabel: ACTIVITY_KIND_LABEL.rangeOfMotion,
      symmetry: "0.89",
      stableWeight: "70",
      note: null,
      openable: false,
    },
    {
      id: "a-oct2",
      occurredAt: "2026-10-16",
      dateLabel: "Oct 16",
      kind: "session",
      kindLabel: ACTIVITY_KIND_LABEL.smartSession,
      symmetry: "0.88",
      stableWeight: "70",
      note: null,
      openable: false,
    },
  ],
};

const SAM: MemberRecord = {
  smartSessionReady: false,
  deviceStatus: "Arc not connected",
  notes: [],
  program: null,
  analyses: [],
};

const JAMIE: MemberRecord = {
  smartSessionReady: true,
  deviceStatus: "Arc connected",
  notes: [],
  program: null,
  analyses: [
    {
      id: "a-today",
      occurredAt: "2026-10-23T13:00:00",
      dateLabel: "Today",
      kind: "assessment",
      kindLabel: ACTIVITY_KIND_LABEL.rangeOfMotion,
      symmetry: "0.89",
      stableWeight: "68",
      note: null,
      openable: true,
    },
    {
      id: "a-oct14",
      occurredAt: "2026-10-14",
      dateLabel: "Oct 14",
      kind: "assessment",
      kindLabel: ACTIVITY_KIND_LABEL.firstAssessment,
      symmetry: "0.87",
      stableWeight: "67",
      note: null,
      openable: false,
    },
  ],
};

const TAYLOR: MemberRecord = {
  smartSessionReady: true,
  deviceStatus: "Arc connected",
  notes: [],
  program: null,
  analyses: [
    {
      id: "a-today",
      occurredAt: "2026-10-23T10:45:00",
      dateLabel: "Today",
      kind: "session",
      kindLabel: ACTIVITY_KIND_LABEL.smartSession,
      symmetry: "0.93",
      stableWeight: "75",
      note: null,
      openable: true,
    },
    {
      id: "a-oct12",
      occurredAt: "2026-10-12",
      dateLabel: "Oct 12",
      kind: "assessment",
      kindLabel: ACTIVITY_KIND_LABEL.firstAssessment,
      symmetry: "0.91",
      stableWeight: "74",
      note: null,
      openable: false,
    },
  ],
};

const RECORD_BY_MEMBER: Record<string, MemberRecord> = {
  jordan: JORDAN,
  alex: ALEX,
  jamie: JAMIE,
  taylor: TAYLOR,
  sam: SAM,
};

export function memberRecordFor(memberId: string): MemberRecord {
  return RECORD_BY_MEMBER[memberId] ?? SAM;
}
