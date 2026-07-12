import { SUBJECTS, type Subject, type UserScores } from "./types";

export { SUBJECTS };

export const SUBJECT_MAX_SCORE = 15;

export const SUBJECT_LABELS: Readonly<Record<Subject, string>> = {
  國文: "國文",
  英文: "英文",
  數A: "數A",
  數B: "數B",
  社會: "社會",
  自然: "自然",
  英聽: "英聽",
};

/** A numeric zero is an entered score. An absent or undefined value is not. */
export function hasSubjectScore(scores: UserScores, subject: Subject): boolean {
  return typeof scores[subject] === "number";
}

/** Missing subjects contribute zero to screening-rule sums. */
export function getSubjectScore(scores: UserScores, subject: Subject): number {
  return hasSubjectScore(scores, subject) ? (scores[subject] as number) : 0;
}

export function assertValidUserScores(scores: UserScores): void {
  for (const subject of SUBJECTS) {
    const score = scores[subject];

    if (score === undefined) {
      continue;
    }

    if (
      typeof score !== "number" ||
      !Number.isFinite(score) ||
      !Number.isInteger(score) ||
      score < 0 ||
      score > SUBJECT_MAX_SCORE
    ) {
      throw new RangeError(`${subject}級分必須是 0 到 ${SUBJECT_MAX_SCORE} 的整數`);
    }
  }
}
