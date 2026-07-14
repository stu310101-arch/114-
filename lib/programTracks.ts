import type { Program } from "./types";

export const PROGRAM_TRACK_OPTIONS = [
  {
    id: "humanities-business",
    label: "第一類組・文法商",
    description: "文史哲、外語、法律、社會、商管、教育與藝術",
  },
  {
    id: "science-engineering",
    label: "第二類組・理工資訊",
    description: "數理、資訊、電機、工程、建築與科技",
  },
  {
    id: "biomedical",
    label: "第三類組・醫藥生命",
    description: "醫牙藥、護理、生科、農業、食品與公衛",
  },
] as const;

export type ProgramTrackId = (typeof PROGRAM_TRACK_OPTIONS)[number]["id"];

const PROGRAM_TRACK_IDS = new Set<ProgramTrackId>(
  PROGRAM_TRACK_OPTIONS.map(({ id }) => id),
);

const TRACK_KEYWORDS: Readonly<Record<ProgramTrackId, readonly string[]>> = {
  "humanities-business": [
    "文學",
    "語文",
    "外語",
    "英語",
    "日語",
    "歷史",
    "哲學",
    "人類",
    "社會",
    "社工",
    "心理",
    "法律",
    "政治",
    "公共",
    "行政",
    "經濟",
    "財政",
    "金融",
    "財務",
    "會計",
    "商學",
    "管理",
    "企業",
    "國際",
    "外交",
    "傳播",
    "新聞",
    "廣告",
    "教育",
    "幼兒",
    "華語",
    "藝術",
    "音樂",
    "戲劇",
    "美術",
    "文化",
    "觀光",
    "休閒",
    "餐旅",
    "運動",
    "體育",
  ],
  "science-engineering": [
    "工程",
    "資訊",
    "資工",
    "人工智慧",
    "電機",
    "電子",
    "機械",
    "土木",
    "化工",
    "材料",
    "數學",
    "統計",
    "物理",
    "化學",
    "科學",
    "科技",
    "光電",
    "半導體",
    "建築",
    "營建",
    "能源",
    "航空",
    "造船",
    "系統",
    "地球",
    "大氣",
  ],
  biomedical: [
    "醫學",
    "牙醫",
    "藥學",
    "護理",
    "生命",
    "生物",
    "生技",
    "生科",
    "農",
    "森林",
    "園藝",
    "獸醫",
    "動物",
    "植物",
    "食品",
    "營養",
    "公共衛生",
    "醫務",
    "醫療",
    "健康",
    "職能治療",
    "物理治療",
    "呼吸治療",
    "語言治療",
    "水產",
    "海洋生物",
  ],
};

function normalizedCorpus(
  program: Pick<Program, "programName" | "departmentKeywords">,
): string {
  return [program.programName, ...(program.departmentKeywords ?? [])]
    .join(" ")
    .normalize("NFKC")
    .replace(/[\s\u3000·・‧,，、()（）\-_/]+/gu, "");
}

export function isProgramTrackId(value: string): value is ProgramTrackId {
  return PROGRAM_TRACK_IDS.has(value as ProgramTrackId);
}

/**
 * 依科系名稱與人工關鍵字提供查詢用領域分類；這不是官方招生分類。
 * 跨領域校系可同時回傳多個類組，未命中時以官方自然／社會標籤補足。
 */
export function programTrackIdsFor(
  program: Pick<Program, "programName" | "departmentKeywords" | "groupTags">,
): ProgramTrackId[] {
  const corpus = normalizedCorpus(program);
  const matched = PROGRAM_TRACK_OPTIONS.flatMap(({ id }) =>
    TRACK_KEYWORDS[id].some((keyword) => corpus.includes(keyword)) ? [id] : [],
  );
  if (matched.length > 0) return matched;

  const fallback: ProgramTrackId[] = [];
  if (program.groupTags.includes("社會組")) fallback.push("humanities-business");
  if (program.groupTags.includes("自然組")) fallback.push("science-engineering");
  return fallback;
}

export function matchesProgramTrackIds(
  available: readonly ProgramTrackId[],
  selected: readonly ProgramTrackId[] = [],
): boolean {
  return selected.length === 0 || selected.some((id) => available.includes(id));
}

export function matchesProgramTracks(
  program: Pick<Program, "programName" | "departmentKeywords" | "groupTags">,
  selected: readonly ProgramTrackId[] = [],
): boolean {
  return matchesProgramTrackIds(programTrackIdsFor(program), selected);
}
