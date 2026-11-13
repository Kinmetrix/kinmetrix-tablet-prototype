import { useCallback, useMemo, useState, type ChangeEvent } from "react";
import { Button } from "../../../shared/primitives/buttons/Button";
import { Typography } from "../../../shared/primitives/typography/Typography";
import {
  defaultCompareSelection,
  isCompareEligible,
} from "../model/memberCompareModel";
import { TEAM_ACTIVITY_DESTINATION } from "../model/teamWorkspaceCatalog";
import type {
  TeamActivityItem,
  TeamOverviewKpi,
  TeamOverviewMemberRow,
} from "../model/teamOverviewModel";
import { useAppShell } from "./AppShellContext";
import { KpiSparkline } from "./KpiSparkline";
import { TeamActivityFeed } from "./TeamActivityFeed";

const PAGE_SIZE = 6;

function kpiTrendDirection(values: readonly number[]): "up" | "down" | "flat" {
  if (values.length < 2) {
    return "flat";
  }
  const first = values[0]!;
  const last = values[values.length - 1]!;
  if (last > first) {
    return "up";
  }
  if (last < first) {
    return "down";
  }
  return "flat";
}

function KpiCard({ kpi }: { kpi: TeamOverviewKpi }) {
  const deltaPositive = kpi.deltaLabel.startsWith("+");
  const deltaNegative = kpi.deltaLabel.startsWith("-");
  const trend = kpiTrendDirection(kpi.trend);
  const deltaClassName = [
    "team-overview-kpi-delta",
    deltaPositive ? "is-positive" : null,
    deltaNegative ? "is-negative" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className="team-overview-kpi">
      <Typography variant="label" className="muted">
        {kpi.label}
      </Typography>
      <div className="team-overview-kpi-main">
        <Typography variant="metric" as="p" className="team-overview-kpi-value">
          {kpi.value}
        </Typography>
        <KpiSparkline
          gradientId={`team-kpi-${kpi.id}`}
          values={kpi.trend}
          trend={trend}
          ariaLabel={`${kpi.label} trend across the reporting period`}
        />
      </div>
      <Typography variant="label" className={deltaClassName}>
        {kpi.deltaLabel}
      </Typography>
      <Typography variant="helper" className="muted">
        {kpi.footnote}
      </Typography>
    </article>
  );
}

function OverviewMemberRow({
  row,
  compareEligible,
  selected,
  onToggleSelect,
}: {
  row: TeamOverviewMemberRow;
  compareEligible: boolean;
  selected: boolean;
  onToggleSelect: (memberId: string) => void;
}) {
  const { openMember } = useAppShell();
  const { member } = row;

  const handleOpen = useCallback(() => {
    openMember(member);
  }, [member, openMember]);

  const handleToggle = useCallback(() => {
    onToggleSelect(member.id);
  }, [member.id, onToggleSelect]);

  return (
    <tr className={selected ? "is-selected" : undefined}>
      <td className="roster-select-cell">
        {compareEligible ? (
          <input
            type="checkbox"
            checked={selected}
            aria-label={`Include ${member.name} in comparison`}
            onChange={handleToggle}
            onClick={(event) => event.stopPropagation()}
          />
        ) : null}
      </td>
      <td>
        <button type="button" className="roster-name-btn" onClick={handleOpen}>
          <Typography variant="body" as="strong">
            {member.name}
          </Typography>
        </button>
      </td>
      <td className="numeric">{row.analysesCount}</td>
      <td>
        {row.currentForceLabel ? (
          <Typography variant="body" as="strong" className="numeric">
            {row.currentForceLabel}
          </Typography>
        ) : (
          <Typography variant="label" className="muted">
            Not measured
          </Typography>
        )}
      </td>
      <td>
        {row.stabilityLabel ? (
          <Typography variant="body" as="strong" className="numeric">
            {row.stabilityLabel}
          </Typography>
        ) : (
          <Typography variant="label" className="muted">
            Not measured
          </Typography>
        )}
      </td>
      <td>
        <Typography
          variant="label"
          className={row.measuredLabel === "No data" ? "muted" : undefined}
        >
          {row.measuredLabel}
        </Typography>
      </td>
    </tr>
  );
}

function OverviewActivityRail({
  items,
  onOpenMember,
  onSeeHistory,
}: {
  items: readonly TeamActivityItem[];
  onOpenMember: (memberId: string) => void;
  onSeeHistory: () => void;
}) {

  return (
    <section className="team-overview-activity" aria-label="Recent activity">
      <header className="team-overview-activity-head">
        <Typography variant="heading" as="h2">
          Recent activity
        </Typography>
        <Button
          type="button"
          variant="outline"
          className="team-overview-activity-history"
          onClick={onSeeHistory}
        >
          View all
        </Button>
      </header>
      <TeamActivityFeed items={items} onOpenMember={onOpenMember} />
    </section>
  );
}

