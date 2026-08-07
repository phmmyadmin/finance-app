import { join } from 'node:path';

const EXTENSION_BY_BANK: Record<string, string> = {
  bbva: '.xlsx',
  sabadell: '.xls',
  revolut: '.csv',
  trade_republic: '.csv',
};

const DEFAULT_SUBDIR = 'Downloads';

export type FsAdapter = {
  homedir: string;
  listDirectory: (dir: string) => { name: string; mtimeMs: number }[];
};

function expandHome(path: string, homedir: string): string {
  if (path === '~') return homedir;
  if (path.startsWith('~/')) return join(homedir, path.slice(2));
  return path;
}

export function resolveBankExportFile(
  bank: string,
  hint: string | undefined,
  fs: FsAdapter,
): string {
  const ext = EXTENSION_BY_BANK[bank];
  if (!ext) {
    throw new Error(
      `Unknown bank "${bank}". Expected one of: ${Object.keys(EXTENSION_BY_BANK).join(', ')}`,
    );
  }

  if (hint && (hint.startsWith('/') || hint.startsWith('~'))) {
    return expandHome(hint, fs.homedir);
  }

  const dir = join(fs.homedir, DEFAULT_SUBDIR);
  const matches = fs
    .listDirectory(dir)
    .filter((entry) => entry.name.toLowerCase().endsWith(ext))
    .filter((entry) => !hint || entry.name.toLowerCase().includes(hint.toLowerCase()))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (matches.length === 0) {
    throw new Error(`No ${bank} export found in ${dir}${hint ? ` matching "${hint}"` : ''}`);
  }
  return join(dir, matches[0]!.name);
}
