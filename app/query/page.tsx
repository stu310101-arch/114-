import { QueryWorkspace } from "@/components/QueryWorkspace";
import programsJson from "@/data/programs_114.json";
import sourcesJson from "@/data/sources_114.json";
import type { Program } from "@/lib/types";

type SchoolSource = {
  schoolId: string;
  schoolName: string;
};

export default function QueryPage() {
  return (
    <QueryWorkspace
      programCount={(programsJson as Program[]).length}
      schoolSources={sourcesJson as SchoolSource[]}
    />
  );
}
