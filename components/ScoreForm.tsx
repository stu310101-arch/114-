"use client";

import type { ApplicantGender, Subject } from "@/lib/types";

export const SCORE_SUBJECTS = [
  "國文",
  "英文",
  "數A",
  "數B",
  "社會",
  "自然",
  "英聽",
] as const satisfies readonly Subject[];

export type ScoreSubject = (typeof SCORE_SUBJECTS)[number];
export type ScoreDraft = Record<ScoreSubject, string>;
export type ApcsScorePart = "concept" | "practice";
export type ApcsScoreDraft = Record<ApcsScorePart, string>;

type ScoreFormProps = {
  apcsScores: ApcsScoreDraft;
  applicantGender: ApplicantGender | "";
  scores: ScoreDraft;
  onApcsChange: (part: ApcsScorePart, value: string) => void;
  onApplicantGenderChange: (value: ApplicantGender | "") => void;
  onChange: (subject: ScoreSubject, value: string) => void;
  onUseExample: () => void;
  onClear: () => void;
};

export function ScoreForm({
  apcsScores,
  applicantGender,
  scores,
  onApcsChange,
  onApplicantGenderChange,
  onChange,
  onUseExample,
  onClear,
}: ScoreFormProps) {
  return (
    <section className="query-card score-card" aria-labelledby="score-heading">
      <div className="section-heading-row">
        <div>
          <h2 id="score-heading">填入學測級分</h2>
        </div>
        <div className="inline-actions">
          <button className="text-button" type="button" onClick={onUseExample}>
            帶入範例
          </button>
          <button className="text-button muted" type="button" onClick={onClear}>
            清除
          </button>
        </div>
      </div>

      <p className="section-help">
        學測每科 0–15 級分，英聽選擇等級；留白會以 0 計算並提醒你。
      </p>

      <div className="score-grid">
        {SCORE_SUBJECTS.map((subject) => (
          <label className="score-field" key={subject}>
            <span>{subject}</span>
            <span className="score-input-wrap">
              {subject === "英聽" ? (
                <select
                  aria-label="英語聽力測驗等級"
                  data-testid="score-英聽"
                  name={subject}
                  onChange={(event) => onChange(subject, event.target.value)}
                  value={scores[subject]}
                >
                  <option value="">未填</option>
                  <option value="3">A級</option>
                  <option value="2">B級</option>
                  <option value="1">C級</option>
                  <option value="0">未達C級</option>
                </select>
              ) : (
                <>
                  <input
                    aria-label={`${subject}級分`}
                    data-testid={`score-${subject}`}
                    inputMode="numeric"
                    max={15}
                    min={0}
                    name={subject}
                    onChange={(event) => onChange(subject, event.target.value)}
                    placeholder="—"
                    step={1}
                    type="number"
                    value={scores[subject]}
                  />
                  <span aria-hidden="true">級</span>
                </>
              )}
            </span>
          </label>
        ))}
      </div>

      <fieldset className="apcs-score-section">
        <legend>APCS 成績（選填）</legend>
        <p>
          觀念題與實作題皆為 0–5 級；留白不會當成 0 級或直接判定未通過，結果頁會以黃色提醒。
        </p>
        <div className="apcs-score-grid">
          {([
            ["concept", "APCS 觀念題"],
            ["practice", "APCS 實作題"],
          ] as const).map(([part, label]) => (
            <label className="score-field" key={part}>
              <span>{label}</span>
              <span className="score-input-wrap">
                <input
                  aria-label={`${label}級分`}
                  data-testid={`apcs-${part}`}
                  inputMode="numeric"
                  max={5}
                  min={0}
                  name={`apcs-${part}`}
                  onChange={(event) => onApcsChange(part, event.target.value)}
                  placeholder="選填"
                  step={1}
                  type="number"
                  value={apcsScores[part]}
                />
                <span aria-hidden="true">級</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="applicant-gender-field">
        <span>官方招生性別組別</span>
        <select
          aria-label="官方招生性別組別"
          name="applicantGender"
          onChange={(event) =>
            onApplicantGenderChange(event.target.value as ApplicantGender | "")
          }
          value={applicantGender}
        >
          <option value="">未選擇</option>
          <option value="male">男生組</option>
          <option value="female">女生組</option>
        </select>
        <small>
          僅用於官方分列男、女生門檻的校系；未選時不會自動套用任一組標準。
        </small>
      </label>
    </section>
  );
}
