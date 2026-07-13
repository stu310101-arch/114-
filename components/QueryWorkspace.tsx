"use client";

import { useState, useSyncExternalStore } from "react";
import type { FormEvent } from "react";
import type { DepartmentKeywordId } from "@/config/departmentKeywords";
import { FilterPanel, type GroupSelection, type SchoolSourceOption } from "./FilterPanel";
import { ScoreForm, type ScoreSubject } from "./ScoreForm";
import { PageNavigation, SubpageHeader } from "./PageNavigation";
import {
  EMPTY_SCORES,
  EXAMPLE_SCORES,
  queryStateToParams,
  restoreQueryState,
  routePath,
  saveQueryState,
  type AdmissionQueryState,
} from "./queryState";

type QueryWorkspaceProps = {
  programCount: number;
  schoolSources: readonly SchoolSourceOption[];
};

const subscribeToHydration = () => () => {};

export function QueryWorkspace(props: QueryWorkspaceProps) {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  if (!hydrated) {
    return (
      <main className="subpage-main query-page">
        <SubpageHeader kicker="YOUR PROFILE" title="輸入成績與篩選校系" />
        <div className="page-loading" role="status">正在準備查詢表單…</div>
      </main>
    );
  }

  return <HydratedQueryWorkspace {...props} />;
}

function HydratedQueryWorkspace({
  programCount,
  schoolSources,
}: QueryWorkspaceProps) {
  const [query, setQuery] = useState<AdmissionQueryState>(() =>
    restoreQueryState(),
  );

  function updateScore(subject: ScoreSubject, value: string) {
    if (value === "") {
      setQuery((current) => ({
        ...current,
        scores: { ...current.scores, [subject]: "" },
      }));
      return;
    }

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return;
    const maximum = subject === "英聽" ? 3 : 15;
    const bounded = Math.max(0, Math.min(maximum, Math.trunc(numericValue)));
    setQuery((current) => ({
      ...current,
      scores: { ...current.scores, [subject]: String(bounded) },
    }));
  }

  function update<K extends keyof AdmissionQueryState>(
    key: K,
    value: AdmissionQueryState[K],
  ) {
    setQuery((current) => ({ ...current, [key]: value }));
  }

  function showResults(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveQueryState(query);
    const params = queryStateToParams(query).toString();
    const destination = routePath("results");
    window.location.assign(params ? `${destination}?${params}` : destination);
  }

  const querySearch = queryStateToParams(query).toString();

  return (
    <main className="subpage-main query-page">
      <SubpageHeader kicker="YOUR PROFILE" title="輸入成績與篩選校系" />

      <form className="query-section standalone-query" onSubmit={showResults}>
        <div className="query-intro">
          <span>STEP 01—02</span>
          <h1>先從你的成績開始</h1>
          <p>填入成績並選擇學校、科系；未填的科目會以 0 級分計算。</p>
        </div>

        <div className="query-grid">
          <ScoreForm
            onChange={updateScore}
            onClear={() => update("scores", { ...EMPTY_SCORES })}
            onUseExample={() => update("scores", { ...EXAMPLE_SCORES })}
            scores={query.scores}
          />
          <FilterPanel
            customSchoolIds={query.customSchoolIds}
            departmentKeywordIds={query.departmentKeywordIds}
            freeText={query.freeText}
            groupSelection={query.groupSelection}
            onCustomSchoolIdsChange={(value: string[]) =>
              update("customSchoolIds", value)
            }
            onDepartmentKeywordIdsChange={(value: DepartmentKeywordId[]) =>
              update("departmentKeywordIds", value)
            }
            onFreeTextChange={(value: string) => update("freeText", value)}
            onGroupSelectionChange={(value: GroupSelection) =>
              update("groupSelection", value)
            }
            onSchoolSelectionChange={(value: string) =>
              update("schoolSelection", value)
            }
            schoolSelection={query.schoolSelection}
            schoolSources={schoolSources}
          />
        </div>

        <div className="submit-bar">
          <div>
            <span className="submit-index">03</span>
            <p>
              將依目前條件逐關比對 <b>{programCount}</b> 筆校系資料
            </p>
          </div>
          <button className="submit-button" data-testid="submit-query" type="submit">
            查看 <span aria-hidden="true">→</span>
          </button>
        </div>
      </form>
      <PageNavigation
        nextLabel="下一頁：查看結果"
        nextRoute="results"
        nextSearch={querySearch}
        previousLabel="前一頁：網站介紹"
        previousRoute="how-it-works"
      />
    </main>
  );
}
