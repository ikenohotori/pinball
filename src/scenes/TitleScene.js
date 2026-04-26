import * as Phaser from 'phaser';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create() {
    const highScore = this.registry.get('highScore') ?? 0;

    // ---- 背景 ----
    this.add.rectangle(270, 480, 540, 960, 0x050010);
    this.add.rectangle(270, 480, 498, 920, 0x0d0025);
    this.add.rectangle(270, 480, 486, 908, 0x080018);

    // ---- ネオンパープルグロー枠 ----
    const border = this.add.graphics();
    border.lineStyle(3, 0xd040ff, 0.92);
    border.strokeRoundedRect(34, 24, 472, 60, 12);
    border.lineStyle(2, 0xd040ff, 0.45);
    border.strokeRoundedRect(46, 88, 448, 824, 20);

    // ---- 上部タイトルバー ----
    this.add.rectangle(270, 54, 472, 60, 0x0a0018, 0.96)
      .setStrokeStyle(3, 0xd040ff);

    // ---- スターフィールド ----
    const starfield = this.add.graphics();
    for (let index = 0; index < 80; index += 1) {
      const x = 44 + ((index * 37) % 452);
      const y = 120 + ((index * 83) % 760);
      const radius = index % 9 === 0 ? 2 : 1;
      const alpha = 0.4 + (index % 5) * 0.12;
      starfield.fillStyle(0xffffff, alpha);
      starfield.fillCircle(x, y, radius);
    }

    // ---- 惑星風グロー ----
    this.add.circle(390, 220, 100, 0xff00cc, 0.12);
    this.add.circle(140, 720, 130, 0x00e5ff, 0.10);
    this.add.circle(270, 480, 180, 0x1a003a, 0.88).setStrokeStyle(3, 0xd040ff, 0.55);
    this.add.circle(270, 480, 140, 0x12002a, 0.92).setStrokeStyle(2, 0x00e5ff, 0.45);

    // ---- タイトルロゴ ----
    this.add.text(270, 170, 'ORBITAL\nCADET', {
      fontFamily: 'Impact',
      fontSize: '90px',
      align: 'center',
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
    }).setOrigin(0.5).setAngle(-2);

    this.add.text(270, 314, 'NEON SPACE PINBALL', {
      fontFamily: 'Impact',
      fontSize: '24px',
      color: '#00e5ff',
      stroke: '#001a2a',
      strokeThickness: 4,
      letterSpacing: 3,
    }).setOrigin(0.5);

    this.add.text(270, 368, 'スペース・ピンボール', {
      fontFamily: 'Trebuchet MS',
      fontSize: '28px',
      color: '#d040ff',
      stroke: '#1a003a',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(270, 466, `HI SCORE ${highScore.toString().padStart(6, '0')}`, {
      fontFamily: 'Courier New',
      fontSize: '26px',
      color: '#ffea00',
      stroke: '#3a2000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.rectangle(270, 618, 386, 168, 0x12002a, 0.96).setStrokeStyle(3, 0x00e5ff, 0.72);
    this.add.text(270, 618, 'LEFT / CENTER / RIGHT\nFLIPPER / PLUNGER / FLIPPER\n\n3 TARGETS TO LIGHT THE RAMP', {
      fontFamily: 'Trebuchet MS',
      fontSize: '22px',
      align: 'center',
      color: '#e0e0ff',
      lineSpacing: 8,
    }).setOrigin(0.5);

    const startButton = this.add.text(270, 798, 'START GAME', {
      fontFamily: 'Impact',
      fontSize: '52px',
      color: '#0a0018',
      backgroundColor: '#ff40ff',
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
  }
}