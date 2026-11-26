import * as THREE from 'three';
import { HumanCharacter } from './humanCharacter.js';

const HUB_NPCS = [
  {
    id: 'npc_eldrin',
    name: 'Master Eldrin',
    role: 'Pemberi Misi Guild',
    icon: '📜',
    marker: '!',
    markerColor: '#ffd95e',
    pos: [-5.2, 1.6, 2.2],
    baseYaw: 0.55,
    kind: 'questgiver',
    avatar: {
      id: 'npc_eldrin',
      name: 'Master Eldrin',
      role: 'Pemberi Misi',
      hairStyle: 'swept_short',
      accessory: 'knight_pauldrons',
      bodyType: 'athletic',
      capeStyle: 'long',
      colors: {
        tunic: '#1c4478',
        tunicTrim: '#f5c74c',
        shirt: '#f7f2e1',
        cape: '#19355c',
        capeTrim: '#ffd966',
        pants: '#1b2436',
        boots: '#5c3c22',
        gloves: '#4a311c',
        hair: '#dce4f0',
        skin: '#ecc29f',
        eyeIris: '#38d9c8'
      }
    }
  },
  {
    id: 'npc_velia',
    name: 'Kapten Velia',
    role: 'Pelatih Parkour & Emote',
    icon: '🍃',
    marker: '?',
    markerColor: '#4bf5df',
    pos: [5.4, 1.6, 2.4],
    baseYaw: -0.58,
    kind: 'trainer',
    avatar: {
      id: 'npc_velia',
      name: 'Kapten Velia',
      role: 'Pelatih Guild',
      hairStyle: 'ponytail',
      accessory: 'goggles',
      bodyType: 'slim',
      capeStyle: 'scarf',
      colors: {
        tunic: '#1e8569',
        tunicTrim: '#f2cc5c',
        shirt: '#f7f3e4',
        cape: '#e07a34',
        capeTrim: '#ffe38c',
        pants: '#253642',
        boots: '#6e472b',
        gloves: '#52341e',
        hair: '#c97828',
        skin: '#f2c7a4',
        eyeIris: '#26b88e'
      }
    }
  }
];

function createQuestMarker(symbol, colorHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // Soft radial glow
  const g = ctx.createRadialGradient(64, 64, 10, 64, 64, 58);
  g.addColorStop(0, colorHex);
  g.addColorStop(0.55, 'rgba(255, 220, 110, 0.35)');
  g.addColorStop(1, 'rgba(255, 220, 110, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);

  ctx.fillStyle = '#101d34';
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(64, 64, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.font = '900 48px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = colorHex;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(symbol, 64, 66);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sprite.scale.set(0.72, 0.72, 1);
  return sprite;
}

/**
 * Manages interactive stylized 3D NPCs in the Skyward Guild Hub
 * (Questmaster Eldrin & Parkour Trainer Velia).
 */
export class NpcManager {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.npcs = [];
  }

  clear() {
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    this.npcs = [];
  }

  spawnForWorld(worldId) {
    this.clear();
    if (worldId !== 'skyward-hub') return;

    for (const cfg of HUB_NPCS) {
      const ch = new HumanCharacter({
        username: cfg.name,
        avatar: cfg.avatar
      });
      ch.root.position.set(...cfg.pos);
      ch.root.rotation.y = cfg.baseYaw;

      // Glowing golden pedestal ring under NPC feet
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.68, 0.88, 24),
        new THREE.MeshBasicMaterial({
          color: cfg.markerColor,
          transparent: true,
          opacity: 0.65,
          side: THREE.DoubleSide
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(cfg.pos[0], cfg.pos[1] + 0.04, cfg.pos[2]);

      const marker = createQuestMarker(cfg.marker, cfg.markerColor);
      marker.position.set(0, 2.95, 0);
      ch.root.add(marker);

      this.group.add(ch.root, ring);
      this.npcs.push({
        cfg,
        character: ch,
        marker,
        pos: new THREE.Vector3(...cfg.pos),
        currentYaw: cfg.baseYaw,
        greeted: false
      });
    }
  }

  update(dt, time, playerPos) {
    let nearest = null;
    let nearestDist = Infinity;

    for (const npc of this.npcs) {
      const dist = playerPos ? npc.pos.distanceTo(playerPos) : 99;
      let anim = 'idle';

      // Smoothly turn to face player & wave warmly when nearby!
      let targetYaw = npc.cfg.baseYaw;
      if (dist < 6.8 && playerPos) {
        targetYaw = Math.atan2(playerPos.x - npc.pos.x, playerPos.z - npc.pos.z);
        if (dist < 5.0) {
          anim = 'emote_wave';
          if (!npc.greeted) {
            npc.greeted = true;
            npc.character.showEmoteBubble(npc.cfg.kind === 'questgiver' ? '📜' : '👋', 2.6);
          }
        }
      } else {
        npc.greeted = false;
      }

      let diff = targetYaw - npc.currentYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      npc.currentYaw += diff * Math.min(1, 6 * dt);
      npc.character.root.rotation.y = npc.currentYaw;

      npc.character.update(dt, anim, 0, 0);
      npc.marker.position.y = 2.98 + Math.sin(time * 3.2 + npc.pos.x) * 0.14;

      if (dist < 4.2 && dist < nearestDist) {
        nearest = npc;
        nearestDist = dist;
      }
    }

    return nearest;
  }
}
