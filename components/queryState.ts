import {
  EMPTY_GROUPED_PROGRAM_SELECTIONS,
  PROGRAM_SELECTION_MODES,
  type GroupedProgramSelections,
  type ProgramSelection,
  type ProgramSelectionMode,
} from "../lib/programSelection";
import type { GroupTag } from "../lib/types";
import { SCORE_SUBJECTS, type ScoreDraft } from "./ScoreForm";

export type SiteRoute = "home" | "how-it-works" | "query" | "results";
export type GroupSelection = "all" | GroupTag;

export type AdmissionQueryState = {
  scores: ScoreDraft;
  groupSelection: GroupSelection;
  schoolSelection: string;
  customSchoolIds: string[];
  programSelections: GroupedProgramSelections;
};

export const EMPTY_SCORES: ScoreDraft = {
  國文: "",
  英文: "",
  數A: "",
  數B: "",
  社會: "",
  自然: "",
  英聽: "",
};

export const EXAMPLE_SCORES: ScoreDraft = {
  國文: "12",
  英文: "13",
  數A: "11",
  數B: "10",
  社會: "12",
  自然: "11",
  英聽: "2",
};

export const DEFAULT_QUERY_STATE: AdmissionQueryState = {
  scores: { ...EMPTY_SCORES },
  groupSelection: "all",
  schoolSelection: "all",
  customSchoolIds: [],
  programSelections: EMPTY_GROUPED_PROGRAM_SELECTIONS,
};

const SESSION_KEY = "admission-114-query-v3";
const SCORE_PARAMS = {
  國文: "ch",
  英文: "en",
  數A: "ma",
  數B: "mb",
  社會: "so",
  自然: "na",
  英聽: "li",
} as const;
const PROGRAM_SELECTION_PARAMS = {
  自然組: { mode: "naturalMode", code: "natural" },
  社會組: { mode: "socialMode", code: "social" },
} as const;

function safeScore(
  value: unknown,
  subject: (typeof SCORE_SUBJECTS)[number],
): string {
  if (typeof value !== "string" || value.trim() === "") return "";
  const score = Number(value);
  if (!Number.isFinite(score)) return "";
  const maximum = subject === "英聽" ? 3 : 15;
  return String(Math.max(0, Math.min(maximum, Math.trunc(score))));
}

function safeGroup(value: unknown): GroupSelection {
  return value === "自然組" || value === "社會組" ? value : "all";
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function safeProgramCodes(value: unknown): string[] {
  return safeStringArray(value).filter((code) => /^\d{6}$/.test(code));
}

function safeProgramSelection(value: unknown): ProgramSelection {
  if (!value || typeof value !== "object") {
    return { mode: "none", codes: [] };
  }
  const candidate = value as Partial<ProgramSelection>;
  const mode = PROGRAM_SELECTION_MODES.includes(
    candidate.mode as ProgramSelectionMode,
  )
    ? (candidate.mode as ProgramSelectionMode)
    : "none";

  if (mode === "none" || mode === "all") {
    return { mode, codes: [] };
  }

  const codes = safeProgramCodes(candidate.codes);
  return codes.length > 0
    ? { mode, codes }
    : { mode: "none", codes: [] };
}

function safeGroupedProgramSelections(
  value: unknown,
): GroupedProgramSelections {
  const candidate =
    value && typeof value === "object"
      ? (value as Partial<GroupedProgramSelections>)
      : {};
  return {
    自然組: safeProgramSelection(candidate.自然組),
    社會組: safeProgramSelection(candidate.社會組),
  };
}

function normalizeStoredState(value: unknown): AdmissionQueryState | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<AdmissionQueryState>;
  const storedScores = candidate.scores ?? ({} as ScoreDraft);

  return {
    scores: SCORE_SUBJECTS.reduce<ScoreDraft>(
      (scores, subject) => ({
        ...scores,
        [subject]: safeScore(storedScores[subject], subject),
      }),
      { ...EMPTY_SCORES },
    ),
    groupSelection: safeGroup(candidate.groupSelection),
    schoolSelection:
      typeof candidate.schoolSelection === "string"
        ? candidate.schoolSelection
        : "all",
    customSchoolIds: safeStringArray(candidate.customSchoolIds),
    programSelections: safeGroupedProgramSelections(candidate.programSelections),
  };
}

