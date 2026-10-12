import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import type { Plugin } from 'vite';

export function pwaPlugin(): Plugin {
  return {
    name: 'local-offline-app',
    apply: 'build',
    generateBundle(_options, bundle) {
      const assets = [
        '/index.html',
        ...Object.keys(bundle)
          .filter((name) => name !== 'index.html')
          .map((name) => `/${name}`),
      ];
      const publicFiles = (directory: string, prefix: string): string[] =>
        readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
          entry.isDirectory()
            ? publicFiles(
                resolve(directory, entry.name),
                `${prefix}/${entry.name}`,
              )
            : [`${prefix}/${entry.name}`],
        );
      assets.push(...publicFiles(resolve('public'), ''));
      const hash = createHash('sha256');
      for (const [name, item] of Object.entries(bundle).sort(([a], [b]) =>
        a.localeCompare(b),
      )) {
        hash.update(name);
        hash.update(item.type === 'chunk' ? item.code : item.source);
      }
      for (const path of publicFiles(resolve('public'), '')) {
        hash.update(path);
        hash.update(readFileSync(resolve('public', path.slice(1))));
      }
      const template = readFileSync(resolve('src/pwa/worker.ts'), 'utf8');
      hash.update(template);
      hash.update(readFileSync(resolve('index.html')));
      const cacheName = `punto-a-punto-app-${hash.digest('hex').slice(0, 16)}`;
      const code = ts
        .transpileModule(template, {
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
          },
        })
        .outputText.replaceAll('__CACHE_NAME__', JSON.stringify(cacheName))
        .replaceAll(
          '__PRECACHE_ASSETS__',
          JSON.stringify([...new Set(assets)].sort()),
        )
        .replace(/export\s*\{\s*\};?\s*$/, '');
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: code });
    },
  };
}
