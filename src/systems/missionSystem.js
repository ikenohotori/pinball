export class MissionSystem {
  constructor() {
    this.score = 0;
    this.targetState = new Map([
      ['alpha', false],
      ['beta', false],
      ['gamma', false],
    ]);
    this.missionReady = false;
    this.lastEvent = 'LIGHT THE 3 STAR TARGETS';
  }

  addScore(value) {
    this.score += value;
    return this.score;
  }

  onBumperHit() {
    this.lastEvent = 'BUMPER BOOST';
    return this.addScore(125);
  }

  onTargetHit(targetId) {
    const wasLit = this.targetState.get(targetId);
    this.targetState.set(targetId, true);
    this.lastEvent = wasLit ? 'TARGET LOOP' : 'TARGET LIT';
    const bonus = wasLit ? 150 : 500;

    if ([...this.targetState.values()].every(Boolean)) {
      this.missionReady = true;
      this.lastEvent = 'MISSION READY - SHOOT RAMP';
    }

    return this.addScore(bonus);
  }

  onRampShot() {
    if (this.missionReady) {
      this.resetTargets();
      this.missionReady = false;
      this.lastEvent = 'MISSION COMPLETE';
      return this.addScore(5000);
    }

    this.lastEvent = 'ORBIT SHOT';
    return this.addScore(850);
  }

  resetTargets() {
    for (const key of this.targetState.keys()) {
      this.targetState.set(key, false);
    }
  }

  getTargetState() {
    return Object.fromEntries(this.targetState.entries());
  }

  getStatusText() {
    if (this.missionReady) {
      return 'MISSION READY';
    }

    const litCount = [...this.targetState.values()].filter(Boolean).length;
    return `TARGETS ${litCount}/3`;
  }
}