import * as Phaser from 'phaser';

const MatterLib = Phaser.Physics.Matter.Matter;

export class PlungerSystem {
  constructor() {
    this.charge = 0;
    this.isCharging = false;
  }

  setCharging(active) {
    this.isCharging = active;
  }

  update(delta, ball, canLaunch) {
    if (!ball) {
      this.charge = 0;
      return;
    }

    if (this.isCharging && canLaunch) {
      this.charge = Math.min(1, this.charge + delta / 900);
      return;
    }

    if (!this.isCharging && !canLaunch) {
      this.charge = 0;
    }
  }

  release(ball, canLaunch) {
    if (!ball || !canLaunch) {
      this.charge = 0;
      return false;
    }

    const chargeRatio = this.charge;
    const midChargeAssist = 1 - Math.min(1, Math.abs(chargeRatio - 0.5) / 0.5);
    const launchVelocity = {
      x: -3.2 + (chargeRatio * 1.4) - (midChargeAssist * 1.2),
      y: -20 - (chargeRatio * 12) - (midChargeAssist * 4),
    };

    MatterLib.Body.setVelocity(ball, launchVelocity);
    MatterLib.Body.setAngularVelocity(ball, 0.12);
    this.charge = 0;
    return true;
  }
}