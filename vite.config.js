import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages は /pinball/ サブパスでホストされるため base を指定
  // ローカル開発時は VITE_BASE 未設定 → '/' にフォールバック
  base: process.env.VITE_BASE ?? '/',
});
