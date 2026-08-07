export type Category =
  | 'groceries'
  | 'restaurants'
  | 'transport'
  | 'utilities'
  | 'subscriptions'
  | 'shopping'
  | 'entertainment'
  | 'cash_withdrawal'
  | 'investments'
  | 'transfers_self'
  | 'bizum'
  | 'income'
  | 'uncategorized';

export type CategorizableTransaction = {
  description: string;
  amount: number;
};

type RuleMatch = RegExp | ((tx: CategorizableTransaction) => boolean);
type Rule = { category: Category; match: RuleMatch };

const RULES: Rule[] = [
  {
    category: 'income',
    match: (tx) =>
      tx.amount > 0 &&
      /n[oó]mina|salario|payment from|remun(?:eraci[oó]n)? mes cta|abono por transferencia/i.test(
        tx.description,
      ),
  },
  {
    category: 'bizum',
    match: /bizum/i,
  },
  {
    category: 'investments',
    match:
      /myinvestor|urbanitae|civislend|mintos|esketit|bitcoin|withdrawal from investor account|inv-\d+|lw-urbanitae|→ revolut x|revolut x|andbank|cuenta metas|traspaso movimiento cuenta metas/i,
  },
  {
    category: 'transfers_self',
    match:
      /transferencia a pablo hernando|pablo hernando marrugat|pablo hernando|traspaso a cuenta|traspaso desde cuenta|ingreso en efectivo bbva oficina|transferencia recibida saldo/i,
  },
  {
    category: 'utilities',
    match:
      /vodafone|o2 fibra|naturgy|endesa|iberdrola|telefonica|orange|movistar|jazztel|aigues del vendrell|comisi[oó]n divisa|josep irla|p municipal la bordeta/i,
  },
  {
    category: 'subscriptions',
    match:
      /amazon prime|netflix|spotify|disney\+|disney plus|hbo |apple\.com\/bill|youtube premium/i,
  },
  {
    category: 'groceries',
    match:
      /mercadona|condis|super dia|\bdia\b|spar|carrefour|alcampo|lidl|consum|coaliment|market vendrell|amarcoy|hiper home|caprabo|mkvendrell|aliprox|proxim supermercats|mini supermercat|supermercado|makro|eleven el vendrell|k[' ]?aprofiti/i,
  },
  {
    category: 'restaurants',
    match:
      /mc donald|mcdonald|burger king|kfc|telepizza|domino|timesburg|the dog is hot|bendita locura|the yvory|t.?mate algo express|quim|pizza|burguer|bar unic|bar tremendo|bar jin|cafeteria|deleval|subway|l[' ]?ovella negra/i,
  },
  {
    category: 'transport',
    match:
      /renfe|metro |tmb |cabify|uber|taxi|bolt|gasolinera|repsol|cepsa|galp|shell|bicing|esclatoil|benzinera|grab makati|pemsa/i,
  },
  {
    category: 'entertainment',
    match:
      /steamgames|steam |cinesa|cinema|cines |pkrser|b365|bet365|bolera|spa |fitness|gym |escalada|indomit|speed queen|kinepolis|salamandra/i,
  },
  {
    category: 'shopping',
    match:
      /amazon|fnac|el corte ingles|life informatica|norma comics|zara|h&m|decathlon|ikea|leroy merlin|hipaywalle|trikitrac|sq \*|vestidos araya/i,
  },
  {
    category: 'cash_withdrawal',
    match: /disposicion de efectivo|disposicion en cajero|cajero|com ret efec|ret efec debito/i,
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
