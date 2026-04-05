import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Clock, Users, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface RegistrationRequest {
  id: string;
  phone_number: string;
  full_name: string;
  status: string;
  batch_id: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface Batch {
  id: string;
  batch_name: string | null;
  course_type: string;
  start_date: string;
}

export function RegistrationQueue() {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatches, setSelectedBatches] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [requestsRes, batchesRes] = await Promise.all([
      supabase
        .from('registration_requests')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('batches')
        .select('id, batch_name, course_type, start_date')
        .order('start_date', { ascending: false })
    ]);

    if (requestsRes.data) setRequests(requestsRes.data as RegistrationRequest[]);
    if (batchesRes.data) setBatches(batchesRes.data);
    setLoading(false);
  };

  const handleApprove = async (request: RegistrationRequest) => {
    const batchId = selectedBatches[request.id];
    if (!batchId) {
      toast({ title: 'Select a batch', description: 'Please select which batch to enroll this student in.', variant: 'destructive' });
      return;
    }

    setProcessingId(request.id);
    try {
      // Split name into first/last
      const nameParts = request.full_name.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

      // Get batch's unique_link_id
      const { data: batchData } = await supabase
        .from('batches')
        .select('unique_link_id')
        .eq('id', batchId)
        .single();

      // Create student record
      const { error: studentError } = await supabase
        .from('students')
        .insert([{
          name: request.full_name,
          first_name: firstName || 'Unknown',
          last_name: lastName,
          phone: request.phone_number,
          batch_id: batchId,
          unique_link_id: batchData?.unique_link_id ?? batchId
        }]);

      if (studentError) throw studentError;

      // Mark request as approved
      const { error: updateError } = await supabase
        .from('registration_requests')
        .update({
          status: 'approved',
          batch_id: batchId,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      toast({ title: 'Approved!', description: `${request.full_name} has been enrolled.` });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: RegistrationRequest) => {
    setProcessingId(request.id);
    try {
      const { error } = await supabase
        .from('registration_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (error) throw error;

      toast({ title: 'Rejected', description: `Request from ${request.full_name} was rejected.` });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Registration Queue</h2>
        <p className="text-muted-foreground">Review and approve student registration requests</p>
      </div>

      {/* Pending requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Pending Requests
            {pendingRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2">{pendingRequests.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>Students waiting for your approval to access the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No pending requests</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Assign to Batch</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.full_name}</TableCell>
                    <TableCell className="font-mono text-sm">{request.phone_number}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(request.created_at), 'MMM d, HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={selectedBatches[request.id] || ''}
                        onValueChange={(val) => setSelectedBatches(prev => ({ ...prev, [request.id]: val }))}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Select batch..." />
                        </SelectTrigger>
                        <SelectContent>
                          {batches.map((batch) => (
                            <SelectItem key={batch.id} value={batch.id}>
                              {batch.batch_name || `${batch.course_type} - ${batch.start_date}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(request)}
                          disabled={processingId === request.id}
                        >
                          {processingId === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-1" />
                          )}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(request)}
                          disabled={processingId === request.id}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Processed requests */}
      {processedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recent History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Processed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedRequests.slice(0, 20).map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.full_name}</TableCell>
                    <TableCell className="font-mono text-sm">{request.phone_number}</TableCell>
                    <TableCell>
                      <Badge variant={request.status === 'approved' ? 'default' : 'destructive'}>
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {request.reviewed_at ? format(new Date(request.reviewed_at), 'MMM d, HH:mm') : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
