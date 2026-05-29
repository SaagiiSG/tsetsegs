import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink, FolderOpen, Send, MessageCircle } from 'lucide-react';

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

export function ExternalResourcesCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-sm sm:text-base">External Resources</h3>
              <p className="text-xs text-muted-foreground">Quick links to your study materials & community</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {RESOURCES.map(({ label, description, href, icon: Icon, accent }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-all hover:border-primary/40 hover:shadow-sm"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${accent}`}>
                  <Icon className="h-5 w-5" />
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
        </CardContent>
      </Card>
    </motion.div>
  );
}
