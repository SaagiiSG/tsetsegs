import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GitCompare, Download, Filter } from 'lucide-react';

export function ClassComparisonTab() {
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  // Mock batch data
  const mockBatches = [
    { id: '1', name: 'January 2025 SAT A', studentCount: 24 },
    { id: '2', name: 'January 2025 SAT B', studentCount: 22 },
    { id: '3', name: 'December 2024 SAT', studentCount: 28 },
    { id: '4', name: 'November 2024 SAT', studentCount: 20 },
    { id: '5', name: 'October 2024 IELTS', studentCount: 15 },
  ];

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
              <CardDescription>
                Choose up to 5 classes for side-by-side comparison
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={selectedClasses.length === 0}>
                <Filter className="h-4 w-4 mr-2" />
                Quick Select
              </Button>
              <Button variant="outline" size="sm" disabled={selectedClasses.length < 2}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {mockBatches.map((batch) => (
              <div
                key={batch.id}
                className={`p-3 border rounded-lg cursor-pointer transition-all ${
                  selectedClasses.includes(batch.id)
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-muted-foreground/50'
                }`}
                onClick={() => toggleClass(batch.id)}
              >
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={selectedClasses.includes(batch.id)}
                    disabled={selectedClasses.length >= 5 && !selectedClasses.includes(batch.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{batch.name}</p>
                    <p className="text-xs text-muted-foreground">{batch.studentCount} students</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="secondary">{selectedClasses.length}/5 selected</Badge>
            {selectedClasses.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedClasses([])}>
                Clear All
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Content */}
      {selectedClasses.length < 2 ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <GitCompare className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Select at least 2 classes</h3>
              <p className="text-muted-foreground max-w-md">
                Choose 2-5 classes above to compare their performance metrics, topic mastery, and engagement levels.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Comparison Table */}
          <Card>
            <CardHeader>
              <CardTitle>Class Metrics Comparison</CardTitle>
              <CardDescription>
                Side-by-side performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Comparison table coming in Phase 5</p>
              </div>
            </CardContent>
          </Card>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Topic Matrix Heatmap */}
            <Card>
              <CardHeader>
                <CardTitle>Topic Matrix Heatmap</CardTitle>
                <CardDescription>
                  Topic performance across selected classes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center border-2 border-dashed rounded-lg">
                  <p className="text-muted-foreground">Topic heatmap coming in Phase 5</p>
                </div>
              </CardContent>
            </Card>

            {/* Engagement Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Engagement Comparison</CardTitle>
                <CardDescription>
                  30-day activity trends by class
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center border-2 border-dashed rounded-lg">
                  <p className="text-muted-foreground">Engagement chart coming in Phase 5</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sprint Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Sprint Performance</CardTitle>
              <CardDescription>
                Competition participation and tier distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] flex items-center justify-center border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Sprint comparison coming in Phase 5</p>
              </div>
            </CardContent>
          </Card>

          {/* Insights Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Auto-Generated Insights</CardTitle>
              <CardDescription>
                AI-powered recommendations based on comparison
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[150px] flex items-center justify-center border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Insights panel coming in Phase 5</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
