export interface CommonScriptArgs {
  write: boolean;
  dryRun: boolean;
  onlyFile: string;
}

export function parseCommonScriptArgs(args: string[]): CommonScriptArgs {
  const write = args.includes('--write');
  const dryRun = !write || args.includes('--dry') || args.includes('--dry-run');
  const onlyArg = args.find((arg) => arg.startsWith('--only='));
  const onlyFile = onlyArg ? onlyArg.slice('--only='.length) : '';
  return { write, dryRun, onlyFile };
}

export function resolveOnlyContentFiles(files: string[], onlyFile: string): string[] {
  if (!onlyFile) return files;
  const token = onlyFile.trim();
  const fileName = token.endsWith('.md') ? token : `${token}.md`;
  const categoryId = token.replace(/\.md$/, '');
  const matched = files.filter(
    (file) => file === fileName || file.replace(/\.md$/, '') === categoryId,
  );
  if (!matched.length) {
    throw new Error(`--only=${onlyFile} 未匹配任何 content/*.md 文件`);
  }
  return matched;
}
