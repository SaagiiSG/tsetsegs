import { useState } from "react";
import { IntensePrepGroupList } from "./IntensePrepGroupList";
import { IntensePrepGroupDetail } from "./IntensePrepGroupDetail";

export interface IntensePrepGroup {
  id: string;
  name: string;
  created_by_teacher_id: string;
  created_at: string;
  is_active: boolean;
  memberCount?: number;
  avgProgress?: number;
}

export function IntensePrepContent() {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  if (selectedGroupId) {
    return (
      <IntensePrepGroupDetail
        groupId={selectedGroupId}
        onBack={() => setSelectedGroupId(null)}
      />
    );
  }

  return (
    <IntensePrepGroupList
      onSelectGroup={(groupId) => setSelectedGroupId(groupId)}
    />
  );
}
