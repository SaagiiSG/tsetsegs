import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Key, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Credential {
  name: string;
  username: string;
  password: string;
  success: boolean;
  error?: string;
}

export function SetupTeacherAccounts() {
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();

  const handleSetup = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('setup-teacher-accounts');

      if (error) throw error;

      if (data?.results) {
        setCredentials(data.results);
        setShowResults(true);
        
        const successCount = data.results.filter((r: Credential) => r.success).length;
        toast({
          title: 'Setup Complete',
          description: `${successCount} teacher account(s) created successfully`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to setup teacher accounts',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyAllCredentials = () => {
    const text = credentials
      .filter(c => c.success)
      .map(c => `${c.name}:\nUsername: ${c.username}\nPassword: ${c.password}\nLogin: ${window.location.origin}/teacher/login\n`)
      .join('\n---\n\n');
    
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'All credentials copied to clipboard',
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Setup Teacher Accounts
          </CardTitle>
          <CardDescription>
            Create auth accounts for all teachers using their phone numbers as passwords
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded p-4 text-sm">
              <p className="font-semibold mb-2">🔐 Credential Rules:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-900 dark:text-blue-100">
                <li><strong>Username:</strong> Teacher name (lowercase with dashes)</li>
                <li><strong>Password:</strong> Last 8 digits of phone number (after +976-)</li>
                <li>Example: "Saran-Ochir" with phone "+976-88163115" → Username: "saran-ochir", Password: "88163115"</li>
              </ul>
            </div>
            
            <Button onClick={handleSetup} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up accounts...
                </>
              ) : (
                <>
                  <Key className="mr-2 h-4 w-4" />
                  Create Teacher Accounts
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Teacher Account Credentials</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded p-3 text-sm">
              ⚠️ <strong>Save these credentials!</strong> Share them securely with each teacher.
            </div>
            
            {credentials.map((cred, idx) => (
              <div key={idx} className={`border rounded-lg p-4 ${cred.success ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'}`}>
                <h3 className="font-semibold mb-2">{cred.name}</h3>
                {cred.success ? (
                  <div className="space-y-1 font-mono text-sm">
                    <p><strong>Username:</strong> {cred.username}</p>
                    <p><strong>Password:</strong> {cred.password}</p>
                    <p className="text-xs text-muted-foreground">Login at: {window.location.origin}/teacher/login</p>
                  </div>
                ) : (
                  <p className="text-red-600 dark:text-red-400 text-sm">Error: {cred.error}</p>
                )}
              </div>
            ))}

            {credentials.filter(c => c.success).length > 0 && (
              <Button onClick={copyAllCredentials} className="w-full">
                Copy All Credentials
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}