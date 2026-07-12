import { AdmissionExplorer } from "@/components/AdmissionExplorer";
import programsJson from "@/data/programs_114.json";
import sourcesJson from "@/data/sources_114.json";
import type { Program } from "@/lib/types";

type SchoolSource = {
  schoolId: string;
  schoolName: string;
  reportHtmlUrl: string;
  reportImageUrl: string;
  collegeListUrl: string;
};

export default function Home() {
  return (
    <AdmissionExplorer
      programs={programsJson as Program[]}
      schoolSources={sourcesJson as SchoolSource[]}
    />
  );
}
