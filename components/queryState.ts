import { DEPARTMENT_KEYWORD_OPTIONS } from "@/config/departmentKeywords";
import type { DepartmentKeywordId } from "@/config/departmentKeywords";
import type { GroupSelection } from "./FilterPanel";
import { SCORE_SUBJECTS, type ScoreDraft } from "./ScoreForm";

export type SiteRoute = "home" | "how-it-works" | "query" | "results";

export type AdmissionQueryState = {
  scores: ScoreDraft;
  groupSelection: GroupSelection;
  schoolSelection: string;
  customSchoolIds: string[];
  departmentKeywordIds: DepartmentKeywordId[];
  freeText: string;
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
  departmentKeywordIds: [],
  freeText: "",
};

const SESSION_KEY = "admission-114-query-v1";
const SCORE_PARAMS = {
  國文: "ch",
  英文: "en",
  數A: "ma",
  數B: "mb",
  社會: "so",
  自然: "na",
  英聽: "li",
} as const;

function safeScore(value: unknown, subject: (typeof SCORE_SUBJECTS)[number]): string {
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
  return value.filter(
    (item): item is string => typeof item === "string" && item.length > 0,
  );
}

function safeDepartmentIds(value: unknown): DepartmentKeywordId[] {
  const allowed = new Set(
    DEPARTMENT_KEYWORD_OPTIONS.map((option) => option.id),
  );
  return safeStringArray(value).filter((item): item is DepartmentKeywordId =>
    allowed.has(item as DepartmentKeywordId),
  );
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
    departmentKeywordIds: safeDepartmentIds(candidate.departmentKeywordIds),
    freeText: typeof candidate.freeText === "string" ? candidate.freeText : "",
  };
}

export function queryStateFromParams(
  params: URLSearchParams,
): AdmissionQueryState {
  const departmentIds = params.get("dept")?.split(",").filter(Boolean) ?? [];

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
    departmentKeywordIds: safeDepartmentIds(departmentIds),
    freeText: params.get("q") ?? "",
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
  if (state.departmentKeywordIds.length > 0) {
    params.set("dept", state.departmentKeywordIds.join(","));
  }
  if (state.freeText.trim()) params.set("q", state.freeText.trim());

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
    "dept",
    "q",
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
