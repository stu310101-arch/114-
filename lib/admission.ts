import {
  SUBJECTS,
  type EvaluationResult,
  type Program,
  type RuleResult,
  type ScreeningRule,
  type Subject,
  type SubjectBoost,
  type UserScores,
} from "./types";
import {
  assertValidUserScores,
  getSubjectScore,
  hasSubjectScore,
  SUBJECT_MAX_SCORE,
} from "./subjects";

const MAX_BOOST_PLANS = 5;

type SearchRule = {
  subjects: ReadonlySet<Subject>;
  required: number;
};

type SearchSubject = {
  subject: Subject;
  capacity: number;
};

function uniqueRuleSubjects(rule: ScreeningRule): Subject[] {
  return [...new Set(rule.subjects)];
}

function evaluateRule(rule: ScreeningRule, scores: UserScores): RuleResult {
  const userScore = uniqueRuleSubjects(rule).reduce(
    (total, subject) => total + getSubjectScore(scores, subject),
    0,
  );
  const deficit = Math.max(0, rule.minScore - userScore);

  return {
    rule,
    userScore,
    minScore: rule.minScore,
    deficit,
    passed: deficit === 0,
  };
}

function usedSubjects(program: Program): Subject[] {
  const used = new Set(
    program.screeningRules.flatMap((rule) => uniqueRuleSubjects(rule)),
  );

  return SUBJECTS.filter((subject) => used.has(subject));
}

function removeRedundantRules(rules: SearchRule[]): SearchRule[] {
  return rules.filter((candidate, candidateIndex) => {
    return !rules.some((other, otherIndex) => {
      if (candidateIndex === otherIndex || other.required < candidate.required) {
        return false;
      }

      const otherIsSubset = [...other.subjects].every((subject) =>
        candidate.subjects.has(subject),
      );
      if (!otherIsSubset) {
        return false;
      }

      const sameSubjects = other.subjects.size === candidate.subjects.size;

      // Meeting the stronger rule over a subset also meets this candidate.
      // For exact duplicates, retain the first so the pair cannot remove both.
      return (
        other.required > candidate.required ||
        !sameSubjects ||
        otherIndex < candidateIndex
      );
    });
  });
}

/**
 * Finds the exact minimum boost with a memoized, bounded exhaustive search.
 * Only subjects used by failed rules are searched, each over at most 0...15.
 */
