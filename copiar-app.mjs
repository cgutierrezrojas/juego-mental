// Copia los archivos de la app a la carpeta indicada: `_site` (GitHub Pages) o `www` (app Android con Capacitor).
// Quedan fuera las pruebas, los documentos, las reglas de Firebase y lo del proyecto Android.
import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';

const destino = process.argv[2];
if (!destino) throw new Error('Uso: node copiar-app.mjs <carpeta>');
const FUERA = /^(docs\/|\.github\/|app-android\/|assets\/|tests\.(js|html)$|firestore\.rules$|database\.rules\.json$|\.gitignore$|package(-lock)?\.json$|capacitor\.config\.json$|copiar-app\.mjs$)/;

rmSync(destino, { recursive: true, force: true });
for (const archivo of execSync('git ls-files', { encoding: 'utf8' }).split('\n')) {
  if (!archivo || FUERA.test(archivo)) continue;
  mkdirSync(join(destino, dirname(archivo)), { recursive: true });
  copyFileSync(archivo, join(destino, archivo));
}
