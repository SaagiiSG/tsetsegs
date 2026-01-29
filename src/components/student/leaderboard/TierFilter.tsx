import { TierType, TIER_COLORS } from '@/data/badgeDefinitions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TierFilterProps {
  selectedTier: TierType | 'all';
  onTierChange: (tier: TierType | 'all') => void;
}

const tiers: { value: TierType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Tiers' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'platinum', label: 'Platinum' },
  { value: 'gold', label: 'Gold' },
  { value: 'silver', label: 'Silver' },
  { value: 'bronze', label: 'Bronze' },
  { value: 'unranked', label: 'Unranked' },
];

export function TierFilter({ selectedTier, onTierChange }: TierFilterProps) {
  return (
    <Select value={selectedTier} onValueChange={(v) => onTierChange(v as TierType | 'all')}>
      <SelectTrigger className="w-[160px]">
        <SelectValue>
          <div className="flex items-center gap-2">
            {selectedTier !== 'all' && (
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: TIER_COLORS[selectedTier] }}
              />
            )}
            <span>{tiers.find(t => t.value === selectedTier)?.label}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {tiers.map((tier) => (
          <SelectItem key={tier.value} value={tier.value}>
            <div className="flex items-center gap-2">
              {tier.value !== 'all' && (
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: TIER_COLORS[tier.value] }}
                />
              )}
              <span>{tier.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
