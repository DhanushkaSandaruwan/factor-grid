import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));

function withExtension(base) {
  const candidates = [base, `${base}.js`, `${base}.mjs`, path.join(base, 'index.js')];
  return candidates.find((c) => existsSync(c) && !c.endsWith('/'));
}

export async function resolve(specifier, context, next) {
  // Next's package exports don't expose './server' to plain Node, so use the file path.
  if (specifier === 'next/server') return next('next/server.js', context);
  if (specifier.startsWith('@/')) {
    const hit = withExtension(path.join(SRC, specifier.slice(2)));
    if (hit) return next(pathToFileURL(hit).href, context);
  }
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
    const dir = path.dirname(fileURLToPath(context.parentURL));
    const target = path.resolve(dir, specifier);
    const hit = withExtension(target);
    if (hit && hit !== target) return next(pathToFileURL(hit).href, context);
  }
  return next(specifier, context);
}
