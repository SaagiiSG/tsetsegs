import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Users, Calendar, MapPin, Clock, ExternalLink, Copy, RefreshCw, Trash2, MessageSquare, Pencil } from 'lucide-react';
import { BatchStudentsTable } from './BatchStudentsTable';
import { EditBatchDialog } from './EditBatchDialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { isOnlineClass } from '@/lib/classUtils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BatchCardProps {
  batch: any;
  onUpdate: () => void;
}

export function BatchCard({ batch, onUpdate }: BatchCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSmsTemplate, setShowSmsTemplate] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { toast } = useToast();

  const handleCopyLink = () => {
    const batchLink = `https://tsetsegs.lovable.app/batch/${batch.unique_link_id}`;
    navigator.clipboard.writeText(batchLink);
    toast({
      title: "Link Copied",
      description: "Batch link copied to clipboard"
    });
  };

  const handleOpenLink = () => {
    window.open(`/batch/${batch.unique_link_id}`, '_blank');
  };

  const handleRegenerateLink = async () => {
    const newLinkId = Math.random().toString(36).substring(2, 15);
    const { error } = await supabase
      .from('batches')
      .update({ unique_link_id: newLinkId })
      .eq('id', batch.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to regenerate link",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Batch link regenerated"
      });
      onUpdate();
    }
  };

  const handleDeleteBatch = async () => {
    const { error } = await supabase
      .from('batches')
      .delete()
      .eq('id', batch.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete batch",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Batch deleted successfully"
      });
      onUpdate();
    }
    setShowDeleteDialog(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getSmsTemplate = () => {
    const batchLink = `https://tsetsegs.lovable.app/batch/${batch.unique_link_id}`;
    
    // IELTS template
    if (batch.course_type === 'IELTS') {
      return `Сайн байна уу? 

Tsetsegs IELTS сургалтаас холбогдож байна. 

Ангийн мэдээлэл: ${batchLink}

Тус групт
1. Бидний хэрэглэх ном (Google drive дотор)
2. Цээжлэх үгс (Google drive дотор)
3. ЭЕШ-д бэлдэх Англи хэл, Нийгмийн 700+ материал
4. Сургалтын төлөвлөгөө зэрэг байгаа тул эхний postоос эхлэн дуустал нь уншаарай.

Баярлалаа.`;
    }
    
    // SAT Online template
    if (isOnlineClass(batch.schedule)) {
      return `Сайн байна уу? Таныг бүртгэж авлаа. SAT Math сургалтаас холбогдож байна.

🌐 ONLINE CLASS

Class Info: ${batchLink}

Хичээлийн хуваарь:
Math (Online): Даваа/Лхагва/Баасан 18:40-20:30
English (үнэгүй): Бямба 18:30-20:00

Platform: Discord

Тус групт 1. Бидний хэрэглэх ном 2. Цээжлэх үгс 3. Шалгалтад бүртгүүлэх заавар 4. 1074 бодлогын сан зэрэг байгаа тул эхний postоос эхлэн дуустал нь уншаарай.

Танилцах уулзалтанд тавтай морилно уу!

Баярлалаа.
Утас: 80660314, 88559876`;
    }
    
    // SAT In-person template
    return `Сайн байна уу? Таныг бүртгэж авлаа. SAT Math сургалтаас холбогдож байна.

Class Info: ${batchLink}

Тус групт 1. Бидний хэрэглэх ном 2. Цээжлэх үгс 3. Шалгалтад бүртгүүлэх заавар 4. 1074 бодлогын сан зэрэг байгаа тул эхний postоос эхлэн дуустал нь уншаарай.

Танилцах уулзалтанд тавтай морилно уу!

Баярлалаа.
Хаяг: Их Наяд Зүүн Өндөр 1114, ${batch.room} тоот
Утас: 80660314, 88559876`;
  };

  const handleCopySmsTemplate = () => {
    navigator.clipboard.writeText(getSmsTemplate());
    toast({
      title: "Message Copied",
      description: "SMS template copied to clipboard"
    });
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <CardTitle className="text-lg">
                {batch.batch_name || `${batch.teacher} - ${formatDate(batch.start_date)}`}
              </CardTitle>
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{batch.students?.length || 0} students</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{batch.schedule}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>Room {batch.room}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(batch.start_date)}</span>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon">
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="space-y-4 pt-0">
            <div className="flex gap-2 flex-wrap">
              <Button variant="default" size="sm" onClick={() => setShowEditDialog(true)}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Batch
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
              <Button variant="outline" size="sm" onClick={handleOpenLink}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open
              </Button>
              <Button variant="outline" size="sm" onClick={handleRegenerateLink}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Batch
              </Button>
            </div>

            <Collapsible open={showSmsTemplate} onOpenChange={setShowSmsTemplate}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  📋 SMS Message Template
                  {showSmsTemplate ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                  <pre className="text-sm whitespace-pre-wrap font-sans text-foreground">
                    {getSmsTemplate()}
                  </pre>
                  <Button 
                    onClick={handleCopySmsTemplate} 
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    📋 Copy Message
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {batch.students && batch.students.length > 0 && (
              <BatchStudentsTable students={batch.students} batchId={batch.id} onUpdate={onUpdate} />
            )}
          </CardContent>
        )}
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Batch?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this batch and all associated students. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBatch} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditBatchDialog
        batch={batch}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onUpdate={onUpdate}
      />
    </>
  );
}
