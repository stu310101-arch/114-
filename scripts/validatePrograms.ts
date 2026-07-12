import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Program } from "../lib/types";

const VALID_SUBJECTS = new Set([
  "國文",
  "英文",
  "數A",
  "數B",
  "社會",
  "自然",
  "英聽",
]);
const VALID_GROUP_TAGS = new Set(["自然組", "社會組"]);
const SOURCE_URL_FIELDS = [
  "collegeListUrl",
  "reportHtmlUrl",
  "reportImageUrl",
] as const;

export type ValidationIssue = Readonly<{
  path: string;
  message: string;
}>;

export type ProgramsValidationReport = Readonly<{
  valid: boolean;
  programCount: number;
  verifiedCount: number;
  unverifiedCount: number;
  errors: readonly ValidationIssue[];
  warnings: readonly ValidationIssue[];
}>;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isHttpUrl(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * 驗證原始 JSON；不因 `verified: false` 判為結構錯誤，但會明確列入警告。
 * 正式查詢是否排除未校對資料，則由 `lib/filters.ts` 強制保證。
 */
export function validatePrograms(input: unknown): ProgramsValidationReport {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!Array.isArray(input)) {
    return {
      valid: false,
      programCount: 0,
      verifiedCount: 0,
      unverifiedCount: 0,
      errors: [{ path: "$", message: "根節點必須是校系陣列" }],
      warnings,
    };
  }

  const seenProgramCodes = new Map<string, number>();
  let verifiedCount = 0;
  let unverifiedCount = 0;

  input.forEach((candidate, index) => {
    const basePath = `$[${index}]`;
    const addError = (field: string, message: string) => {
      errors.push({ path: `${basePath}.${field}`, message });
    };

    if (!isRecord(candidate)) {
      errors.push({ path: basePath, message: "每筆校系資料必須是物件" });
      return;
    }

    if (candidate.year !== 114) {
      addError("year", "year 必須是數字 114");
    }

    for (const field of [
      "schoolId",
      "schoolName",
      "programCode",
      "programName",
    ] as const) {
      if (!isNonEmptyString(candidate[field])) {
        addError(field, `${field} 必須是非空字串`);
      }
    }

    if (isNonEmptyString(candidate.programCode)) {
      const code = candidate.programCode.trim();
      const firstIndex = seenProgramCodes.get(code);
      if (firstIndex !== undefined) {
        addError(
          "programCode",
          `校系代碼 ${code} 重複，首次出現在 $[${firstIndex}]`,
        );
      } else {
        seenProgramCodes.set(code, index);
      }
    }

    if (
      candidate.quota !== undefined &&
      (typeof candidate.quota !== "number" ||
        !Number.isInteger(candidate.quota) ||
        candidate.quota < 0)
    ) {
      addError("quota", "quota 必須是非負整數");
    }

    if (
      !Array.isArray(candidate.groupTags) ||
      candidate.groupTags.length === 0
    ) {
      addError("groupTags", "groupTags 至少要有自然組或社會組其中一項");
    } else {
      candidate.groupTags.forEach((tag, tagIndex) => {
        if (typeof tag !== "string" || !VALID_GROUP_TAGS.has(tag)) {
          addError(
            `groupTags[${tagIndex}]`,
            "groupTags 只能包含自然組或社會組",
          );
        }
      });
    }

    if (
      !Array.isArray(candidate.departmentKeywords) ||
      candidate.departmentKeywords.some((keyword) =>
        !isNonEmptyString(keyword),
      )
    ) {
      addError(
        "departmentKeywords",
        "departmentKeywords 必須是字串陣列",
      );
    }

    if (
      !Array.isArray(candidate.screeningRules) ||
      candidate.screeningRules.length === 0
    ) {
      addError("screeningRules", "screeningRules 至少要有一筆規則");
    } else {
      candidate.screeningRules.forEach((rule, ruleIndex) => {
        const rulePath = `screeningRules[${ruleIndex}]`;
        if (!isRecord(rule)) {
          addError(rulePath, "每筆 screeningRule 必須是物件");
          return;
        }

        if (
          typeof rule.order !== "number" ||
          !Number.isInteger(rule.order) ||
          rule.order < 1
        ) {
          addError(`${rulePath}.order`, "order 必須是大於 0 的整數");
        }
        if (!isNonEmptyString(rule.label)) {
          addError(`${rulePath}.label`, "label 必須是非空字串");
        }
        if (typeof rule.rawText !== "string") {
          addError(`${rulePath}.rawText`, "rawText 必須是字串");
        }

        if (!Array.isArray(rule.subjects) || rule.subjects.length === 0) {
          addError(`${rulePath}.subjects`, "subjects 至少要有一個科目");
        } else {
          const seenSubjects = new Set<unknown>();
          rule.subjects.forEach((subject, subjectIndex) => {
            if (typeof subject !== "string" || !VALID_SUBJECTS.has(subject)) {
              addError(
                `${rulePath}.subjects[${subjectIndex}]`,
                `未知科目：${String(subject)}`,
              );
            } else if (seenSubjects.has(subject)) {
              addError(
                `${rulePath}.subjects[${subjectIndex}]`,
                `同一規則不可重複計算科目：${subject}`,
              );
            }
            seenSubjects.add(subject);
          });
        }

        if (
          typeof rule.minScore !== "number" ||
          !Number.isFinite(rule.minScore)
        ) {
          addError(`${rulePath}.minScore`, "minScore 必須是有限數字");
        } else if (rule.minScore < 0) {
          addError(`${rulePath}.minScore`, "minScore 不可小於 0");
        } else if (
          Array.isArray(rule.subjects) &&
          rule.subjects.length > 0 &&
          rule.minScore > rule.subjects.length * 15
        ) {
          addError(
            `${rulePath}.minScore`,
            "minScore 超過所列科目的最高總級分",
          );
        }
      });
    }

    if (!isRecord(candidate.source)) {
      addError("source", "source 必須是物件，且包含三個官方網址");
    } else {
      for (const field of SOURCE_URL_FIELDS) {
        if (!isHttpUrl(candidate.source[field])) {
          addError(
            `source.${field}`,
            `${field} 必須是存在且格式正確的 http(s) URL`,
          );
        }
      }
    }

    if (typeof candidate.verified !== "boolean") {
      addError("verified", "verified 必須明確為 boolean");
    } else if (candidate.verified) {
      verifiedCount += 1;
    } else {
      unverifiedCount += 1;
      warnings.push({
        path: `${basePath}.verified`,
        message: "此筆尚未人工校對，正式篩選會排除",
      });
    }
  });

  return {
    valid: errors.length === 0,
    programCount: input.length,
    verifiedCount,
    unverifiedCount,
    errors,
    warnings,
  };
}

async function main(): Promise<void> {
  const filePath = resolve(process.argv[2] ?? "data/programs_114.json");
  let input: unknown;

  try {
    input = JSON.parse(await readFile(filePath, "utf8")) as unknown;
  } catch (error) {
    console.error(
      `無法讀取或解析 ${filePath}:`,
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
    return;
  }

  const report = validatePrograms(input);
  for (const issue of report.errors) {
    console.error(`錯誤 ${issue.path}: ${issue.message}`);
  }
  for (const issue of report.warnings) {
    console.warn(`警告 ${issue.path}: ${issue.message}`);
  }

  console.log(
    `校系 ${report.programCount} 筆；已校對 ${report.verifiedCount} 筆；未校對 ${report.unverifiedCount} 筆`,
  );

  if (!report.valid) {
    console.error(`資料驗證失敗，共 ${report.errors.length} 個錯誤`);
    process.exitCode = 1;
  } else {
    console.log("資料驗證通過");
  }
}

const entryUrl = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : undefined;
if (entryUrl === import.meta.url) {
  void main();
}

// 保留顯式型別關聯，確保 validator 與正式資料介面同步接受 TypeScript 檢查。
export type ValidatedProgram = Program;
