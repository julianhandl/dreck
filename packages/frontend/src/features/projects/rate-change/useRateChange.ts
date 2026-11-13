import type { Project } from '@dreck/shared/api/projects';
import type { TimeEntry } from '@dreck/shared/api/time-entries';
import { amountMinor, roundSeconds } from '@dreck/shared/report';
import { useState } from 'react';
import { useSettings } from '@/settings/useSettings';

/** Answer of the question: the choice and whether existing Time Entries take over the rate. */
export type RateAnswer = { choice: RateChoice; timeEntries: boolean };

/** What the user chose; goes into `applyToTimeEntries` or `applyToProjects`. */
export type RateChoice = {
  from?: string;
  to?: string;
  includeOverridden: boolean;
  /** Customer only: Projects that take over the new rate. */
  projectIds: number[];
};

export type RateQuestion = {
  /** Time Entries of the Project, or of all Projects of the Customer. */
  entries: TimeEntry[];
  newRateMinor: number;
  /** Customer only: its Projects with the ones preselected that had the old Customer rate. */
  projects?: { project: Project; preselected: boolean }[];
};

export type RateSummary = {
  count: number;
  seconds: number;
  oldMinor: number;
  newMinor: number;
  /** Corrected by hand, in range, untouched unless `includeOverridden`. */
  overriddenCount: number;
};

export type RateChange = {
  from: string;
  to: string;
  includeOverridden: boolean;
  selected: Set<number>;
  summary: RateSummary;
  choice: RateChoice;
  handleFromChange: (value: string) => void;
  handleToChange: (value: string) => void;
  handleToggleOverridden: () => void;
  handleToggleProject: (projectId: number) => void;
};

/** State of the question "Bestehende Time Entries übernehmen?" with a live preview. */
export function useRateChange({ entries, newRateMinor, projects }: RateQuestion): RateChange {
  const { roundingMinutes } = useSettings();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [includeOverridden, setIncludeOverridden] = useState(false);
  const [selected, setSelected] = useState(
    () => new Set(projects?.filter((p) => p.preselected).map((p) => p.project.id)),
  );

  // Invoiced Time Entries never take over a new rate
  const inScope = entries.filter(
    (e) =>
      e.invoiceItemId === null &&
      (projects === undefined || selected.has(e.projectId)) &&
      (from === '' || e.date >= from) &&
      (to === '' || e.date <= to),
  );
  const affected = inScope.filter((e) => includeOverridden || !e.hourlyRateOverridden);
  const amount = (rate: (e: TimeEntry) => number): number =>
    affected.reduce(
      (sum, e) => sum + amountMinor(rate(e), roundSeconds(e.durationSeconds, roundingMinutes)),
      0,
    );

  return {
    from,
    to,
    includeOverridden,
    selected,
    summary: {
      count: affected.length,
      seconds: affected.reduce((sum, e) => sum + e.durationSeconds, 0),
      oldMinor: amount((e) => e.hourlyRateMinor),
      newMinor: amount(() => newRateMinor),
      overriddenCount: inScope.filter((e) => e.hourlyRateOverridden).length,
    },
    choice: {
      from: from || undefined,
      to: to || undefined,
      includeOverridden,
      projectIds: [...selected],
    },
    handleFromChange: setFrom,
    handleToChange: setTo,
    handleToggleOverridden: () => setIncludeOverridden((value) => !value),
    handleToggleProject: (id) =>
      setSelected((current) => {
        const next = new Set(current);
        if (!next.delete(id)) next.add(id);
        return next;
      }),
  };
}
