export const SUBJECTS = [
  "國文",
  "英文",
  "數A",
  "數B",
  "社會",
  "自然",
  "英聽",
] as const;

export type Subject = (typeof SUBJECTS)[number];

export type GroupTag = "自然組" | "社會組";

export type ScreeningRule = {
  order: number;
  label: string;
  subjects: Subject[];
  minScore: number;
  rawText: string;
};

export type ProgramSource = {
  collegeListUrl: string;
  reportHtmlUrl: string;
  reportImageUrl: string;
};

export type Program = {
  year: 114;
  schoolId: string;
  schoolName: string;
  programCode: string;
  programName: string;
  quota?: number;
  groupTags: GroupTag[];
  departmentKeywords: string[];
  screeningRules: ScreeningRule[];
  source: ProgramSource;
  verified: boolean;
};

export type UserScores = Partial<Record<Subject, number>>;

export type RuleResult = {
  rule: ScreeningRule;
  userScore: number;
  minScore: number;
  deficit: number;
  passed: boolean;
};

export type SubjectChange = {
  subject: Subject;
  points: number;
  from: number;
  to: number;
};

/** One minimum-total-points way to make every screening rule pass. */
export type SubjectBoost = {
  totalPoints: number;
  changes: SubjectChange[];
};

export type EvaluationResult = {
  passed: boolean;
  program: Program;
  ruleResults: RuleResult[];
  failedRules: RuleResult[];
  /** Sum of each failed rule's deficit; overlapping rules may count the same point. */
  totalDeficit: number;
  /** Subjects used by this program that are absent (or undefined) in UserScores. */
  missingSubjects: Subject[];
  /** Up to five tied, minimum-total-points boost plans. */
  nearestBoost: SubjectBoost[];
};
