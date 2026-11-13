// Maps the "@/…" import alias to ./src so service modules run under `node --test`.
import { register } from 'node:module';
register('./alias-hooks.mjs', import.meta.url);
