import * as Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('game-over');
  }

  create(data) {
    // ---- 宇宙背景 ----
    this.add.rectangle(270, 480, 540, 960, 0x000810);

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
  }
}