import * as Phaser from 'phaser';
import { TABLE_HEIGHT, TABLE_WIDTH, PANEL_WIDTH } from '../config/gameConfig.js';
import { SynthSfx } from '../audio/sfx.js';
import { BallSystem } from '../systems/ballSystem.js';
import { FlipperSystem } from '../systems/flipperSystem.js';
import { MissionSystem } from '../systems/missionSystem.js';
import { PlungerSystem } from '../systems/plungerSystem.js';
import { buildTable } from '../systems/tableLayout.js';
import { Hud } from '../ui/hud.js';
import { saveHighScore } from '../storage/highScore.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('game');
    this.cooldowns = new Map();
    this.pointerZones = new Map();
  }

  create() {
    this.matter.world.setBounds(0, 0, TABLE_WIDTH, TABLE_HEIGHT, 32, true, true, true, true);
    this.matter.world.engine.world.gravity.y = 0.74;

    this.lives = 1;
    this.isRespawning = false;
    this.isGameOver = false;
    this.highScore = this.registry.get('highScore') ?? 0;

    this.sfx = new SynthSfx(this);
    this.missionSystem = new MissionSystem();
    this.table = buildTable(this);
    this.ballSystem = new BallSystem(this, this.table.spawnPoint);
    this.plungerSystem = new PlungerSystem();
    this.flipperSystem = new FlipperSystem(this);
    this.hud = new Hud(this);

    this.staticGraphics = this.add.graphics().setDepth(5);
    this.dynamicGraphics = this.add.graphics().setDepth(20);

    this.drawTableBase();
    this.buildStaticLabels();
    this.drawRightPanel();
    this.buildRightPanelLabels();
    this.ballSystem.spawn();
    this.ballGlow = this.add.circle(0, 0, 18, 0x4488cc, 0.18).setDepth(15);

    this.registerControls();
    this.registerCollisions();
    this.renderHud();
  }

  registerControls() {
    this.input.on('pointerdown', (pointer) => {
      this.sfx.unlock();
      const zone = this.resolveZone(pointer);
      this.pointerZones.set(pointer.id, zone);
      this.applyZone(zone, true);
    });

    this.input.on('pointerup', (pointer) => {
      const zone = this.pointerZones.get(pointer.id);
      this.pointerZones.delete(pointer.id);
      this.applyZone(zone, false);
    });

    this.input.on('pointerupoutside', (pointer) => {
      const zone = this.pointerZones.get(pointer.id);
      this.pointerZones.delete(pointer.id);
      this.applyZone(zone, false);
    });

    this.input.keyboard?.on('keydown-LEFT', () => this.setFlipper('left', true));
    this.input.keyboard?.on('keyup-LEFT', () => this.setFlipper('left', false));
    this.input.keyboard?.on('keydown-RIGHT', () => this.setFlipper('right', true));
    this.input.keyboard?.on('keyup-RIGHT', () => this.setFlipper('right', false));
    this.input.keyboard?.on('keydown-DOWN', () => this.setPlunger(true));
    this.input.keyboard?.on('keyup-DOWN', () => this.setPlunger(false));
    this.input.keyboard?.on('keydown-SPACE', () => this.setPlunger(true));
    this.input.keyboard?.on('keyup-SPACE', () => this.setPlunger(false));
  }

  resolveZone(pointer) {
    if (pointer.x >= TABLE_WIDTH) {
      return null;
    }

    const normalizedX = Phaser.Math.Clamp(pointer.x / TABLE_WIDTH, 0, 1);

    if (normalizedX < 0.33) {
      return 'left';
    }

    if (normalizedX > 0.67) {
      return 'right';
    }

    return 'center';
  }

  applyZone(zone, active) {
    if (!zone) {
      return;
    }

    if (zone === 'left') {
      this.setFlipper('left', active);
      return;
    }

    if (zone === 'right') {
      this.setFlipper('right', active);
      return;
    }

    if (zone === 'center') {
      this.setPlunger(active);
    }
  }

  setFlipper(side, active) {
    const changed = this.flipperSystem.setActive(side, active);

    if (changed && active) {
      this.sfx.play('flipper');
    }
  }

  setPlunger(active) {
    if (!this.ballSystem.canUseLauncher()) {
      this.plungerSystem.setCharging(false);
      return;
    }

    this.plungerSystem.setCharging(active);

    if (!active) {
      const launched = this.plungerSystem.release(this.ballSystem.getBall(), this.ballSystem.isReadyToLaunch());

      if (launched) {
        this.ballSystem.markLaunched();
        this.sfx.play('launch');
      }
    }
  }

  registerCollisions() {
    this.matter.world.on('collisionstart', (event) => {
      for (const pair of event.pairs) {
        this.handleCollisionPair(pair.bodyA, pair.bodyB);
        this.handleCollisionPair(pair.bodyB, pair.bodyA);
      }
    });
  }

  handleCollisionPair(ballCandidate, otherBody) {
    if (this.isGameOver || ballCandidate.label !== 'ball') {
      return;
    }

    if (!otherBody) {
      return;
    }

    if (otherBody.label === 'bumper') {
      if (this.cooldownPassed(`bumper-${otherBody.id}`, 110)) {
        this.missionSystem.onBumperHit();
        // direction from bumper center to ball
        const bx = ballCandidate.position.x - otherBody.position.x;
        const by = ballCandidate.position.y - otherBody.position.y;
        const bd = Math.max(1, Math.hypot(bx, by));
        const minBumpSpeed = 14;
        const curSpeed = Math.hypot(ballCandidate.velocity.x, ballCandidate.velocity.y);
        const bumpSpeed = Math.max(minBumpSpeed, curSpeed * 1.15);
        Phaser.Physics.Matter.Matter.Body.setVelocity(ballCandidate, {
          x: (bx / bd) * bumpSpeed,
          y: (by / bd) * bumpSpeed,
        });
        this.sfx.play('bumper');
      }
      return;
    }

    if (otherBody.label === 'target') {
      const targetId = otherBody.plugin?.targetId ?? 'alpha';

      if (this.cooldownPassed(`target-${targetId}`, 220)) {
        const previousStatus = this.missionSystem.getStatusText();
        this.missionSystem.onTargetHit(targetId);
        this.sfx.play(this.missionSystem.getStatusText() !== previousStatus ? 'mission' : 'target');
      }
      return;
    }

    if (otherBody.label === 'ramp') {
      if (this.cooldownPassed('ramp', 300)) {
        this.missionSystem.onRampShot();
        this.sfx.play(this.missionSystem.missionReady ? 'target' : 'mission');
        this.tweens.add({
          targets: this.cameras.main,
          zoom: 1.02,
          duration: 90,
          yoyo: true,
        });
      }
      return;
    }

    if (otherBody.label === 'flipper-left' || otherBody.label === 'flipper-right') {
      const side = otherBody.label === 'flipper-left' ? 'left' : 'right';
      const flipper = this.flipperSystem.state[side];

      if (flipper?.active && ballCandidate.velocity.y > -12) {
        if (this.cooldownPassed(`flip-kick-${side}`, 110)) {
          const dx = ballCandidate.position.x - flipper.pivot.x;
          const dy = ballCandidate.position.y - flipper.pivot.y;
          const dist = Math.hypot(dx, dy);
          const reach = Phaser.Math.Clamp((dist - 10) / (this.flipperSystem.length - 10), 0, 1);
          const speed = 22 + reach * 7;
          const xSign = side === 'left' ? 1 : -1;
          const xVel = xSign * (0.15 + reach * 0.42) * speed;
          const yVel = -Math.sqrt(Math.max(0.01, speed * speed - xVel * xVel));
          Phaser.Physics.Matter.Matter.Body.setVelocity(ballCandidate, { x: xVel, y: yVel });
          this.sfx.play('flipper');
        }
      }
      return;
    }

    if (otherBody.label === 'saver') {
      const saverId = otherBody.plugin?.saverId ?? 'left';

      if (this.cooldownPassed(`saver-${saverId}`, 400)) {
        const xForce = saverId === 'left' ? 0.006 : saverId === 'right' ? -0.006 : 0;
        const yForce = saverId === 'center' ? -0.03 : -0.02;
        Phaser.Physics.Matter.Matter.Body.applyForce(ballCandidate, ballCandidate.position, {
          x: xForce,
          y: yForce,
        });
      }
      return;
    }

    if (otherBody.label === 'drain') {
      if (this.cooldownPassed('drain', 600)) {
        this.handleDrain();
      }
    }
  }

  cooldownPassed(key, duration) {
    const now = this.time.now;
    const until = this.cooldowns.get(key) ?? 0;

    if (now < until) {
      return false;
    }

    this.cooldowns.set(key, now + duration);
    return true;
  }

  handleDrain() {
    if (this.isRespawning || this.isGameOver) {
      return;
    }

    this.sfx.play('drain');
    this.endGame('Ball drained below the flippers. Tap RETRY to start a new run.');
  }

  endGame(message) {
    this.isGameOver = true;
    const highScore = saveHighScore(this.missionSystem.score);
    this.registry.set('highScore', highScore);
    this.time.delayedCall(900, () => {
      this.scene.start('game-over', {
        score: this.missionSystem.score,
        highScore,
        message,
      });
    });
  }

  drawTableBase() {
    const g = this.staticGraphics;

    g.clear();

    // ---- 背景（ダーク青紫） ----
    g.fillStyle(0x04061a, 1);
    g.fillRoundedRect(20, 14, 500, 930, 22);

    // 外枠（ダークゴールド/ブロンズ）
    g.lineStyle(7, 0x5a3a00, 1.0);
    g.strokeRoundedRect(20, 14, 500, 930, 22);
    g.lineStyle(3, 0xc88800, 0.75);
    g.strokeRoundedRect(24, 18, 492, 922, 21);
    g.lineStyle(2, 0x7a5a00, 0.55);
    g.strokeRoundedRect(27, 21, 486, 916, 20);

    // ---- プレイエリア（青紫グラデーション・Space Cadet特有の色調） ----
    g.fillGradientStyle(0x0e1448, 0x0a1040, 0x080e38, 0x060c30, 1);
    g.fillRoundedRect(36, 14, 400, 900, 18);

    // プレイエリア上部（少し明るい青） 
    g.fillStyle(0x121860, 0.22);
    g.fillRoundedRect(40, 18, 392, 300, 14);

    // 右レーン（シューター）
    g.fillStyle(0x050820, 0.98);
    g.fillRect(436, 14, 50, 900);

    // 内枠
    g.lineStyle(2, 0x2a3880, 0.65);
    g.strokeRoundedRect(38, 16, 396, 896, 16);

    // ---- 星フィールド ----
    const starData = [
      [62, 108, 0], [94, 142, 1], [132, 96, 0], [164, 168, 2], [202, 112, 0],
      [242, 128, 1], [282, 98, 2], [312, 152, 0], [352, 118, 1], [383, 88, 0],
      [64, 208, 2], [102, 248, 0], [148, 228, 1], [192, 198, 0], [232, 218, 2],
      [272, 192, 1], [302, 238, 0], [342, 208, 2], [383, 178, 1], [65, 308, 0],
      [98, 338, 2], [138, 298, 1], [178, 328, 0], [218, 278, 2], [258, 348, 1],
      [298, 308, 0], [338, 288, 2], [378, 318, 1], [62, 418, 0], [108, 458, 2],
      [152, 398, 1], [188, 438, 0], [228, 418, 2], [268, 388, 1], [308, 428, 0],
      [352, 398, 2], [382, 448, 1], [72, 508, 0], [112, 538, 2], [158, 498, 1],
      [198, 528, 0], [238, 508, 2], [278, 488, 1], [318, 518, 0], [358, 502, 2],
      [392, 532, 1], [78, 598, 0], [118, 628, 2], [158, 602, 1], [198, 618, 0],
      [238, 592, 2], [278, 612, 1], [318, 588, 0], [358, 622, 2], [78, 698, 1],
      [118, 718, 0], [158, 702, 2], [198, 712, 1], [238, 696, 0], [278, 708, 2],
      [318, 692, 1], [358, 716, 0], [90, 760, 2], [135, 778, 1], [175, 748, 0],
      [215, 768, 2], [255, 752, 1], [295, 772, 0], [335, 756, 2], [375, 770, 1],
    ];
    for (const [sx, sy, type] of starData) {
      const alpha = type === 0 ? 0.48 : type === 1 ? 0.32 : 0.62;
      const radius = type === 2 ? 1.5 : 0.8;
      g.fillStyle(0xffffff, alpha);
      g.fillCircle(sx, sy, radius);
    }

    // ---- テーブル表面の微細グリッド（Space Cadet特有の質感） ----
    g.lineStyle(1, 0x181e60, 0.3);
    for (let gy = 20; gy < 900; gy += 44) {
      g.beginPath(); g.moveTo(42, gy); g.lineTo(430, gy); g.strokePath();
    }
    g.lineStyle(1, 0x181e60, 0.18);
    for (let gx = 60; gx < 430; gx += 44) {
      g.beginPath(); g.moveTo(gx, 20); g.lineTo(gx, 900); g.strokePath();
    }

    // ---- サイドレール（紫/青の縦ライン） ----
    // 左レール
    g.lineStyle(6, 0x2a1a6a, 1.0);
    g.beginPath(); g.moveTo(42, 18); g.lineTo(42, 908); g.strokePath();
    g.lineStyle(2, 0x6644cc, 0.55);
    g.beginPath(); g.moveTo(42, 18); g.lineTo(42, 908); g.strokePath();
    // 右レール（メインエリア右端）
    g.lineStyle(6, 0x2a1a6a, 1.0);
    g.beginPath(); g.moveTo(430, 18); g.lineTo(430, 908); g.strokePath();
    g.lineStyle(2, 0x6644cc, 0.45);
    g.beginPath(); g.moveTo(430, 18); g.lineTo(430, 908); g.strokePath();

    // ---- 左レールのインジケーターライト（小丸）----
    const leftLights = [
      { y: 200, color: 0xff4400 }, { y: 254, color: 0xff6600 },
      { y: 308, color: 0xff4400 }, { y: 362, color: 0xff8800 },
      { y: 416, color: 0xff6600 }, { y: 470, color: 0xff4400 },
    ];
    for (const ll of leftLights) {
      g.fillStyle(ll.color, 0.55);
      g.fillCircle(50, ll.y, 5);
      g.fillStyle(0xffffff, 0.3);
      g.fillCircle(49, ll.y - 1, 2);
    }

    // 右レール（メインエリア右端）インジケーター
    const rightLights = [
      { y: 190, color: 0xffaa00 }, { y: 250, color: 0xff8800 },
      { y: 310, color: 0xffaa00 }, { y: 370, color: 0xff6600 },
      { y: 430, color: 0xffaa00 },
    ];
    for (const rl of rightLights) {
      g.fillStyle(rl.color, 0.5);
      g.fillCircle(422, rl.y, 5);
    }

    // ---- 上部ランプライン（明るい青/シアン） ----
    g.lineStyle(6, 0x2266dd, 0.75);
    g.beginPath();
    g.moveTo(118, 162); g.lineTo(210, 114); g.lineTo(294, 130); g.lineTo(390, 194);
    g.strokePath();
    g.lineStyle(2, 0x88bbff, 0.5);
    g.beginPath();
    g.moveTo(118, 162); g.lineTo(210, 114); g.lineTo(294, 130); g.lineTo(390, 194);
    g.strokePath();

    // 中段ランプライン（青）
    g.lineStyle(4, 0x1a55bb, 0.6);
    g.beginPath();
    g.moveTo(92, 522); g.lineTo(164, 468); g.lineTo(254, 492); g.lineTo(338, 432); g.lineTo(396, 462);
    g.strokePath();

    // ---- ガイドライン（オレンジ） ----
    g.lineStyle(5, 0xcc6600, 0.75);
    g.beginPath();
    g.moveTo(110, 742); g.lineTo(66, 882); g.lineTo(204, 910);
    g.moveTo(430, 742); g.lineTo(474, 882); g.lineTo(336, 910);
    g.strokePath();
    g.lineStyle(2, 0xff9933, 0.4);
    g.beginPath();
    g.moveTo(110, 742); g.lineTo(66, 882); g.lineTo(204, 910);
    g.moveTo(430, 742); g.lineTo(474, 882); g.lineTo(336, 910);
    g.strokePath();

    // ---- ターゲットエリア枠（左レール） ----
    g.fillStyle(0x0a0e38, 0.9);
    g.fillRoundedRect(88, 140, 52, 360, 14);
    g.lineStyle(2, 0x4455aa, 0.8);
    g.strokeRoundedRect(88, 140, 52, 360, 14);

    // ---- バンパーグロー（ブルー/パープル） ----
    g.fillStyle(0x1a2288, 0.30);
    g.fillCircle(208, 244, 52);
    g.fillStyle(0x1a2288, 0.30);
    g.fillCircle(318, 244, 52);
    g.fillStyle(0x1a1a88, 0.30);
    g.fillCircle(262, 332, 56);

    // ---- バンパーリングアーク（鮮やかブルー） ----
    g.lineStyle(4, 0x4488ff, 0.75);
    g.beginPath();
    g.arc(208, 244, 64, Phaser.Math.DegToRad(218), Phaser.Math.DegToRad(24), false);
    g.strokePath();
    g.lineStyle(4, 0x4488ff, 0.75);
    g.beginPath();
    g.arc(318, 244, 64, Phaser.Math.DegToRad(156), Phaser.Math.DegToRad(322), false);
    g.strokePath();
    g.lineStyle(4, 0x3377ee, 0.75);
    g.beginPath();
    g.arc(262, 332, 72, Phaser.Math.DegToRad(210), Phaser.Math.DegToRad(330), false);
    g.strokePath();

    // ---- 中段バンパーグロー（下の3つ） ----
    g.fillStyle(0x441188, 0.25);
    g.fillCircle(184, 548, 40);
    g.fillCircle(340, 548, 40);
    g.fillCircle(262, 626, 44);
    g.lineStyle(3, 0x8844cc, 0.55);
    g.beginPath();
    g.arc(184, 548, 40, 0, Math.PI * 2);
    g.strokePath();
    g.beginPath();
    g.arc(340, 548, 40, 0, Math.PI * 2);
    g.strokePath();
    g.lineStyle(3, 0x6633bb, 0.55);
    g.beginPath();
    g.arc(262, 626, 44, 0, Math.PI * 2);
    g.strokePath();

    // ---- 色付きライトデコ ----
    // 赤/オレンジ（上部）
    g.fillStyle(0xff2200, 0.9);
    g.fillCircle(102, 182, 9);
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(100, 179, 3.5);
    g.fillStyle(0xff5500, 0.88);
    g.fillCircle(116, 212, 7);
    g.fillStyle(0xff2200, 0.9);
    g.fillCircle(388, 184, 9);
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(386, 181, 3.5);
    g.fillStyle(0xff5500, 0.88);
    g.fillCircle(404, 214, 7);

    // アンバー（中段ゲート）
    g.fillStyle(0xffaa00, 0.9);
    g.fillCircle(144, 560, 11);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(142, 557, 4);
    g.fillStyle(0xffcc44, 0.85);
    g.fillCircle(202, 600, 9);
    g.fillCircle(306, 606, 9);
    g.fillStyle(0xffaa00, 0.9);
    g.fillCircle(362, 564, 11);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(360, 561, 4);

    // ---- 三角デコ（上部 - オレンジ/グリーン） ----
    g.fillStyle(0xee6600, 0.88);
    g.fillTriangle(244, 164, 280, 150, 264, 196);
    g.fillTriangle(328, 150, 364, 164, 308, 198);
    g.lineStyle(1.5, 0x662200, 0.8);
    g.strokeTriangle(244, 164, 280, 150, 264, 196);
    g.strokeTriangle(328, 150, 364, 164, 308, 198);

    // ---- Space Cadet特有：オレンジ下向き矢印（テーブル下部に散在） ----
    // 下向き三角矢印を複数配置
    const downArrows = [
      { x: 152, y: 468 }, { x: 218, y: 468 },
      { x: 302, y: 468 }, { x: 368, y: 468 },
      { x: 120, y: 560 }, { x: 394, y: 556 },
      { x: 160, y: 648 }, { x: 362, y: 648 },
      { x: 118, y: 716 }, { x: 398, y: 714 },
    ];
    for (const arr of downArrows) {
      g.fillStyle(0xee6600, 0.85);
      g.fillTriangle(arr.x, arr.y + 14, arr.x + 14, arr.y - 6, arr.x - 14, arr.y - 6);
      g.lineStyle(1, 0x662200, 0.7);
      g.strokeTriangle(arr.x, arr.y + 14, arr.x + 14, arr.y - 6, arr.x - 14, arr.y - 6);
    }

    // ---- 水平インジケーターライト行（Space Cadet特有：小さな丸が並ぶ） ----
    // 中段エリア
    const dotRows = [
      { y: 410, xs: [108, 136, 164, 192, 280, 308, 336, 364, 392] },
      { y: 660, xs: [108, 136, 164, 192, 220, 280, 308, 336, 364, 392] },
      { y: 754, xs: [122, 150, 178, 260, 288, 336, 364] },
    ];
    for (const row of dotRows) {
      for (const x of row.xs) {
        g.fillStyle(0x2a3a88, 0.9);
        g.fillCircle(x, row.y, 4.5);
        g.lineStyle(1, 0x4455aa, 0.6);
        g.strokeCircle(x, row.y, 4.5);
        g.fillStyle(0x6677cc, 0.35);
        g.fillCircle(x - 1, row.y - 1, 2);
      }
    }

    // ---- コーナーボルト ----
    g.fillStyle(0x5a3a00, 0.95);
    g.fillCircle(44, 38, 8);
    g.fillCircle(496, 38, 8);
    g.fillCircle(44, 920, 8);
    g.fillCircle(496, 920, 8);
    g.fillStyle(0xffcc44, 0.9);
    g.fillCircle(44, 38, 4);
    g.fillCircle(496, 38, 4);
    g.fillCircle(44, 920, 4);
    g.fillCircle(496, 920, 4);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(43, 37, 1.5);
    g.fillCircle(495, 37, 1.5);

    // ---- 右レーンのデコ ----
    g.lineStyle(1.5, 0x1a2a5c, 0.45);
    g.beginPath();
    for (let zy = 136; zy < 748; zy += 18) {
      g.moveTo(438, zy); g.lineTo(464, zy + 9);
    }
    g.strokePath();
    // シューターレーンの小ライト
    for (let ly = 160; ly < 760; ly += 52) {
      g.fillStyle(0x2a3a88, 0.8);
      g.fillCircle(460, ly, 3.5);
    }

    // ---- フリッパーエリア（オレンジ/赤 - Space Cadet特有） ----
    g.fillStyle(0x882200, 0.92);
    g.fillTriangle(76, 820, 176, 820, 96, 900);
    g.fillTriangle(464, 820, 364, 820, 444, 900);
    g.lineStyle(3, 0xdd5500, 0.85);
    g.strokeTriangle(76, 820, 176, 820, 96, 900);
    g.strokeTriangle(464, 820, 364, 820, 444, 900);
    // フリッパー三角ハイライト
    g.fillStyle(0xcc4400, 0.45);
    g.fillTriangle(80, 824, 150, 824, 97, 878);
    g.fillTriangle(460, 824, 390, 824, 443, 878);
  }

  buildStaticLabels() {
    const makeLabel = (x, y, text, options = {}) => this.add.text(x, y, text, {
      fontFamily: options.fontFamily ?? 'Impact',
      fontSize: options.fontSize ?? '18px',
      color: options.color ?? '#66ccff',
      stroke: options.stroke ?? '#001a2a',
      strokeThickness: options.strokeThickness ?? 5,
      align: options.align ?? 'center',
      rotation: options.rotation,
    }).setOrigin(0.5).setAngle(options.angle ?? 0).setDepth(12);

    makeLabel(270, 120, 'ORBITAL CADET', {
      fontSize: '30px',
      color: '#ff9900',
      stroke: '#3a1800',
      strokeThickness: 7,
    });

    makeLabel(118, 196, 'BOOST', {
      fontSize: '18px',
      color: '#ff6600',
      stroke: '#1a0e00',
      strokeThickness: 5,
      angle: -74,
    });

    makeLabel(118, 358, 'TARGETS', {
      fontSize: '18px',
      color: '#66ccff',
      stroke: '#001a2a',
      strokeThickness: 5,
      angle: -90,
    });

    makeLabel(380, 226, 'HYPER RAMP', {
      fontSize: '17px',
      color: '#66ccff',
      stroke: '#001a2a',
      strokeThickness: 5,
      angle: -32,
    });

    makeLabel(252, 706, 'BONUS LANE', {
      fontSize: '22px',
      color: '#ff9900',
      stroke: '#3a1800',
      strokeThickness: 5,
      angle: 1,
    });

    makeLabel(462, 824, 'LAUNCH', {
      fontSize: '18px',
      color: '#aabbcc',
      stroke: '#001a2a',
      strokeThickness: 5,
      angle: -90,
    });

    makeLabel(138, 862, 'DANGER', {
      fontSize: '17px',
      color: '#ff4400',
      stroke: '#1a0000',
      strokeThickness: 5,
      angle: 33,
    });

    makeLabel(398, 862, 'ESCAPE', {
      fontSize: '17px',
      color: '#66ccff',
      stroke: '#001a2a',
      strokeThickness: 5,
      angle: -33,
    });

    makeLabel(260, 390, 'STAR GATE', {
      fontSize: '14px',
      color: '#66ccff',
      stroke: '#001a2a',
      strokeThickness: 4,
    });

    makeLabel(94, 792, 'WARP', {
      fontSize: '18px',
      color: '#aabbcc',
      stroke: '#001a2a',
      strokeThickness: 5,
      angle: -66,
    });

    makeLabel(426, 792, 'ORBIT', {
      fontSize: '18px',
      color: '#66ccff',
      stroke: '#001a2a',
      strokeThickness: 5,
      angle: 66,
    });
  }

  renderDynamic() {
    const ball = this.ballSystem.getBall();
    const targets = this.missionSystem.getTargetState();
    const g = this.dynamicGraphics;

    g.clear();

    const targetVisuals = [
      { x: 128, y: 254, key: 'alpha' },
      { x: 128, y: 340, key: 'beta' },
      { x: 128, y: 426, key: 'gamma' },
    ];

    for (const target of targetVisuals) {
      const lit = targets[target.key];
      // ターゲット外枠（クローム/スチール）
      g.fillStyle(lit ? 0xcc5500 : 0x1a2233, lit ? 1 : 0.85);
      g.fillRoundedRect(target.x - 12, target.y - 34, 24, 68, 8);
      // ターゲット面
      g.fillStyle(lit ? 0xff8800 : 0x0a1020, 0.9);
      g.fillRoundedRect(target.x - 7, target.y - 26, 14, 52, 6);
      // ターゲット枠
      g.lineStyle(2, lit ? 0xffffff : 0x334455, 0.82);
      g.strokeRoundedRect(target.x - 12, target.y - 34, 24, 68, 8);
    }

    for (const bumper of this.table.bumpers) {
      const bx = bumper.position.x;
      const by = bumper.position.y;
      const isTop = by < 400;
      // Space Cadet風バンパー：多重同心円
      // 外グロー
      g.fillStyle(isTop ? 0x1122aa : 0x440088, 0.20);
      g.fillCircle(bx, by, 52);
      // 外リング（シルバーグレー）
      g.fillStyle(0x9aabbf, 0.95);
      g.fillCircle(bx, by, 30);
      g.lineStyle(2, 0xccddee, 0.85);
      g.strokeCircle(bx, by, 30);
      // 第2リング（ダーク）
      g.fillStyle(0x0a0c28, 0.95);
      g.fillCircle(bx, by, 24);
      // 第3リング（ブルー/パープル）
      g.lineStyle(3, isTop ? 0x4488ff : 0x8844cc, 0.9);
      g.strokeCircle(bx, by, 20);
      // 第4リング（細い明るいリング）
      g.lineStyle(1.5, isTop ? 0xaaccff : 0xcc99ff, 0.6);
      g.strokeCircle(bx, by, 14);
      // センタードット（白/明るい）
      g.fillStyle(0xeeeeff, 0.95);
      g.fillCircle(bx, by, 6);
      g.fillStyle(isTop ? 0x4488ff : 0x9944ff, 0.9);
      g.fillCircle(bx, by, 4);
      // ハイライト
      g.fillStyle(0xffffff, 0.65);
      g.fillCircle(bx - 9, by - 9, 4);
      g.fillStyle(0xffffff, 0.3);
      g.fillCircle(bx - 7, by - 7, 2);
    }

    for (const flipper of this.flipperSystem.getBodies()) {
      const body = flipper.body;
      // フリッパー：シルバー/クローム
      const fillColor = flipper.active ? 0xaabbcc : 0x778899;
      g.fillStyle(fillColor, 1);
      g.lineStyle(3, flipper.active ? 0xddeeff : 0x99aacc, 0.9);
      g.save();
      g.translateCanvas(body.position.x, body.position.y);
      g.rotateCanvas(body.angle);
      g.fillRoundedRect(-(this.flipperSystem.length / 2), -(this.flipperSystem.width / 2), this.flipperSystem.length, this.flipperSystem.width, 8);
      g.strokeRoundedRect(-(this.flipperSystem.length / 2), -(this.flipperSystem.width / 2), this.flipperSystem.length, this.flipperSystem.width, 8);
      g.lineStyle(2, 0xffffff, 0.35);
      g.beginPath();
      g.moveTo(-(this.flipperSystem.length / 2) + 10, -(this.flipperSystem.width / 2) + 4);
      g.lineTo((this.flipperSystem.length / 2) - 10, -(this.flipperSystem.width / 2) + 4);
      g.strokePath();
      g.restore();
      // ピボット
      g.fillStyle(0x8899aa, 1);
      g.fillCircle(flipper.pivot.x, flipper.pivot.y, 8);
      g.fillStyle(0xddeeff, 0.55);
      g.fillCircle(flipper.pivot.x - 2, flipper.pivot.y - 2, 3);
    }

    if (ball) {
      this.ballGlow.setPosition(ball.position.x, ball.position.y);
      // ボールグロー（ブルー）
      g.fillStyle(0x0044aa, 0.18);
      g.fillCircle(ball.position.x, ball.position.y, 22);
      // ボール本体（シルバー）
      g.fillStyle(0xc0c8d8, 1);
      g.fillCircle(ball.position.x, ball.position.y, 12);
      // シェーディング
      g.fillStyle(0x8896a8, 0.45);
      g.fillCircle(ball.position.x + 3, ball.position.y + 4, 8);
      // ハイライト
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(ball.position.x - 4, ball.position.y - 4, 4.5);
      g.fillStyle(0xffffff, 0.4);
      g.fillCircle(ball.position.x - 2, ball.position.y - 2, 2);
    }

    // プランジャーゲージ（オレンジ/アンバー）
    g.fillStyle(0xff8800, 0.3 + this.plungerSystem.charge * 0.55);
    g.fillRoundedRect(460, 788 - (this.plungerSystem.charge * 120), 16, 120 * this.plungerSystem.charge, 6);

    g.lineStyle(2, 0x8899aa, 0.55);
    for (let spring = 0; spring < 8; spring += 1) {
      const top = 808 + spring * 10;
      g.beginPath();
      g.moveTo(454, top);
      g.lineTo(472, top + 6);
      g.strokePath();
    }
  }

  renderHud() {
    this.highScore = Math.max(this.highScore, this.missionSystem.score);
    this.hud.render({
      score: this.missionSystem.score,
      lives: this.lives,
      highScore: this.highScore,
      status: this.missionSystem.lastEvent || this.missionSystem.getStatusText(),
      charge: this.plungerSystem.charge,
      launcherEnabled: this.ballSystem.canUseLauncher(),
      readyToLaunch: this.ballSystem.isReadyToLaunch(),
    });
  }

  update(_time, delta) {
    if (this.isGameOver) {
      return;
    }

    const ball = this.ballSystem.getBall();
    this.ballSystem.holdInLauncher();
    this.flipperSystem.update(delta, ball);
    this.plungerSystem.update(delta, ball, this.ballSystem.isReadyToLaunch());
    this.ballSystem.clampSpeed(21);
    this.ballSystem.ensureMinSpeed(2.0);

    if (ball && !this.isRespawning) {
      if (this.ballSystem.wasRecentlyLaunched(2400)
        && this.ballSystem.canUseOrbitalGuide()
        && ball.position.y < 810
        && ball.position.x > 430
        && ball.velocity.y < -5
      ) {
        Phaser.Physics.Matter.Matter.Body.setPosition(ball, { x: 360, y: 178 });
        Phaser.Physics.Matter.Matter.Body.setVelocity(ball, {
          x: -3.4,
          y: 9.8,
        });
        this.ballSystem.markOrbitalGuideUsed();
      }

      if (this.ballSystem.wasRecentlyLaunched(2400) && ball.position.y < 420 && ball.velocity.y < -0.2) {
        const targetX = ball.position.y < 220 ? 270 : 330;
        const forceX = Phaser.Math.Clamp((targetX - ball.position.x) * 0.00024, -0.026, 0.026);
        const forceY = ball.position.y < 240 ? -0.0012 : -0.00035;

        if (Math.abs(targetX - ball.position.x) > 10 && this.cooldownPassed('orbital-guide', 20)) {
          Phaser.Physics.Matter.Matter.Body.applyForce(ball, ball.position, { x: forceX, y: forceY });
        }
      }

      if (!this.ballSystem.canUseLauncher() && ball.position.x > 430 && ball.position.y > 700) {
        const recentLaunch = this.ballSystem.wasRecentlyLaunched(1800);
        if (this.cooldownPassed('shooter-return', recentLaunch ? 45 : 70)) {
          Phaser.Physics.Matter.Matter.Body.applyForce(ball, ball.position, recentLaunch
            ? { x: -0.032, y: -0.0095 }
            : { x: -0.018, y: -0.0085 });
        }
      }

      const outsideBottom = ball.position.y > TABLE_HEIGHT + 40;
      const outsideSides = ball.position.x < -40 || ball.position.x > TABLE_WIDTH + 40;
      const outsideTop = ball.position.y < -40;

      if (outsideBottom || outsideSides || outsideTop) {
        this.endGame('Ball escaped the table. Tap RETRY to launch again.');
        return;
      }
    }

    if (ball && ball.position.y < 100 && Math.abs(ball.velocity.y) < 0.25) {
      Phaser.Physics.Matter.Matter.Body.applyForce(ball, ball.position, { x: 0, y: 0.0022 });
    }

    this.renderDynamic();
    this.renderHud();
  }

  drawRightPanel() {
    const g = this.staticGraphics;
    const px = TABLE_WIDTH;        // 540
    const pw = PANEL_WIDTH;        // 210

    // Panel background (fill includes the gap between table frame edge and panel)
    g.fillStyle(0x000810, 1);
    g.fillRect(518, 0, pw + 22, TABLE_HEIGHT);

    // Separator line (table / panel border)
    g.lineStyle(4, 0x5a3a00, 1.0);
    g.beginPath(); g.moveTo(px, 0); g.lineTo(px, TABLE_HEIGHT); g.strokePath();
    g.lineStyle(1.5, 0xc88800, 0.7);
    g.beginPath(); g.moveTo(px + 3, 0); g.lineTo(px + 3, TABLE_HEIGHT); g.strokePath();

    // ---- TITLE AREA (y=0 to y=260) ----
    g.fillStyle(0x020d20, 1);
    g.fillRect(px + 2, 0, pw - 2, 260);

    // Stars
    const starPositions = [
      [549,18],[562,46],[579,30],[595,60],[613,14],[628,42],[643,22],[660,54],
      [675,16],[690,46],[708,28],[723,58],[738,20],
      [546,88],[563,114],[582,74],[601,104],[620,80],[638,100],[657,72],
      [675,108],[694,76],[712,100],[730,74],
      [550,154],[568,178],[589,132],[609,164],[628,148],[649,170],[669,128],
      [691,160],[713,138],[731,167],
      [544,212],[573,234],[601,200],[629,224],[656,198],[684,218],[712,202],[738,228],
    ];
    for (const [sx, sy] of starPositions) {
      const brightness = (sx + sy) % 7;
      g.fillStyle(0xffffff, 0.28 + brightness * 0.07);
      g.fillCircle(sx, sy, brightness === 6 ? 1.5 : 0.8);
    }

    // Orange planet (top-right)
    g.fillStyle(0x2a1200, 1);
    g.fillCircle(720, 55, 30);
    g.fillStyle(0x7a3500, 0.9);
    g.fillCircle(714, 47, 24);
    g.fillStyle(0xcc6000, 0.25);
    g.fillCircle(720, 55, 36);
    g.lineStyle(2.5, 0x886400, 0.55);
    g.beginPath();
    g.arc(720, 55, 40, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false);
    g.strokePath();

    // Spaceship illustration
    g.fillStyle(0x7a8896, 0.55);
    g.fillEllipse(630, 192, 100, 48);
    g.fillStyle(0xbbc8d4, 0.65);
    g.fillEllipse(630, 187, 78, 34);
    g.lineStyle(2, 0x99aabb, 0.75);
    g.strokeEllipse(630, 192, 100, 48);
    g.fillStyle(0x2244aa, 0.85);
    g.fillCircle(630, 184, 16);
    g.fillStyle(0x5577cc, 0.45);
    g.fillCircle(625, 180, 7);
    g.fillStyle(0xff6600, 0.45);
    g.fillCircle(676, 194, 9);
    g.fillStyle(0xffaa00, 0.3);
    g.fillCircle(676, 194, 13);

    // Title area bottom separator
    g.fillStyle(0x3a2500, 1);
    g.fillRect(px + 2, 258, pw - 2, 4);
    g.lineStyle(2.5, 0xd49000, 0.8);
    g.beginPath(); g.moveTo(px + 2, 260); g.lineTo(px + pw, 260); g.strokePath();

    // ---- BALL ROW (y=260 to y=344) ----
    g.fillGradientStyle(0xb0b8c0, 0xb0b8c0, 0x6a7280, 0x6a7280, 1);
    g.fillRect(px + 2, 260, pw - 2, 84);
    // Ball number box (black with red border)
    g.fillStyle(0x000000, 1);
    g.fillRect(px + pw - 62, 264, 58, 72);
    g.lineStyle(3, 0xcc1100, 1);
    g.strokeRect(px + pw - 62, 264, 58, 72);

    // Ball row bottom separator
    g.fillStyle(0x3a2500, 1);
    g.fillRect(px + 2, 344, pw - 2, 4);
    g.lineStyle(2.5, 0xd49000, 0.8);
    g.beginPath(); g.moveTo(px + 2, 346); g.lineTo(px + pw, 346); g.strokePath();

    // ---- SCORE ROW (y=348 to y=420) ----
    g.fillStyle(0x000000, 1);
    g.fillRect(px + 2, 348, pw - 2, 72);
    // Player number box (amber)
    g.fillStyle(0x7a5800, 1);
    g.fillRect(px + 4, 350, 58, 68);
    g.lineStyle(2, 0xbbaa00, 1);
    g.strokeRect(px + 4, 350, 58, 68);
    // Score value box
    g.fillStyle(0x050505, 1);
    g.fillRect(px + 66, 350, pw - 70, 68);
    g.lineStyle(2, 0x554400, 0.9);
    g.strokeRect(px + 66, 350, pw - 70, 68);

    // Score row bottom separator
    g.fillStyle(0x3a2500, 1);
    g.fillRect(px + 2, 420, pw - 2, 4);
    g.lineStyle(2.5, 0xd49000, 0.8);
    g.beginPath(); g.moveTo(px + 2, 422); g.lineTo(px + pw, 422); g.strokePath();

    // ---- MISSION TEXT AREA (y=424 to y=960) ----
    g.fillStyle(0x000000, 1);
    g.fillRect(px + 2, 424, pw - 2, TABLE_HEIGHT - 424);
    g.lineStyle(1.5, 0x1a2a44, 0.5);
    g.strokeRect(px + 4, 426, pw - 6, TABLE_HEIGHT - 430);
  }

  buildRightPanelLabels() {
    const px = TABLE_WIDTH;        // 540
    const pw = PANEL_WIDTH;        // 210
    const cx = px + pw / 2;        // 645

    this.add.text(cx, 34, '3D Pinball!', {
      fontFamily: 'Impact',
      fontSize: '17px',
      color: '#cc99ee',
      stroke: '#110022',
      strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(12);

    this.add.text(cx, 60, 'Space\nCadet', {
      fontFamily: 'Impact',
      fontSize: '38px',
      color: '#ffee88',
      stroke: '#3a2800',
      strokeThickness: 5,
      align: 'center',
      lineSpacing: 2,
    }).setOrigin(0.5, 0).setDepth(12);
  }
}