export function queryStateFromParams(
  params: URLSearchParams,
): AdmissionQueryState {
  const programSelections: GroupedProgramSelections = {
    自然組: safeProgramSelection({
      mode: params.get(PROGRAM_SELECTION_PARAMS.自然組.mode),
      codes: params.getAll(PROGRAM_SELECTION_PARAMS.自然組.code),
    }),
    社會組: safeProgramSelection({
      mode: params.get(PROGRAM_SELECTION_PARAMS.社會組.mode),
      codes: params.getAll(PROGRAM_SELECTION_PARAMS.社會組.code),
    }),
  };

  return {
    scores: SCORE_SUBJECTS.reduce<ScoreDraft>(
      (scores, subject) => ({
        ...scores,
        [subject]: safeScore(params.get(SCORE_PARAMS[subject]), subject),
      }),
      { ...EMPTY_SCORES },
    ),
    groupSelection: safeGroup(params.get("group")),
    schoolSelection: params.get("school") || "all",
    customSchoolIds:
      params.get("schoolIds")?.split(",").filter(Boolean) ?? [],
    programSelections,
  };
}

export function queryStateToParams(state: AdmissionQueryState): URLSearchParams {
  const params = new URLSearchParams();

  SCORE_SUBJECTS.forEach((subject) => {
    const value = safeScore(state.scores[subject], subject);
    if (value !== "") params.set(SCORE_PARAMS[subject], value);
  });
  if (state.groupSelection !== "all") {
    params.set("group", state.groupSelection);
  }
  if (state.schoolSelection !== "all") {
    params.set("school", state.schoolSelection);
  }
  if (state.customSchoolIds.length > 0) {
    params.set("schoolIds", state.customSchoolIds.join(","));
  }
  (["自然組", "社會組"] as const).forEach((group) => {
    const selection = state.programSelections[group];
    const names = PROGRAM_SELECTION_PARAMS[group];
    if (selection.mode === "none") return;
    params.set(names.mode, selection.mode);
    selection.codes.forEach((code) => params.append(names.code, code));
  });

  return params;
}

export function restoreQueryState(): AdmissionQueryState {
  if (typeof window === "undefined") return DEFAULT_QUERY_STATE;

  const params = new URLSearchParams(window.location.search);
  const queryKeys = new Set([
    ...Object.values(SCORE_PARAMS),
    "group",
    "school",
    "schoolIds",
    "naturalMode",
    "natural",
    "socialMode",
    "social",
  ]);
  if ([...params.keys()].some((key) => queryKeys.has(key))) {
    return queryStateFromParams(params);
  }

  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      return normalizeStoredState(JSON.parse(raw)) ?? DEFAULT_QUERY_STATE;
    }
  } catch {
    // Browser storage can be unavailable in privacy modes; URL state still works.
  }

  return DEFAULT_QUERY_STATE;
}

export function saveQueryState(state: AdmissionQueryState): void {
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    // URL parameters remain the cross-page source of truth.
  }
}

export function routePath(route: SiteRoute): string {
  if (typeof window === "undefined") return route === "home" ? "/" : `/${route}`;

  const pathname = window.location.pathname;
  const routeSuffix = /\/(?:query|results|how-it-works)(?:\/|\.html)?$/;
  const match = pathname.match(routeSuffix);
  const base = match
    ? pathname.slice(0, match.index)
    : pathname.replace(/\/index\.html$/i, "").replace(/\/$/, "");
  return route === "home" ? `${base || ""}/` : `${base || ""}/${route}`;
}
