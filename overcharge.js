// === OVERCHARGE.JS ===
// Responsabilidade: estado e transições do sistema Overcharge.
// Não sabe nada de input, render ou UI.

export const OVERCHARGE_DURATION = 6.0;
export const OVERCHARGE_COOLDOWN = 5.0;
export const OVERCHARGE_KILL_GAIN = 1.8;
export const OVERCHARGE_SPEED_MULTIPLIER = 1.8;
export const OVERCHARGE_READY_SLOWMO_DURATION = 2000;

export function createOverchargeRuntime() {
    return {
        isReady: false,
        readyStart: 0,
    };
}

export function addOverchargePoints(player, runtime, amount, now = performance.now()) {
    if (player.overchargeState !== 'idle') return false;

    player.overchargeBar = Math.min(player.overchargeMax, player.overchargeBar + amount);
    if (player.overchargeBar >= player.overchargeMax) {
        player.overchargeBar = player.overchargeMax;
        player.overchargeState = 'ready';
        runtime.isReady = true;
        runtime.readyStart = now;
        return true;
    }

    return false;
}

export function addOverchargeKill(player, runtime, now = performance.now()) {
    return addOverchargePoints(player, runtime, OVERCHARGE_KILL_GAIN, now);
}

export function tryActivateOvercharge(player, runtime) {
    if (player.overchargeState !== 'ready') return false;

    player.overchargeState          = 'active';
    player.overchargePrevMultiplier = player.comboMultiplier;
    player.overchargeTotalDuration   = OVERCHARGE_DURATION * player.comboMultiplier;
    player.overchargeTimer          = player.overchargeTotalDuration;
    runtime.isReady                 = false;
    player.comboMultiplier          = 5.0;
    player.invulnerableTimer        = 9999;
    if (player.isFlying) player.isFlying = false;
    return true;
}

export function updateOvercharge(player, runtime, dt, now = performance.now()) {
    const sec = dt / 60;
    const events = {
        readySlowMoActive: runtime.isReady,
        becameCooldownReady: false,
        endedActive: false,
    };

    if (player.overchargeState === 'active') {
        player.overchargeTimer -= sec;

        const drainRate = player.overchargeMax / player.overchargeTotalDuration;
        player.overchargeBar = Math.max(0, player.overchargeBar - drainRate * sec);

        if (player.overchargeTimer <= 0) {
            player.overchargeState       = 'cooldown';
            player.overchargeTimer       = OVERCHARGE_COOLDOWN;
            player.overchargeBar         = 0;
            player.comboMultiplier       = player.overchargePrevMultiplier;
            player.invulnerableTimer     = 90;
            player.isOverchargeRecovering = true;
            player.fuel                  = player.maxFuel;
            player.isFlying              = false;
            player.vy                    = player.doubleJumpForce;
            player.isGrounded            = false;
            runtime.isReady              = true;
            runtime.readyStart           = now;
            events.readySlowMoActive     = true;
            events.becameCooldownReady   = true;
            events.endedActive           = true;
        }
    } else if (player.overchargeState === 'cooldown') {
        player.overchargeTimer -= sec;
        if (player.overchargeTimer <= 0) {
            player.overchargeState = 'idle';
            player.overchargeTimer = 0;
        }
    }

    if (runtime.isReady) {
        const elapsed = now - runtime.readyStart;
        if (elapsed >= OVERCHARGE_READY_SLOWMO_DURATION) {
            runtime.isReady = false;
            events.readySlowMoActive = false;
        }
    }

    return events;
}
