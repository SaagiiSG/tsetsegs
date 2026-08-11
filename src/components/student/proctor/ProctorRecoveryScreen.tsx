import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CloudOff, Smartphone, Cloud, Layers } from 'lucide-react';
import type { AnswerMap, ConflictReport } from './proctorConflict';

interface Props {
  report: ConflictReport;
  device: AnswerMap;
  server: AnswerMap;
  savedAt?: number;
  onChoose: (answers: AnswerMap, label: string) => void;
}

/** Shown only when the two saved copies of an attempt disagree.
 *  Nothing is discarded until the student taps one of these. */
export function ProctorRecoveryScreen({ report, device, server, savedAt, onChoose }: Props) {
  const when = savedAt ? new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-md p-6 space-y-5">
        <div className="space-y-1">
          <CloudOff className="h-8 w-8 text-primary" />
          <h1 className="text-lg font-semibold">We found two saved copies of your test</h1>
          <p className="text-sm text-muted-foreground">
            You went offline for a bit, so this device and our servers each kept a copy. Pick the one to
            continue with — nothing is deleted until you choose.
          </p>
        </div>

        {report.conflicts.length > 0 && (
          <p className="text-xs rounded-lg bg-destructive/10 text-destructive px-3 py-2">
            {report.conflicts.length} question{report.conflicts.length === 1 ? '' : 's'} answered differently in the
            two copies.
          </p>
        )}

        <div className="space-y-2">
          <button
            onClick={() => onChoose(report.combined, 'combined')}
            className="w-full text-left rounded-xl border-2 border-primary bg-primary/5 p-3 flex gap-3 items-start"
          >
            <Layers className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <span className="flex-1">
              <span className="block text-sm font-semibold">
                Combine both — recommended
              </span>
              <span className="block text-xs text-muted-foreground">
                Keeps every answer from both copies ({Object.keys(report.combined).length} total). Where they
                disagree, the newer answer from this device is used.
              </span>
            </span>
          </button>

          <button
            onClick={() => onChoose(device, 'device')}
            className="w-full text-left rounded-xl border p-3 flex gap-3 items-start hover:bg-muted/50"
          >
            <Smartphone className="h-5 w-5 mt-0.5 shrink-0" />
            <span className="flex-1">
              <span className="block text-sm font-semibold">Use this device's copy</span>
              <span className="block text-xs text-muted-foreground">
                {report.deviceCount} answers{when ? ` · last saved ${when}` : ''}
              </span>
            </span>
          </button>

          <button
            onClick={() => onChoose(server, 'server')}
            className="w-full text-left rounded-xl border p-3 flex gap-3 items-start hover:bg-muted/50"
          >
            <Cloud className="h-5 w-5 mt-0.5 shrink-0" />
            <span className="flex-1">
              <span className="block text-sm font-semibold">Use the online copy</span>
              <span className="block text-xs text-muted-foreground">{report.serverCount} answers</span>
            </span>
          </button>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Your module timer is still running, so choose quickly. If you're unsure, choose Combine.
        </p>
        <Button variant="ghost" className="w-full h-9 text-xs" onClick={() => onChoose(report.combined, 'combined')}>
          Just continue with everything saved
        </Button>
      </Card>
    </div>
  );
}
