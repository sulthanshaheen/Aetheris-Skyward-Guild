/**
 * Rock-Solid Multi-Touch Mobile Controls (iOS Safari / iPhone & Android safe!)
 * Uses native Touch Events on touch devices with strict window-level release failsafes
 * so a lifted thumb NEVER leaves the joystick stuck walking!
 */

export function isMobileDevice() {
  return (
    (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
    navigator.maxTouchPoints > 0 ||
    window.innerWidth <= 900
  );
}

export class MobileControls {
  constructor(controller) {
    this.controller = controller;
    this.root = document.getElementById('mobile-controls');
    this.joyZone = document.getElementById('mobile-joystick');
    this.joyKnob = document.getElementById('mobile-joystick-knob');
    this.btnJump = document.getElementById('btn-mobile-jump');
    this.btnSprint = document.getElementById('btn-mobile-sprint');

    this.joyTouchId = null;
    this.joyPointerId = null;
    this.joyCenter = { x: 0, y: 0 };
    this.joyMaxRadius = 44;
    this.sprintLocked = false;
    this.enabled = false;

    this._bindEvents();
  }

  show() {
    if (!this.root) return;
    if (isMobileDevice()) {
      this.enabled = true;
      this.root.classList.remove('hidden');
      this.resetJoystick();
    }
  }

  hide() {
    if (!this.root) return;
    this.enabled = false;
    this.root.classList.add('hidden');
    this.resetJoystick();
  }

  resetJoystick() {
    this.joyTouchId = null;
    this.joyPointerId = null;
    if (this.joyKnob) {
      this.joyKnob.style.transform = 'translate(0px, 0px)';
    }
    this.controller.setVirtualInput(0, 0, this.sprintLocked);
  }

  _bindEvents() {
    if (!this.joyZone || !this.btnJump || !this.btnSprint) return;

    const startCenter = () => {
      const rect = this.joyZone.getBoundingClientRect();
      this.joyCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    };

    // ================= NATIVE TOUCH EVENTS (Primary for iPhone / Android) =================
    this.joyZone.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.joyTouchId !== null) return;
        const touch = e.changedTouches[0];
        if (!touch) return;
        this.joyTouchId = touch.identifier;
        startCenter();
        this._updateJoystick(touch.clientX, touch.clientY);
      },
      { passive: false }
    );

    window.addEventListener(
      'touchmove',
      (e) => {
        if (this.joyTouchId === null) return;
        for (let i = 0; i < e.touches.length; i++) {
          const t = e.touches[i];
          if (t.identifier === this.joyTouchId) {
            e.preventDefault();
            this._updateJoystick(t.clientX, t.clientY);
            return;
          }
        }
        // Failsafe: tracked finger no longer present in active touches!
        this.resetJoystick();
      },
      { passive: false }
    );

    const verifyTouchStillDown = (e) => {
      if (this.joyTouchId === null) return;
      if (!e.touches || e.touches.length === 0) {
        this.resetJoystick();
        return;
      }
      let stillActive = false;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === this.joyTouchId) {
          stillActive = true;
          break;
        }
      }
      if (!stillActive) {
        this.resetJoystick();
      }
    };

    window.addEventListener('touchend', verifyTouchStillDown, { passive: true });
    window.addEventListener('touchcancel', verifyTouchStillDown, { passive: true });

    // ================= MOUSE / POINTER FALLBACK (Desktop emulation) =================
    this.joyZone.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return; // Handled cleanly by native touch events above
      e.preventDefault();
      e.stopPropagation();
      this.joyPointerId = e.pointerId;
      startCenter();
      this._updateJoystick(e.clientX, e.clientY);
    });

    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch' || e.pointerId !== this.joyPointerId) return;
      e.preventDefault();
      this._updateJoystick(e.clientX, e.clientY);
    });

    const endMouseJoy = (e) => {
      if (e.pointerId === this.joyPointerId) {
        this.resetJoystick();
      }
    };
    window.addEventListener('pointerup', endMouseJoy);
    window.addEventListener('pointercancel', endMouseJoy);
    window.addEventListener('blur', () => this.resetJoystick());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.resetJoystick();
    });

    // ================= JUMP / DOUBLE-JUMP BUTTON =================
    const onJumpDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.btnJump.classList.add('pressed');
      this.controller.triggerJump();
    };
    const onJumpUp = (e) => {
      if (e && e.cancelable) e.preventDefault();
      this.btnJump.classList.remove('pressed');
    };
    this.btnJump.addEventListener('touchstart', onJumpDown, { passive: false });
    this.btnJump.addEventListener('touchend', onJumpUp, { passive: false });
    this.btnJump.addEventListener('touchcancel', onJumpUp, { passive: false });
    this.btnJump.addEventListener('mousedown', onJumpDown);
    window.addEventListener('mouseup', () => this.btnJump.classList.remove('pressed'));

    // ================= SPRINT TOGGLE BUTTON =================
    const onSprintToggle = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.sprintLocked = !this.sprintLocked;
      this.btnSprint.classList.toggle('active', this.sprintLocked);
      this.controller.virtualSprint = this.sprintLocked;
    };
    this.btnSprint.addEventListener('touchstart', onSprintToggle, { passive: false });
    this.btnSprint.addEventListener('mousedown', onSprintToggle);

    // Re-evaluate visibility on orientation / resize change
    window.addEventListener('resize', () => {
      this.resetJoystick();
      if (!this.root) return;
      if (this.enabled && !isMobileDevice()) {
        this.root.classList.add('hidden');
      } else if (this.enabled && isMobileDevice()) {
        this.root.classList.remove('hidden');
      }
    });
  }

  _updateJoystick(clientX, clientY) {
    let dx = clientX - this.joyCenter.x;
    let dy = clientY - this.joyCenter.y;
    const dist = Math.hypot(dx, dy);
    const maxR = this.joyMaxRadius;

    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }

    this.joyKnob.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;

    // Deadzone 8px so slight thumb tremor never drifts the character!
    if (dist < 8) {
      this.controller.setVirtualInput(0, 0, this.sprintLocked);
      return;
    }

    const normX = dx / maxR;
    const normZ = -dy / maxR;
    const autoSprint = dist > maxR * 0.86;
    this.controller.setVirtualInput(normX, normZ, this.sprintLocked || autoSprint);
  }
}
