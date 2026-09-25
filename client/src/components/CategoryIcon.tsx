import {
  Briefcase,
  Car,
  Coffee,
  Film,
  Fuel,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  Laptop,
  PiggyBank,
  Plane,
  Receipt,
  Repeat,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Tag,
  TrendingUp,
  Utensils,
  Wallet,
  Zap,
  CreditCard,
  Banknote,
  type LucideIcon,
} from 'lucide-react';
import type { AccountType, CategoryIcon as IconKey } from '@fintrack/shared';
import { cn } from '../lib/cn';

export const ICONS: Record<IconKey, LucideIcon> = {
  utensils: Utensils,
  'shopping-cart': ShoppingCart,
  home: Home,
  car: Car,
  fuel: Fuel,
  zap: Zap,
  'heart-pulse': HeartPulse,
  film: Film,
  'shopping-bag': ShoppingBag,
  plane: Plane,
  'graduation-cap': GraduationCap,
  repeat: Repeat,
  smartphone: Smartphone,
  coffee: Coffee,
  gift: Gift,
  shield: Shield,
  briefcase: Briefcase,
  laptop: Laptop,
  'trending-up': TrendingUp,
  'piggy-bank': PiggyBank,
  landmark: Landmark,
  wallet: Wallet,
  receipt: Receipt,
  tag: Tag,
};

export const ACCOUNT_ICONS: Record<AccountType, LucideIcon> = {
  bank: Landmark,
  cash: Banknote,
  card: CreditCard,
  wallet: Wallet,
};

/** A tinted rounded tile carrying the category's own colour and icon. */
export function CategoryIcon({
  icon,
  color,
  size = 'md',
}: {
  icon: IconKey;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const Icon = ICONS[icon] ?? Tag;
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-xl',
        size === 'sm' && 'h-7 w-7 rounded-lg',
        size === 'md' && 'h-9 w-9',
        size === 'lg' && 'h-11 w-11',
      )}
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
        color: `color-mix(in srgb, ${color} 82%, var(--text))`,
      }}
    >
      <Icon
        className={size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4.5 w-4.5'}
        strokeWidth={2.2}
      />
    </span>
  );
}
