"use client";

import type { Subject } from "@/lib/types";

export const SCORE_SUBJECTS = [
  "國文",
  "英文",
  "數A",
  "數B",
  "社會",
  "自然",
] as const satisfies readonly Subject[];

export type ScoreSubject = (typeof SCORE_SUBJECTS)[number];
export type ScoreDraft = Record<ScoreSubject, string>;

type ScoreFormProps = {
  scores: ScoreDraft;
  onChange: (subject: ScoreSubject, value: string) => void;
  onUseExample: () => void;
  onClear: () => void;
};

export function ScoreForm({
  scores,
  onChange,
  onUseExample,
  onClear,
}: ScoreFormProps) {
  return (
    <section className="query-card score-card" aria-labelledby="score-heading">
      <div className="section-heading-row">
        <div>
          <span className="step-kicker">STEP 01</span>
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
        每科 0–15 級分；留白會以 0 計算，結果中也會提醒你。
      </p>

      <div className="score-grid">
        {SCORE_SUBJECTS.map((subject) => (
          <label className="score-field" key={subject}>
            <span>{subject}</span>
            <span className="score-input-wrap">
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
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}
