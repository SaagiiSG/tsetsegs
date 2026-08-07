import { useState } from "react";
import { IntensePrepGroupList } from "./IntensePrepGroupList";
import { PrepClassRoster } from "./PrepClassRoster";

export interface IntensePrepGroup {
  id: string;
  name: string;
  created_by_teacher_id: string;
  created_at: string;
  is_active: boolean;
  join_code?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  memberCount?: number;
  avgProgress?: number;
}

export function IntensePrepContent() {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  if (selectedGroupId) {
    return <PrepClassRoster groupId={selectedGroupId} onBack={() => setSelectedGroupId(null)} />;
  }

  return <IntensePrepGroupList onSelectGroup={(groupId) => setSelectedGroupId(groupId)} />;
}
