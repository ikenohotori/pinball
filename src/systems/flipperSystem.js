import * as Phaser from 'phaser';

const MatterLib = Phaser.Physics.Matter.Matter;

function moveToward(current, target, step) {
  if (Math.abs(target - current) <= step) {
    return target;
  }

  return current + Math.sign(target - current) * step;
}

export class FlipperSystem {
  constructor(scene) {
    this.scene = scene;
    this.length = 92;
    this.width = 18;
    this.state = {
      left: this.createFlipper('left', { x: 176, y: 840 }, -0.38, -1.04),
      right: this.createFlipper('right', { x: 364, y: 840 }, 3.52, 4.18),
    };
  }

  createFlipper(side, pivot, restAngle, activeAngle) {
    const center = this.getCenter(pivot, restAngle);
    const body = MatterLib.Bodies.rectangle(center.x, center.y, this.length, this.width, {
      isStatic: true,
      label: `flipper-${side}`,
      chamfer: { radius: 8 },
    });

    MatterLib.Body.setAngle(body, restAngle);
    this.scene.matter.world.add(body);

    return {
      side,
      body,
      pivot,
      active: false,
      restAngle,
      activeAngle,
      currentAngle: restAngle,
    };
  }

  getCenter(pivot, angle) {
    const offset = (this.length * 0.5) - 8;
    return {
      x: pivot.x + Math.cos(angle) * offset,
      y: pivot.y + Math.sin(angle) * offset,
    };
  }

  setActive(side, active) {
    const flipper = this.state[side];

    if (!flipper) {
      return false;
    }

    const changed = flipper.active !== active;
    flipper.active = active;
    return changed;
  }

  update(delta, ball) {
    const angleStep = (delta / 1000) * 6.5;

    for (const flipper of Object.values(this.state)) {
      const targetAngle = flipper.active ? flipper.activeAngle : flipper.restAngle;
      flipper.currentAngle = moveToward(flipper.currentAngle, targetAngle, angleStep);

      const center = this.getCenter(flipper.pivot, flipper.currentAngle);
      MatterLib.Body.setPosition(flipper.body, center);
      MatterLib.Body.setAngle(flipper.body, flipper.currentAngle);

      if (flipper.active && ball) {
        const dx = ball.position.x - flipper.pivot.x;
        const dy = ball.position.y - flipper.pivot.y;
        const distance = Math.hypot(dx, dy);
        const insideArc = distance < 112 && distance > 18;
        const sideGate = flipper.side === 'left' ? ball.position.x < 300 : ball.position.x > 240;
        const descending = ball.velocity.y > -1.5;

        if (insideArc && sideGate && descending && ball.position.y > 690) {
          const reach = Phaser.Math.Clamp((distance - 22) / 74, 0, 1);
          const lift = 0.0088 + (reach * 0.0042);
          const xForce = (flipper.side === 'left' ? 0.0038 : -0.0038) + (reach * (flipper.side === 'left' ? 0.0016 : -0.0016));
          MatterLib.Body.applyForce(ball, ball.position, { x: xForce, y: -lift });
        }
      }
    }
  }

  getBodies() {
    return Object.values(this.state);
  }
}