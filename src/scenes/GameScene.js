import * as Phaser from 'phaser';
import { TABLE_HEIGHT, TABLE_WIDTH } from '../config/gameConfig.js';
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
    this.ballSystem.spawn();
    this.ballGlow = this.add.circle(0, 0, 18, 0xffe59a, 0.22).setDepth(15);

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
    const normalizedX = Phaser.Math.Clamp(pointer.x / TABLE_WIDTH, 0, 1);
    const normalizedY = Phaser.Math.Clamp(pointer.y / TABLE_HEIGHT, 0, 1);

    if (normalizedY < 0.7) {
      return 'none';
    }

    if (normalizedX < 0.33) {
      return 'left';
    }

    if (normalizedX > 0.66) {
      return 'right';
    }

    return 'center';
  }

  applyZone(zone, active) {
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
        this.ballSystem.nudgeFrom(otherBody.position, 0.03);
        this.cameras.main.shake(45, 0.0022);
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

    // ---- 外枠：ネオンパープルグラデーション ----
    g.fillGradientStyle(0x3a006f, 0x20003d, 0x16002e, 0x0a0018, 1);
    g.fillRoundedRect(20, 14, 500, 930, 22);
    g.lineStyle(3, 0xd040ff, 0.9);
    g.strokeRoundedRect(20, 14, 500, 930, 22);

    g.fillGradientStyle(0x280050, 0x180038, 0x0e0028, 0x080018, 1);
    g.fillRoundedRect(32, 26, 476, 906, 18);

    // ---- メインプレイエリア ----
    g.fillGradientStyle(0x120028, 0x0a0020, 0x060016, 0x030010, 1);
    g.fillRoundedRect(42, 84, 446, 826, 20);

    g.fillStyle(0x080018, 0.98);
    g.fillRoundedRect(46, 88, 388, 590, 20);
    g.fillRoundedRect(438, 84, 46, 822, 18);

    // ---- スター背景 ----
    g.fillStyle(0xffffff, 0.7);
    for (let s = 0; s < 60; s += 1) {
      const sx = 50 + ((s * 43 + 7) % 380);
      const sy = 100 + ((s * 97 + 13) % 580);
      g.fillCircle(sx, sy, s % 11 === 0 ? 1.5 : 0.8);
    }

    // ---- 斜めネオンライン（マゼンタ） ----
    g.lineStyle(2, 0xff40ff, 0.14);
    for (let row = 0; row < 7; row += 1) {
      g.beginPath();
      g.moveTo(58, 142 + row * 74);
      g.lineTo(422, 112 + row * 74);
      g.strokePath();
    }

    // ---- プレイエリア枠（シアン） ----
    g.lineStyle(2, 0x00e5ff, 0.28);
    g.strokeRoundedRect(52, 102, 370, 560, 18);

    // ---- 上部ランプライン（ネオンピンク） ----
    g.lineStyle(5, 0xff00cc, 0.55);
    g.beginPath();
    g.moveTo(118, 162);
    g.lineTo(216, 118);
    g.lineTo(292, 134);
    g.lineTo(392, 194);
    g.strokePath();

    // ---- 中段ランプライン（シアン） ----
    g.lineStyle(4, 0x00e5ff, 0.45);
    g.beginPath();
    g.moveTo(92, 522);
    g.lineTo(164, 468);
    g.lineTo(254, 492);
    g.lineTo(338, 432);
    g.lineTo(396, 462);
    g.strokePath();

    // ---- 下部ガイドライン（ネオンイエロー） ----
    g.lineStyle(4, 0xffea00, 0.62);
    g.beginPath();
    g.moveTo(110, 742);
    g.lineTo(66, 882);
    g.lineTo(204, 906);
    g.moveTo(430, 742);
    g.lineTo(474, 882);
    g.lineTo(336, 906);
    g.strokePath();

    // ---- 右レーンとターゲットエリア枠 ----
    g.lineStyle(3, 0x00e5ff, 0.48);
    g.strokeRoundedRect(450, 116, 20, 662, 10);
    g.lineStyle(3, 0xff40ff, 0.38);
    g.strokeRoundedRect(88, 140, 52, 360, 14);

    // ---- 上部スコアパネル（ほぼ黒） ----
    g.fillStyle(0x0a0018, 0.96);
    g.fillRoundedRect(34, 24, 472, 60, 12);
    g.lineStyle(2, 0xd040ff, 0.9);
    g.strokeRoundedRect(34, 24, 472, 60, 12);

    // ---- バンパーグロー（ネオンマゼンタ・シアン・黄） ----
    g.fillStyle(0xff00cc, 0.22);
    g.fillCircle(208, 244, 46);
    g.fillStyle(0x00e5ff, 0.22);
    g.fillCircle(318, 244, 46);
    g.fillStyle(0xffea00, 0.22);
    g.fillCircle(262, 332, 50);

    // ---- 小デコレーション丸（ランプ端） ----
    g.fillStyle(0xff00cc, 0.9);
    g.fillCircle(102, 182, 10);
    g.fillCircle(116, 212, 8);
    g.fillStyle(0x00e5ff, 0.9);
    g.fillCircle(388, 184, 10);
    g.fillCircle(404, 214, 8);

    // ---- スターゲートのアーチ装飾 ----
    g.fillStyle(0xffea00, 0.85);
    g.fillCircle(144, 560, 12);
    g.fillCircle(202, 600, 10);
    g.fillCircle(306, 606, 10);
    g.fillCircle(362, 564, 12);

    // ---- 上三角デコ（ネオングリーン） ----
    g.fillStyle(0x76ff03, 0.78);
    g.fillTriangle(244, 164, 280, 150, 264, 196);
    g.fillTriangle(328, 150, 364, 164, 308, 198);

    // ---- バンパーリングアーク ----
    g.lineStyle(3, 0xff40ff, 0.65);
    g.beginPath();
    g.arc(208, 244, 60, Phaser.Math.DegToRad(218), Phaser.Math.DegToRad(24), false);
    g.strokePath();
    g.lineStyle(3, 0x00e5ff, 0.65);
    g.beginPath();
    g.arc(318, 244, 60, Phaser.Math.DegToRad(156), Phaser.Math.DegToRad(322), false);
    g.strokePath();
    g.lineStyle(3, 0xffea00, 0.65);
    g.beginPath();
    g.arc(262, 332, 68, Phaser.Math.DegToRad(210), Phaser.Math.DegToRad(330), false);
    g.strokePath();

    // ---- ターゲットパネル（ダーク） ----
    g.fillStyle(0x1a003a, 0.95);
    g.fillRoundedRect(62, 116, 16, 38, 6);
    g.fillRoundedRect(388, 116, 16, 38, 6);
    g.fillRoundedRect(216, 378, 92, 24, 10);
    g.lineStyle(2, 0xff40ff, 0.65);
    g.strokeRoundedRect(62, 116, 16, 38, 6);
    g.strokeRoundedRect(388, 116, 16, 38, 6);
    g.lineStyle(2, 0xffea00, 0.65);
    g.strokeRoundedRect(216, 378, 92, 24, 10);

    // ---- ターゲット丸（ネオンオレンジ） ----
    g.fillStyle(0xff8800, 0.95);
    g.fillCircle(70, 135, 5);
    g.fillCircle(396, 135, 5);
    g.fillCircle(232, 390, 5);
    g.fillCircle(292, 390, 5);

    // ---- コーナーボルト ----
    g.fillStyle(0xd040ff, 0.9);
    g.fillCircle(44, 38, 5);
    g.fillCircle(496, 38, 5);
    g.fillCircle(44, 920, 5);
    g.fillCircle(496, 920, 5);

    // ---- 右レーンのジグザグデコ ----
    g.lineStyle(2, 0xff40ff, 0.38);
    g.beginPath();
    g.moveTo(454, 136);
    g.lineTo(466, 154);
    g.lineTo(454, 172);
    g.lineTo(466, 190);
    g.lineTo(454, 208);
    g.lineTo(466, 226);
    g.lineTo(454, 244);
    g.lineTo(466, 262);
    g.lineTo(454, 280);
    g.lineTo(466, 298);
    g.lineTo(454, 316);
    g.lineTo(466, 334);
    g.lineTo(454, 352);
    g.lineTo(466, 370);
    g.lineTo(454, 388);
    g.lineTo(466, 406);
    g.lineTo(454, 424);
    g.lineTo(466, 442);
    g.lineTo(454, 460);
    g.lineTo(466, 478);
    g.lineTo(454, 496);
    g.lineTo(466, 514);
    g.lineTo(454, 532);
    g.lineTo(466, 550);
    g.lineTo(454, 568);
    g.lineTo(466, 586);
    g.lineTo(454, 604);
    g.lineTo(466, 622);
    g.lineTo(454, 640);
    g.lineTo(466, 658);
    g.lineTo(454, 676);
    g.lineTo(466, 694);
    g.lineTo(454, 712);
    g.lineTo(466, 730);
    g.lineTo(454, 748);
    g.strokePath();

    // ---- フリッパーエリア三角（ダーク紫） ----
    g.fillStyle(0x1a0040, 1);
    g.fillTriangle(76, 820, 176, 820, 96, 900);
    g.fillTriangle(464, 820, 364, 820, 444, 900);
    g.lineStyle(3, 0xd040ff, 0.55);
    g.strokeTriangle(76, 820, 176, 820, 96, 900);
    g.strokeTriangle(464, 820, 364, 820, 444, 900);
  }

  buildStaticLabels() {
    const makeLabel = (x, y, text, options = {}) => this.add.text(x, y, text, {
      fontFamily: options.fontFamily ?? 'Impact',
      fontSize: options.fontSize ?? '18px',
      color: options.color ?? '#ff40ff',
      stroke: options.stroke ?? '#1a003a',
      strokeThickness: options.strokeThickness ?? 5,
      align: options.align ?? 'center',
      rotation: options.rotation,
    }).setOrigin(0.5).setAngle(options.angle ?? 0).setDepth(12);

    makeLabel(270, 120, 'ORBITAL CADET', {
      fontSize: '30px',
      color: '#ffea00',
      stroke: '#3a0060',
      strokeThickness: 7,
    });

    makeLabel(118, 196, 'BOOST', {
      fontSize: '18px',
      color: '#ff00cc',
      stroke: '#1a003a',
      strokeThickness: 5,
      angle: -74,
    });

    makeLabel(118, 358, 'TARGETS', {
      fontSize: '18px',
      color: '#00e5ff',
      stroke: '#001a2a',
      strokeThickness: 5,
      angle: -90,
    });

    makeLabel(380, 226, 'HYPER RAMP', {
      fontSize: '17px',
      color: '#00e5ff',
      stroke: '#001a2a',
      strokeThickness: 5,
      angle: -32,
    });

    makeLabel(252, 706, 'BONUS LANE', {
      fontSize: '22px',
      color: '#ffea00',
      stroke: '#3a2000',
      strokeThickness: 5,
      angle: 1,
    });

    makeLabel(462, 824, 'LAUNCH', {
      fontSize: '18px',
      color: '#d040ff',
      stroke: '#1a003a',
      strokeThickness: 5,
      angle: -90,
    });

    makeLabel(138, 862, 'DANGER', {
      fontSize: '17px',
      color: '#ff4444',
      stroke: '#1a0000',
      strokeThickness: 5,
      angle: 33,
    });

    makeLabel(398, 862, 'ESCAPE', {
      fontSize: '17px',
      color: '#00e5ff',
      stroke: '#001a2a',
      strokeThickness: 5,
      angle: -33,
    });

    makeLabel(260, 390, 'STAR GATE', {
      fontSize: '14px',
      color: '#ff40ff',
      stroke: '#1a003a',
      strokeThickness: 4,
    });

    makeLabel(94, 792, 'WARP', {
      fontSize: '18px',
      color: '#d040ff',
      stroke: '#1a003a',
      strokeThickness: 5,
      angle: -66,
    });

    makeLabel(426, 792, 'ORBIT', {
      fontSize: '18px',
      color: '#00e5ff',
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
      g.fillStyle(lit ? 0xff40ff : 0x2a004a, lit ? 1 : 0.75);
      g.fillRoundedRect(target.x - 12, target.y - 34, 24, 68, 8);
      g.fillStyle(lit ? 0xffea00 : 0x0f0020, 0.9);
      g.fillRoundedRect(target.x - 7, target.y - 26, 14, 52, 6);
      g.lineStyle(2, lit ? 0xffffff : 0x00e5ff, 0.82);
      g.strokeRoundedRect(target.x - 12, target.y - 34, 24, 68, 8);
    }

    for (const bumper of this.table.bumpers) {
      // 外グロー
      g.fillStyle(0xff00cc, 0.18);
      g.fillCircle(bumper.position.x, bumper.position.y, 44);
      // バンパー本体
      g.fillStyle(0x2a0060, 0.9);
      g.fillCircle(bumper.position.x, bumper.position.y, 29);
      g.lineStyle(6, 0xff00cc, 1.0);
      g.strokeCircle(bumper.position.x, bumper.position.y, 27);
      g.lineStyle(4, 0xffea00, 0.9);
      g.strokeCircle(bumper.position.x, bumper.position.y, 20);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(bumper.position.x + 10, bumper.position.y - 12, 4);
    }

    for (const flipper of this.flipperSystem.getBodies()) {
      const body = flipper.body;
      // フリッパー：アクティブ=シアン、待機=紫
      g.fillStyle(flipper.active ? 0x00e5ff : 0x8800cc, 1);
      g.lineStyle(4, flipper.active ? 0x80ffff : 0xd040ff, 0.9);
      g.save();
      g.translateCanvas(body.position.x, body.position.y);
      g.rotateCanvas(body.angle);
      g.fillRoundedRect(-(this.flipperSystem.length / 2), -(this.flipperSystem.width / 2), this.flipperSystem.length, this.flipperSystem.width, 8);
      g.strokeRoundedRect(-(this.flipperSystem.length / 2), -(this.flipperSystem.width / 2), this.flipperSystem.length, this.flipperSystem.width, 8);
      g.lineStyle(2, 0xffffff, 0.45);
      g.beginPath();
      g.moveTo(-(this.flipperSystem.length / 2) + 10, -(this.flipperSystem.width / 2) + 4);
      g.lineTo((this.flipperSystem.length / 2) - 10, -(this.flipperSystem.width / 2) + 4);
      g.strokePath();
      g.restore();
      g.fillStyle(0xd040ff, 1);
      g.fillCircle(flipper.pivot.x, flipper.pivot.y, 8);
    }

    if (ball) {
      this.ballGlow.setPosition(ball.position.x, ball.position.y);
      // ボールグロー
      g.fillStyle(0xff40ff, 0.25);
      g.fillCircle(ball.position.x, ball.position.y, 22);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(ball.position.x, ball.position.y, 12);
      g.lineStyle(3, 0x00e5ff, 0.7);
      g.strokeCircle(ball.position.x, ball.position.y, 12);
      g.lineStyle(2, 0xff40ff, 0.5);
      g.strokeCircle(ball.position.x, ball.position.y, 16);
    }

    // プランジャーゲージ（マゼンタ）
    g.fillStyle(0xff00cc, 0.3 + this.plungerSystem.charge * 0.55);
    g.fillRoundedRect(460, 788 - (this.plungerSystem.charge * 120), 16, 120 * this.plungerSystem.charge, 6);

    g.lineStyle(2, 0xd040ff, 0.55);
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
}