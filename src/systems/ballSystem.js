import * as Phaser from 'phaser';

const MatterLib = Phaser.Physics.Matter.Matter;

export class BallSystem {
  constructor(scene, spawnPoint) {
    this.scene = scene;
    this.spawnPoint = spawnPoint;
    this.ball = null;
    this.radius = 12;
    this.releaseUntil = 0;
    this.lastLaunchAt = -Infinity;
    this.orbitalGuideUsed = false;
    this.launcherEnabled = true;
  }

  spawn() {
    if (this.ball) {
      this.scene.matter.world.remove(this.ball);
    }

    this.ball = MatterLib.Bodies.circle(this.spawnPoint.x, this.spawnPoint.y, this.radius, {
      label: 'ball',
      restitution: 0.82,
      friction: 0.004,
      frictionAir: 0.0022,
      density: 0.0026,
      slop: 0.01,
    });

    MatterLib.Body.setVelocity(this.ball, { x: 0, y: 0 });
    MatterLib.Body.setAngularVelocity(this.ball, 0);
    this.releaseUntil = 0;
    this.lastLaunchAt = -Infinity;
    this.orbitalGuideUsed = false;
    this.launcherEnabled = true;
    this.scene.matter.world.add(this.ball);
    return this.ball;
  }

  getBall() {
    return this.ball;
  }

  clampSpeed(maxSpeed) {
    if (!this.ball) {
      return;
    }

    const { x, y } = this.ball.velocity;
    const speed = Math.hypot(x, y);

    if (speed > maxSpeed) {
      const scale = maxSpeed / speed;
      MatterLib.Body.setVelocity(this.ball, { x: x * scale, y: y * scale });
    }
  }

  isReadyToLaunch() {
    if (!this.ball || !this.launcherEnabled) {
      return false;
    }

    if (this.scene.time.now < this.releaseUntil) {
      return false;
    }

    return this.ball.position.x > 442 && this.ball.position.y > 680 && Math.abs(this.ball.velocity.y) < 1.5;
  }

  markLaunched(duration = 900) {
    this.lastLaunchAt = this.scene.time.now;
    this.releaseUntil = this.scene.time.now + duration;
    this.launcherEnabled = false;
  }

  canUseLauncher() {
    return this.launcherEnabled;
  }

  wasRecentlyLaunched(windowMs = 1500) {
    return (this.scene.time.now - this.lastLaunchAt) <= windowMs;
  }

  canUseOrbitalGuide() {
    return !this.orbitalGuideUsed;
  }

  markOrbitalGuideUsed() {
    this.orbitalGuideUsed = true;
  }

  holdInLauncher() {
    if (!this.isReadyToLaunch()) {
      return false;
    }

    MatterLib.Body.setPosition(this.ball, {
      x: this.spawnPoint.x,
      y: this.spawnPoint.y,
    });
    MatterLib.Body.setVelocity(this.ball, { x: 0, y: 0 });
    MatterLib.Body.setAngularVelocity(this.ball, 0);
    return true;
  }

  nudgeFrom(point, force = 0.025) {
    if (!this.ball) {
      return;
    }

    const offsetX = this.ball.position.x - point.x;
    const offsetY = this.ball.position.y - point.y;
    const distance = Math.max(1, Math.hypot(offsetX, offsetY));

    MatterLib.Body.applyForce(this.ball, this.ball.position, {
      x: (offsetX / distance) * force,
      y: (offsetY / distance) * force,
    });
  }

  /**
   * 発射後にボールが摩擦で停止しないよう最低速度を保証する。
   * ランチャー待機中（launcherEnabled=true）は適用しない。
   */
  ensureMinSpeed(minSpeed = 2.0) {
    if (!this.ball || this.launcherEnabled) {
      return;
    }

    const { x, y } = this.ball.velocity;
    const speed = Math.hypot(x, y);

    if (speed < minSpeed) {
      if (speed > 0.01) {
        // 向きを保ったまま最低速度までスケールアップ
        const scale = minSpeed / speed;
        MatterLib.Body.setVelocity(this.ball, { x: x * scale, y: y * scale });
      } else {
        // 完全停止時は重力方向（下）へキック
        MatterLib.Body.setVelocity(this.ball, { x: 0, y: minSpeed });
      }
    }
  }

  /** テスト用: ボール速度を直接セット */
  setVelocity(vx, vy) {
    if (!this.ball) {
      return;
    }

    MatterLib.Body.setVelocity(this.ball, { x: vx, y: vy });
  }
}