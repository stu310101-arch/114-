"use client";

import { useMemo, useState } from "react";
import { DEPARTMENT_KEYWORD_OPTIONS } from "@/config/departmentKeywords";
import { SCHOOL_SELECTION_OPTIONS } from "@/config/schoolGroups";
import type { DepartmentKeywordId } from "@/config/departmentKeywords";
import type { GroupTag } from "@/lib/types";

export type SchoolSourceOption = {
  schoolId: string;
  schoolName: string;
};

export type GroupSelection = "all" | GroupTag;

type FilterPanelProps = {
  groupSelection: GroupSelection;
  onGroupSelectionChange: (value: GroupSelection) => void;
  schoolSelection: string;
  onSchoolSelectionChange: (value: string) => void;
  customSchoolIds: readonly string[];
  onCustomSchoolIdsChange: (value: string[]) => void;
  departmentKeywordIds: readonly DepartmentKeywordId[];
  onDepartmentKeywordIdsChange: (value: DepartmentKeywordId[]) => void;
  freeText: string;
  onFreeTextChange: (value: string) => void;
  schoolSources: readonly SchoolSourceOption[];
};

function toggleValue<T extends string>(values: readonly T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export function FilterPanel({
  groupSelection,
  onGroupSelectionChange,
  schoolSelection,
  onSchoolSelectionChange,
  customSchoolIds,
  onCustomSchoolIdsChange,
  departmentKeywordIds,
  onDepartmentKeywordIdsChange,
  freeText,
  onFreeTextChange,
  schoolSources,
}: FilterPanelProps) {
  const [schoolSearch, setSchoolSearch] = useState("");
  const filteredSchools = useMemo(() => {
    const query = schoolSearch.trim().toLocaleLowerCase("zh-Hant");
    if (!query) return schoolSources;
    return schoolSources.filter(
      (school) =>
        school.schoolId.includes(query) ||
        school.schoolName.toLocaleLowerCase("zh-Hant").includes(query),
    );
  }, [schoolSearch, schoolSources]);

  return (
    <section className="query-card filter-card" aria-labelledby="filter-heading">
      <div className="section-heading-row">
        <div>
          <span className="step-kicker">STEP 02</span>
          <h2 id="filter-heading">縮小想看的校系</h2>
        </div>
        <span className="optional-label">皆可不選</span>
      </div>

      <div className="filter-block">
        <div className="filter-label-row">
          <h3>科系組別</h3>
          <span>單選</span>
        </div>
        <div className="segmented-control" role="group" aria-label="科系組別">
          {([
            ["all", "全部科系"],
            ["自然組", "自然組"],
            ["社會組", "社會組"],
          ] as const).map(([value, label]) => (
            <button
              aria-pressed={groupSelection === value}
              className={groupSelection === value ? "selected" : ""}
              key={value}
              onClick={() => onGroupSelectionChange(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-block">
        <div className="filter-label-row">
          <h3>學校範圍</h3>
          <span>單選</span>
        </div>
        <div className="choice-grid school-choice-grid" role="radiogroup" aria-label="學校範圍">
          {SCHOOL_SELECTION_OPTIONS.map((option) => (
            <button
              aria-checked={schoolSelection === option.id}
              className={`choice-button ${schoolSelection === option.id ? "selected" : ""}`}
              key={option.id}
              onClick={() => onSchoolSelectionChange(option.id)}
              role="radio"
              type="button"
            >
              <span className="choice-dot" aria-hidden="true" />
              {option.label}
            </button>
          ))}
        </div>

        {schoolSelection === "custom" ? (
          <div className="custom-school-panel">
            <label className="search-field">
              <span className="sr-only">搜尋學校</span>
              <input
                onChange={(event) => setSchoolSearch(event.target.value)}
                placeholder="搜尋校名或校碼"
                type="search"
                value={schoolSearch}
              />
            </label>
            <div className="custom-school-toolbar">
              <span>已選 {customSchoolIds.length} 所</span>
              {customSchoolIds.length > 0 ? (
                <button
                  className="text-button muted"
                  onClick={() => onCustomSchoolIdsChange([])}
                  type="button"
                >
                  全部清除
                </button>
              ) : null}
            </div>
            <div className="school-checklist" aria-label="自訂學校清單">
              {filteredSchools.map((school) => (
                <label className="school-check" key={school.schoolId}>
                  <input
                    checked={customSchoolIds.includes(school.schoolId)}
                    onChange={() =>
                      onCustomSchoolIdsChange(
                        toggleValue(customSchoolIds, school.schoolId),
                      )
                    }
                    type="checkbox"
                  />
                  <span>
                    <b>{school.schoolId}</b>
                    {school.schoolName}
                  </span>
                </label>
              ))}
            </div>
            <p className="microcopy">
              66 所官方來源皆可選；正式結果只會顯示已人工校對的校系。
            </p>
          </div>
        ) : null}
      </div>

      <div className="filter-block">
        <div className="filter-label-row">
          <h3>特定科系</h3>
          <span>可複選</span>
        </div>
        <div className="keyword-chips" aria-label="科系快捷選項">
          {DEPARTMENT_KEYWORD_OPTIONS.map((option) => (
            <button
              aria-pressed={departmentKeywordIds.includes(option.id)}
              className={
                departmentKeywordIds.includes(option.id) ? "selected" : ""
              }
              key={option.id}
              onClick={() =>
                onDepartmentKeywordIdsChange(
                  toggleValue(departmentKeywordIds, option.id),
                )
              }
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
        <label className="free-keyword-field">
          <span>或輸入科系關鍵字</span>
          <input
            onChange={(event) => onFreeTextChange(event.target.value)}
            placeholder="例如：心理、傳播、生醫"
            type="search"
            value={freeText}
          />
        </label>
      </div>
    </section>
  );
}
