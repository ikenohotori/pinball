import * as Phaser from 'phaser';
import { TABLE_WIDTH, PANEL_WIDTH } from '../config/gameConfig.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create() {
    const highScore = this.registry.get('highScore') ?? 0;
    const totalWidth = TABLE_WIDTH + PANEL_WIDTH; // 750

    // ---- 宇宙背景 (full width) ----
    this.add.rectangle(totalWidth / 2, 480, totalWidth, 960, 0x000810);

    // 外枠（アンバー/ブロンズ金属フレーム）
    const frame = this.add.graphics();
    frame.lineStyle(6, 0x8b5200, 1.0);
    frame.strokeRoundedRect(20, 14, 500, 930, 22);
    frame.lineStyle(3, 0xd4880a, 0.7);
    frame.strokeRoundedRect(25, 19, 490, 920, 20);
    frame.lineStyle(2, 0x4a2e00, 0.5);
    frame.strokeRoundedRect(28, 22, 484, 914, 18);

    // ---- 上部タイトルバー ----
    this.add.rectangle(270, 54, 472, 60, 0x000000, 0.98)
      .setStrokeStyle(2, 0xa06800);

    // ---- 星フィールド ----
    const starfield = this.add.graphics();
    for (let index = 0; index < 100; index += 1) {
      const x = 36 + ((index * 37 + 13) % 466);
      const y = 88 + ((index * 83 + 7) % 832);
      const radius = index % 7 === 0 ? 1.8 : index % 11 === 0 ? 1.2 : 0.7;
      const alpha = 0.35 + (index % 6) * 0.1;
      starfield.fillStyle(0xffffff, alpha);
      starfield.fillCircle(x, y, radius);
    }

    // ---- 惑星（右上：オレンジ惑星） ----
    const planets = this.add.graphics();
    planets.fillStyle(0x8b3300, 0.9);
    planets.fillCircle(400, 200, 80);
    planets.fillStyle(0xcc5500, 0.6);
    planets.fillCircle(390, 190, 65);
    planets.fillStyle(0xff8833, 0.15);
    planets.fillCircle(400, 200, 95);
    planets.lineStyle(4, 0xaa7700, 0.45);
    planets.beginPath();
    planets.arc(400, 200, 112, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false);
    planets.strokePath();
    // 左下：ブルー惑星
    planets.fillStyle(0x001040, 0.85);
    planets.fillCircle(130, 740, 100);
    planets.fillStyle(0x002260, 0.6);
    planets.fillCircle(120, 730, 80);
    planets.fillStyle(0x0044aa, 0.12);
    planets.fillCircle(130, 740, 115);

    // ---- 中央装飾リング ----
    this.add.circle(270, 500, 160, 0x010d1f, 0.95)
      .setStrokeStyle(3, 0x0066aa, 0.45);
    this.add.circle(270, 500, 120, 0x010d1f, 0.95)
      .setStrokeStyle(2, 0x004488, 0.35);

    // ---- タイトルロゴ ----
    this.add.text(270, 170, 'ORBITAL\nCADET', {
      fontFamily: 'Impact',
      fontSize: '90px',
      align: 'center',
      color: '#ff9900',
      stroke: '#3a1800',
      strokeThickness: 12,
      shadow: {
        offsetX: 0,
        offsetY: 6,
        color: '#cc5500',
        blur: 18,
        fill: true,
      },
    }).setOrigin(0.5).setAngle(-2);

    this.add.text(270, 314, 'SPACE PINBALL', {
      fontFamily: 'Impact',
      fontSize: '24px',
      color: '#66ccff',
      stroke: '#001a2a',
      strokeThickness: 4,
      letterSpacing: 3,
    }).setOrigin(0.5);

    this.add.text(270, 368, 'スペース・ピンボール', {
      fontFamily: 'Trebuchet MS',
      fontSize: '28px',
      color: '#aabbcc',
      stroke: '#001a2a',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(270, 466, `HI SCORE ${highScore.toString().padStart(6, '0')}`, {
      fontFamily: 'Courier New',
      fontSize: '26px',
      color: '#ff9900',
      stroke: '#3a1a00',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.rectangle(270, 618, 386, 168, 0x010d1f, 0.96).setStrokeStyle(3, 0x0066aa, 0.72);
    this.add.text(270, 618, 'LEFT / CENTER / RIGHT\nFLIPPER / PLUNGER / FLIPPER\n\n3 TARGETS TO LIGHT THE RAMP', {
      fontFamily: 'Trebuchet MS',
      fontSize: '22px',
      align: 'center',
      color: '#c8d8e8',
      lineSpacing: 8,
    }).setOrigin(0.5);

    const startButton = this.add.text(270, 798, 'START GAME', {
      fontFamily: 'Impact',
      fontSize: '52px',
      color: '#000810',
      backgroundColor: '#ff9900',
      padding: { left: 30, right: 30, top: 14, bottom: 14 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: startButton,
      scale: { from: 1, to: 1.05 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    startButton.on('pointerdown', () => {
      this.scene.start('game');
    });

    this.input.keyboard?.once('keydown-SPACE', () => {
      this.scene.start('game');
    });

    // ---- RIGHT PANEL ----
    this._buildTitleRightPanel(totalWidth);
  }

  _buildTitleRightPanel(totalWidth) {
    const highScore = this.registry.get('highScore') ?? 0;
    const px = TABLE_WIDTH;
    const pw = PANEL_WIDTH;
    const cx = px + pw / 2;

    const g = this.add.graphics();
    // Panel background
    g.fillStyle(0x000810, 1);
    g.fillRect(px, 0, pw, 960);
    // Separator
    g.lineStyle(4, 0x5a3a00, 1.0);
    g.beginPath(); g.moveTo(px, 0); g.lineTo(px, 960); g.strokePath();
    g.lineStyle(1.5, 0xc88800, 0.7);
    g.beginPath(); g.moveTo(px + 3, 0); g.lineTo(px + 3, 960); g.strokePath();

    // Space background
    g.fillStyle(0x020d20, 1);
    g.fillRect(px + 2, 0, pw - 2, 960);

    // Stars
    for (let i = 0; i < 50; i++) {
      const sx = px + 4 + ((i * 41 + 7) % (pw - 8));
      const sy = 8 + ((i * 79 + 3) % 944);
      const bright = 0.25 + (i % 6) * 0.08;
      const r = i % 9 === 0 ? 1.5 : 0.8;
      g.fillStyle(0xffffff, bright);
      g.fillCircle(sx, sy, r);
    }

    // Planet
    g.fillStyle(0x2a1200, 1);
    g.fillCircle(cx + 44, 110, 36);
    g.fillStyle(0x7a3500, 0.85);
    g.fillCircle(cx + 36, 100, 28);
    g.fillStyle(0xcc6000, 0.2);
    g.fillCircle(cx + 44, 110, 44);
    g.lineStyle(2, 0x886400, 0.5);
    g.beginPath();
    g.arc(cx + 44, 110, 50, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false);
    g.strokePath();

    // Spaceship
    g.fillStyle(0x7a8896, 0.5);
    g.fillEllipse(cx - 10, 280, 110, 52);
    g.fillStyle(0xbbc8d4, 0.6);
    g.fillEllipse(cx - 10, 274, 84, 36);
    g.lineStyle(2, 0x99aabb, 0.7);
    g.strokeEllipse(cx - 10, 280, 110, 52);
    g.fillStyle(0x2244aa, 0.8);
    g.fillCircle(cx - 10, 271, 18);
    g.fillStyle(0xff6600, 0.4);
    g.fillCircle(cx + 44, 283, 10);
    g.fillStyle(0xffaa00, 0.25);
    g.fillCircle(cx + 44, 283, 15);

    // "3D Pinball!" label
    this.add.text(cx, 36, '3D Pinball!', {
      fontFamily: 'Impact',
      fontSize: '18px',
      color: '#cc99ee',
      stroke: '#110022',
      strokeThickness: 3,
    }).setOrigin(0.5, 0);

    // "Space Cadet" label
    this.add.text(cx, 62, 'Space\nCadet', {
      fontFamily: 'Impact',
      fontSize: '40px',
      color: '#ffee88',
      stroke: '#3a2800',
      strokeThickness: 5,
      align: 'center',
      lineSpacing: 2,
    }).setOrigin(0.5, 0);

    // Separator
    g.fillStyle(0x3a2500, 1);
    g.fillRect(px + 2, 350, pw - 2, 4);

    // High score in panel
    this.add.text(cx, 368, 'HI SCORE', {
      fontFamily: 'Impact',
      fontSize: '16px',
      color: '#aabbcc',
      stroke: '#001a2a',
      strokeThickness: 3,
    }).setOrigin(0.5, 0);

    this.add.text(cx, 392, String(highScore).padStart(6, '0'), {
      fontFamily: 'Courier New',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#ffaa00',
      stroke: '#3a1a00',
      strokeThickness: 3,
    }).setOrigin(0.5, 0);
  }
}