import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GitCompare, Download, Filter } from 'lucide-react';
import { useBatchesList } from '@/hooks/useAdminAnalytics';
import { ClassComparisonTable } from './ClassComparisonTable';
import { TopicMatrixHeatmap } from './TopicMatrixHeatmap';
import { EngagementComparisonChart } from './EngagementComparisonChart';
import { SprintComparisonSection } from './SprintComparisonSection';
import { ClassInsightsPanel } from './ClassInsightsPanel';

export function ClassComparisonTab() {
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const { data: batches } = useBatchesList();

  // Filter to only SAT batches
  const satBatches = batches?.filter((batch: any) => batch.course_type === 'SAT') || [];

  const toggleClass = (id: string) => {
    if (selectedClasses.includes(id)) {
      setSelectedClasses(selectedClasses.filter(c => c !== id));
    } else if (selectedClasses.length < 5) {
      setSelectedClasses([...selectedClasses, id]);
    }
  };


  return (
    <div className="space-y-6">
      {/* Class Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GitCompare className="h-5 w-5" />
                Select Classes to Compare
              </CardTitle>
              <CardDescription>Choose up to 5 classes for side-by-side comparison</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={selectedClasses.length === 0}>
                <Filter className="h-4 w-4 mr-2" />Quick Select
              </Button>
              <Button variant="outline" size="sm" disabled={selectedClasses.length < 2}>
                <Download className="h-4 w-4 mr-2" />Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {satBatches.map((batch: any) => (
              <div
                key={batch.id}
                className={`p-4 border rounded-xl cursor-pointer transition-all ${
                  selectedClasses.includes(batch.id) 
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                    : 'hover:border-muted-foreground/50 hover:shadow-sm'
                }`}
                onClick={() => toggleClass(batch.id)}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedClasses.includes(batch.id)}
                    disabled={selectedClasses.length >= 5 && !selectedClasses.includes(batch.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-semibold truncate">{batch.batch_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {batch.teacher || 'No teacher assigned'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {satBatches.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No SAT batches found</p>
          )}
          <div className="mt-4 flex items-center gap-2">
            <Badge variant="secondary">{selectedClasses.length}/5 selected</Badge>
            {selectedClasses.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedClasses([])}>Clear All</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedClasses.length < 2 ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <GitCompare className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Select at least 2 classes</h3>
              <p className="text-muted-foreground max-w-md">
                Choose 2-5 classes above to compare their performance metrics.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <ClassComparisonTable selectedBatchIds={selectedClasses} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopicMatrixHeatmap selectedBatchIds={selectedClasses} />
            <EngagementComparisonChart selectedBatchIds={selectedClasses} />
          </div>
          <SprintComparisonSection selectedBatchIds={selectedClasses} />
          <ClassInsightsPanel selectedBatchIds={selectedClasses} />
        </>
      )}
    </div>
  );
}