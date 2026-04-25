import type { AssetClass } from './AssetClass.js';
import type { Money } from './Money.js';

export type Position = {
  platform: string;
  name: string;
  assetClass: AssetClass;
  principal: Money;
  acquiredAt: Date | null;
  terms?: {
    expectedReturn: Money;
    maturityAt: Date;
  };
};
