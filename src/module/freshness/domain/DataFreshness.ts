export type StaleSource = {
  source: string;
  lastUpdate: string | null;
  daysSince: number | null;
};

export type DataFreshness = StaleSource[];
