# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pinball.spec.js >> T07: 左矢印キー押下で左フリッパーがactive=trueになる
- Location: tests/pinball.spec.js:149:1

# Error details

```
TimeoutError: page.waitForFunction: Timeout 10000ms exceeded.
```

# Page snapshot

```yaml
- generic "Orbital Cadet Pinball" [ref=e3]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | // ─────────────────────────────────────────────────────────
  4   | // ヘルパー関数
  5   | // ─────────────────────────────────────────────────────────
  6   | async function waitForBoot(page) {
> 7   |   await page.waitForFunction(
      |              ^ TimeoutError: page.waitForFunction: Timeout 10000ms exceeded.
  8   |     () => typeof window.__pinballGame !== 'undefined' && window.__pinballGame.isBooted,
  9   |     { timeout: 20000 },
  10  |   );
  11  | }
  12  | 
  13  | async function getActiveScene(page) {
  14  |   return page.evaluate(() =>
  15  |     window.__pinballGame?.scene?.scenes?.find(s => s.sys.isActive())?.sys.settings.key,
  16  |   );
  17  | }
  18  | 
  19  | async function waitForScene(page, key, timeout = 8000) {
  20  |   await page.waitForFunction(
  21  |     (k) => window.__pinballGame?.scene?.scenes?.find(s => s.sys.isActive())?.sys.settings.key === k,
  22  |     key,
  23  |     { timeout },
  24  |   );
  25  | }
  26  | 
  27  | // ScenePlugin 経由でシーン遷移（SceneManager.start は現行シーンを停止しないため使わない）
  28  | async function startGame(page) {
  29  |   await waitForScene(page, 'title');
  30  |   // TitleScene の ScenePlugin 経由で game に遷移させる（title を停止して game を開始）
  31  |   await page.evaluate(() => {
  32  |     window.__pinballGame?.scene?.getScene('title')?.scene.start('game');
  33  |   });
  34  |   await waitForScene(page, 'game', 10000);
  35  |   // ボールのスポーンを待つ
  36  |   await page.waitForFunction(
  37  |     () => window.__pinballGame?.scene?.getScene('game')?.ballSystem?.getBall() != null,
  38  |     { timeout: 5000 },
  39  |   );
  40  |   // 物理エンジン安定待ち
  41  |   await page.waitForTimeout(250);
  42  | }
  43  | 
  44  | // ─────────────────────────────────────────────────────────
  45  | // T01: Canvas 表示確認
  46  | // ─────────────────────────────────────────────────────────
  47  | test('T01: ページ読み込み後にCanvas要素が表示される', async ({ page }) => {
  48  |   await page.goto('/');
  49  |   const canvas = page.locator('canvas');
  50  |   await expect(canvas).toBeVisible({ timeout: 20000 });
  51  | });
  52  | 
  53  | // ─────────────────────────────────────────────────────────
  54  | // T02: 起動後タイトルシーンがアクティブ
  55  | // ─────────────────────────────────────────────────────────
  56  | test('T02: 起動直後にタイトルシーンがアクティブになっている', async ({ page }) => {
  57  |   await page.goto('/');
  58  |   await waitForBoot(page);
  59  |   const active = await getActiveScene(page);
  60  |   expect(active).toBe('title');
  61  | });
  62  | 
  63  | // ─────────────────────────────────────────────────────────
  64  | // T03: Spaceキーでゲームシーンへ遷移
  65  | // ─────────────────────────────────────────────────────────
  66  | test('T03: Spaceキー押下でタイトルからゲームシーンへ遷移する', async ({ page }) => {
  67  |   await page.goto('/');
  68  |   await waitForBoot(page);
  69  |   await waitForScene(page, 'title');
  70  |   await page.keyboard.press('Space');
  71  |   await waitForScene(page, 'game', 6000);
  72  |   const active = await getActiveScene(page);
  73  |   expect(active).toBe('game');
  74  | });
  75  | 
  76  | // ─────────────────────────────────────────────────────────
  77  | // T04: ゲーム開始時にボールがランチャー位置付近にスポーンする
  78  | // ─────────────────────────────────────────────────────────
  79  | test('T04: ゲーム開始時にボールがランチャー(x>440,y>780)付近にスポーンする', async ({ page }) => {
  80  |   await page.goto('/');
  81  |   await waitForBoot(page);
  82  |   await startGame(page);
  83  | 
  84  |   const ballPos = await page.evaluate(() => {
  85  |     const gs = window.__pinballGame?.scene?.getScene('game');
  86  |     const b = gs?.ballSystem?.getBall();
  87  |     return b ? { x: Math.round(b.position.x), y: Math.round(b.position.y) } : null;
  88  |   });
  89  | 
  90  |   expect(ballPos).not.toBeNull();
  91  |   expect(ballPos.x).toBeGreaterThan(440);
  92  |   expect(ballPos.y).toBeGreaterThan(780);
  93  |   expect(ballPos.y).toBeLessThan(870);
  94  | });
  95  | 
  96  | // ─────────────────────────────────────────────────────────
  97  | // T05: プランジャーチャージ蓄積ロジック確認
  98  | // ─────────────────────────────────────────────────────────
  99  | // headless Chromium では rAF がスロットリングされるため、
  100 | // update() を直接呼び出して決定論的にチェックする。
  101 | test('T05: 600ms 相当の delta を与えるとプランジャーチャージが0.4以上になる', async ({ page }) => {
  102 |   await page.goto('/');
  103 |   await waitForBoot(page);
  104 |   await startGame(page);
  105 | 
  106 |   const charge = await page.evaluate(() => {
  107 |     const gs = window.__pinballGame?.scene?.getScene('game');
```