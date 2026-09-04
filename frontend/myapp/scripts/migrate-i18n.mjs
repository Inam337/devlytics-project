import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

function migrateFormatMessage(content) {
  let changed = true;

  while (changed) {
    changed = false;
    const idx = content.indexOf('intl.formatMessage(');
    if (idx === -1) {
      break;
    }

    let depth = 0;
    let end = idx;
    for (let i = idx; i < content.length; i++) {
      const ch = content[i];
      if (ch === '(') {
        depth++;
      } else if (ch === ')') {
        depth--;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }

    const call = content.slice(idx, end);
    const shorthandMatch = call.match(
      /intl\.formatMessage\(\{\s*id,\s*defaultMessage\s*\},\s*([^)]+)\)/,
    );
    const exprMatch = call.match(/id:\s*([^,]+),\s*defaultMessage:\s*([^,}]+)/);
    const stringIdMatch = call.match(/id:\s*'([^']+)'/);
    const stringDefaultMatch = call.match(/defaultMessage:\s*'((?:\\'|[^'])*)'/);
    const valuesMatch = call.match(/\},\s*(\{[\s\S]+\}|[^)]+)\s*\)$/);

    let replacement;

    if (shorthandMatch) {
      replacement = `t(id, defaultMessage, ${shorthandMatch[1].trim()})`;
    } else if (exprMatch && (exprMatch[1].includes('?') || exprMatch[1].trim() !== `'${stringIdMatch?.[1]}'`)) {
      const idExpr = exprMatch[1].trim();
      const defaultExpr = exprMatch[2].trim();
      const values = valuesMatch ? `, ${valuesMatch[1].trim()}` : '';
      replacement = `t(${idExpr}, ${defaultExpr}${values})`;
    } else if (stringIdMatch) {
      const id = stringIdMatch[1];
      const defaultMessage = stringDefaultMatch
        ? stringDefaultMatch[1].replace(/\\'/g, "'")
        : id;
      const values = valuesMatch ? `, ${valuesMatch[1].trim()}` : '';
      replacement = `t('${id}', '${defaultMessage}'${values})`;
    } else {
      throw new Error(`Could not parse id in: ${call}`);
    }

    content = content.slice(0, idx) + replacement + content.slice(end);
    changed = true;
  }

  return content;
}

function migrateFile(file) {
  if (
    file.includes('flatten-messages')
    || file.includes('i18n-client')
    || file.includes('use-t.ts')
    || file.includes('i18n.ts')
  ) {
    return false;
  }

  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('react-intl') && !content.includes('useIntl')) {
    return false;
  }

  content = content.replace(/import \{ useIntl \} from 'react-intl';\r?\n/g, "import { useT } from '@/hooks/use-t';\n");
  content = content.replace(/const intl = useIntl\(\);/g, 'const { t } = useT();');
  content = migrateFormatMessage(content);

  if (content.includes('intl.')) {
    console.warn(`WARN leftover intl in ${file}`);
  }

  fs.writeFileSync(file, content);
  return true;
}

const files = walk(root);
let count = 0;

for (const file of files) {
  if (migrateFile(file)) {
    count++;
    console.log('migrated', path.relative(root, file));
  }
}

console.log(`Done: ${count} files`);
