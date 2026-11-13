import { useCallback, useState } from "react";
import {
  SegmentedControl,
  SegmentedOption,
} from "../../../shared/primitives/form/SegmentedControl";
import { Typography } from "../../../shared/primitives/typography/Typography";
import { Button } from "../../../shared/primitives/buttons/Button";
import { AnalysisHistory } from "./AnalysisHistory";
import { useAppShell } from "./AppShellContext";
import type { AnalysisKind } from "../model/appShellTypes";

type HistoryFilter = "all" | AnalysisKind;

export function AnalysisHistoryScreen() {
  const { activeMember, memberRecordFor, openLatestAnalysis } = useAppShell();
  const [filter, setFilter] = useState<HistoryFilter>("all");

  const handleAll = useCallback(() => {
    setFilter("all");
  }, []);

  const handleAssessment = useCallback(() => {
    setFilter("assessment");
  }, []);

  const handleSession = useCallback(() => {
    setFilter("session");
  }, []);

  const handleProgram = useCallback(() => {
    setFilter("program");
  }, []);

  const handleOpen = useCallback(() => {
    openLatestAnalysis();
  }, [openLatestAnalysis]);

  if (!activeMember) {
    return null;
  }

  const record = memberRecordFor(activeMember.id);
  const analyses =
    filter === "all"
      ? record.analyses
      : record.analyses.filter((analysis) => analysis.kind === filter);

  return (
    <div className="shell-page">
      <header className="shell-page-head">
        <Typography variant="display" as="h1">
          History
        </Typography>
        <Typography variant="muted">
          Strength analyses for {activeMember.name}.
        </Typography>
      </header>
      <SegmentedControl aria-label="Analysis type">
        <SegmentedOption pressed={filter === "all"} onClick={handleAll}>
          All
        </SegmentedOption>
        <SegmentedOption
          pressed={filter === "assessment"}
          onClick={handleAssessment}
        >
          Assessment
        </SegmentedOption>
        <SegmentedOption pressed={filter === "session"} onClick={handleSession}>
          Session
        </SegmentedOption>
        <SegmentedOption pressed={filter === "program"} onClick={handleProgram}>
          Program
        </SegmentedOption>
      </SegmentedControl>
      {record.analyses.some((analysis) => analysis.openable) ? (
        <Button variant="outline" onClick={handleOpen}>
          View latest analysis
        </Button>
      ) : null}
      <AnalysisHistory analyses={analyses} />
    </div>
  );
}
