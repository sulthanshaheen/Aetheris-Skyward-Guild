/**
 * Multi-Touch Mobile Controls for Aetheris: Skyward Guild
 * - Left virtual thumbstick (analog movement + auto-sprint at outer rim)
 * - Right-side Jump button (supports Double Jump) & Sprint toggle
 * - Independent pointerId tracking so players can steer, rotate camera, and jump simultaneously!
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
    }
  }

  hide() {
    if (!this.root) return;
    this.enabled = false;
    this.root.classList.add('hidden');
    this.resetJoystick();
  }

  resetJoystick() {
    this.joyPointerId = null;
    if (this.joyKnob) {
      this.joyKnob.style.transform = 'translate(0px, 0px)';
    }
    this.controller.setVirtualInput(0, 0, this.sprintLocked);
  }

  _bindEvents() {
    if (!this.joyZone || !this.btnJump || !this.btnSprint) return;

    // Virtual Analog Joystick (Multi-touch safe via pointerId)
    this.joyZone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.joyPointerId !== null) return;
      this.joyPointerId = e.pointerId;
      this.joyZone.setPointerCapture(e.pointerId);
      const rect = this.joyZone.getBoundingClientRect();
      this.joyCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
      this._updateJoystick(e.clientX, e.clientY);
    });

    this.joyZone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.joyPointerId) return;
      e.preventDefault();
      e.stopPropagation();
      this._updateJoystick(e.clientX, e.clientY);
    });

    const endJoy = (e) => {
      if (e.pointerId !== this.joyPointerId) return;
      e.preventDefault();
      e.stopPropagation();
      this.resetJoystick();
    };
    this.joyZone.addEventListener('pointerup', endJoy);
    this.joyZone.addEventListener('pointercancel', endJoy);

    // Jump / Double-Jump touch button
    this.btnJump.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.btnJump.classList.add('pressed');
      this.controller.triggerJump();
    });
    const endJump = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.btnJump.classList.remove('pressed');
    };
    this.btnJump.addEventListener('pointerup', endJump);
    this.btnJump.addEventListener('pointercancel', endJump);

    // Sprint toggle button
    this.btnSprint.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.sprintLocked = !this.sprintLocked;
      this.btnSprint.classList.toggle('active', this.sprintLocked);
      this.controller.virtualSprint = this.sprintLocked;
    });

    // Re-evaluate visibility on orientation / resize change
    window.addEventListener('resize', () => {
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

    // Map joystick: +X right, -Y forward (+inZ)
    const normX = Math.abs(dx) < 6 ? 0 : dx / maxR;
    const normZ = Math.abs(dy) < 6 ? 0 : -dy / maxR;
    const autoSprint = dist > maxR * 0.86;
    this.controller.setVirtualInput(normX, normZ, this.sprintLocked || autoSprint);
  }
}
