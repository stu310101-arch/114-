"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  type DepartmentKeywordId,
} from "@/config/departmentKeywords";
import {
  SCHOOL_GROUPS,
  type SchoolGroupId,
} from "@/config/schoolGroups";
import { evaluateProgram } from "@/lib/admission";
import {
  filterPrograms,
  type ProgramFilterCriteria,
} from "@/lib/filters";
import type {
  EvaluationResult,
  Program,
  Subject,
  UserScores,
} from "@/lib/types";
import {
  FilterPanel,
  type GroupSelection,
  type SchoolSourceOption,
} from "./FilterPanel";
import { ProgramResultTable } from "./ProgramResultTable";
import {
  SCORE_SUBJECTS,
  ScoreForm,
  type ScoreDraft,
  type ScoreSubject,
} from "./ScoreForm";
import { SourceLink } from "./SourceLink";

type SchoolSource = SchoolSourceOption & {
  reportHtmlUrl: string;
  reportImageUrl: string;
  collegeListUrl: string;
};

type AdmissionExplorerProps = {
  programs: Program[];
  schoolSources: SchoolSource[];
};

const EMPTY_SCORES: ScoreDraft = {
  國文: "",
  英文: "",
  數A: "",
  數B: "",
  社會: "",
  自然: "",
};

const EXAMPLE_SCORES: ScoreDraft = {
  國文: "12",
  英文: "13",
  數A: "11",
  數B: "10",
  社會: "12",
  自然: "11",
};

function toUserScores(draft: ScoreDraft): UserScores {
  return SCORE_SUBJECTS.reduce<UserScores>((scores, subject) => {
    const raw = draft[subject].trim();
    if (raw !== "") scores[subject] = Number(raw);
    return scores;
  }, {});
}

function schoolPriority(schoolId: string): number {
  const index = SCHOOL_GROUPS.findIndex((group) =>
    group.schoolIds.includes(schoolId),
  );
  return index === -1 ? SCHOOL_GROUPS.length : index;
}

function comparePrograms(
  left: EvaluationResult,
  right: EvaluationResult,
): number {
  return (
    schoolPriority(left.program.schoolId) -
      schoolPriority(right.program.schoolId) ||
    left.program.schoolId.localeCompare(right.program.schoolId) ||
    left.program.programCode.localeCompare(right.program.programCode)
  );
}

function compareNear(
  left: EvaluationResult,
  right: EvaluationResult,
): number {
  const leftBoost =
    left.nearestBoost[0]?.totalPoints ?? Number.POSITIVE_INFINITY;
  const rightBoost =
    right.nearestBoost[0]?.totalPoints ?? Number.POSITIVE_INFINITY;
  return leftBoost - rightBoost || comparePrograms(left, right);
}

function formatSelectedDepartment(
  keywordIds: readonly DepartmentKeywordId[],
  freeText: string,
): string {
  if (keywordIds.length === 1 && !freeText.trim()) {
    return `${keywordIds[0]}相關校系`;
  }
  if (keywordIds.length === 0 && freeText.trim()) {
    return `「${freeText.trim()}」相關校系`;
  }
  return "所選條件的校系";
}

