import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface BatchListProps {
  batches: any[];
  onUpdate: () => void;
}

export const BatchList = ({ batches }: BatchListProps) => {
  return (
    <div className="space-y-4">
      {batches.map((batch) => (
        <Card key={batch.id} className="shadow-soft">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">{batch.teacher}'s Class</CardTitle>
                <CardDescription className="mt-1">
                  {batch.schedule} • Room {batch.room}
                </CardDescription>
                <p className="text-sm text-muted-foreground mt-1">
                  Starts: {new Date(batch.start_date).toLocaleDateString()}
                </p>
              </div>
              <Badge variant="outline">
                {batch.students?.length || 0} students
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-accent/10 rounded-lg">
              <div>
                <p className="font-medium">Batch Link</p>
                <p className="text-sm text-muted-foreground">
                  Share this link with all students in this batch
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const link = `${window.location.origin}/batch/${batch.unique_link_id}`;
                    navigator.clipboard.writeText(link);
                    toast.success("Batch link copied!");
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/batch/${batch.unique_link_id}`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <p className="font-medium mb-2">Students ({batch.students?.length || 0}):</p>
              <div className="space-y-2">
                {batch.students?.map((student: any) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-muted-foreground">{student.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
