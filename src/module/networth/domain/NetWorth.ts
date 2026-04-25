export type NetWorth = {
  cash: number;
  investments: number;
  computedTotal: number;
  lastPatrimony?: {
    year: number;
    value: number;
  };
  deltaSinceLastPatrimony?: number;
  /**
   * Platforms whose value was estimated from initial principal (no Valuation snapshot found).
   * The number is closer to "money committed" than to "current market value" for these.
   */
  platformsMissingValuation?: string[];
};
