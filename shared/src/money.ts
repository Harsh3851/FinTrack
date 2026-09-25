const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrWholeFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const plainFormatter = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

/**
 * Formats an amount held in paise as Indian Rupees with lakh/crore grouping.
 * formatINR(12345600) -> "₹1,23,456.00"
 */
export function formatINR(paise: number, opts: { whole?: boolean; signed?: boolean } = {}): string {
  const rupees = paise / 100;
  const formatter = opts.whole ? inrWholeFormatter : inrFormatter;
  const text = formatter.format(Math.abs(rupees));
  if (rupees < 0) return `-${text}`;
  if (opts.signed && rupees > 0) return `+${text}`;
  return text;
}

/** Short axis labels: ₹950, ₹12.5K, ₹3.4L, ₹1.2Cr. */
export function formatCompactINR(paise: number): string {
  const rupees = paise / 100;
  const abs = Math.abs(rupees);
  const sign = rupees < 0 ? '-' : '';
  if (abs >= 1_00_00_000) return `${sign}₹${plainFormatter.format(abs / 1_00_00_000)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${plainFormatter.format(abs / 1_00_000)}L`;
  if (abs >= 1_000) return `${sign}₹${plainFormatter.format(abs / 1_000)}K`;
  return `${sign}₹${plainFormatter.format(abs)}`;
}

const RUPEE_INPUT = /^\d{1,10}(\.\d{1,2})?$/;

/** True when the string is a valid rupee amount with at most two decimals. */
export function isRupeeInput(value: string): boolean {
  return RUPEE_INPUT.test(value.replace(/,/g, '').trim());
}

/**
 * Converts user input in rupees ("1,250.5") to integer paise (125050).
 * String arithmetic avoids floating point drift such as 0.1 + 0.2.
 */
export function rupeesToPaise(value: string | number): number {
  const text = String(value).replace(/,/g, '').trim();
  if (!RUPEE_INPUT.test(text)) throw new Error(`Invalid rupee amount: ${value}`);
  const [whole = '0', fraction = ''] = text.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

/** 125050 -> "1250.50", used to prefill amount inputs and CSV cells. */
export function paiseToRupeesString(paise: number): string {
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(paise);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}