function findNearestBoosts(
  failedRules: RuleResult[],
  scores: UserScores,
): SubjectBoost[] {
  if (failedRules.length === 0) {
    return [];
  }

  let searchRules = failedRules.map<SearchRule>((result) => ({
    subjects: new Set(uniqueRuleSubjects(result.rule)),
    required: result.deficit,
  }));
  searchRules = removeRedundantRules(searchRules);

  const relevant = new Set(searchRules.flatMap((rule) => [...rule.subjects]));
  const searchSubjects: SearchSubject[] = SUBJECTS.filter((subject) =>
    relevant.has(subject),
  )
    .map((subject) => ({
      subject,
      capacity: SUBJECT_MAX_SCORE - getSubjectScore(scores, subject),
    }))
    .filter(({ capacity }) => capacity > 0)
    .sort((left, right) => {
      const leftUse = searchRules.filter((rule) =>
        rule.subjects.has(left.subject),
      ).length;
      const rightUse = searchRules.filter((rule) =>
        rule.subjects.has(right.subject),
      ).length;
      return rightUse - leftUse;
    });

  // Every constraint is monotonic, so checking all relevant subjects at 15
  // proves whether any plan can exist before the search begins.
  const possible = searchRules.every((rule) => {
    const capacity = searchSubjects.reduce(
      (total, item) =>
        total + (rule.subjects.has(item.subject) ? item.capacity : 0),
      0,
    );
    return capacity >= rule.required;
  });

  if (!possible) {
    return [];
  }

  const capacityFrom: number[][] = Array.from(
    { length: searchSubjects.length + 1 },
    () => Array(searchRules.length).fill(0),
  );

  for (let index = searchSubjects.length - 1; index >= 0; index -= 1) {
    const item = searchSubjects[index];
    for (let ruleIndex = 0; ruleIndex < searchRules.length; ruleIndex += 1) {
      capacityFrom[index][ruleIndex] =
        capacityFrom[index + 1][ruleIndex] +
        (searchRules[ruleIndex].subjects.has(item.subject) ? item.capacity : 0);
    }
  }

  const memo = new Map<string, number>();

  function minimumFrom(index: number, needs: readonly number[]): number {
    if (needs.every((need) => need === 0)) {
      return 0;
    }
    if (index === searchSubjects.length) {
      return Number.POSITIVE_INFINITY;
    }
    if (
      needs.some(
        (need, ruleIndex) => need > capacityFrom[index][ruleIndex],
      )
    ) {
      return Number.POSITIVE_INFINITY;
    }

    const key = `${index}|${needs.join(",")}`;
    const cached = memo.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const item = searchSubjects[index];
    const largestUsefulBoost = Math.min(
      item.capacity,
      Math.max(
        0,
        ...needs.map((need, ruleIndex) =>
          searchRules[ruleIndex].subjects.has(item.subject) ? need : 0,
        ),
      ),
    );
    let minimum = Number.POSITIVE_INFINITY;

    for (let points = 0; points <= largestUsefulBoost; points += 1) {
      const nextNeeds = needs.map((need, ruleIndex) =>
        searchRules[ruleIndex].subjects.has(item.subject)
          ? Math.max(0, need - points)
          : need,
      );
      const tail = minimumFrom(index + 1, nextNeeds);
      minimum = Math.min(minimum, points + tail);
    }

    memo.set(key, minimum);
    return minimum;
  }

  const initialNeeds = searchRules.map((rule) => rule.required);
  const minimumPoints = minimumFrom(0, initialNeeds);
  if (!Number.isFinite(minimumPoints)) {
    return [];
  }

  const plans: SubjectBoost[] = [];
  const increments = new Map<Subject, number>();

  function collectPlans(
    index: number,
    needs: readonly number[],
    pointsRemaining: number,
  ): void {
    if (plans.length >= MAX_BOOST_PLANS) {
      return;
    }
    if (needs.every((need) => need === 0)) {
      if (pointsRemaining !== 0) {
        return;
      }

      const changes = SUBJECTS.flatMap((subject) => {
        const points = increments.get(subject) ?? 0;
        if (points === 0) {
          return [];
        }
        const from = getSubjectScore(scores, subject);
        return [{ subject, points, from, to: from + points }];
      });
      plans.push({ totalPoints: minimumPoints, changes });
      return;
    }
    if (index === searchSubjects.length || pointsRemaining < 0) {
      return;
    }

    const item = searchSubjects[index];
    const maxPoints = Math.min(item.capacity, pointsRemaining);

    for (let points = 0; points <= maxPoints; points += 1) {
      const nextNeeds = needs.map((need, ruleIndex) =>
        searchRules[ruleIndex].subjects.has(item.subject)
          ? Math.max(0, need - points)
          : need,
      );
      const tail = minimumFrom(index + 1, nextNeeds);
      if (points + tail !== pointsRemaining) {
        continue;
      }

      if (points > 0) {
        increments.set(item.subject, points);
      }
      collectPlans(index + 1, nextNeeds, pointsRemaining - points);
      increments.delete(item.subject);

      if (plans.length >= MAX_BOOST_PLANS) {
        return;
      }
    }
  }

  collectPlans(0, initialNeeds, minimumPoints);
  return plans;
}

export function evaluateProgram(
  program: Program,
  scores: UserScores,
): EvaluationResult {
  if (!program.verified) {
    throw new Error(
      `校系 ${program.programCode} 尚未人工驗證，不能進入正式判斷`,
    );
  }

  assertValidUserScores(scores);

  const ruleResults = program.screeningRules.map((rule) =>
    evaluateRule(rule, scores),
  );
  const failedRules = ruleResults.filter((result) => !result.passed);
  const missingSubjects = usedSubjects(program).filter(
    (subject) => !hasSubjectScore(scores, subject),
  );

  return {
    passed: failedRules.length === 0,
    program,
    ruleResults,
    failedRules,
    totalDeficit: failedRules.reduce(
      (total, result) => total + result.deficit,
      0,
    ),
    missingSubjects,
    nearestBoost: findNearestBoosts(failedRules, scores),
  };
}

export type {
  EvaluationResult,
  RuleResult,
  SubjectBoost,
} from "./types";
