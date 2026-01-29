import { motion } from 'framer-motion';
import { ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface ActionBoxProps {
  message: string;
  action?: string;
  link?: string;
  variant?: 'default' | 'urgent' | 'success';
}

export function ActionBox({ message, action, link, variant = 'default' }: ActionBoxProps) {
  const navigate = useNavigate();

  const variantStyles = {
    default: 'bg-primary/10 border-primary/30 text-primary',
    urgent: 'bg-destructive/10 border-destructive/30 text-destructive',
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={`mt-4 p-3 rounded-lg border ${variantStyles[variant]}`}
    >
      <div className="flex items-start gap-2">
        <Zap className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium leading-relaxed">{message}</p>
          {action && (
            <p className="text-sm opacity-80">
              <span className="font-semibold">Action:</span> {action}
            </p>
          )}
          {link && (
            <Button
              size="sm"
              variant="outline"
              className="mt-2 gap-1"
              onClick={() => navigate(link)}
            >
              Start Now <ArrowRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
