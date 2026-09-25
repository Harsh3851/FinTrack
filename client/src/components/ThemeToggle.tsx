import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemePreference } from '../lib/theme';
import { cn } from '../lib/cn';

const options: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme();
  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn('inline-flex rounded-lg border border-line bg-surface-2 p-0.5', className)}
    >
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={preference === value}
          aria-label={label}
          title={label}
          onClick={() => setPreference(value)}
          className={cn(
            'flex h-7 w-8 items-center justify-center rounded-md transition-colors',
            preference === value ? 'bg-surface text-fg shadow-card' : 'text-fg-3 hover:text-fg',
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </button>
      ))}
    </div>
  );
}
