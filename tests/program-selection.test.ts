import { describe, expect, it } from "vitest";
import programsJson from "../data/programs_114.json";
import {
  isProgramSelected,
  selectedUniqueProgramCodes,
  selectedProgramCount,
  toProgramOptions,
  toggleProgramSelection,
} from "../lib/programSelection";
import { filterPrograms } from "../lib/filters";
import type { Program } from "../lib/types";
import {
  DEFAULT_QUERY_STATE,
  EXAMPLE_SCORES,
  queryStateFromParams,
  queryStateToParams,
} from "../components/queryState";

const programs = programsJson as Program[];

describe("114 官方校系選取資料", () => {
  it("完整保留 2,168 個唯一 6 碼校系代碼與兩組清單", () => {
    const options = toProgramOptions(programs);
    const codes = new Set(options.map((program) => program.programCode));
    const natural = options.filter((program) =>
      program.groupTags.includes("自然組"),
    );
    const social = options.filter((program) =>
      program.groupTags.includes("社會組"),
    );

    expect(options).toHaveLength(2168);
    expect(codes.size).toBe(2168);
    expect([...codes].every((code) => /^\d{6}$/.test(code))).toBe(true);
    expect(natural).toHaveLength(1280);
    expect(social).toHaveLength(1287);
  });

  it("長庚大學 27 個校系均可進入選取清單", () => {
    const changGung = toProgramOptions(programs).filter(
      (program) => program.schoolName === "長庚大學",
    );

    expect(changGung).toHaveLength(27);
    expect(changGung.every((program) => program.programCode.startsWith("030")))
      .toBe(true);
    expect(changGung.map((program) => program.programName)).toContain("醫學系");
  });

  it("兩組可分開全選；兩組同時全選時重疊校系只算一次", () => {
    const options = toProgramOptions(programs);
    const naturalOnly = selectedUniqueProgramCodes(options, {
      自然組: { mode: "all", codes: [] },
      社會組: { mode: "none", codes: [] },
    });
    const bothGroups = selectedUniqueProgramCodes(options, {
      自然組: { mode: "all", codes: [] },
      社會組: { mode: "all", codes: [] },
    });

    expect(naturalOnly).toHaveLength(1280);
    expect(bothGroups).toHaveLength(2168);
    expect(new Set(bothGroups).size).toBe(2168);
  });
});

describe("programSelection", () => {
  const codes = ["001012", "041082", "099202"];

  it("預設不選，單筆勾選與取消使用 include 模式", () => {
    const selected = toggleProgramSelection(
      { mode: "none", codes: [] },
      "041082",
    );
    expect(selected).toEqual({ mode: "include", codes: ["041082"] });
    expect(isProgramSelected(selected, "041082")).toBe(true);
    expect(selectedProgramCount(selected, codes)).toBe(1);
    expect(toggleProgramSelection(selected, "041082")).toEqual({
      mode: "none",
      codes: [],
    });
  });

  it("全選後只記錄取消勾選的少數代碼", () => {
    const exceptOne = toggleProgramSelection(
      { mode: "all", codes: [] },
      "099202",
    );
    expect(exceptOne).toEqual({ mode: "exclude", codes: ["099202"] });
    expect(selectedProgramCount(exceptOne, codes)).toBe(2);
    expect(isProgramSelected(exceptOne, "099202")).toBe(false);
  });

  it("結果篩選精確使用校系代碼", () => {
    const selected = filterPrograms(programs, {
      programSelection: {
        mode: "include",
        codes: ["030012", "030272"],
      },
    });
    expect(selected.map((program) => program.programCode)).toEqual([
      "030012",
      "030272",
    ]);
    expect(
      filterPrograms(programs, {
        programSelection: { mode: "none", codes: [] },
      }),
    ).toHaveLength(0);
  });

  it("自然組與社會組各自選取後採聯集，重疊校系不重複", () => {
    const selected = filterPrograms(programs, {
      groupedProgramSelections: {
        自然組: { mode: "include", codes: ["030042", "030012"] },
        社會組: { mode: "include", codes: ["030042", "099202"] },
      },
    });

    expect(selected.map((program) => program.programCode)).toEqual([
      "030012",
      "030042",
      "099202",
    ]);
  });
});

describe("科系選取網址狀態", () => {
  it("include 模式可完整往返，並拒絕非 6 碼代碼", () => {
    const params = queryStateToParams({
      ...DEFAULT_QUERY_STATE,
      scores: EXAMPLE_SCORES,
      groupSelection: "自然組",
      programSelections: {
        自然組: {
          mode: "include",
          codes: ["030012", "030022", "bad-code"],
        },
        社會組: { mode: "none", codes: [] },
      },
    });
    const restored = queryStateFromParams(params);

    expect(restored.groupSelection).toBe("自然組");
    expect(restored.programSelections.自然組).toEqual({
      mode: "include",
      codes: ["030012", "030022"],
    });
    expect(restored.programSelections.社會組).toEqual({
      mode: "none",
      codes: [],
    });
    expect(restored.scores).toEqual(EXAMPLE_SCORES);
  });

  it("兩組全選各自只傳模式，不在網址列展開上千個代碼", () => {
    const params = queryStateToParams({
      ...DEFAULT_QUERY_STATE,
      groupSelection: "社會組",
      programSelections: {
        自然組: { mode: "all", codes: [] },
        社會組: { mode: "all", codes: [] },
      },
    });

    expect(params.get("naturalMode")).toBe("all");
    expect(params.get("socialMode")).toBe("all");
    expect(params.getAll("natural")).toEqual([]);
    expect(params.getAll("social")).toEqual([]);
  });
});
