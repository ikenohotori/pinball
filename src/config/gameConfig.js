import * as Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene.js';
import { TitleScene } from '../scenes/TitleScene.js';
import { GameScene } from '../scenes/GameScene.js';
import { GameOverScene } from '../scenes/GameOverScene.js';

export const TABLE_WIDTH = 540;
export const TABLE_HEIGHT = 960;
export const PANEL_WIDTH = 210;
export const TOTAL_WIDTH = TABLE_WIDTH + PANEL_WIDTH;

export const gameConfig = {
  type: Phaser.AUTO,
  width: TOTAL_WIDTH,
  height: TABLE_HEIGHT,
  backgroundColor: '#04061a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: TOTAL_WIDTH,
    height: TABLE_HEIGHT,
  },
  render: {
    antialias: true,
    pixelArt: false,
  },
  physics: {
    default: 'matter',
    matter: {
      gravity: { y: 0.92 },
      enableSleep: false,
      positionIterations: 10,
      velocityIterations: 8,
    },
  },
  scene: [BootScene, TitleScene, GameScene, GameOverScene],
};