import { describe, it, expect } from 'vitest';
import { detectRecurringExpenses } from '../../../../../src/module/cashflow/application/detectRecurringExpenses.js';
import type { Transaction } from '../../../../../src/module/cashflow/domain/Transaction.js';

const tx = (date: string, description: string, amount: number): Transaction => ({
  date: new Date(`${date}T00:00:00.000Z`),
  description,
  amount,
  bank: 'BBVA',
  category: 'subscriptions',
});

const NOW = new Date('2026-04-25T00:00:00.000Z');

describe('detectRecurringExpenses', () => {
  it('detects a monthly subscription with consistent amount', () => {
    const transactions = [
      tx('2026-02-15', 'Spotify Premium', -9.99),
      tx('2026-03-15', 'Spotify Premium', -9.99),
      tx('2026-04-15', 'Spotify Premium', -9.99),
    ];

    const result = detectRecurringExpenses(transactions, { now: NOW });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      merchant: 'Spotify Premium',
      frequency: 'monthly',
      occurrences: 3,
      typicalAmount: -9.99,
      latestAmount: -9.99,
      hasPriceChange: false,
      firstSeen: '2026-02-15',
      lastSeen: '2026-04-15',
    });
    expect(result[0]!.estimatedMonthlyCost).toBe(-9.99);
  });

  it('flags price changes when amounts vary', () => {
    const transactions = [
      tx('2026-02-15', 'Spotify Premium', -9.99),
      tx('2026-03-15', 'Spotify Premium', -10.99),
      tx('2026-04-15', 'Spotify Premium', -10.99),
    ];

    const result = detectRecurringExpenses(transactions, { now: NOW });

    expect(result[0]!.hasPriceChange).toBe(true);
    expect(result[0]!.latestAmount).toBe(-10.99);
  });

  it('skips merchants below the minimum occurrences threshold', () => {
    const transactions = [
      tx('2026-03-15', 'Random Shop', -50),
      tx('2026-04-15', 'Random Shop', -50),
    ];

    const result = detectRecurringExpenses(transactions, { now: NOW, minOccurrences: 3 });

    expect(result).toEqual([]);
  });

  it('filters inactive subscriptions when activeOnly is true', () => {
    const transactions = [
      tx('2024-01-01', 'Old Sub', -5),
      tx('2024-02-01', 'Old Sub', -5),
      tx('2024-03-01', 'Old Sub', -5),
    ];

    const active = detectRecurringExpenses(transactions, { now: NOW, activeOnly: true });
    const all = detectRecurringExpenses(transactions, { now: NOW, activeOnly: false });

    expect(active).toEqual([]);
    expect(all).toHaveLength(1);
  });

  it('groups transactions whose descriptions only differ by digits', () => {
    const transactions = [
      tx('2026-02-01', 'Adeudo de vodafone N 2025041001677433 Vodafone CPVR', -10),
      tx('2026-03-01', 'Adeudo de vodafone N 2025060001234567 Vodafone CPVR', -10),
      tx('2026-04-01', 'Adeudo de vodafone N 2025090001999999 Vodafone CPVR', -10),
    ];

    const result = detectRecurringExpenses(transactions, { now: NOW });

    expect(result).toHaveLength(1);
    expect(result[0]!.occurrences).toBe(3);
    expect(result[0]!.examples).toHaveLength(3);
  });

  it('classifies a weekly cadence and estimates monthly cost', () => {
    const transactions = [
      tx('2026-04-01', 'Weekly Sub', -2),
      tx('2026-04-08', 'Weekly Sub', -2),
      tx('2026-04-15', 'Weekly Sub', -2),
      tx('2026-04-22', 'Weekly Sub', -2),
    ];

    const result = detectRecurringExpenses(transactions, { now: NOW });

    expect(result[0]!.frequency).toBe('weekly');
    // -2 EUR/week * 52 weeks / 12 months = -8.67 EUR/month
    expect(result[0]!.estimatedMonthlyCost).toBe(-8.67);
  });

  it('classifies a yearly cadence and estimates monthly cost', () => {
    const transactions = [
      tx('2024-04-15', 'Domain renewal', -120),
      tx('2025-04-15', 'Domain renewal', -120),
      tx('2026-04-15', 'Domain renewal', -120),
    ];

    const result = detectRecurringExpenses(transactions, { now: NOW });

    expect(result[0]!.frequency).toBe('yearly');
    expect(result[0]!.estimatedMonthlyCost).toBe(-10);
  });

  it('returns multiple subscriptions sorted by absolute monthly cost desc', () => {
    const transactions = [
      // Big one
      tx('2026-02-15', 'Big Subscription', -50),
      tx('2026-03-15', 'Big Subscription', -50),
      tx('2026-04-15', 'Big Subscription', -50),
      // Small one
      tx('2026-02-10', 'Small Subscription', -2),
      tx('2026-03-10', 'Small Subscription', -2),
      tx('2026-04-10', 'Small Subscription', -2),
    ];

    const result = detectRecurringExpenses(transactions, { now: NOW });

    expect(result.map((r) => r.merchant)).toEqual(['Big Subscription', 'Small Subscription']);
  });

  it('includes positive recurring amounts (e.g., salary)', () => {
    const transactions = [
      tx('2026-02-25', 'NOMINA INNOVAMAT EDUCATION', 2000),
      tx('2026-03-25', 'NOMINA INNOVAMAT EDUCATION', 2000),
      tx('2026-04-25', 'NOMINA INNOVAMAT EDUCATION', 2000),
    ];

    const result = detectRecurringExpenses(transactions, { now: NOW });

    expect(result).toHaveLength(1);
    expect(result[0]!.typicalAmount).toBe(2000);
    expect(result[0]!.frequency).toBe('monthly');
  });
});
