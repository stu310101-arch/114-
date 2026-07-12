/** Official 114 school-level source index published by the admission committee. */
export const CAC_114_COLLEGE_LIST_URL =
  "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/collegeList.htm" as const;

export const CAC_114_STANDARD_BASE_URL = new URL(
  "./",
  CAC_114_COLLEGE_LIST_URL,
).href;

/** The archived 114 list contains 66 university links. */
export const CAC_114_EXPECTED_SCHOOL_COUNT = 66;

export type SchoolSource114 = {
  schoolId: string;
  schoolName: string;
  reportHtmlUrl: string;
  reportImageUrl: string;
  collegeListUrl: string;
};

const officialOrigin = new URL(CAC_114_COLLEGE_LIST_URL).origin;
const officialPathPrefix = new URL(CAC_114_STANDARD_BASE_URL).pathname;

function assertSchoolId(schoolId: string): void {
  if (!/^\d{3}$/.test(schoolId)) {
    throw new Error(`Invalid CAC school id: ${schoolId}`);
  }
}

export function reportHtmlUrlForSchool(schoolId: string): string {
  assertSchoolId(schoolId);
  return new URL(`report/${schoolId}.htm`, CAC_114_STANDARD_BASE_URL).href;
}

export function reportImageUrlForSchool(schoolId: string): string {
  assertSchoolId(schoolId);
  return new URL(`report/pict/${schoolId}.png`, CAC_114_STANDARD_BASE_URL).href;
}

export function isOfficialCac114SourceUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.origin === officialOrigin &&
      url.username === "" &&
      url.password === "" &&
      url.pathname.startsWith(officialPathPrefix)
    );
  } catch {
    return false;
  }
}

export function assertOfficialCac114SourceUrl(value: string): void {
  if (!isOfficialCac114SourceUrl(value)) {
    throw new Error(`URL is outside the official CAC 114 source tree: ${value}`);
  }
}

export function resolveOfficialCac114SourceUrl(
  value: string,
  baseUrl: string = CAC_114_COLLEGE_LIST_URL,
): string {
  const resolved = new URL(value, baseUrl).href;
  assertOfficialCac114SourceUrl(resolved);
  return resolved;
}
