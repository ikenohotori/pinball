import * as Phaser from 'phaser';
import { getHighScore } from '../storage/highScore.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create() {
    this.registry.set('highScore', getHighScore());
    this.scene.start('title');
  }
}