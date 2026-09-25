import { Check } from 'lucide-react';
import { CATEGORY_ICONS, SWATCHES, type CategoryIcon as IconKey } from '@fintrack/shared';
import { cn } from '../lib/cn';
import { ICONS } from './CategoryIcon';

export function ColorSwatches({
  value,
  onChange,
  label = 'Colour',
}: {
  value: string;
  onChange(v: string): void;
  label?: string;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-medium text-fg-2">{label}</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={value === c}
            aria-label={c}
            onClick={() => onChange(c)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full ring-offset-2 ring-offset-surface transition-transform hover:scale-110',
              value === c && 'ring-2 ring-fg-2',
            )}
            style={{ backgroundColor: c }}
          >
            {value === c && <Check className="h-4 w-4 text-white" aria-hidden />}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function IconPicker({
  value,
  onChange,
  color,
}: {
  value: IconKey;
  onChange(v: IconKey): void;
  color: string;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-medium text-fg-2">Icon</legend>
      <div className="grid grid-cols-8 gap-1.5" role="radiogroup" aria-label="Icon">
        {CATEGORY_ICONS.map((key) => {
          const Icon = ICONS[key];
          const selected = value === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={key.replace(/-/g, ' ')}
              title={key.replace(/-/g, ' ')}
              onClick={() => onChange(key)}
              className={cn(
                'flex aspect-square items-center justify-center rounded-lg border text-fg-2 transition-colors hover:bg-surface-2',
                selected ? 'border-transparent' : 'border-line',
              )}
              style={
                selected
                  ? {
                      backgroundColor: `${color}22`,
                      color,
                      boxShadow: `inset 0 0 0 1.5px ${color}`,
                    }
                  : undefined
              }
            >
              <Icon className="h-4 w-4" aria-hidden />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
