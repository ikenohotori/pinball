import * as Phaser from 'phaser';

const MatterLib = Phaser.Physics.Matter.Matter;

function addRectangle(scene, x, y, width, height, options = {}) {
  const body = MatterLib.Bodies.rectangle(x, y, width, height, {
    isStatic: true,
    angle: options.angle ?? 0,
    label: options.label ?? 'wall',
    isSensor: options.isSensor ?? false,
    chamfer: options.chamfer,
  });

  if (options.plugin) {
    body.plugin = options.plugin;
  }

  scene.matter.world.add(body);
  return body;
}

function addCircle(scene, x, y, radius, options = {}) {
  const body = MatterLib.Bodies.circle(x, y, radius, {
    isStatic: true,
    label: options.label ?? 'bumper',
    isSensor: options.isSensor ?? false,
    restitution: options.restitution ?? 1.02,
  });

  if (options.plugin) {
    body.plugin = options.plugin;
  }

  scene.matter.world.add(body);
  return body;
}

export function buildTable(scene) {
  const walls = [
    addRectangle(scene, 270, 50, 394, 18, { label: 'wall' }),
    addRectangle(scene, 72, 430, 18, 760, { label: 'wall' }),
    addRectangle(scene, 508, 480, 16, 870, { label: 'wall' }),
    addRectangle(scene, 430, 586, 14, 612, { label: 'wall' }),
    addRectangle(scene, 164, 188, 150, 16, { label: 'wall', angle: -0.62 }),
    addRectangle(scene, 340, 184, 150, 16, { label: 'wall', angle: 0.62 }),
    addRectangle(scene, 164, 332, 120, 14, { label: 'wall', angle: 0.68 }),
    addRectangle(scene, 370, 330, 128, 14, { label: 'wall', angle: -0.68 }),
    addRectangle(scene, 412, 274, 86, 14, { label: 'wall', angle: -0.64 }),
    addRectangle(scene, 398, 154, 108, 12, { label: 'wall', angle: -0.92 }),
    addRectangle(scene, 378, 238, 118, 12, { label: 'wall', angle: -0.82 }),
    addRectangle(scene, 144, 700, 118, 12, { label: 'wall', angle: -1.02 }),
    addRectangle(scene, 394, 698, 118, 12, { label: 'wall', angle: 1.02 }),
    addRectangle(scene, 196, 786, 126, 12, { label: 'wall', angle: 0.88 }),
    addRectangle(scene, 344, 786, 126, 12, { label: 'wall', angle: -0.88 }),
    addRectangle(scene, 238, 904, 60, 12, { label: 'wall', angle: 0.28 }),
    addRectangle(scene, 302, 904, 60, 12, { label: 'wall', angle: -0.28 }),
    addCircle(scene, 270, 878, 14, { label: 'wall' }),
    addCircle(scene, 226, 868, 12, { label: 'wall' }),
    addCircle(scene, 314, 868, 12, { label: 'wall' }),
    addRectangle(scene, 114, 735, 104, 14, { label: 'wall', angle: -0.92 }),
    addRectangle(scene, 424, 735, 104, 14, { label: 'wall', angle: 0.92 }),
    addRectangle(scene, 146, 890, 148, 16, { label: 'wall', angle: 0.58 }),
    addRectangle(scene, 394, 890, 148, 16, { label: 'wall', angle: -0.58 }),
    addRectangle(scene, 456, 120, 16, 190, { label: 'wall', angle: -0.1 }),
  ];

  const bumpers = [
    addCircle(scene, 208, 244, 28, { label: 'bumper', restitution: 1.08, plugin: { bumperId: 'nova' } }),
    addCircle(scene, 318, 244, 28, { label: 'bumper', restitution: 1.08, plugin: { bumperId: 'quasar' } }),
    addCircle(scene, 262, 332, 30, { label: 'bumper', restitution: 1.08, plugin: { bumperId: 'pulse' } }),
    addCircle(scene, 184, 548, 24, { label: 'bumper', restitution: 1.06, plugin: { bumperId: 'drift-left' } }),
    addCircle(scene, 340, 548, 24, { label: 'bumper', restitution: 1.06, plugin: { bumperId: 'drift-right' } }),
    addCircle(scene, 262, 626, 26, { label: 'bumper', restitution: 1.07, plugin: { bumperId: 'orbit-core' } }),
  ];

  const targets = [
    addRectangle(scene, 128, 254, 16, 62, { label: 'target', isSensor: true, plugin: { targetId: 'alpha' } }),
    addRectangle(scene, 128, 340, 16, 62, { label: 'target', isSensor: true, plugin: { targetId: 'beta' } }),
    addRectangle(scene, 128, 426, 16, 62, { label: 'target', isSensor: true, plugin: { targetId: 'gamma' } }),
  ];

  const rampSensor = addRectangle(scene, 387, 220, 90, 26, {
    label: 'ramp',
    isSensor: true,
    angle: -0.58,
  });

  const savers = [
    addRectangle(scene, 104, 842, 56, 92, {
      label: 'saver',
      isSensor: true,
      angle: -0.18,
      plugin: { saverId: 'left' },
    }),
    addRectangle(scene, 436, 842, 56, 92, {
      label: 'saver',
      isSensor: true,
      angle: 0.18,
      plugin: { saverId: 'right' },
    }),
    addRectangle(scene, 270, 874, 186, 42, {
      label: 'drain',
      isSensor: true,
    }),
  ];

  const drain = addRectangle(scene, 270, 938, 74, 14, {
    label: 'drain',
    isSensor: true,
  });

  const outlaneDrains = [
    addRectangle(scene, 84, 950, 92, 20, {
      label: 'drain',
      isSensor: true,
    }),
    addRectangle(scene, 456, 950, 92, 20, {
      label: 'drain',
      isSensor: true,
    }),
  ];

  const spawnPoint = { x: 468, y: 826 };

  return {
    walls,
    bumpers,
    targets,
    rampSensor,
    savers,
    drain,
    outlaneDrains,
    spawnPoint,
  };
}