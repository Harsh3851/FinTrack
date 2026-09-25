import type { AccountType, TransactionType } from './constants';
import { DEFAULT_CATEGORIES } from './constants';
import { monthBounds, monthsEndingAt, todayIso } from './dates';

export interface DemoAccount {
  key: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  color: string;
}

export interface DemoTransaction {
  type: TransactionType;
  amount: number;
  categoryKey: string;
  accountKey: string;
  date: string;
  note: string;
  tags: string[];
}

export interface DemoDataset {
  accounts: DemoAccount[];
  categories: typeof DEFAULT_CATEGORIES;
  transactions: DemoTransaction[];
  budgets: { categoryKey: string; amount: number }[];
}

/** Deterministic PRNG so the demo looks the same on every machine. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rupees = (n: number) => Math.round(n * 100);

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    key: 'bank',
    name: 'HDFC Savings',
    type: 'bank',
    openingBalance: rupees(85_000),
    color: '#2a78d6',
  },
  { key: 'card', name: 'ICICI Credit Card', type: 'card', openingBalance: 0, color: '#e34948' },
  { key: 'cash', name: 'Cash', type: 'cash', openingBalance: rupees(6_500), color: '#1baf7a' },
];

const DEMO_BUDGETS = [
  { categoryKey: 'food', amount: rupees(14_000) },
  { categoryKey: 'groceries', amount: rupees(9_000) },
  { categoryKey: 'transport', amount: rupees(6_500) },
  { categoryKey: 'shopping', amount: rupees(6_000) },
  { categoryKey: 'entertainment', amount: rupees(3_000) },
  { categoryKey: 'utilities', amount: rupees(5_500) },
  { categoryKey: 'subscriptions', amount: rupees(1_500) },
];

type Pick = <T>(items: readonly T[]) => T;

/**
 * Builds twelve months of realistic personal-finance activity ending today:
 * salary, rent, bills, groceries, food delivery, commutes, shopping and trips.
 */
