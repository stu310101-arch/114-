import { describe, expect, it } from "vitest";
import programsJson from "../data/programs_114.json";
import learningGroupsJson from "../data/program_learning_groups_114.json";
import { LEARNING_GROUP_OPTIONS } from "../lib/learningGroups";
import {
  isProgramSelected,
  rankDepartmentOptions,
  selectedDepartmentCount,
  selectedUniqueProgramCodes,
  selectedProgramCount,
  toDepartmentOptions,
  toProgramOptions,
  toggleProgramCodes,
  toggleProgramSelection,
} from "../lib/programSelection";
import { filterPrograms } from "../lib/filters";
import { supportsProgramEvaluation } from "../lib/admission";
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
    const schools = new Set(options.map((program) => program.schoolId));
    const natural = options.filter((program) =>
      program.groupTags.includes("自然組"),
    );
    const social = options.filter((program) =>
      program.groupTags.includes("社會組"),
    );

    expect(options).toHaveLength(2168);
    expect(codes.size).toBe(2168);
    expect(schools.size).toBe(66);
    expect([...codes].every((code) => /^\d{6}$/.test(code))).toBe(true);
    expect(natural).toHaveLength(1280);
    expect(social).toHaveLength(1287);
    expect(Object.keys(learningGroupsJson.programs)).toHaveLength(2168);
    expect(learningGroupsJson.unresolvedPrograms).toEqual([]);
    expect(LEARNING_GROUP_OPTIONS).toHaveLength(18);
    LEARNING_GROUP_OPTIONS.forEach(({ id }) => {
      expect(
        options.some((program) => program.learningGroupIds.includes(id)),
      ).toBe(true);
    });
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

  it("科系選單只列去重後的科系名稱，不重複顯示學校", () => {
    const options = toProgramOptions(programs);
    const naturalDepartments = toDepartmentOptions(options, "自然組");
    const socialDepartments = toDepartmentOptions(options, "社會組");
    const computerScience = naturalDepartments.find(
      (department) => department.departmentName === "資訊工程學系",
    );

    expect(naturalDepartments).toHaveLength(853);
    expect(socialDepartments).toHaveLength(934);
    expect(computerScience?.programCodes).toHaveLength(30);
    expect(
      naturalDepartments.every(
        (department) => !("schoolName" in department),
      ),
    ).toBe(true);
  });

  it("中正大學數學系數 A 官方最低篩選級分固定為 11", () => {
    const mathematics = programs.find(
      (program) => program.programCode === "041052",
    );
    const mathARule = mathematics?.screeningRules.find(
      (rule) => rule.label === "數A",
    );

    expect(mathematics?.schoolName).toBe("國立中正大學");
    expect(mathARule).toMatchObject({
      order: 3,
      subjects: ["數A"],
      minScore: 11,
      rawText: "數A11",
    });
  });

  it("全表複驗發現的 12 個官方門檻均已校正", () => {
    const correctedRuleScores = [
      ["001112", 1, 11],
      ["002222", 2, 11],
      ["003132", 2, 11],
      ["004242", 2, 11],
      ["006392", 1, 11],
      ["007012", 2, 11],
      ["011262", 1, 53],
      ["011292", 2, 52],
      ["013132", 2, 51],
      ["013442", 2, 58],
      ["027182", 3, 11],
      ["109012", 1, 57],
    ] as const;

    correctedRuleScores.forEach(([programCode, order, minScore]) => {
      const program = programs.find(
        (candidate) => candidate.programCode === programCode,
      );
      expect(program?.screeningRules.find((rule) => rule.order === order))
        .toMatchObject({ order, minScore });
    });
  });

  it("逢甲中文不將官方未啟動的社會倍率建模為零分門檻", () => {
    const chinese = programs.find(
      (program) => program.programCode === "015232",
    );

    expect(chinese?.screeningRules).toEqual([
      {
        order: 1,
        label: "國文",
        subjects: ["國文"],
        minScore: 10,
        rawText: "國文10",
      },
    ]);
  });

  it("臺大戲劇保留男、女生分列名額與兩套官方門檻", () => {
    const theatre = programs.find(
      (program) => program.programCode === "001082",
    );

    expect(theatre).toMatchObject({
      quota: 17,
      screeningRules: [],
      evaluationSupport: "supported",
    });
    expect(theatre?.screeningVariants).toEqual([
      expect.objectContaining({
        applicantGender: "male",
        label: "男生組",
        quota: 8,
        screeningRules: expect.arrayContaining([
          expect.objectContaining({ order: 3, minScore: 41 }),
          expect.objectContaining({ order: 4, minScore: 12 }),
          expect.objectContaining({ order: 5, minScore: 13 }),
        ]),
      }),
      expect.objectContaining({
        applicantGender: "female",
        label: "女生組",
        quota: 9,
        screeningRules: expect.arrayContaining([
          expect.objectContaining({ order: 3, minScore: 45 }),
          expect.objectContaining({ order: 4, minScore: 13 }),
          expect.objectContaining({ order: 5, minScore: 14 }),
        ]),
      }),
    ]);
  });

  it("三筆校系保留官方男女名額與不同篩選門檻", () => {
    const expectedVariants = {
      "031232": [
        { applicantGender: "male", label: "男生組", quota: 16, minScore: 2 },
        {
          applicantGender: "female",
          label: "女生組",
          quota: 12,
          minScore: 3,
        },
      ],
      "033202": [
        {
          applicantGender: "male",
          label: "男生組",
          quota: 6,
          minScore: 13,
        },
        {
          applicantGender: "female",
          label: "女生組",
          quota: 16,
          minScore: 16,
        },
      ],
      "056042": [
        {
          applicantGender: "male",
          label: "男生組",
          quota: 10,
          minScore: 21,
        },
        {
          applicantGender: "female",
          label: "女生組",
          quota: 10,
          minScore: 28,
        },
      ],
    } as const;

    for (const [programCode, variants] of Object.entries(expectedVariants)) {
      const program = programs.find((item) => item.programCode === programCode);

      expect(program).toMatchObject({
        screeningRules: [],
        evaluationSupport: "supported",
      });
      expect(program?.screeningVariants).toHaveLength(2);
      expect(
        program?.screeningVariants?.map((variant) => ({
          applicantGender: variant.applicantGender,
          label: variant.label,
          quota: variant.quota,
          minScore: variant.screeningRules[0]?.minScore,
        })),
      ).toEqual(variants);
      expect(
        program?.screeningVariants?.reduce(
          (total, variant) => total + variant.quota,
          0,
        ),
      ).toBe(program?.quota);
    }
  });

  it("女子啦啦舞組只允許女生組進行通過判定", () => {
    const cheerDance = programs.find(
      (program) => program.programCode === "039072",
    );

    expect(cheerDance).toMatchObject({
      quota: 5,
      screeningRules: [],
      evaluationSupport: "supported",
    });
    expect(cheerDance?.screeningVariants).toEqual([
      expect.objectContaining({
        applicantGender: "female",
        label: "女生組",
        quota: 5,
        screeningRules: [
          expect.objectContaining({
            label: "國文＋英文＋社會",
            minScore: 13,
          }),
        ],
      }),
    ]);
    expect(supportsProgramEvaluation(cheerDance!, "female")).toBe(true);
    expect(supportsProgramEvaluation(cheerDance!, "male")).toBe(false);
    expect(supportsProgramEvaluation(cheerDance!)).toBe(false);
  });

  it("臺大資工 APCS 組明列特殊門檻並警示不可只用學測完整判定", () => {
    const apcs = programs.find(
      (program) => program.programCode === "001602",
    );

    expect(apcs).toMatchObject({
      evaluationSupport: "unsupported",
      screeningRules: [],
      additionalScreeningRules: [
        { label: "數學A", minScore: 12, rawText: "數學A12" },
        { label: "APCS 實作題", minScore: 5, rawText: "APCS 實作題5" },
      ],
    });
    expect(apcs?.reviewReasons?.join(" ")).toContain(
      "不可用一般學測成績完整判定",
    );
  });

  it("逢甲資工 APCS 組完整保留三項官方最低篩選分數", () => {
    const apcs = programs.find(
      (program) => program.programCode === "015262",
    );

    expect(apcs).toMatchObject({
      evaluationSupport: "unsupported",
      screeningRules: [],
      additionalScreeningRules: [
        {
          label: "APCS 觀念題＋實作題",
          minScore: 4,
          rawText: "APCS 觀念題＋實作題4",
        },
        { label: "數學A", minScore: 4, rawText: "數學A4" },
        {
          label: "國文＋英文＋數學A",
          minScore: 24,
          rawText: "國文＋英文＋數學A24",
        },
      ],
    });
    expect(apcs?.reviewReasons).toEqual([
      "需特殊檢定（APCS），不可用一般學測成績完整判定，詳情請至官方網站查詢",
    ]);
  });

  it("APCS 與術科校系不發布可能錯位的部分學測規則", () => {
    ["004522", "056182"].forEach((programCode) => {
      const program = programs.find(
        (candidate) => candidate.programCode === programCode,
      );
      expect(program).toMatchObject({
        programCode,
        evaluationSupport: "unsupported",
        screeningRules: [],
      });
      expect(program?.source.reportImageUrl).toMatch(/^https:\/\//u);
      expect(program?.reviewReasons?.[0]).toMatch(
        /^需特殊檢定（(?:APCS|術科)）/u,
      );
    });
  });

  it("全數 APCS 與術科校系均標示需特殊檢定並停止自動判斷", () => {
    const apcsProgramsWithoutApcsInName = [
      "013092",
      "016252",
      "033152",
      "058102",
      "101132",
      "150172",
      "153112",
    ];
    const expectedApcsPrograms = programs.filter(
      (program) =>
        /APCS/iu.test(program.programName) ||
        apcsProgramsWithoutApcsInName.includes(program.programCode),
    );
    const specialPrograms = programs.filter((program) =>
      program.reviewReasons?.some((reason) =>
        reason.startsWith("需特殊檢定"),
      ),
    );
    const apcsPrograms = specialPrograms.filter((program) =>
      program.reviewReasons?.some((reason) => reason.includes("（APCS）")),
    );
    const artPrograms = specialPrograms.filter((program) =>
      program.reviewReasons?.some((reason) => reason.includes("（術科）")),
    );

    expect(expectedApcsPrograms).toHaveLength(60);
    expect(specialPrograms).toHaveLength(130);
    expect(apcsPrograms).toHaveLength(60);
    expect(artPrograms).toHaveLength(70);
    specialPrograms.forEach((program) => {
      expect(program.evaluationSupport).toBe("unsupported");
      expect(program.screeningRules).toEqual([]);
      expect(program.reviewReasons?.[0]).toMatch(
        /^需特殊檢定（(?:APCS|術科)）/u,
      );
    });
    expectedApcsPrograms.forEach((program) => {
      expect(specialPrograms).toContain(program);
    });
  });

  it("60 筆 APCS 均完整收錄個別檢定、倍率與依序最低分", () => {
    const apcsPrograms = programs.filter((program) =>
      Object.prototype.hasOwnProperty.call(program, "apcsConceptMin"),
    );
    const knownIndividualMinimums: Record<
      string,
      readonly [number | null, number | null]
    > = {
      "001602": [4, 4],
      "002282": [4, 3],
      "003082": [3, 3],
      "003272": [4, 3],
      "004252": [4, 3],
      "004522": [3, 2],
      "005222": [2, 2],
      "006422": [4, 3],
      "014482": [2, 2],
      "014492": [2, 2],
      "014502": [2, 2],
      "014512": [2, 2],
      "015262": [2, 2],
      "018232": [2, null],
      "018262": [2, null],
      "018292": [2, null],
    };

    expect(apcsPrograms).toHaveLength(60);
    apcsPrograms.forEach((program) => {
      expect(program.additionalScreeningRules?.length).toBeGreaterThan(0);
      expect(program).toHaveProperty("apcsPracticeMin");
      expect(program).toHaveProperty("apcsConceptMultiplier");
      expect(program).toHaveProperty("apcsPracticeMultiplier");
      expect(program.reviewReasons?.join(" ")).not.toMatch(
        /未能解析|OCR|無法確認/u,
      );
    });
    Object.entries(knownIndividualMinimums).forEach(
      ([programCode, [conceptMin, practiceMin]]) => {
        const program = apcsPrograms.find(
          (candidate) => candidate.programCode === programCode,
        );
        expect(program?.apcsConceptMin).toBe(conceptMin);
        expect(program?.apcsPracticeMin).toBe(practiceMin);
      },
    );
  });

  it("官方最低分全為 -- 的校系使用 dash 狀態，不再描述為資料缺失", () => {
    const dashCodes = [
      "027402",
      "027432",
      "032062",
      "099142",
      "130092",
      "042052",
      "110112",
      "110222",
    ];
    const exactReason =
      "官方「通過倍率篩選最低級分」欄為 --，沒有數值可供自動判定。";

    dashCodes.forEach((programCode) => {
      const program = programs.find(
        (candidate) => candidate.programCode === programCode,
      );
      expect(program?.officialThresholdStatus).toBe("dash");
      expect(program?.reviewReasons).toContain(exactReason);
      expect(program?.reviewReasons?.join(" ")).not.toContain("資料缺失");
    });
  });

  it("完整說明臺師大 8 筆特殊檢定門檻與音樂系分流名額", () => {
    const expectedRules = {
      "002282": [
        { label: "英文", minScore: 8, rawText: "英文8" },
        { label: "數學A", minScore: 10, rawText: "數學A10" },
        {
          label: "APCS 觀念題＋實作題",
          minScore: 7,
          rawText: "APCS 觀念題＋實作題7",
        },
      ],
      "002472": [
        { label: "國文＋英文", minScore: 34, rawText: "國文＋英文34" },
        {
          label: "素描＋彩繪技法＋創意表現",
          minScore: 213,
          rawText: "素描＋彩繪技法＋創意表現213",
        },
      ],
      "002482": [
        { label: "國文＋英文", minScore: 28, rawText: "國文＋英文28" },
        { label: "彩繪技法", minScore: 72, rawText: "彩繪技法72" },
        { label: "素描", minScore: 75, rawText: "素描75" },
      ],
      "002492": [
        { label: "國文＋英文", minScore: 26, rawText: "國文＋英文26" },
        { label: "彩繪技法", minScore: 69, rawText: "彩繪技法69" },
        { label: "素描", minScore: 69, rawText: "素描69" },
        { label: "水墨書畫", minScore: 79.8, rawText: "水墨書畫79.8" },
      ],
      "002502": [
        {
          label: "體育百分等級",
          minScore: 75.36,
          rawText: "體育百分等級75.36",
        },
        {
          label: "國文＋英文＋社會＋自然",
          minScore: 30,
          rawText: "國文＋英文＋社會＋自然30",
        },
      ],
      "002512": [
        {
          label: "體育百分等級",
          minScore: 75.3,
          rawText: "體育百分等級75.3",
        },
        {
          label: "國文＋英文＋社會＋自然",
          minScore: 37,
          rawText: "國文＋英文＋社會＋自然37",
        },
      ],
      "002522": [
        {
          label: "體育百分等級",
          minScore: 82.7,
          rawText: "體育百分等級82.7",
        },
        {
          label: "國文＋英文＋社會＋自然",
          minScore: 43,
          rawText: "國文＋英文＋社會＋自然43",
        },
      ],
    } as const;
    const expectedDetails = {
      "002282": ["英文 8", "數學A 10", "APCS 觀念題＋實作題合計 7"],
      "002452": ["64 名", "19 種主修樂器", "名額與術科最低分不同"],
      "002472": ["國文＋英文 34", "素描＋彩繪技法＋創意表現 213"],
      "002482": ["國文＋英文 28", "彩繪技法 72", "素描 75"],
      "002492": ["國文＋英文 26", "彩繪技法 69", "素描 69", "水墨書畫 79.8"],
      "002502": ["體育百分等級 75.36", "國文＋英文＋社會＋自然 30"],
      "002512": ["體育百分等級 75.3", "國文＋英文＋社會＋自然 37"],
      "002522": ["體育百分等級 82.7", "國文＋英文＋社會＋自然 43"],
    } as const;

    Object.entries(expectedDetails).forEach(([programCode, details]) => {
      const program = programs.find(
        (candidate) => candidate.programCode === programCode,
      );
      expect(program).toMatchObject({
        programCode,
        evaluationSupport: "unsupported",
      });
      const explanation = program?.reviewReasons?.join("；") ?? "";
      details.forEach((detail) => expect(explanation).toContain(detail));
      if (programCode in expectedRules) {
        expect(program?.additionalScreeningRules).toEqual(
          expectedRules[programCode as keyof typeof expectedRules],
        );
      }
    });
  });

  it("科系搜尋逐字依序比對並依相似度排序", () => {
    const naturalDepartments = toDepartmentOptions(
      toProgramOptions(programs),
      "自然組",
    );
    const computerScience = rankDepartmentOptions(
      naturalDepartments,
      "資工系",
    );
    const dentistry = rankDepartmentOptions(naturalDepartments, "牙醫系");

    expect(computerScience.length).toBeGreaterThan(3);
    expect(
      computerScience.some(
        (department) => department.departmentName === "資訊工程學系",
      ),
    ).toBe(true);
    const firstNonInformationEngineering = computerScience.findIndex(
      (department) => !department.departmentName.includes("資訊工程"),
    );
    const lastInformationEngineering = computerScience.reduce(
      (lastIndex, department, index) =>
        department.departmentName.includes("資訊工程") ? index : lastIndex,
      -1,
    );
    expect(firstNonInformationEngineering).toBeGreaterThanOrEqual(0);
    expect(lastInformationEngineering).toBeLessThan(
      firstNonInformationEngineering,
    );
    expect(
      computerScience.every((department) => {
        let cursor = 0;
        return [..."資工系"].every((character) => {
          const index = department.departmentName.indexOf(character, cursor);
          if (index < 0) return false;
          cursor = index + 1;
          return true;
        });
      }),
    ).toBe(true);
    expect(dentistry.length).toBeGreaterThan(0);
    expect(
      dentistry.every((department) =>
        department.departmentName.includes("牙"),
      ),
    ).toBe(true);
    expect(
      dentistry.some((department) => department.departmentName === "中醫學系"),
    ).toBe(false);
  });

  it("完整說明中興大學 2 筆 APCS 特殊門檻", () => {
    const expectedRules = {
      "003082": [
        { label: "英文＋自然", minScore: 23, rawText: "英文＋自然23" },
        {
          label: "APCS 觀念題＋實作題",
          minScore: 6,
          rawText: "APCS 觀念題＋實作題6",
        },
        { label: "數學A", minScore: 9, rawText: "數學A9" },
      ],
      "003272": [
        { label: "數學A", minScore: 7, rawText: "數學A7" },
        { label: "英文＋自然", minScore: 25, rawText: "英文＋自然25" },
        {
          label: "英文＋數學A＋自然",
          minScore: 34,
          rawText: "英文＋數學A＋自然34",
        },
        {
          label: "APCS 觀念題＋實作題",
          minScore: 7,
          rawText: "APCS 觀念題＋實作題7",
        },
      ],
    } as const;

    Object.entries(expectedRules).forEach(([programCode, rules]) => {
      const program = programs.find(
        (candidate) => candidate.programCode === programCode,
      );
      expect(program).toMatchObject({
        programCode,
        evaluationSupport: "unsupported",
        screeningRules: [],
      });
      expect(program?.additionalScreeningRules).toEqual(rules);
      expect(program?.reviewReasons).toEqual([
        "需特殊檢定（APCS），不可用一般學測成績完整判定，詳情請至官方網站查詢",
      ]);
    });
  });

  it("完整說明成功大學 2 筆 APCS 組最低篩選分數", () => {
    const expectedRules = {
      "004252": [
        { label: "英文＋數學A", minScore: 21, rawText: "英文＋數學A21" },
        {
          label: "APCS 觀念題＋實作題",
          minScore: 8,
          rawText: "APCS 觀念題＋實作題8",
        },
      ],
      "004522": [
        { label: "國文", minScore: 10, rawText: "國文10" },
        {
          label: "APCS 觀念題＋實作題",
          minScore: 5,
          rawText: "APCS 觀念題＋實作題5",
        },
        { label: "英文＋數學A", minScore: 16, rawText: "英文＋數學A16" },
        { label: "自然", minScore: 12, rawText: "自然12" },
      ],
    } as const;

    Object.entries(expectedRules).forEach(([programCode, rules]) => {
      const program = programs.find(
        (candidate) => candidate.programCode === programCode,
      );
      expect(program).toMatchObject({
        programCode,
        evaluationSupport: "unsupported",
        screeningRules: [],
      });
      expect(program?.additionalScreeningRules).toEqual(rules);
      expect(program?.reviewReasons).toEqual([
        "需特殊檢定（APCS），不可用一般學測成績完整判定，詳情請至官方網站查詢",
      ]);
    });
  });

  it("完整保留東吳與政大 3 筆特殊篩選門檻", () => {
    const expectedApcsRules = {
      "005222": [
        {
          label: "APCS 觀念題＋實作題",
          minScore: 4,
          rawText: "APCS 觀念題＋實作題4",
        },
        { label: "英文＋數學B", minScore: 12, rawText: "英文＋數學B12" },
      ],
      "006422": [
        { label: "數學A＋自然", minScore: 20, rawText: "數學A＋自然20" },
        { label: "APCS 實作題", minScore: 3, rawText: "APCS 實作題3" },
      ],
    } as const;

    Object.entries(expectedApcsRules).forEach(([programCode, rules]) => {
      const program = programs.find(
        (candidate) => candidate.programCode === programCode,
      );
      expect(program).toMatchObject({
        programCode,
        evaluationSupport: "unsupported",
        screeningRules: [],
      });
      expect(program?.additionalScreeningRules).toEqual(rules);
    });

    const music = programs.find(
      (program) => program.programCode === "005242",
    );
    expect(music).toMatchObject({
      programCode: "005242",
      quota: 48,
      evaluationSupport: "unsupported",
      screeningRules: [],
    });
    expect(
      music?.specialScreeningGroups?.map((group) => [
        group.label,
        group.quota,
        group.rules[0]?.minScore,
      ]),
    ).toEqual([
      ["鋼琴", 10, 80],
      ["聲樂", 5, 83],
      ["小提琴", 7, 82.07],
      ["中提琴", 3, 83.73],
      ["大提琴", 5, 82],
      ["低音提琴", 1, 82.79],
      ["長號", 1, 84.33],
      ["小號", 1, 86.22],
      ["法國號", 2, 84],
      ["上低音號", 1, 86.89],
      ["低音號", 1, 87.56],
      ["薩克斯管", 1, 87],
      ["長笛", 2, 85],
      ["單簧管（豎笛）", 2, 84.22],
      ["雙簧管", 1, 86.78],
      ["低音管", 1, 85.22],
      ["擊樂", 2, 85.2],
      ["理論作曲", 2, 82.6],
    ]);
  });

  it("修正靜宜大學未啟動門檻並完整保留 3 筆 APCS 最低篩選分數", () => {
    const sustainability = programs.find(
      (program) => program.programCode === "018152",
    );
    expect(sustainability).toMatchObject({
      programCode: "018152",
      evaluationSupport: "supported",
      screeningRules: [
        {
          order: 1,
          label: "國文",
          subjects: ["國文"],
          minScore: 7,
          rawText: "國文7",
        },
      ],
    });

    const expectedApcsRules = {
      "018232": [
        { label: "APCS 觀念題", minScore: 2, rawText: "APCS 觀念題2" },
        { label: "國文＋英文", minScore: 9, rawText: "國文＋英文9" },
      ],
      "018262": [
        { label: "APCS 觀念題", minScore: 2, rawText: "APCS 觀念題2" },
        { label: "數學B", minScore: 3, rawText: "數學B3" },
      ],
      "018292": [
        { label: "APCS 觀念題", minScore: 2, rawText: "APCS 觀念題2" },
        { label: "國文", minScore: 6, rawText: "國文6" },
      ],
    } as const;

    Object.entries(expectedApcsRules).forEach(([programCode, rules]) => {
      const program = programs.find(
        (candidate) => candidate.programCode === programCode,
      );
      expect(program).toMatchObject({
        programCode,
        evaluationSupport: "unsupported",
        screeningRules: [],
      });
      expect(program?.additionalScreeningRules).toEqual(rules);
      expect(program?.reviewReasons).toEqual([
        "需特殊檢定（APCS），不可用一般學測成績完整判定，詳情請至官方網站查詢",
      ]);
    });
  });

  it("淡江大學移除未啟動的零分門檻並完整錄入 4 筆 APCS 門檻", () => {
    const expectedOrdinaryRules = {
      "014092": [{ label: "英文", minScore: 8 }],
      "014162": [{ label: "英文", minScore: 6 }],
      "014292": [
        { label: "國文", minScore: 4 },
        { label: "英文", minScore: 10 },
      ],
    } as const;
    const expectedApcsRules = {
      "014482": [
        { label: "英文", minScore: 3, rawText: "英文3" },
        {
          label: "APCS 觀念題＋實作題",
          minScore: 4,
          rawText: "APCS 觀念題＋實作題4",
        },
      ],
      "014492": [
        { label: "英文", minScore: 3, rawText: "英文3" },
        {
          label: "APCS 觀念題＋實作題",
          minScore: 4,
          rawText: "APCS 觀念題＋實作題4",
        },
      ],
      "014502": [
        { label: "國文", minScore: 8, rawText: "國文8" },
        {
          label: "APCS 觀念題＋實作題",
          minScore: 4,
          rawText: "APCS 觀念題＋實作題4",
        },
      ],
      "014512": [
        {
          label: "APCS 觀念題＋實作題",
          minScore: 4,
          rawText: "APCS 觀念題＋實作題4",
        },
        { label: "數學B", minScore: 5, rawText: "數學B5" },
      ],
    } as const;

    Object.entries(expectedOrdinaryRules).forEach(([programCode, rules]) => {
      const program = programs.find(
        (candidate) => candidate.programCode === programCode,
      );
      expect(
        program?.screeningRules.map(({ label, minScore }) => ({
          label,
          minScore,
        })),
      ).toEqual(rules);
      expect(program?.screeningRules.some((rule) => rule.minScore === 0)).toBe(
        false,
      );
    });

    Object.entries(expectedApcsRules).forEach(([programCode, rules]) => {
      const program = programs.find(
        (candidate) => candidate.programCode === programCode,
      );
      expect(program).toMatchObject({
        evaluationSupport: "unsupported",
        screeningRules: [],
        additionalScreeningRules: rules,
      });
      expect(program?.reviewReasons).toEqual([
        "需特殊檢定（APCS），不可用一般學測成績完整判定，詳情請至官方網站查詢",
      ]);
    });
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

  it("勾選一個科系名稱會選取該組所有學校的同名校系", () => {
    const naturalDepartments = toDepartmentOptions(
      toProgramOptions(programs),
      "自然組",
    );
    const computerScience = naturalDepartments.find(
      (department) => department.departmentName === "資訊工程學系",
    );
    if (!computerScience) throw new Error("測試資料缺少資訊工程學系");

    const selection = toggleProgramCodes(
      { mode: "none", codes: [] },
      computerScience.programCodes,
    );
    expect(selection.mode).toBe("include");
    expect(selection.codes).toHaveLength(30);
    expect(selectedDepartmentCount(selection, naturalDepartments)).toBe(1);

    const selectedPrograms = filterPrograms(programs, {
      groupedProgramSelections: {
        自然組: selection,
        社會組: { mode: "none", codes: [] },
      },
    });
    expect(selectedPrograms).toHaveLength(30);
    expect(
      selectedPrograms.every(
        (program) => program.programName === "資訊工程學系",
      ),
    ).toBe(true);

    expect(
      toggleProgramCodes(selection, computerScience.programCodes),
    ).toEqual({ mode: "none", codes: [] });

    const excluded = toggleProgramCodes(
      { mode: "all", codes: [] },
      computerScience.programCodes,
    );
    expect(excluded.mode).toBe("exclude");
    expect(excluded.codes).toHaveLength(30);

    const completedFromPartial = toggleProgramCodes(
      { mode: "include", codes: [computerScience.programCodes[0]] },
      computerScience.programCodes,
    );
    expect(completedFromPartial.mode).toBe("include");
    expect(completedFromPartial.codes).toHaveLength(30);
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
      groupSelection: ["自然組"],
      programSelections: {
        自然組: {
          mode: "include",
          codes: ["030012", "030022", "bad-code"],
        },
        社會組: { mode: "none", codes: [] },
      },
    });
    const restored = queryStateFromParams(params);

    expect(restored.groupSelection).toEqual(["自然組"]);
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
      groupSelection: ["自然組", "社會組"],
      programSelections: {
        自然組: { mode: "all", codes: [] },
        社會組: { mode: "all", codes: [] },
      },
    });

    expect(params.get("naturalMode")).toBe("all");
    expect(params.get("socialMode")).toBe("all");
    expect(params.getAll("group")).toEqual(["自然組", "社會組"]);
    expect(params.getAll("natural")).toEqual([]);
    expect(params.getAll("social")).toEqual([]);
  });
});
