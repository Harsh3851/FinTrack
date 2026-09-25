import { Info } from 'lucide-react';
import { DATA_MODE, README_URL } from '../config';

export function DemoBanner() {
  if (DATA_MODE !== 'demo') return null;
  return (
    <div className="border-b border-line bg-primary-soft/70 px-4 py-2 text-center text-[12.5px] text-fg-2">
      <Info className="mr-1.5 inline h-3.5 w-3.5 -translate-y-px text-primary" aria-hidden />
      Demo mode — data is stored in your browser. Run locally for the full Node.js + MongoDB
      backend.{' '}
      <a
        href={README_URL}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-primary underline-offset-2 hover:underline"
      >
        Read the README
      </a>
    </div>
  );
}
