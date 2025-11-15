import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

interface BatchListProps {
  batches: any[];
  onUpdate: () => void;
}

export const BatchList = ({ batches }: BatchListProps) => {
  const copyLink = (linkId: string) => {
    const link = `${window.location.origin}/student/${linkId}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard!");
  };

  const openLink = (linkId: string) => {
    window.open(`/student/${linkId}`, '_blank');
  };

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
          <CardContent>
            <div className="space-y-2">
              {batch.students?.map((student: any) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div>
                      {student.accessed ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <Clock className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-muted-foreground">{student.phone}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyLink(student.unique_link_id)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openLink(student.unique_link_id)}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
