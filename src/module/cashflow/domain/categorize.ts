import type { Category } from './Category.js';

export type CategorizableTransaction = {
  description: string;
  amount: number;
};

type RuleMatch = RegExp | ((tx: CategorizableTransaction) => boolean);
type Rule = { category: Category; match: RuleMatch };

// Order matters: first matching rule wins. Specific/high-priority rules first.
const RULES: Rule[] = [
  // Income wins over everything else for credit transactions matching salary keywords.
  // Otherwise broad merchant patterns (e.g. "pizza" inside the employer name "Grupo Zena Pizza")
  // would mis-route the salary into restaurants/etc.
  {
    category: 'income',
    match: (tx) => tx.amount > 0 && /n[oó]mina|salario|payment from/i.test(tx.description),
  },
  // Investments must come before transfers_self because transfers to investment
  // platforms ("...Myinvestor", "...Urbanitae") would otherwise match the broader
  // self-transfer pattern.
  {
    category: 'investments',
    match:
      /myinvestor|urbanitae|civislend|mintos|esketit|bitcoin|withdrawal from investor account|inv-\d+|lw-urbanitae|→ revolut x|revolut x/i,
  },
  {
    category: 'transfers_self',
    match:
      /transferencia a pablo hernando|pablo hernando marrugat|traspaso a cuenta|traspaso desde cuenta/i,
  },
  {
    category: 'utilities',
    match: /vodafone|o2 fibra|naturgy|endesa|iberdrola|telefonica|orange|movistar|jazztel/i,
  },
  {
    category: 'subscriptions',
    match:
      /amazon prime|netflix|spotify|disney\+|disney plus|hbo|apple\.com\/bill|youtube premium|paypal/i,
  },
  {
    category: 'groceries',
    match:
      /mercadona|condis|super dia|spar|carrefour|alcampo|lidl|consum|coaliment|market vendrell|amarcoy|hiper home|caprabo/i,
  },
  {
    category: 'restaurants',
    match:
      /mc donald|burger king|kfc|telepizza|domino|timesburg|the dog is hot|bendita locura|the yvory|t.?mate algo express|quim|pizza|burguer/i,
  },
  {
    category: 'transport',
    match: /renfe|metro |tmb |cabify|uber|taxi|bolt|gasolinera|repsol|cepsa|galp|shell/i,
  },
  {
    category: 'entertainment',
    match:
      /steamgames|steam |cinesa|cinema|cines |pkrser|b365|bet365|bolera|spa |fitness|gym |escalada|indomit|speed queen/i,
  },
  {
    category: 'shopping',
    match:
      /amazon|fnac|el corte ingles|life informatica|norma comics|zara|h&m|decathlon|ikea|leroy merlin|hipaywalle|trikitrac|sq \*/i,
  },
  {
    category: 'cash_withdrawal',
    match: /disposicion de efectivo|disposicion en cajero|cajero/i,
  },
];

export function categorize(tx: CategorizableTransaction): Category {
  for (const rule of RULES) {
    const matches =
      typeof rule.match === 'function' ? rule.match(tx) : rule.match.test(tx.description);
    if (matches) return rule.category;
  }
  return 'uncategorized';
}
