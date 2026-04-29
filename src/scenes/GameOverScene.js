import * as Phaser from 'phaser';
import { TABLE_WIDTH, PANEL_WIDTH } from '../config/gameConfig.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('game-over');
  }

  create(data) {
    const totalWidth = TABLE_WIDTH + PANEL_WIDTH;

    // ---- 宇宙背景 ----
    this.add.rectangle(totalWidth / 2, 480, totalWidth, 960, 0x000810);

    // 外枠（アンバー/ブロンズ金属フレーム）
    const frame = this.add.graphics();
    frame.lineStyle(6, 0x8b5200, 1.0);
    frame.strokeRoundedRect(20, 14, 500, 930, 22);
    frame.lineStyle(3, 0xd4880a, 0.7);
    frame.strokeRoundedRect(25, 19, 490, 920, 20);

    this.add.rectangle(270, 54, 472, 60, 0x000000, 0.98).setStrokeStyle(2, 0xa06800);

    // ---- 星フィールド ----
    const starfield = this.add.graphics();
    for (let index = 0; index < 80; index += 1) {
      const x = 36 + ((index * 37 + 13) % 466);
      const y = 88 + ((index * 83 + 7) % 832);
      const radius = index % 9 === 0 ? 2 : 1;
      const alpha = 0.4 + (index % 5) * 0.12;
      starfield.fillStyle(0xffffff, alpha);
      starfield.fillCircle(x, y, radius);
    }

    // ---- グロー（オレンジ/アンバー） ----
    this.add.circle(270, 220, 170, 0xcc5500, 0.1);

    // ---- GAME OVER タイトル ----
    this.add.text(270, 160, 'GAME OVER', {
      fontFamily: 'Impact',
      fontSize: '72px',
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
    }).setOrigin(0.5);

    this.add.text(270, 330, `SCORE ${String(data.score ?? 0).padStart(6, '0')}`, {
      fontFamily: 'Courier New',
      fontSize: '34px',
      color: '#ff9900',
      stroke: '#3a1a00',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(270, 386, `HI SCORE ${String(data.highScore ?? 0).padStart(6, '0')}`, {
      fontFamily: 'Trebuchet MS',
      fontSize: '24px',
      color: '#66ccff',
      stroke: '#001a2a',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.rectangle(270, 500, 388, 120, 0x010d1f, 0.96).setStrokeStyle(3, 0x0066aa, 0.72);
    this.add.text(270, 486, data.message ?? 'Drain the lane and try again.', {
      fontFamily: 'Trebuchet MS',
      fontSize: '22px',
      color: '#c8d8e8',
      wordWrap: { width: 380 },
      align: 'center',
    }).setOrigin(0.5);

    const retry = this.add.text(270, 648, 'RETRY', {
      fontFamily: 'Impact',
      fontSize: '48px',
      color: '#000810',
      backgroundColor: '#ff9900',
      padding: { left: 34, right: 34, top: 12, bottom: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: retry,
      scale: { from: 1, to: 1.04 },
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    const title = this.add.text(270, 742, 'TITLE', {
      fontFamily: 'Impact',
      fontSize: '40px',
      color: '#66ccff',
      backgroundColor: '#010d1f',
      padding: { left: 30, right: 30, top: 12, bottom: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    retry.on('pointerdown', () => this.scene.start('game'));
    title.on('pointerdown', () => this.scene.start('title'));

    // ---- RIGHT PANEL ----
    const px = TABLE_WIDTH;
    const pw = PANEL_WIDTH;
    const cx = px + pw / 2;

    const g = this.add.graphics();
    g.fillStyle(0x000810, 1);
    g.fillRect(px, 0, pw, 960);
    g.lineStyle(4, 0x5a3a00, 1.0);
    g.beginPath(); g.moveTo(px, 0); g.lineTo(px, 960); g.strokePath();
    g.lineStyle(1.5, 0xc88800, 0.7);
    g.beginPath(); g.moveTo(px + 3, 0); g.lineTo(px + 3, 960); g.strokePath();

    g.fillStyle(0x020d20, 1);
    g.fillRect(px + 2, 0, pw - 2, 960);

    for (let i = 0; i < 40; i++) {
      const sx = px + 4 + ((i * 43 + 11) % (pw - 8));
      const sy = 8 + ((i * 83 + 5) % 944);
      g.fillStyle(0xffffff, 0.25 + (i % 5) * 0.08);
      g.fillCircle(sx, sy, i % 7 === 0 ? 1.5 : 0.8);
    }

    this.add.text(cx, 80, '3D Pinball!', {
      fontFamily: 'Impact',
      fontSize: '18px',
      color: '#cc99ee',
      stroke: '#110022',
      strokeThickness: 3,
    }).setOrigin(0.5, 0);

    this.add.text(cx, 108, 'Space\nCadet', {
      fontFamily: 'Impact',
      fontSize: '40px',
      color: '#ffee88',
      stroke: '#3a2800',
      strokeThickness: 5,
      align: 'center',
      lineSpacing: 2,
    }).setOrigin(0.5, 0);

    this.add.text(cx, 280, String(data.score ?? 0).padStart(6, '0'), {
      fontFamily: 'Courier New',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffaa00',
    }).setOrigin(0.5, 0);

    this.add.text(cx, 318, 'HI SCORE', {
      fontFamily: 'Impact',
      fontSize: '14px',
      color: '#aabbcc',
    }).setOrigin(0.5, 0);

    this.add.text(cx, 340, String(data.highScore ?? 0).padStart(6, '0'), {
      fontFamily: 'Courier New',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#66ccff',
    }).setOrigin(0.5, 0);
  }
}