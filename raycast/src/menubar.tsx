import { Clipboard, Color, Icon, MenuBarExtra, openCommandPreferences, showHUD } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';
import { fetchDashboardData, type StaleSource } from './lib/data.js';
import { formatCompactEur, formatEur, formatEurPrecise } from './lib/format.js';
import { CATEGORY_ICON, CATEGORY_LABEL } from './lib/categoryEmoji.js';

function freshnessIcon(daysSince: number | null): { source: Icon; tintColor: Color } {
  if (daysSince === null) return { source: Icon.ExclamationMark, tintColor: Color.Red };
  if (daysSince > 30) return { source: Icon.XMarkCircle, tintColor: Color.Red };
  if (daysSince > 7) return { source: Icon.Clock, tintColor: Color.Yellow };
  return { source: Icon.CheckCircle, tintColor: Color.Green };
}

function freshnessLabel(s: StaleSource): string {
  if (s.daysSince === null) return 'never';
  if (s.daysSince === 0) return 'today';
  if (s.daysSince === 1) return 'yesterday';
  return `${s.daysSince}d ago`;
}

async function copy(value: string, label: string): Promise<void> {
  await Clipboard.copy(value);
  await showHUD(`Copied ${label}`);
}

export default function Command() {
  const { data, isLoading, revalidate, error } = useCachedPromise(fetchDashboardData, [], {
    keepPreviousData: true,
  });

  const title = data
    ? `${formatEur(data.monthSpending)} · ${formatCompactEur(data.netWorth.computedTotal)}`
    : undefined;

  return (
    <MenuBarExtra
      icon={{ source: Icon.BankNote, tintColor: Color.Green }}
      title={title}
      tooltip="Finance"
      isLoading={isLoading}
    >
      {error ? (
        <MenuBarExtra.Item
          title={`Error: ${error.message}`}
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          onAction={() => showHUD(error.message)}
        />
      ) : null}

      {data ? (
        <>
          <MenuBarExtra.Section title="This month">
            <MenuBarExtra.Item
              title={`Spending — ${formatEurPrecise(data.monthSpending)}`}
              icon={{ source: Icon.ArrowDown, tintColor: Color.Red }}
              onAction={() => copy(data.monthSpending.toFixed(2), 'spending')}
            />
            {data.monthTopCategories.map(({ category, amount }) => (
              <MenuBarExtra.Item
                key={category}
                title={`${CATEGORY_LABEL[category]} — ${formatEurPrecise(amount)}`}
                icon={CATEGORY_ICON[category]}
                onAction={() => copy(amount.toFixed(2), CATEGORY_LABEL[category])}
              />
            ))}
          </MenuBarExtra.Section>

          <MenuBarExtra.Section title="Net worth">
            <MenuBarExtra.Item
              title={`Total — ${formatEurPrecise(data.netWorth.computedTotal)}`}
              icon={{ source: Icon.Coin, tintColor: Color.Yellow }}
              onAction={() => copy(data.netWorth.computedTotal.toFixed(2), 'net worth')}
            />
            <MenuBarExtra.Item
              title={`Cash — ${formatEurPrecise(data.netWorth.cash)}`}
              icon={{ source: Icon.BankNote, tintColor: Color.Green }}
              onAction={() => copy(data.netWorth.cash.toFixed(2), 'cash')}
            />
            <MenuBarExtra.Item
              title={`Investments — ${formatEurPrecise(data.netWorth.investments)}`}
              icon={{ source: Icon.LineChart, tintColor: Color.Blue }}
              onAction={() => copy(data.netWorth.investments.toFixed(2), 'investments')}
            />
            {data.netWorth.lastPatrimony && data.netWorth.deltaSinceLastPatrimony !== undefined ? (
              <MenuBarExtra.Item
                title={`vs ${data.netWorth.lastPatrimony.year} — ${formatEurPrecise(data.netWorth.deltaSinceLastPatrimony)}`}
                icon={{
                  source:
                    data.netWorth.deltaSinceLastPatrimony >= 0 ? Icon.ArrowUp : Icon.ArrowDown,
                  tintColor:
                    data.netWorth.deltaSinceLastPatrimony >= 0 ? Color.Green : Color.Red,
                }}
                onAction={() =>
                  copy(
                    (data.netWorth.deltaSinceLastPatrimony ?? 0).toFixed(2),
                    `delta vs ${data.netWorth.lastPatrimony?.year}`,
                  )
                }
              />
            ) : null}
          </MenuBarExtra.Section>

          <MenuBarExtra.Section title="Freshness">
            {data.freshness.map((s) => (
              <MenuBarExtra.Item
                key={s.source}
                title={`${s.source} — ${freshnessLabel(s)}`}
                icon={freshnessIcon(s.daysSince)}
                onAction={() => copy(s.lastUpdate ?? '', s.source)}
              />
            ))}
          </MenuBarExtra.Section>
        </>
      ) : null}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Refresh"
          icon={{ source: Icon.ArrowClockwise, tintColor: Color.Blue }}
          shortcut={{ modifiers: ['cmd'], key: 'r' }}
          onAction={() => revalidate()}
        />
        <MenuBarExtra.Item
          title="Preferences"
          icon={{ source: Icon.Gear, tintColor: Color.SecondaryText }}
          shortcut={{ modifiers: ['cmd'], key: ',' }}
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
