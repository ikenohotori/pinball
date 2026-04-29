export class Hud {
  constructor(scene) {
    this.scene = scene;
    this.topPanel = scene.add.rectangle(270, 54, 472, 60, 0x000000, 0.98)
      .setStrokeStyle(2, 0xa06800, 0.9)
      .setDepth(38);
    this.scoreText = scene.add.text(28, 24, '', {
      fontFamily: 'Courier New',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ff9900',
      stroke: '#3a1a00',
      strokeThickness: 3,
    }).setDepth(40);

    this.statusText = scene.add.text(28, 62, '', {
      fontFamily: 'Impact',
      fontSize: '15px',
      color: '#66ccff',
      stroke: '#001a2a',
      strokeThickness: 3,
    }).setDepth(40);

    this.hintText = scene.add.text(270, 922, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '14px',
      color: '#aabbcc',
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