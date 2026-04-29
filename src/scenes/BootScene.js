import * as Phaser from 'phaser';
import { getHighScore } from '../storage/highScore.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    this.load.image('splash', 'splash.png');
  }

  create() {
    this.registry.set('highScore', getHighScore());

    const { width, height } = this.scale;

    // 黒背景
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000);

    // スプラッシュ画像を中央にフィット
    const img = this.add.image(width / 2, height / 2, 'splash');
    const scaleX = width / img.width;
    const scaleY = height / img.height;
    img.setScale(Math.min(scaleX, scaleY));
    img.setAlpha(0);

    // フェードイン → 2秒表示 → フェードアウト → title へ
    this.tweens.add({
      targets: img,
      alpha: 1,
      duration: 600,
      ease: 'Linear',
      onComplete: () => {
        this.time.delayedCall(2000, () => {
          this.tweens.add({
            targets: img,
            alpha: 0,
            duration: 500,
            ease: 'Linear',
            onComplete: () => {
              this.scene.start('title');
            },
          });
        });
      },
    });
  }
}
