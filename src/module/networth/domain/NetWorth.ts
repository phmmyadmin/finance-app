export type NetWorth = {
  cash: number;
  investmentsPrincipal: number;
  computedTotal: number;
  lastPatrimony?: {
    year: number;
    value: number;
  };
  deltaSinceLastPatrimony?: number;
};
