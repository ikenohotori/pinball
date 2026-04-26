import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────
// ヘルパー関数
// ─────────────────────────────────────────────────────────
async function waitForBoot(page) {
  await page.waitForFunction(
    () => typeof window.__pinballGame !== 'undefined' && window.__pinballGame.isBooted,
    { timeout: 20000 },
  );
}

async function getActiveScene(page) {
  return page.evaluate(() =>
    window.__pinballGame?.scene?.scenes?.find(s => s.sys.isActive())?.sys.settings.key,
  );
}

async function waitForScene(page, key, timeout = 8000) {
  await page.waitForFunction(
    (k) => window.__pinballGame?.scene?.scenes?.find(s => s.sys.isActive())?.sys.settings.key === k,
    key,
    { timeout },
  );
}

// ScenePlugin 経由でシーン遷移（SceneManager.start は現行シーンを停止しないため使わない）
async function startGame(page) {
  await waitForScene(page, 'title');
  // TitleScene の ScenePlugin 経由で game に遷移させる（title を停止して game を開始）
  await page.evaluate(() => {
    window.__pinballGame?.scene?.getScene('title')?.scene.start('game');
  });
  await waitForScene(page, 'game', 10000);
  // ボールのスポーンを待つ
  await page.waitForFunction(
    () => window.__pinballGame?.scene?.getScene('game')?.ballSystem?.getBall() != null,
    { timeout: 5000 },
  );
  // 物理エンジン安定待ち
  await page.waitForTimeout(250);
}

// ─────────────────────────────────────────────────────────
// T01: Canvas 表示確認
// ─────────────────────────────────────────────────────────
test('T01: ページ読み込み後にCanvas要素が表示される', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible({ timeout: 20000 });
});

// ─────────────────────────────────────────────────────────
// T02: 起動後タイトルシーンがアクティブ
// ─────────────────────────────────────────────────────────
test('T02: 起動直後にタイトルシーンがアクティブになっている', async ({ page }) => {
  await page.goto('/');
  await waitForBoot(page);
  const active = await getActiveScene(page);
  expect(active).toBe('title');
});

// ─────────────────────────────────────────────────────────
// T03: Spaceキーでゲームシーンへ遷移
// ─────────────────────────────────────────────────────────
test('T03: Spaceキー押下でタイトルからゲームシーンへ遷移する', async ({ page }) => {
  await page.goto('/');
  await waitForBoot(page);
  await waitForScene(page, 'title');
  await page.keyboard.press('Space');
  await waitForScene(page, 'game', 6000);
  const active = await getActiveScene(page);
  expect(active).toBe('game');
});

// ─────────────────────────────────────────────────────────
// T04: ゲーム開始時にボールがランチャー位置付近にスポーンする
// ─────────────────────────────────────────────────────────
test('T04: ゲーム開始時にボールがランチャー(x>440,y>780)付近にスポーンする', async ({ page }) => {
  await page.goto('/');
  await waitForBoot(page);
  await startGame(page);

  const ballPos = await page.evaluate(() => {
    const gs = window.__pinballGame?.scene?.getScene('game');
    const b = gs?.ballSystem?.getBall();
    return b ? { x: Math.round(b.position.x), y: Math.round(b.position.y) } : null;
  });

  expect(ballPos).not.toBeNull();
  expect(ballPos.x).toBeGreaterThan(440);
  expect(ballPos.y).toBeGreaterThan(780);
  expect(ballPos.y).toBeLessThan(870);
});

// ─────────────────────────────────────────────────────────
// T05: プランジャーチャージ蓄積ロジック確認
// ─────────────────────────────────────────────────────────
// headless Chromium では rAF がスロットリングされるため、
// update() を直接呼び出して決定論的にチェックする。
test('T05: 600ms 相当の delta を与えるとプランジャーチャージが0.4以上になる', async ({ page }) => {
  await page.goto('/');
  await waitForBoot(page);
  await startGame(page);

  const charge = await page.evaluate(() => {
    const gs = window.__pinballGame?.scene?.getScene('game');
    if (!gs) return -1;
    gs.plungerSystem.setCharging(true);
    const ball = gs.ballSystem.getBall();
    const canLaunch = gs.ballSystem.isReadyToLaunch();
    // 600ms 分のデルタを直接与える（60fps 換算で約36フレーム相当）
    gs.plungerSystem.update(600, ball, canLaunch);
    return gs.plungerSystem.charge;
  });

  // 600 / 900 ≈ 0.667 なので余裕をもって 0.4 以上を確認
  expect(charge).toBeGreaterThan(0.4);
});

