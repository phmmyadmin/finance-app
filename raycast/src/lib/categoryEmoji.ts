import { Color, Icon, type Image } from '@raycast/api';
import type { Category } from './data.js';

type IconWithTint = { source: Image.Source; tintColor: Color };

export const CATEGORY_ICON: Record<Category, IconWithTint> = {
  groceries: { source: Icon.Cart, tintColor: Color.Green },
  restaurants: { source: Icon.Mug, tintColor: Color.Orange },
  transport: { source: Icon.Car, tintColor: Color.Blue },
  utilities: { source: Icon.LightBulb, tintColor: Color.Yellow },
  subscriptions: { source: Icon.Repeat, tintColor: Color.Purple },
  shopping: { source: Icon.Tag, tintColor: Color.Magenta },
  entertainment: { source: Icon.GameController, tintColor: Color.Red },
  cash_withdrawal: { source: Icon.Coin, tintColor: Color.SecondaryText },
  investments: { source: Icon.LineChart, tintColor: Color.Green },
  transfers_self: { source: Icon.ArrowClockwise, tintColor: Color.Blue },
  bizum: { source: Icon.Mobile, tintColor: Color.Magenta },
  income: { source: Icon.PlusCircle, tintColor: Color.Green },
  uncategorized: { source: Icon.QuestionMark, tintColor: Color.SecondaryText },
};

export const CATEGORY_LABEL: Record<Category, string> = {
  groceries: 'Groceries',
  restaurants: 'Restaurants',
  transport: 'Transport',
  utilities: 'Utilities',
  subscriptions: 'Subscriptions',
  shopping: 'Shopping',
  entertainment: 'Entertainment',
  cash_withdrawal: 'Cash withdrawal',
  investments: 'Investments',
  transfers_self: 'Self transfers',
  bizum: 'Bizum',
  income: 'Income',
  uncategorized: 'Uncategorized',
};
