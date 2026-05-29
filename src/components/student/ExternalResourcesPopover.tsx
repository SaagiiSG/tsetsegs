import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ExternalLink, FolderOpen, Send, MessageCircle, Link2 } from 'lucide-react';

type Resource = {
  label: string;
  description: string;
  href: string;
  icon: typeof FolderOpen;
  accent: string;
};

const RESOURCES: Resource[] = [
  {
    label: 'Google Drive',
    description: 'Shared materials & resources',
    href: 'https://drive.google.com/drive/folders/1slnxyRbJnFtKna2HmmdFLnj4w53AWF11?usp=drive_link',
    icon: FolderOpen,
    accent: 'from-amber-500/20 to-yellow-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    label: 'Telegram',
    description: 'Join the group chat',
    href: 'https://t.me/+mldrqgJAruAyN2I9',
    icon: Send,
    accent: 'from-sky-500/20 to-blue-500/10 text-sky-600 dark:text-sky-400',
  },
  {
    label: 'Discord',
    description: 'Hang out with classmates',
    href: 'https://discord.gg/njvTx9uHU',
    icon: MessageCircle,
    accent: 'from-indigo-500/20 to-purple-500/10 text-indigo-600 dark:text-indigo-400',
  },
];

export function ExternalResourcesPopover({ collapsed }: { collapsed?: boolean }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "w-full text-muted-foreground hover:text-foreground hover:bg-muted text-xs md:text-sm",
            collapsed ? "justify-center p-2" : "justify-start gap-2 md:gap-3"
          )}
        >
          <Link2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
          {!collapsed && <span>Resources</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent side="right" align="end" className="w-72 p-2">
        <div className="px-2 py-1.5">
          <p className="text-sm font-semibold">External Resources</p>
          <p className="text-[11px] text-muted-foreground">Study materials & community</p>
        </div>
        <div className="space-y-1">
          {RESOURCES.map(({ label, description, href, icon: Icon, accent }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-md border border-transparent p-2 transition-all hover:border-border hover:bg-muted/50"
            >
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br", accent)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="font-medium text-sm truncate">{label}</span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{description}</p>
              </div>
            </a>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