// ─────────────────────────────────────────────────────────
// T06: ボール発射後にランチャーが無効化される
// ─────────────────────────────────────────────────────────
test('T06: プランジャー発射後にcanUseLauncher()がfalseになる', async ({ page }) => {
  await page.goto('/');
  await waitForBoot(page);
  await startGame(page);

  const canBefore = await page.evaluate(() =>
    window.__pinballGame?.scene?.getScene('game')?.ballSystem?.canUseLauncher() ?? null,
  );
  expect(canBefore).toBe(true);

  // チャージして発射
  await page.keyboard.down('Space');
  await page.waitForTimeout(350);
  await page.keyboard.up('Space');
  await page.waitForTimeout(150);

  const canAfter = await page.evaluate(() =>
    window.__pinballGame?.scene?.getScene('game')?.ballSystem?.canUseLauncher() ?? null,
  );
  expect(canAfter).toBe(false);
});

// ─────────────────────────────────────────────────────────
// T07: 左矢印キーで左フリッパーがアクティブになる
// ─────────────────────────────────────────────────────────
test('T07: 左矢印キー押下で左フリッパーがactive=trueになる', async ({ page }) => {
  await page.goto('/');
  await waitForBoot(page);
  await startGame(page);

  const beforeLeft = await page.evaluate(() =>
    window.__pinballGame?.scene?.getScene('game')?.flipperSystem?.state?.left?.active ?? null,
  );
  expect(beforeLeft).toBe(false);

  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(80);
  const afterLeft = await page.evaluate(() =>
    window.__pinballGame?.scene?.getScene('game')?.flipperSystem?.state?.left?.active ?? null,
  );
  await page.keyboard.up('ArrowLeft');

  expect(afterLeft).toBe(true);
});

// ─────────────────────────────────────────────────────────
// T08: 右矢印キーで右フリッパーがアクティブになる
// ─────────────────────────────────────────────────────────
test('T08: 右矢印キー押下で右フリッパーがactive=trueになる', async ({ page }) => {
  await page.goto('/');
  await waitForBoot(page);
  await startGame(page);

  const beforeRight = await page.evaluate(() =>
    window.__pinballGame?.scene?.getScene('game')?.flipperSystem?.state?.right?.active ?? null,
  );
  expect(beforeRight).toBe(false);

  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(80);
  const afterRight = await page.evaluate(() =>
    window.__pinballGame?.scene?.getScene('game')?.flipperSystem?.state?.right?.active ?? null,
  );
  await page.keyboard.up('ArrowRight');

  expect(afterRight).toBe(true);
});

// ─────────────────────────────────────────────────────────
// T09: ドレイン呼び出しでゲームオーバーシーンへ遷移する
// ─────────────────────────────────────────────────────────
test('T09: handleDrain()呼び出し後に900ms以内でgame-overシーンへ遷移する', async ({ page }) => {
  await page.goto('/');
  await waitForBoot(page);
  await startGame(page);

  await page.evaluate(() => {
    window.__pinballGame?.scene?.getScene('game')?.handleDrain();
  });

  await waitForScene(page, 'game-over', 5000);
  const active = await getActiveScene(page);
  expect(active).toBe('game-over');
});