export function generateDemoData(now: Date = new Date(), seed = 20260925): DemoDataset {
  const rand = mulberry32(seed);
  const between = (min: number, max: number) => min + rand() * (max - min);
  const int = (min: number, max: number) => Math.floor(between(min, max + 1));
  const pick: Pick = (items) => items[Math.floor(rand() * items.length)] as never;
  const money = (min: number, max: number, step = 1) =>
    rupees(Math.round(between(min, max) / step) * step);

  const today = todayIso(now);
  const months = monthsEndingAt(today.slice(0, 7), 12);
  const txs: DemoTransaction[] = [];

  // The credit card was issued this month; before that, card-style spends went through UPI.
  const cardOr = (index: number) => (index >= 11 ? 'card' : 'bank');
  const small = () => (rand() < 0.12 ? 'cash' : 'bank');

  const add = (
    type: TransactionType,
    categoryKey: string,
    accountKey: string,
    month: string,
    day: number,
    amount: number,
    note: string,
    tags: string[] = [],
  ) => {
    const { to } = monthBounds(month);
    const lastDay = Number(to.slice(8));
    const date = `${month}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
    if (date > today) return;
    txs.push({ type, amount, categoryKey, accountKey, date, note, tags });
  };

  months.forEach((month, index) => {
    const m = Number(month.slice(5));
    const salary = index < 6 ? 1_05_000 : 1_15_000; // appraisal half-way through the year
    add(
      'income',
      'salary',
      'bank',
      month,
      1,
      rupees(salary),
      'Monthly salary - Acme Technologies',
      ['salary'],
    );

    if (rand() < 0.6) {
      add(
        'income',
        'freelance',
        'bank',
        month,
        int(8, 26),
        money(8_000, 32_000, 500),
        pick([
          'Landing page for a local cafe',
          'Angular dashboard fixes',
          'API integration contract',
          'UI audit for a startup',
        ]),
        ['freelance', 'work'],
      );
    }
    if (m % 3 === 0) {
      add(
        'income',
        'investments',
        'bank',
        month,
        int(10, 20),
        money(1_200, 4_800, 50),
        'Mutual fund dividend payout',
        ['mutual-funds'],
      );
    }
    if (m === 11 || m === 3) {
      add(
        'income',
        'gifts',
        'cash',
        month,
        int(5, 25),
        money(2_000, 11_000, 500),
        m === 11 ? 'Diwali gift from family' : 'Birthday gift',
        ['family'],
      );
    }

    add('expense', 'rent', 'bank', month, 3, rupees(26_000), 'House rent - Indiranagar flat', [
      'home',
    ]);
    add(
      'expense',
      'utilities',
      'bank',
      month,
      int(6, 10),
      money(1_400, 3_600, 10),
      'BESCOM electricity bill',
      ['bills'],
    );
    add('expense', 'utilities', 'bank', month, 12, rupees(999), 'ACT Fibernet broadband', [
      'bills',
      'internet',
    ]);
    add('expense', 'utilities', 'bank', month, 15, rupees(599), 'Jio postpaid plan', [
      'bills',
      'mobile',
    ]);
    add('expense', 'subscriptions', cardOr(index), month, 5, rupees(649), 'Netflix subscription', [
      'streaming',
    ]);
    add('expense', 'subscriptions', cardOr(index), month, 18, rupees(119), 'Spotify Premium', [
      'streaming',
    ]);
    if (m % 3 === 1)
      add('expense', 'subscriptions', cardOr(index), month, 21, rupees(459), 'Google One storage', [
        'cloud',
      ]);

    for (let i = int(4, 6); i > 0; i--) {
      add(
        'expense',
        'groceries',
        cardOr(index),
        month,
        int(1, 28),
        money(650, 3_200, 5),
        pick([
          'BigBasket order',
          'Zepto groceries',
          'Blinkit essentials',
          'DMart weekly shopping',
          'Fruits and vegetables',
        ]),
        ['groceries'],
      );
    }
    for (let i = int(8, 13); i > 0; i--) {
      const place = pick([
        'Swiggy dinner',
        'Zomato lunch',
        'Third Wave Coffee',
        'Team lunch',
        'Weekend brunch',
        'Chai and snacks',
      ]);
      add(
        'expense',
        'food',
        small(),
        month,
        int(1, 28),
        money(120, 1_450, 5),
        place,
        place.startsWith('Swiggy') ? ['swiggy'] : place.startsWith('Zomato') ? ['zomato'] : [],
      );
    }
    for (let i = int(6, 10); i > 0; i--) {
      add(
        'expense',
        'transport',
        small(),
        month,
        int(1, 28),
        money(60, 480, 5),
        pick(['Uber to office', 'Ola auto', 'Namma Metro recharge', 'Rapido bike taxi']),
        ['commute'],
      );
    }
    add(
      'expense',
      'transport',
      cardOr(index),
      month,
      int(8, 14),
      money(1_800, 2_600, 10),
      'Petrol - HP pump',
      ['fuel'],
    );

    for (let i = int(1, 3); i > 0; i--) {
      add(
        'expense',
        'shopping',
        cardOr(index),
        month,
        int(1, 28),
        money(700, 5_200, 10),
        pick([
          'Amazon order',
          'Myntra - clothing',
          'Decathlon sports gear',
          'Croma accessories',
          'IKEA home items',
        ]),
        ['online'],
      );
    }
    for (let i = int(1, 3); i > 0; i--) {
      add(
        'expense',
        'entertainment',
        cardOr(index),
        month,
        int(1, 28),
        money(250, 1_400, 10),
        pick(['PVR movie tickets', 'BookMyShow concert', 'Bowling with friends', 'Steam game']),
        ['weekend'],
      );
    }
    if (rand() < 0.45) {
      add(
        'expense',
        'health',
        'bank',
        month,
        int(1, 28),
        money(300, 2_800, 10),
        pick(['Apollo pharmacy', 'Doctor consultation', 'Cult.fit membership', 'Lab tests']),
        ['health'],
      );
    }
    if (index === 4) {
      add('expense', 'travel', 'bank', month, 9, rupees(9_860), 'Flights Bengaluru to Goa', [
        'trip-goa',
      ]);
      add('expense', 'travel', 'bank', month, 10, rupees(12_400), 'Goa beach resort - 3 nights', [
        'trip-goa',
      ]);
    }
    if (index === 8) {
      add('expense', 'travel', 'bank', month, 14, rupees(3_450), 'Train tickets to Mysuru', [
        'weekend-trip',
      ]);
    }
    if (index === 2 || index === 9) {
      add(
        'expense',
        'education',
        'bank',
        month,
        int(3, 20),
        rupees(index === 2 ? 3_499 : 1_299),
        index === 2 ? 'Udemy - Advanced TypeScript course' : 'Frontend Masters monthly',
        ['learning'],
      );
    }
    add('expense', 'other-expense', 'bank', month, 5, rupees(4_850), 'Two-wheeler loan EMI', [
      'emi',
    ]);
    if (m % 3 === 2)
      add(
        'expense',
        'health',
        'bank',
        month,
        11,
        rupees(2_450),
        'Health insurance premium (quarterly)',
        ['insurance'],
      );
    add(
      'expense',
      'other-expense',
      'bank',
      month,
      22,
      money(150, 600, 10),
      'Bank charges and misc',
      ['misc'],
    );
  });

  // Make the current month tell a story: shopping over budget, food close to it.
  const current = months[months.length - 1] as string;
  const day = Math.max(1, Number(today.slice(8)));
  add(
    'expense',
    'shopping',
    'card',
    current,
    Math.min(day, 2),
    rupees(5_499),
    'Amazon Great Indian Festival - headphones',
    ['online', 'sale'],
  );
  add(
    'expense',
    'food',
    'card',
    current,
    Math.min(day, 4),
    rupees(2_350),
    'Friends dinner at Toit',
    ['friends'],
  );

  txs.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return {
    accounts: DEMO_ACCOUNTS,
    categories: DEFAULT_CATEGORIES,
    transactions: txs,
    budgets: DEMO_BUDGETS,
  };
}
