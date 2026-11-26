import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene, glowTexture) {
    this.scene = scene;
    this.glowTexture = glowTexture;
    this.particles = [];
    this.group = new THREE.Group();
    this.scene.add(this.group);
  }

  burst(pos, options = {}) {
    const count = options.count || 12;
    const color = options.color || 0xfff2c2;
    const speed = options.speed || 4.2;
    const size = options.size || 0.35;
    const life = options.life || 0.65;
    const upward = options.upward !== undefined ? options.upward : 2.2;

    for (let i = 0; i < count; i++) {
      const mat = new THREE.SpriteMaterial({
        map: this.glowTexture,
        color,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.copy(pos);
      sprite.scale.setScalar(size * (0.7 + Math.random() * 0.6));
      this.group.add(sprite);

      const angle = Math.random() * Math.PI * 2;
      const spd = speed * (0.35 + Math.random() * 0.65);
      this.particles.push({
        sprite,
        mat,
        vel: new THREE.Vector3(
          Math.cos(angle) * spd,
          upward * (0.4 + Math.random() * 0.8),
          Math.sin(angle) * spd
        ),
        life,
        maxLife: life,
        gravity: options.gravity !== undefined ? options.gravity : -5.5
      });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.group.remove(p.sprite);
        p.mat.dispose();
        this.particles.splice(i, 1);
        continue;
      }
      p.vel.y += p.gravity * dt;
      p.sprite.position.addScaledVector(p.vel, dt);
      const ratio = p.life / p.maxLife;
      p.mat.opacity = ratio * 0.9;
      p.sprite.scale.multiplyScalar(1 - dt * 0.4);
    }
  }
}
