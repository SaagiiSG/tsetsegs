import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { BadgeRarity, BadgeCategory, RARITY_COLORS } from '@/data/badgeDefinitions';

interface BadgeFiltersProps {
  status: 'all' | 'earned' | 'in-progress' | 'locked';
  rarity: BadgeRarity | 'all';
  category: BadgeCategory | 'all';
  search: string;
  onStatusChange: (status: 'all' | 'earned' | 'in-progress' | 'locked') => void;
  onRarityChange: (rarity: BadgeRarity | 'all') => void;
  onCategoryChange: (category: BadgeCategory | 'all') => void;
  onSearchChange: (search: string) => void;
}

export function BadgeFilters({
  status,
  rarity,
  category,
  search,
  onStatusChange,
  onRarityChange,
  onCategoryChange,
  onSearchChange
}: BadgeFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Status Tabs */}
      <Tabs value={status} onValueChange={(v) => onStatusChange(v as typeof status)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="earned">Earned</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress</TabsTrigger>
          <TabsTrigger value="locked">Locked</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search and Dropdowns */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search badges..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={rarity} onValueChange={(v) => onRarityChange(v as typeof rarity)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Rarity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rarities</SelectItem>
            <SelectItem value="common">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                Common
              </div>
            </SelectItem>
            <SelectItem value="uncommon">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                Uncommon
              </div>
            </SelectItem>
            <SelectItem value="rare">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                Rare
              </div>
            </SelectItem>
            <SelectItem value="epic">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                Epic
              </div>
            </SelectItem>
            <SelectItem value="legendary">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                Legendary
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        <Select value={category} onValueChange={(v) => onCategoryChange(v as typeof category)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="speed">Speed</SelectItem>
            <SelectItem value="discipline">Discipline</SelectItem>
            <SelectItem value="championship">Championship</SelectItem>
            <SelectItem value="legendary">Legendary</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
