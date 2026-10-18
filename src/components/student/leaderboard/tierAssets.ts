import { Shield, Medal, Award, Gem, Diamond, Crown, CircleDashed, type LucideIcon } from 'lucide-react';
import type { TierType } from '@/data/badgeDefinitions';

/**
 * Rank artwork map. Drop generated images into src/assets/ranks/ using the
 * names from the art brief and add them to `image` — the ladder and other
 * rank surfaces fall back to the icon while an image is missing.
 */
export interface TierAsset { icon: LucideIcon; image?: string; lockedImage?: string }

export const TIER_ASSETS: Record<TierType, TierAsset> = {
  unranked: { icon: CircleDashed },
  bronze: { icon: Shield },
  silver: { icon: Medal },
  gold: { icon: Award },
  platinum: { icon: Gem },
  diamond: { icon: Diamond },
  ruby: { icon: Crown },
};
