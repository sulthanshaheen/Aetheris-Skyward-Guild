import * as THREE from 'three';

/**
 * Responsive 3rd-person Parkour & Adventure Character Controller
 * Features: Coyote Time, Jump Buffering, Double Jump, Moving Platform riding,
 * Shadow Blob landing indicator, and smooth drag-to-orbit camera.
 */
export class PlayerController {
  constructor(character, camera, domElement, shadowTexture, particles, audio = null) {
    this.character = character;
    this.camera = camera;
    this.domElement = domElement;
    this.particles = particles;
    this.audio = audio;

    this.pos = new THREE.Vector3(0, 3, 10);
    this.vel = new THREE.Vector3();
    this.spawnPos = new THREE.Vector3(0, 3, 10);

    this.facingYaw = Math.PI; // Facing -Z into the adventure!
    this.camYaw = Math.PI;
    this.camPitch = 0.34;
    this.camDist = 7.4;

    this.radius = 0.42;
    this.height = 1.82;
    this.gravity = -28;
    this.moveSpeed = 8.4;
    this.sprintSpeed = 12.2;
    this.jumpVel = 12.4;

    this.grounded = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.jumpsRemaining = 2;
    this.groundCollider = null;
    this.animState = 'idle';
    this.activeEmote = null;
    this.emoteTimer = 0;
    this.stepDustTimer = 0;
    this.inputEnabled = true;

    this.keys = new Set();
    this.virtualX = 0;
    this.virtualZ = 0;
    this.virtualSprint = false;
    this.isDragging = false;
    this.dragPointerId = null;
    this.lastMouse = { x: 0, y: 0 };

    // Crisp blob shadow underneath feet for accurate parkour landings!
    this.shadowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.35, 1.35),
      new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        depthWrite: false
      })
    );
    this.shadowMesh.rotation.x = -Math.PI / 2;

    this._bindInputs();
  }

  attachToScene(scene) {
    scene.add(this.character.root);
    scene.add(this.shadowMesh);
  }

  setSpawn(spawnArr, gravity = -28) {
    this.gravity = gravity || -28;
    this.spawnPos.set(spawnArr[0], spawnArr[1], spawnArr[2]);
    this.respawn();
  }

  setCheckpoint(vec3) {
    this.spawnPos.copy(vec3);
  }

  respawn() {
    this.pos.copy(this.spawnPos);
    this.vel.set(0, 0, 0);
    this.grounded = false;
    this.jumpsRemaining = 2;
    this.groundCollider = null;
    this.activeEmote = null;
    this.emoteTimer = 0;
    this.character.root.position.copy(this.pos);
  }

  playEmote(emoteName, duration = 4.5) {
    if (!this.grounded) return false;
    this.activeEmote = emoteName;
    this.emoteTimer = duration;
    return true;
  }

  setVirtualInput(x, z, sprint = false) {
    this.virtualX = x;
    this.virtualZ = z;
    this.virtualSprint = sprint;
  }

  triggerJump() {
    if (!this.inputEnabled) return;
    this.jumpBufferTimer = 0.16;
  }

  _bindInputs() {
    window.addEventListener('keydown', (e) => {
      if (!this.inputEnabled) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      const code = e.code;
      this.keys.add(code);
      if (code === 'Space') {
        e.preventDefault();
        this.jumpBufferTimer = 0.16;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    // Clear stuck keys/drag when window loses focus (e.g. iOS Control Center / app switch)
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.virtualX = 0;
      this.virtualZ = 0;
      this.isDragging = false;
      this.dragPointerId = null;
    });

    // Touch camera orbit on canvas (separate from joystick touch!)
    let camTouchId = null;
    this.domElement.addEventListener(
      'touchstart',
      (e) => {
        if (camTouchId !== null) return;
        const t = e.changedTouches[0];
        if (!t) return;
        camTouchId = t.identifier;
        this.lastMouse.x = t.clientX;
        this.lastMouse.y = t.clientY;
      },
      { passive: true }
    );

    window.addEventListener(
      'touchmove',
      (e) => {
        if (camTouchId === null) return;
        for (let i = 0; i < e.touches.length; i++) {
          const t = e.touches[i];
          if (t.identifier === camTouchId) {
            const dx = t.clientX - this.lastMouse.x;
            const dy = t.clientY - this.lastMouse.y;
            this.lastMouse.x = t.clientX;
            this.lastMouse.y = t.clientY;
            this.camYaw -= dx * 0.0085;
            this.camPitch = Math.max(0.08, Math.min(1.18, this.camPitch + dy * 0.007));
            return;
          }
        }
        camTouchId = null;
      },
      { passive: true }
    );

    const endCamTouch = (e) => {
      if (camTouchId === null) return;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === camTouchId) return;
      }
      camTouchId = null;
    };
    window.addEventListener('touchend', endCamTouch, { passive: true });
    window.addEventListener('touchcancel', endCamTouch, { passive: true });

    // Mouse camera orbit on desktop
    this.domElement.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return;
      if (e.button === 0 || e.button === 2) {
        this.isDragging = true;
        this.dragPointerId = e.pointerId;
        this.lastMouse.x = e.clientX;
        this.lastMouse.y = e.clientY;
      }
    });

    const endDrag = (e) => {
      if (e.pointerId === this.dragPointerId) {
        this.isDragging = false;
        this.dragPointerId = null;
      }
    };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch' || !this.isDragging || e.pointerId !== this.dragPointerId) return;
      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;
      this.lastMouse.x = e.clientX;
      this.lastMouse.y = e.clientY;

      this.camYaw -= dx * 0.0065;
      this.camPitch = Math.max(0.08, Math.min(1.18, this.camPitch + dy * 0.0055));
    });

    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    this.domElement.addEventListener(
      'wheel',
      (e) => {
        this.camDist = Math.max(4.0, Math.min(13.5, this.camDist + e.deltaY * 0.005));
      },
      { passive: true }
    );
  }

  update(dt, worldBuilder, callbacks = {}) {
    const safeDt = Math.min(dt, 0.05);

    // Ride moving platform if standing on one
    if (this.grounded && this.groundCollider && this.groundCollider.solid) {
      this.pos.add(this.groundCollider.delta);
    }

    // Camera keyboard rotate (Q / E)
    if (this.inputEnabled && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      if (this.keys.has('KeyQ')) this.camYaw += 2.1 * safeDt;
      if (this.keys.has('KeyE')) this.camYaw -= 2.1 * safeDt;
    }

    // Horizontal movement input (Keyboard + Mobile Virtual Joystick combined!)
    let inX = 0;
    let inZ = 0;
    if (this.inputEnabled && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) inZ += 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) inZ -= 1;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) inX -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) inX += 1;
      inX += this.virtualX;
      inZ += this.virtualZ;
    }

    const forward = new THREE.Vector3(Math.sin(this.camYaw), 0, Math.cos(this.camYaw));
    const right = new THREE.Vector3(-Math.cos(this.camYaw), 0, Math.sin(this.camYaw));
    const moveDir = new THREE.Vector3()
      .addScaledVector(forward, inZ)
      .addScaledVector(right, inX);

    const inputMag = Math.min(1, moveDir.length());
    const isSprinting = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.virtualSprint;
    const targetSpeed = inputMag > 0.05 ? (isSprinting ? this.sprintSpeed : this.moveSpeed) * inputMag : 0;

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      const targetYaw = Math.atan2(moveDir.x, moveDir.z);
      // Shortest-angle smooth character turn
      let diff = targetYaw - this.facingYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.facingYaw += diff * Math.min(1, 13 * safeDt);
    }

    const accel = this.grounded ? 16 : 8.5;
    this.vel.x += (moveDir.x * targetSpeed - this.vel.x) * Math.min(1, accel * safeDt);
    this.vel.z += (moveDir.z * targetSpeed - this.vel.z) * Math.min(1, accel * safeDt);

    // Coyote time & jump buffer
    if (this.grounded) {
      this.coyoteTimer = 0.14;
      this.jumpsRemaining = 2;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - safeDt);
    }
    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - safeDt);

    if (this.jumpBufferTimer > 0) {
      if (this.coyoteTimer > 0) {
        this.vel.y = this.jumpVel;
        this.grounded = false;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.jumpsRemaining = 1;
        if (this.audio) this.audio.playJump();
        this.particles.burst(this.pos, { count: 8, color: 0xfff5d6, speed: 2.6, size: 0.32, upward: 1.0, life: 0.42 });
      } else if (this.jumpsRemaining > 0) {
        // Stylized skyward double-jump!
        this.vel.y = this.jumpVel * 0.92;
        this.jumpsRemaining = 0;
        this.jumpBufferTimer = 0;
        if (this.audio) this.audio.playDoubleJump();
        this.particles.burst(this.pos, { count: 14, color: 0x76fff2, speed: 4.0, size: 0.36, upward: 0.6, life: 0.5 });
      }
    }

    // Gravity
    this.vel.y += this.gravity * safeDt;
    if (this.vel.y < -36) this.vel.y = -36;

    // Integrate & collide with world AABBs
    const prevY = this.pos.y;
    this.pos.x += this.vel.x * safeDt;
    this.pos.z += this.vel.z * safeDt;
    this._resolveHorizontal(worldBuilder.colliders);

    this.pos.y += this.vel.y * safeDt;
    const wasGrounded = this.grounded;
    this.grounded = false;
    this.groundCollider = null;
    this._resolveVertical(worldBuilder.colliders, prevY, worldBuilder);

    if (!wasGrounded && this.grounded) {
      if (this.audio) this.audio.playLand();
      this.particles.burst(this.pos, { count: 7, color: 0xdfe8cf, speed: 2.2, size: 0.28, upward: 0.8, life: 0.35 });
    }

    // Wind geysers
    for (const g of worldBuilder.geysers) {
      const dx = this.pos.x - g.pos.x;
      const dz = this.pos.z - g.pos.z;
      const dy = this.pos.y - g.pos.y;
      if (dx * dx + dz * dz < g.radius * g.radius && dy > -0.5 && dy < 3.6) {
        this.vel.y = g.power;
        this.grounded = false;
        this.jumpsRemaining = 1;
        if (this.audio) this.audio.playGeyser();
        this.particles.burst(this.pos, { count: 14, color: 0x9cfcff, speed: 3.8, size: 0.42, upward: 5.0, life: 0.5 });
      }
    }

    // Hazards & falling into the clouds
    let fell = this.pos.y < -15;
    if (!fell) {
      for (const h of worldBuilder.hazards) {
        if (
          Math.abs(this.pos.x - h.pos.x) < h.halfW + this.radius * 0.7 &&
          Math.abs(this.pos.z - h.pos.z) < h.halfD + this.radius * 0.7 &&
          this.pos.y < h.pos.y + h.halfH &&
          this.pos.y + this.height > h.pos.y - h.halfH
        ) {
          fell = true;
          break;
        }
      }
    }
    if (fell) {
      this.particles.burst(this.pos, { count: 16, color: 0xff5484, speed: 4.5, size: 0.4, life: 0.55 });
      this.respawn();
      if (callbacks.onFall) callbacks.onFall();
    }

    // Footstep dust when running
    const hSpeed = Math.hypot(this.vel.x, this.vel.z);
    if (this.grounded && hSpeed > 3.5) {
      this.stepDustTimer -= safeDt;
      if (this.stepDustTimer <= 0) {
        this.stepDustTimer = isSprinting ? 0.18 : 0.28;
        if (this.audio) this.audio.playStep();
        this.particles.burst(this.pos, { count: 3, color: 0xeaf2dc, speed: 1.2, size: 0.22, upward: 0.5, life: 0.3 });
      }
    }

    // Animation state (emotes stay active until timer ends or player moves/jumps)
    if (this.activeEmote) {
      this.emoteTimer -= safeDt;
      if (!this.grounded || moveDir.lengthSq() > 0 || this.emoteTimer <= 0) {
        this.activeEmote = null;
        this.emoteTimer = 0;
      }
    }

    if (!this.grounded) {
      this.animState = this.vel.y > 0.8 ? 'jump' : 'fall';
    } else if (hSpeed > 0.6) {
      this.animState = 'run';
    } else if (this.activeEmote) {
      this.animState = this.activeEmote;
    } else {
      this.animState = 'idle';
    }

    // Sync character transform & procedural animation
    this.character.root.position.copy(this.pos);
    this.character.root.rotation.y = this.facingYaw;
    this.character.update(safeDt, this.animState, hSpeed, this.vel.y);

    // Update landing shadow blob underneath character
    this._updateShadowBlob(worldBuilder.colliders);

    // Smooth third-person spring camera
    const targetLook = new THREE.Vector3(this.pos.x, this.pos.y + 1.42, this.pos.z);
    const camOffset = new THREE.Vector3(
      -Math.sin(this.camYaw) * Math.cos(this.camPitch) * this.camDist,
      Math.sin(this.camPitch) * this.camDist,
      -Math.cos(this.camYaw) * Math.cos(this.camPitch) * this.camDist
    );
    const desiredCamPos = targetLook.clone().add(camOffset);
    this.camera.position.lerp(desiredCamPos, Math.min(1, 12 * safeDt));
    this.camera.lookAt(targetLook);

    return hSpeed;
  }

  _resolveHorizontal(colliders) {
    for (const c of colliders) {
      if (!c.solid) continue;
      const p = c.obj.position;
      const minY = p.y - c.halfH;
      const maxY = p.y + c.halfH;
      if (this.pos.y + 0.25 >= maxY || this.pos.y + this.height <= minY) continue;

      const dx = this.pos.x - p.x;
      const dz = this.pos.z - p.z;
      const ox = c.halfW + this.radius - Math.abs(dx);
      const oz = c.halfD + this.radius - Math.abs(dz);
      if (ox > 0 && oz > 0) {
        if (ox < oz) {
          this.pos.x += dx >= 0 ? ox : -ox;
          this.vel.x = 0;
        } else {
          this.pos.z += dz >= 0 ? oz : -oz;
          this.vel.z = 0;
        }
      }
    }
  }

  _resolveVertical(colliders, prevY, worldBuilder) {
    for (const c of colliders) {
      if (!c.solid) continue;
      const p = c.obj.position;
      if (
        Math.abs(this.pos.x - p.x) > c.halfW + this.radius * 0.82 ||
        Math.abs(this.pos.z - p.z) > c.halfD + this.radius * 0.82
      ) {
        continue;
      }
      const topY = p.y + c.halfH;
      const botY = p.y - c.halfH;

      // Landing on top surface
      if (this.vel.y <= 0 && prevY >= topY - 0.35 && this.pos.y <= topY + 0.06) {
        this.pos.y = topY;
        this.vel.y = 0;
        this.grounded = true;
        this.groundCollider = c;
        if (c.isCrumbling) {
          worldBuilder.triggerCrumble(c.id);
        }
      } else if (this.vel.y > 0 && prevY + this.height <= botY + 0.2 && this.pos.y + this.height >= botY) {
        // Head bump
        this.pos.y = botY - this.height;
        this.vel.y = 0;
      }
    }
  }

  _updateShadowBlob(colliders) {
    let highestBelow = -999;
    for (const c of colliders) {
      if (!c.solid) continue;
      const p = c.obj.position;
      if (
        Math.abs(this.pos.x - p.x) <= c.halfW + 0.25 &&
        Math.abs(this.pos.z - p.z) <= c.halfD + 0.25
      ) {
        const topY = p.y + c.halfH;
        if (topY <= this.pos.y + 0.15 && topY > highestBelow) {
          highestBelow = topY;
        }
      }
    }
    if (highestBelow > -100) {
      this.shadowMesh.visible = true;
      this.shadowMesh.position.set(this.pos.x, highestBelow + 0.03, this.pos.z);
      const heightDiff = Math.max(0, this.pos.y - highestBelow);
      const scale = Math.max(0.35, 1.05 - heightDiff * 0.08);
      this.shadowMesh.scale.setScalar(scale);
      this.shadowMesh.material.opacity = Math.max(0.15, 0.85 - heightDiff * 0.09);
    } else {
      this.shadowMesh.visible = false;
    }
  }
}