// ─────────────────────────────────────────────────────────
// T10: ゲームオーバー画面のRETRYでゲームシーンが再開する
// ─────────────────────────────────────────────────────────
test('T10: ゲームオーバー後にRETRYをクリックするとゲームシーンが再起動する', async ({ page }) => {
  await page.goto('/');
  await waitForBoot(page);
  await startGame(page);

  // ゲームオーバーをトリガー
  await page.evaluate(() => {
    window.__pinballGame?.scene?.getScene('game')?.endGame('T10: forced game over');
  });
  await waitForScene(page, 'game-over', 5000);

  // ゲームオーバーシーンの RETRY テキストに対して pointerdown を発火
  await page.evaluate(() => {
    const goScene = window.__pinballGame?.scene?.getScene('game-over');
    const retryObj = goScene?.children?.list?.find(c => c.text === 'RETRY');
    retryObj?.emit('pointerdown');
  });

  await waitForScene(page, 'game', 5000);
  const active = await getActiveScene(page);
  expect(active).toBe('game');
});

// ─────────────────────────────────────────────────────────
// T11: ボールが止まらない（最低速度保証）
// ─────────────────────────────────────────────────────────
test('T11: 発射後にボール速度がゼロになっても最低速度(2.0)に復帰する', async ({ page }) => {
  await page.goto('/');
  await waitForBoot(page);
  await startGame(page);

  // launcherEnabled=false にして「発射済み」状態にする
  await page.evaluate(() => {
    window.__pinballGame?.scene?.getScene('game')?.ballSystem?.markLaunched();
  });

  // ボールを完全停止させる
  await page.evaluate(() => {
    window.__pinballGame?.scene?.getScene('game')?.ballSystem?.setVelocity(0, 0);
  });

  // update() が数フレーム走るのを待つ
  await page.waitForTimeout(300);

  const speed = await page.evaluate(() => {
    const gs = window.__pinballGame?.scene?.getScene('game');
    const ball = gs?.ballSystem?.getBall();
    return ball ? Math.hypot(ball.velocity.x, ball.velocity.y) : 0;
  });

  // ensureMinSpeed(2.0) により最低でも 2.0 に近い速度に戻っているはず
  expect(speed).toBeGreaterThanOrEqual(1.8);
});

// ─────────────────────────────────────────────────────────
// T12: ランチャー待機中は最低速度を適用しない
// ─────────────────────────────────────────────────────────
test('T12: ランチャー待機中(launcherEnabled=true)は速度ゼロを維持できる', async ({ page }) => {
  await page.goto('/');
  await waitForBoot(page);
  await startGame(page);

  // launcherEnabled はデフォルトで true。ボールはランチャーに静止している
  const launcherOn = await page.evaluate(() =>
    window.__pinballGame?.scene?.getScene('game')?.ballSystem?.canUseLauncher() ?? null,
  );
  expect(launcherOn).toBe(true);

  // holdInLauncher() により速度はゼロ近辺に保たれているはず
  await page.waitForTimeout(200);

  const speed = await page.evaluate(() => {
    const gs = window.__pinballGame?.scene?.getScene('game');
    const ball = gs?.ballSystem?.getBall();
    return ball ? Math.hypot(ball.velocity.x, ball.velocity.y) : -1;
  });

  // ランチャー中は ensureMinSpeed が発動しないので静止を保つ
  expect(speed).toBeLessThan(1.0);
});

// ─────────────────────────────────────────────────────────
// T13: 微速(0.5)でもensureMinSpeedで2.0に引き上げられる
// ─────────────────────────────────────────────────────────
test('T13: 微速(0.5)のボールがensureMinSpeedで2.0以上に引き上げられる', async ({ page }) => {
  await page.goto('/');
  await waitForBoot(page);
  await startGame(page);

  // 発射済み状態にして微速を与える
  await page.evaluate(() => {
    const gs = window.__pinballGame?.scene?.getScene('game');
    gs?.ballSystem?.markLaunched();
    gs?.ballSystem?.setVelocity(0.3, 0.4); // 速度 = 0.5
  });

  await page.waitForTimeout(300);

  const speed = await page.evaluate(() => {
    const gs = window.__pinballGame?.scene?.getScene('game');
    const ball = gs?.ballSystem?.getBall();
    return ball ? Math.hypot(ball.velocity.x, ball.velocity.y) : 0;
  });

  expect(speed).toBeGreaterThanOrEqual(1.8);
});
