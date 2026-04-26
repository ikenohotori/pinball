import * as Phaser from 'phaser';
import './style.css';
import { gameConfig } from './config/gameConfig.js';

document.querySelector('#app').innerHTML = '<div id="game-shell" aria-label="Orbital Cadet Pinball"></div>';

const game = new Phaser.Game({
  ...gameConfig,
  parent: 'game-shell',
});

if (import.meta.env.DEV) {
  window.__pinballGame = game;
}
