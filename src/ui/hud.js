import { TABLE_WIDTH, PANEL_WIDTH } from '../config/gameConfig.js';

export class Hud {
  constructor(scene) {
    this.scene = scene;
    const PX = TABLE_WIDTH;       // 540 – panel left edge
    const PW = PANEL_WIDTH;       // 210 – panel width

    // "BALL" label (in metallic-gray row)
    this.ballLabel = scene.add.text(PX + 10, 302, 'BALL', {
      fontFamily: 'Impact',
      fontSize: '28px',
      color: '#1a1a1a',
    }).setOrigin(0, 0.5).setDepth(42);

    // Ball number (inside red-bordered box)
    this.ballNumText = scene.add.text(PX + PW - 33, 300, '1', {
      fontFamily: 'Impact',
      fontSize: '40px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5).setDepth(42);

    // Player number (amber box, left of score row)
    this.playerText = scene.add.text(PX + 33, 384, '1', {
      fontFamily: 'Impact',
      fontSize: '34px',
      color: '#ffffff',
    }).setOrigin(0.5, 0.5).setDepth(42);

    // Score digits (right side of score row)
    this.scoreText = scene.add.text(PX + PW / 2 + 38, 384, '000000', {
      fontFamily: 'Courier New',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffaa00',
    }).setOrigin(0.5, 0.5).setDepth(42);

    // Mission / status text
    this.missionText = scene.add.text(PX + 8, 434, '', {
      fontFamily: 'Impact',
      fontSize: '17px',
      color: '#66ccff',
      stroke: '#001220',
      strokeThickness: 3,
      wordWrap: { width: PW - 12 },
      lineSpacing: 4,
    }).setDepth(42);

    // Hint text at bottom of panel
    this.hintText = scene.add.text(PX + PW / 2, 912, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '11px',
      color: '#556677',
      align: 'center',
      wordWrap: { width: PW - 16 },
    }).setOrigin(0.5, 0.5).setDepth(42);
  }

  render({ score, lives, status, charge, readyToLaunch, launcherEnabled }) {
    const chargeLabel = readyToLaunch ? `\nLAUNCH ${Math.round(charge * 100)}%` : '';
    this.ballNumText.setText(String(lives));
    this.scoreText.setText(score.toString().padStart(6, '0'));
    this.missionText.setText(`${status}${chargeLabel}`);
    this.hintText.setText(launcherEnabled ? 'L / CTR / R\nFLIP/PLUNGE/FLIP' : 'LEFT / RIGHT\nFLIPPER');
  }
}