export function TeamOverviewScreen() {
  const {
    teamOverview,
    roster,
    memberRecordFor,
    enterTeamView,
    openCompareMembers,
    openMember,
    selectTeamDestination,
  } = useAppShell();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState(() =>
    defaultCompareSelection(roster),
  );

  const eligibility = useMemo(
    () =>
      new Map(
        roster.map((member) => [
          member.id,
          isCompareEligible(member.id, memberRecordFor(member.id)),
        ]),
      ),
    [memberRecordFor, roster],
  );

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return teamOverview.memberRows;
    }
    return teamOverview.memberRows.filter((row) =>
      row.member.name.toLowerCase().includes(normalized),
    );
  }, [query, teamOverview.memberRows]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filteredRows.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );
  const rangeStart = filteredRows.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const rangeEnd = Math.min(
    filteredRows.length,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  const handleKiosk = useCallback(() => {
    enterTeamView();
  }, [enterTeamView]);

  const handleCompare = useCallback(() => {
    if (selectedIds.length < 2) {
      return;
    }
    openCompareMembers(selectedIds);
  }, [openCompareMembers, selectedIds]);

  const handleToggleSelect = useCallback((memberId: string) => {
    setSelectedIds((current) => {
      if (current.includes(memberId)) {
        return current.filter((id) => id !== memberId);
      }
      return [...current, memberId];
    });
  }, []);

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
      setPage(0);
    },
    [],
  );

  const handlePreviousPage = useCallback(() => {
    setPage((current) => Math.max(0, current - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setPage((current) => Math.min(pageCount - 1, current + 1));
  }, [pageCount]);

  const handlePageSelect = useCallback((nextPage: number) => {
    setPage(nextPage);
  }, []);

  const handleOpenActivityMember = useCallback(
    (memberId: string) => {
      const member = roster.find((entry) => entry.id === memberId);
      if (member) {
        openMember(member);
      }
    },
    [openMember, roster],
  );

  const handleSeeActivityHistory = useCallback(() => {
    selectTeamDestination(TEAM_ACTIVITY_DESTINATION);
  }, [selectTeamDestination]);

  return (
    <div className="shell-page team-overview">
      <header className="team-overview-head">
        <div className="team-overview-title">
          <Typography variant="display" as="h1">
            {teamOverview.title}
          </Typography>
          <Typography variant="muted">{teamOverview.subtitle}</Typography>
        </div>
        <Button className="team-overview-kiosk" onClick={handleKiosk}>
          Kiosk Mode
        </Button>
      </header>

      <section className="team-overview-period" aria-label="Reporting period">
        <div className="team-overview-period-copy">
          <Typography
            variant="body"
            as="p"
            className="team-overview-period-range"
          >
            {teamOverview.period.rangeLabel}
          </Typography>
          <Typography variant="label" className="muted">
            {teamOverview.period.compareLabel}
          </Typography>
        </div>
        <label className="team-overview-period-select">
          <select defaultValue="last-30" aria-label="Reporting period">
            <option value="last-30">{teamOverview.period.presetLabel}</option>
            <option value="last-7">Last 7 days</option>
            <option value="last-90">Last 90 days</option>
          </select>
        </label>
      </section>

      <div className="team-overview-kpis" aria-label="Team summary">
        {teamOverview.kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      <div className="team-overview-split">
        <section className="team-overview-members" aria-label="Members">
          <div className="team-overview-members-head">
            <div className="team-overview-members-title">
              <Typography variant="heading" as="h2">
                Members
              </Typography>
              <span className="team-overview-members-count">
                {roster.length}
              </span>
            </div>
            <div className="team-overview-members-actions">
              <Button
                variant="outline"
                disabled={selectedIds.length < 2}
                onClick={handleCompare}
              >
                Compare
              </Button>
              <Button variant="outline">Add member</Button>
            </div>
          </div>

          <label className="team-overview-search">
            <input
              type="search"
              placeholder="Find a member…"
              aria-label="Find a member"
              value={query}
              onChange={handleSearchChange}
              autoComplete="off"
            />
          </label>

          <div className="table-wrap team-overview-table-wrap">
            <table className="roster-table team-overview-table">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="roster-select-cell"
                    aria-label="Compare"
                  >
                    {" "}
                  </th>
                  <th scope="col">Member</th>
                  <th scope="col">Analyses</th>
                  <th scope="col">Current force</th>
                  <th scope="col">Stability</th>
                  <th scope="col">Measured</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <OverviewMemberRow
                    key={row.member.id}
                    row={row}
                    compareEligible={eligibility.get(row.member.id) ?? false}
                    selected={selectedIds.includes(row.member.id)}
                    onToggleSelect={handleToggleSelect}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <footer className="team-overview-pagination">
            <Typography variant="label" className="muted">
              {rangeStart}–{rangeEnd} of {filteredRows.length} members
            </Typography>
            <div className="team-overview-pagination-controls">
              <Button
                variant="outline"
                disabled={safePage === 0}
                onClick={handlePreviousPage}
              >
                Previous
              </Button>
              {Array.from({ length: pageCount }, (_, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className={index === safePage ? "is-current-page" : undefined}
                  aria-current={index === safePage ? "page" : undefined}
                  onClick={() => handlePageSelect(index)}
                >
                  {index + 1}
                </Button>
              ))}
              <Button
                variant="outline"
                disabled={safePage >= pageCount - 1}
                onClick={handleNextPage}
              >
                Next
              </Button>
            </div>
          </footer>
        </section>

        <OverviewActivityRail
          items={teamOverview.activity.items}
          onOpenMember={handleOpenActivityMember}
          onSeeHistory={handleSeeActivityHistory}
        />
      </div>
    </div>
  );
}
