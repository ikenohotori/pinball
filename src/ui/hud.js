export class Hud {
  constructor(scene) {
    this.scene = scene;
    this.topPanel = scene.add.rectangle(270, 54, 472, 60, 0x0a0018, 0.96)
      .setStrokeStyle(2, 0xd040ff, 0.9)
      .setDepth(38);
    this.scoreText = scene.add.text(28, 24, '', {
      fontFamily: 'Courier New',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffea00',
      stroke: '#3a2000',
      strokeThickness: 3,
    }).setDepth(40);

    this.statusText = scene.add.text(28, 62, '', {
      fontFamily: 'Impact',
      fontSize: '15px',
      color: '#ff40ff',
      stroke: '#1a003a',
      strokeThickness: 3,
    }).setDepth(40);

    this.hintText = scene.add.text(270, 922, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '14px',
      color: '#c0c0ff',
      align: 'center',
    }).setOrigin(0.5, 0.5).setDepth(40);
  }

  render({ score, lives, highScore, status, charge, readyToLaunch, launcherEnabled }) {
    const chargeLabel = readyToLaunch ? ` LAUNCH ${Math.round(charge * 100)}%` : '';
    this.scoreText.setText(`SCORE ${score.toString().padStart(6, '0')}  BALL ${lives}  HI ${highScore.toString().padStart(6, '0')}`);
    this.statusText.setText(`${status}${chargeLabel}`);
    this.hintText.setText(launcherEnabled ? 'LEFT FLIPPER   PLUNGER   RIGHT FLIPPER' : 'LEFT FLIPPER               RIGHT FLIPPER');
  }
}