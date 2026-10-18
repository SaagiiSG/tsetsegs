import { Shield, Medal, Award, Gem, Diamond, Crown, CircleDashed, type LucideIcon } from 'lucide-react';
import type { TierType } from '@/data/badgeDefinitions';

import unrankedImg from '@/assets/ranks/unranked.png';
import unrankedLockedImg from '@/assets/ranks/unranked-locked.png';
import bronzeImg from '@/assets/ranks/bronze.png';
import bronzeLockedImg from '@/assets/ranks/bronze-locked.png';
import silverImg from '@/assets/ranks/silver.png';
import silverLockedImg from '@/assets/ranks/silver-locked.png';
import goldImg from '@/assets/ranks/gold.png';
import goldLockedImg from '@/assets/ranks/gold-locked.png';
import platinumImg from '@/assets/ranks/platinum.png';
import platinumLockedImg from '@/assets/ranks/platinum-locked.png';
import diamondImg from '@/assets/ranks/diamond.png';
import diamondLockedImg from '@/assets/ranks/diamond-locked.png';
import rubyImg from '@/assets/ranks/ruby.png';
import rubyLockedImg from '@/assets/ranks/ruby-locked.png';

/**
 * Rank artwork map. Artwork lives in src/assets/ranks/ using the names from
 * the art brief; surfaces fall back to the icon while an image is missing.
 */
export interface TierAsset { icon: LucideIcon; image?: string; lockedImage?: string }

export const TIER_ASSETS: Record<TierType, TierAsset> = {
  unranked: { icon: CircleDashed, image: unrankedImg, lockedImage: unrankedLockedImg },
  bronze: { icon: Shield, image: bronzeImg, lockedImage: bronzeLockedImg },
  silver: { icon: Medal, image: silverImg, lockedImage: silverLockedImg },
  gold: { icon: Award, image: goldImg, lockedImage: goldLockedImg },
  platinum: { icon: Gem, image: platinumImg, lockedImage: platinumLockedImg },
  diamond: { icon: Diamond, image: diamondImg, lockedImage: diamondLockedImg },
  ruby: { icon: Crown, image: rubyImg, lockedImage: rubyLockedImg },
};