export function AdmissionExplorer({
  programs,
  schoolSources,
}: AdmissionExplorerProps) {
  const [scores, setScores] = useState<ScoreDraft>({ ...EMPTY_SCORES });
  const [groupSelection, setGroupSelection] =
    useState<GroupSelection>("all");
  const [schoolSelection, setSchoolSelection] = useState("all");
  const [customSchoolIds, setCustomSchoolIds] = useState<string[]>([]);
  const [departmentKeywordIds, setDepartmentKeywordIds] = useState<
    DepartmentKeywordId[]
  >([]);
  const [freeText, setFreeText] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const verifiedSchoolCount = useMemo(
    () => new Set(programs.map((program) => program.schoolId)).size,
    [programs],
  );

  const evaluation = useMemo(() => {
    if (!hasSearched) {
      return {
        matched: [] as Program[],
        passed: [] as EvaluationResult[],
        near: [] as EvaluationResult[],
        missingSubjects: [] as Subject[],
      };
    }

    const criteria: ProgramFilterCriteria = {
      groupTags:
        groupSelection === "all" ? undefined : [groupSelection],
      schoolGroupIds:
        schoolSelection === "top" ||
        schoolSelection === "central" ||
        schoolSelection === "regional"
          ? [schoolSelection as SchoolGroupId]
          : undefined,
      customSchoolIds:
        schoolSelection === "custom" ? customSchoolIds : undefined,
      departmentKeywordIds,
      freeText: freeText.trim() || undefined,
    };
    const matched = filterPrograms(programs, criteria);
    const userScores = toUserScores(scores);
    const evaluated = matched.map((program) =>
      evaluateProgram(program, userScores),
    );
    const passed = evaluated.filter((result) => result.passed).sort(comparePrograms);
    const near = evaluated.filter((result) => !result.passed).sort(compareNear);
    const missingSubjects = SCORE_SUBJECTS.filter((subject) =>
      evaluated.some((result) => result.missingSubjects.includes(subject)),
    );

    return { matched, passed, near, missingSubjects };
  }, [
    customSchoolIds,
    departmentKeywordIds,
    freeText,
    groupSelection,
    hasSearched,
    programs,
    schoolSelection,
    scores,
  ]);

  function updateScore(subject: ScoreSubject, value: string) {
    if (value === "") {
      setScores((current) => ({ ...current, [subject]: "" }));
      return;
    }

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return;
    const bounded = Math.max(0, Math.min(15, Math.trunc(numericValue)));
    setScores((current) => ({ ...current, [subject]: String(bounded) }));
  }

  function submitQuery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasSearched(true);
    window.requestAnimationFrame(() => {
      document
        .getElementById("results")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const closest = evaluation.near[0];
  const hasDepartmentFilter =
    departmentKeywordIds.length > 0 || freeText.trim().length > 0;

  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="回到頁首">
          <span className="wordmark-seal">114</span>
          <span>
            <b>申請一階落點</b>
            <small>倍率篩選回測工具</small>
          </span>
        </a>
        <nav aria-label="頁面導覽">
          <a href="#query">開始查詢</a>
          <a href="#method">判斷方式</a>
          <SourceLink href={schoolSources[0]?.collegeListUrl ?? "#"} compact />
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="live-dot" aria-hidden="true" />
            114 學年度・官方資料回測
          </div>
          <h1>
            每一關都算清楚，
            <span>看看你離目標校系有多近。</span>
          </h1>
          <p className="hero-lead">
            輸入學測級分，系統會逐關加總官方通過倍率篩選最低級分，
            找出可能通過的校系，也告訴你最少可以補哪幾科。
          </p>
          <div className="hero-actions">
            <a className="primary-cta" href="#query">
              開始回測 <span aria-hidden="true">↓</span>
            </a>
            <a
              className="secondary-cta"
              href={schoolSources[0]?.collegeListUrl}
              rel="noreferrer"
              target="_blank"
            >
              查看官方總表 ↗
            </a>
          </div>
        </div>

        <aside className="hero-proof" aria-label="資料收錄狀態">
          <span className="proof-kicker">DATA STATUS</span>
          <div className="proof-grid">
            <div>
              <strong>{schoolSources.length}</strong>
              <span>所學校來源索引</span>
            </div>
            <div>
              <strong>{programs.length}</strong>
              <span>筆人工校對校系</span>
            </div>
            <div>
              <strong>{verifiedSchoolCount}</strong>
              <span>所學校可正式判斷</span>
            </div>
          </div>
          <div className="proof-rule">
            <span>判斷核心</span>
            <code>Σ 科目級分 ≥ 每關門檻</code>
          </div>
          <p>
            每一筆可判斷資料皆保留官方報表連結；未校對資料不會進入結果。
          </p>
        </aside>
      </section>

      <section className="notice-strip" aria-label="重要提醒">
        <span>僅供落點參考</span>
        <p>
          本系統使用 114 學年度申請入學通過倍率篩選最低級分進行回測，
          不代表未來年度一定通過。
        </p>
      </section>

      <form className="query-section" id="query" onSubmit={submitQuery}>
        <div className="query-intro">
          <span>YOUR PROFILE</span>
          <h2>先從你的成績開始</h2>
          <p>成績和篩選條件更新後，再按一次回測即可重新整理結果。</p>
        </div>

        <div className="query-grid">
          <ScoreForm
            onChange={updateScore}
            onClear={() => setScores({ ...EMPTY_SCORES })}
            onUseExample={() => setScores({ ...EXAMPLE_SCORES })}
            scores={scores}
          />
          <FilterPanel
            customSchoolIds={customSchoolIds}
            departmentKeywordIds={departmentKeywordIds}
            freeText={freeText}
            groupSelection={groupSelection}
            onCustomSchoolIdsChange={setCustomSchoolIds}
            onDepartmentKeywordIdsChange={setDepartmentKeywordIds}
            onFreeTextChange={setFreeText}
            onGroupSelectionChange={setGroupSelection}
            onSchoolSelectionChange={setSchoolSelection}
            schoolSelection={schoolSelection}
            schoolSources={schoolSources}
          />
        </div>

        <div className="submit-bar">
          <div>
            <span className="submit-index">03</span>
            <p>
              逐關比對 <b>{programs.length}</b> 筆已校對校系資料
            </p>
          </div>
          <button className="submit-button" data-testid="submit-query" type="submit">
            {hasSearched ? "重新回測" : "查看我的一階結果"}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </form>

      {hasSearched ? (
        <section className="results-section" id="results" aria-live="polite">
          <div className="results-heading">
            <div>
              <span className="step-kicker">YOUR RESULTS</span>
              <h2>一階篩選回測結果</h2>
              <p>
                符合條件 {evaluation.matched.length} 筆；逐關判斷後可能通過{" "}
                {evaluation.passed.length} 筆。
              </p>
            </div>
            <a className="back-to-query" href="#query">
              修改條件 ↑
            </a>
          </div>

          {evaluation.missingSubjects.length > 0 ? (
            <div className="missing-alert" role="status">
              <span aria-hidden="true">!</span>
              <p>
                <b>有科目尚未輸入：</b>
                {evaluation.missingSubjects.join("、")}；相關規則暫以 0 級分計算。
              </p>
            </div>
          ) : null}

          {hasDepartmentFilter &&
          evaluation.passed.length === 0 &&
          closest ? (
            <div className="closest-callout">
              <span>最接近目標</span>
              <p>
                你目前沒有通過任何
                {formatSelectedDepartment(departmentKeywordIds, freeText)}。
                最接近的是 <b>{closest.program.schoolName}</b>
                {closest.program.programName}，最少還需 +
                {closest.nearestBoost[0]?.totalPoints ?? "—"} 級分。
              </p>
            </div>
          ) : null}

          <div className="result-block">
            <div className="result-block-heading passed-heading">
              <div>
                <span className="result-icon" aria-hidden="true">✓</span>
                <div>
                  <h2>可能通過的一階校系</h2>
                  <p>所有倍率篩選關卡皆達到 114 學年度最低級分。</p>
                </div>
              </div>
              <strong>{evaluation.passed.length}</strong>
            </div>
            <ProgramResultTable
              emptyMessage="目前條件下沒有全部過關的校系；往下看看最接近的選項。"
              evaluations={evaluation.passed}
              tone="passed"
            />
          </div>

          <div className="result-block near-block">
            <div className="result-block-heading near-heading">
              <div>
                <span className="result-icon" aria-hidden="true">↗</span>
                <div>
                  <h2>未通過但接近的校系</h2>
                  <p>依「最少總加分」由近到遠排列，最多先顯示 30 筆。</p>
                </div>
              </div>
              <strong>{evaluation.near.length}</strong>
            </div>
            <ProgramResultTable
              emptyMessage={
                evaluation.matched.length === 0
                  ? "目前篩選條件沒有已人工校對的校系資料，請改選其他學校或科系。"
                  : "太好了，符合條件的校系已全部通過。"
              }
              evaluations={evaluation.near.slice(0, 30)}
              tone="near"
            />
          </div>
        </section>
      ) : null}

      <section className="method-section" id="method">
        <div className="method-heading">
          <span>HOW IT WORKS</span>
          <h2>不是算一個總分，而是逐關判斷。</h2>
        </div>
        <div className="method-grid">
          <article>
            <span>01</span>
            <h3>每關獨立加總</h3>
            <p>每一筆規則都有自己的科目組合與最低級分，不共用單一總分。</p>
          </article>
          <article>
            <span>02</span>
            <h3>全部過關才算通過</h3>
            <p>多關校系必須每一關都達標；任一關不足，就列出該關差距。</p>
          </article>
          <article>
            <span>03</span>
            <h3>搜尋最少補分</h3>
            <p>只搜尋該校系用到的科目，並遵守單科最高 15 級分。</p>
          </article>
        </div>
        <div className="formula-card">
          <span>一筆規則</span>
          <code>sum(使用者科目級分) ≥ 官方通過篩選最低級分</code>
          <p>一個校系 = 一組 rules[]；所有 rules 通過，Program 才通過。</p>
        </div>
      </section>

      <section className="disclaimer-section">
        <div>
          <span className="disclaimer-mark" aria-hidden="true">i</span>
          <div>
            <h2>使用前請留意</h2>
            <p>
              若校系有檢定標準但本系統尚未匯入該年度五標級分，
              目前先以通過倍率篩選最低級分作為主要判斷依據。
            </p>
            <p>
              目前已完成 66 所學校官方來源索引，正式判斷先提供{" "}
              {verifiedSchoolCount} 所學校、{programs.length} 筆人工校對校系；
              結果不是完整志願建議，請務必回查官方報表。
            </p>
          </div>
        </div>
        <SourceLink href={schoolSources[0]?.collegeListUrl ?? "#"} />
      </section>

      <footer>
        <p>官方資料來源：大學甄選入學委員會 114 學年度各校系篩選標準一覽表。</p>
        <span>114 ADMISSION SCREENING REVIEW</span>
      </footer>
    </main>
  );
}
