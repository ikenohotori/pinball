import * as Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('game-over');
  }

  create(data) {
    // ---- 背景 ----
    this.add.rectangle(270, 480, 540, 960, 0x050010);
    this.add.rectangle(270, 480, 498, 920, 0x0d0025);
    this.add.rectangle(270, 480, 486, 908, 0x080018);
    this.add.rectangle(270, 54, 472, 60, 0x0a0018, 0.96).setStrokeStyle(3, 0xd040ff);

    // ---- グロー ----
    this.add.circle(270, 220, 170, 0xff00cc, 0.12);

    // ---- GAME OVER タイトル ----
    this.add.text(270, 160, 'GAME OVER', {
      fontFamily: 'Impact',
      fontSize: '72px',
      color: '#ff40ff',
      stroke: '#1a003a',
      strokeThickness: 12,
      shadow: {
        offsetX: 0,
        offsetY: 6,
        color: '#ff00cc',
        blur: 18,
        fill: true,
      },
    }).setOrigin(0.5);

    this.add.text(270, 330, `SCORE ${String(data.score ?? 0).padStart(6, '0')}`, {
      fontFamily: 'Courier New',
      fontSize: '34px',
      color: '#ffea00',
      stroke: '#3a2000',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(270, 386, `HI SCORE ${String(data.highScore ?? 0).padStart(6, '0')}`, {
      fontFamily: 'Trebuchet MS',
      fontSize: '24px',
      color: '#00e5ff',
      stroke: '#001a2a',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.rectangle(270, 500, 388, 120, 0x12002a, 0.96).setStrokeStyle(3, 0x00e5ff, 0.72);
    this.add.text(270, 486, data.message ?? 'Drain the lane and try again.', {
      fontFamily: 'Trebuchet MS',
      fontSize: '22px',
      color: '#e0e0ff',
      wordWrap: { width: 380 },
      align: 'center',
    }).setOrigin(0.5);

    const retry = this.add.text(270, 648, 'RETRY', {
      fontFamily: 'Impact',
      fontSize: '48px',
      color: '#0a0018',
      backgroundColor: '#ff40ff',
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
      color: '#00e5ff',
      backgroundColor: '#12002a',
      padding: { left: 30, right: 30, top: 12, bottom: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    retry.on('pointerdown', () => this.scene.start('game'));
    title.on('pointerdown', () => this.scene.start('title'));
  }
}