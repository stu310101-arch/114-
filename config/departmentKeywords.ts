/**
 * 科系快捷鍵與實際系名的對照表。
 * 新增同義系名時只需調整此檔，不必改篩選函式或 UI。
 */
export const DEPARTMENT_KEYWORDS = {
  資工: ["資訊工程", "資訊科學", "電腦與通訊", "資訊工程學系"],
  資管: ["資訊管理", "資訊管理學系"],
  電機: ["電機工程", "電機工程學系"],
  機械: ["機械工程", "機械與機電工程", "機電工程"],
  土木: ["土木工程", "營建工程"],
  化工: ["化學工程", "化工與材料", "化學工程與材料工程"],
  財金: ["財務金融", "財金", "金融學系"],
  企管: ["企業管理", "企管", "工商管理"],
  法律: ["法律", "法學", "財經法律"],
  外文: ["外國語文", "外文", "英國語文", "英美語文", "應用外語"],
} as const satisfies Record<string, readonly string[]>;

export type DepartmentKeywordId = keyof typeof DEPARTMENT_KEYWORDS;

export type DepartmentKeywordOption = Readonly<{
  id: DepartmentKeywordId;
  label: string;
}>;

/** UI 可直接使用的穩定選項，不必理解關鍵字 mapping 的內部結構。 */
export const DEPARTMENT_KEYWORD_OPTIONS: readonly DepartmentKeywordOption[] = (
  Object.keys(DEPARTMENT_KEYWORDS) as DepartmentKeywordId[]
).map((id) => ({ id, label: id }));
