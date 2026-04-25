import { describe, it, expect } from 'vitest';
import { categorize } from '../../../../../src/module/cashflow/domain/categorize.js';
import type { Transaction } from '../../../../../src/module/cashflow/domain/Transaction.js';

const tx = (description: string, amount = -10, bank: string | null = 'BBVA'): Transaction => ({
  date: new Date(Date.UTC(2026, 0, 1)),
  description,
  amount,
  bank,
});

describe('categorize', () => {
  it.each([
    ['MERCADONA something', 'groceries'],
    ['SUPER DIA C/NOU', 'groceries'],
    ['MARKET VENDRELL', 'groceries'],
    ['CARREFOUR Madrid', 'groceries'],
    ['Condis bordeta', 'groceries'],
  ] as const)('groceries: %s', (desc, expected) => {
    expect(categorize(tx(desc))).toBe(expected);
  });

  it.each([
    ["Mc donald's sants", 'restaurants'],
    ['BURGER KING', 'restaurants'],
    ['KFC EL VENDRELL', 'restaurants'],
    ['Telepizza', 'restaurants'],
  ] as const)('restaurants: %s', (desc, expected) => {
    expect(categorize(tx(desc))).toBe(expected);
  });

  it.each([
    ['RENFE CERCANIAS', 'transport'],
    ['Cabify ride', 'transport'],
    ['Repsol gasolinera', 'transport'],
  ] as const)('transport: %s', (desc, expected) => {
    expect(categorize(tx(desc))).toBe(expected);
  });

  it.each([
    ['Adeudo de vodafone', 'utilities'],
    ['O2 FIBRA - TELEFONICA DE ESPANA SAU', 'utilities'],
    ['NATURGY CLIENTES', 'utilities'],
    ['Endesa Energia', 'utilities'],
  ] as const)('utilities: %s', (desc, expected) => {
    expect(categorize(tx(desc))).toBe(expected);
  });

  it.each([
    ['Amazon Prime*NI2TS5Z34', 'subscriptions'],
    ['Spotify Premium', 'subscriptions'],
    ['Netflix.com', 'subscriptions'],
  ] as const)('subscriptions: %s', (desc, expected) => {
    expect(categorize(tx(desc))).toBe(expected);
  });

  it.each([
    ['Amazon Marketplace', 'shopping'],
    ['Norma comics', 'shopping'],
    ['FNAC LAS ARENAS', 'shopping'],
    ['Life informatica  s l', 'shopping'],
  ] as const)('shopping: %s', (desc, expected) => {
    expect(categorize(tx(desc))).toBe(expected);
  });

  it.each([
    ['Steamgames', 'entertainment'],
    ['B365 Pago con tarjeta', 'entertainment'],
    ['BOLERA SPLAU', 'entertainment'],
    ['SALA ESCALADA BATEC', 'entertainment'],
    ['INDOMIT FITNESS', 'entertainment'],
  ] as const)('entertainment: %s', (desc, expected) => {
    expect(categorize(tx(desc))).toBe(expected);
  });

  it.each([
    ['Disposicion de efectivo en cajero servired', 'cash_withdrawal'],
    ['CAJERO BBVA OFICINA', 'cash_withdrawal'],
  ] as const)('cash_withdrawal: %s', (desc, expected) => {
    expect(categorize(tx(desc))).toBe(expected);
  });

  it.each([
    ['TRANSFERENCIA A Pablo Hernando Marrugat Myinvestor', 'investments'],
    ['Withdrawal from Investor account No 59005829', 'investments'],
    ['INV-900980 withdrawal 1963928771', 'investments'],
    ['COMPRA TARJ. ... LW-URBANITAE-Madrid', 'investments'],
    ['BITCOIN', 'investments'],
    ['EUR → Revolut X', 'investments'],
  ] as const)('investments: %s', (desc, expected) => {
    expect(categorize(tx(desc))).toBe(expected);
  });

  it.each([
    ['TRANSFERENCIA A pablo hernando revolut', 'transfers_self'],
    ['TRANSFERENCIA A PABLO HERNANDO', 'transfers_self'],
    ['Pablo Hernando Marrugat', 'transfers_self'],
  ] as const)('transfers_self: %s', (desc, expected) => {
    expect(categorize(tx(desc))).toBe(expected);
  });

  it('income requires a positive amount and a salary-like description', () => {
    expect(categorize(tx('Abono de nómina Grupo zena pizza', 1500))).toBe('income');
    expect(categorize(tx('NOMINA INNOVAMAT EDUCATION', 2000))).toBe('income');
    // Same description but negative amount → not income
    expect(categorize(tx('Abono de nómina', -100))).toBe('uncategorized');
  });

  it('falls back to uncategorized for anything not matched', () => {
    expect(categorize(tx('Random merchant xyz'))).toBe('uncategorized');
    expect(categorize(tx(''))).toBe('uncategorized');
  });

  it('investments take priority over self-transfers when both could match', () => {
    // "Pablo Hernando Marrugat Myinvestor" matches both rules; investments wins.
    expect(categorize(tx('TRANSFERENCIA A Pablo Hernando Marrugat Myinvestor'))).toBe(
      'investments',
    );
  });
});
