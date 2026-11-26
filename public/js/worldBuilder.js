import * as THREE from 'three';

/**
 * Builds rich, stylized Aetheris sky-ruin 3D worlds directly from server JSON mission data!
 * Produces collider descriptors + animated pieces (moving platforms, crumbling stones,
 * wind geysers, collectibles, waystone checkpoints, rune switches, light bridges, portals).
 */
export class WorldBuilder {
  constructor(scene, textures) {
    this.scene = scene;
    this.textures = textures;
    this.worldGroup = new THREE.Group();
    this.scene.add(this.worldGroup);

    this.colliders = [];
    this.movingPlatforms = [];
    this.crumblingStones = [];
    this.geysers = [];
    this.hazards = [];
    this.checkpoints = [];
    this.relics = [];
    this.switches = [];
    this.bridges = new Map();
    this.portals = [];
    this.goalPortals = [];
    this.animatedSpinners = [];

    this._initSharedMaterials();
  }

  _initSharedMaterials() {
    this.matGrass = new THREE.MeshStandardMaterial({
      map: this.textures.grass,
      roughness: 0.84,
      metalness: 0.02
    });
    this.matCarvedStone = new THREE.MeshStandardMaterial({
      map: this.textures.carvedStone,
      roughness: 0.78,
      metalness: 0.06
    });
    this.matCliff = new THREE.MeshStandardMaterial({
      map: this.textures.cliffRock,
      roughness: 0.92,
      metalness: 0.04
    });
    this.matGold = new THREE.MeshStandardMaterial({
      color: 0xe8bc52,
      roughness: 0.3,
      metalness: 0.72,
      emissive: 0x543808,
      emissiveIntensity: 0.25
    });
    this.matCrystal = new THREE.MeshStandardMaterial({
      color: 0x52fff0,
      emissive: 0x16d9c8,
      emissiveIntensity: 1.15,
      roughness: 0.15,
      metalness: 0.25
    });
    this.matCrumble = new THREE.MeshStandardMaterial({
      color: 0xd99c6c,
      map: this.textures.carvedStone,
      roughness: 0.82,
      emissive: 0x542208,
      emissiveIntensity: 0.22
    });
    this.matRift = new THREE.MeshStandardMaterial({
      map: this.textures.rift,
      emissive: 0xd9215b,
      emissiveIntensity: 1.1,
      roughness: 0.35
    });
    this.matTreeTrunk = new THREE.MeshStandardMaterial({
      color: 0x6f4a2e,
      roughness: 0.9
    });
    this.matTreeLeaf = new THREE.MeshStandardMaterial({
      color: 0x55b842,
      roughness: 0.75
    });
    this.matTreeLeafLight = new THREE.MeshStandardMaterial({
      color: 0x86d94f,
      roughness: 0.72
    });
  }

  clear() {
    while (this.worldGroup.children.length > 0) {
      this.worldGroup.remove(this.worldGroup.children[0]);
    }
    this.colliders = [];
    this.movingPlatforms = [];
    this.crumblingStones = [];
    this.geysers = [];
    this.hazards = [];
    this.checkpoints = [];
    this.relics = [];
    this.switches = [];
    this.bridges.clear();
    this.portals = [];
    this.goalPortals = [];
    this.animatedSpinners = [];
  }

  build(worldData) {
    this.clear();
    if (!worldData || !Array.isArray(worldData.pieces)) return;

    for (const p of worldData.pieces) {
      switch (p.type) {
        case 'ancient_island':
          this._buildAncientIsland(p);
          break;
        case 'stepping_stone':
          this._buildSteppingStone(p);
          break;
        case 'aether_platform':
          this._buildMovingPlatform(p);
          break;
        case 'crumbling_stone':
          this._buildCrumblingStone(p);
          break;
        case 'wind_geyser':
          this._buildWindGeyser(p);
          break;
        case 'corrupted_rift':
          this._buildCorruptedRift(p);
          break;
        case 'waystone_checkpoint':
          this._buildCheckpoint(p);
          break;
        case 'aether_relic':
          this._buildAetherRelic(p);
          break;
        case 'rune_switch':
          this._buildRuneSwitch(p);
          break;
        case 'light_bridge':
          this._buildLightBridge(p);
          break;
        case 'goal_portal':
          this._buildPortal(p, true);
          break;
        case 'mission_portal':
          this._buildPortal(p, false);
          break;
        default:
          this._buildSteppingStone(p);
      }
    }
  }

  _addCollider(pieceId, meshOrGroup, size, extra = {}) {
    const col = Object.assign(
      {
        id: pieceId,
        obj: meshOrGroup,
        halfW: size[0] / 2,
        halfH: size[1] / 2,
        halfD: size[2] / 2,
        solid: true,
        delta: new THREE.Vector3()
      },
      extra
    );
    this.colliders.push(col);
    return col;
  }

  _createStylizedTree(scale = 1) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 2.2, 8), this.matTreeTrunk);
    trunk.position.y = 1.1;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    const puffs = [
      { pos: [0, 2.6, 0], r: 1.25, light: false },
      { pos: [-0.75, 2.3, 0.35], r: 0.88, light: true },
      { pos: [0.75, 2.35, -0.3], r: 0.92, light: false },
      { pos: [0.15, 3.15, 0.2], r: 0.85, light: true }
    ];
    for (const pf of puffs) {
      const leaf = new THREE.Mesh(
        new THREE.DodecahedronGeometry(pf.r, 1),
        pf.light ? this.matTreeLeafLight : this.matTreeLeaf
      );
      leaf.position.set(...pf.pos);
      leaf.castShadow = true;
      leaf.receiveShadow = true;
      tree.add(leaf);
    }
    tree.scale.setScalar(scale);
    return tree;
  }

  _createRuinPillar(height = 3.2) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.35, 0.95), this.matCarvedStone);
    base.position.y = 0.175;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.37, height, 10), this.matCarvedStone);
    shaft.position.y = 0.35 + height / 2;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.28, 0.9), this.matCarvedStone);
    cap.position.y = 0.35 + height + 0.14;
    [base, shaft, cap].forEach((m) => {
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
    });
    return g;
  }

  _createCrystalCluster(scale = 1) {
    const g = new THREE.Group();
    const shards = [
      { pos: [0, 0.55, 0], rot: [0.08, 0, -0.05], r: 0.22, h: 1.1 },
      { pos: [0.24, 0.35, 0.12], rot: [0.22, 0.3, -0.35], r: 0.15, h: 0.72 },
      { pos: [-0.22, 0.32, -0.1], rot: [-0.2, 0.4, 0.32], r: 0.14, h: 0.65 }
    ];
    for (const sh of shards) {
      const mesh = new THREE.Mesh(new THREE.ConeGeometry(sh.r, sh.h, 6), this.matCrystal);
      mesh.position.set(...sh.pos);
      mesh.rotation.set(...sh.rot);
      g.add(mesh);
    }
    g.scale.setScalar(scale);
    return g;
  }

  _buildAncientIsland(p) {
    const [w, h, d] = p.size;
    const g = new THREE.Group();
    g.position.set(...p.pos);

    // Grass top layer
    const topCap = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.36, d), this.matGrass);
    topCap.position.y = h * 0.32;
    topCap.receiveShadow = true;
    topCap.castShadow = true;
    g.add(topCap);

    // Carved stone rim
    const stoneRim = new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, h * 0.64, d * 0.98), this.matCliff);
    stoneRim.position.y = -h * 0.18;
    stoneRim.receiveShadow = true;
    stoneRim.castShadow = true;
    g.add(stoneRim);

    // Sculpted floating island rocky underside cone!
    const rockDepth = Math.min(9.5, Math.max(3.2, Math.min(w, d) * 0.52));
    const underRock = new THREE.Mesh(
      new THREE.ConeGeometry(Math.max(w, d) * 0.55, rockDepth, 7),
      this.matCliff
    );
    underRock.rotation.x = Math.PI;
    underRock.rotation.y = 0.4;
    underRock.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
    underRock.position.y = -h * 0.5 - rockDepth * 0.45;
    underRock.castShadow = true;
    g.add(underRock);

    const topY = h / 2;

    if (p.trees) {
      const t1 = this._createStylizedTree(0.95);
      t1.position.set(-w * 0.36, topY, -d * 0.32);
      g.add(t1);

      if (w >= 10) {
        const t2 = this._createStylizedTree(0.78);
        t2.position.set(w * 0.36, topY, -d * 0.25);
        g.add(t2);
      }

      const c1 = this._createCrystalCluster(0.8);
      c1.position.set(w * 0.34, topY, d * 0.3);
      g.add(c1);
    }

    if (p.ruins) {
      const p1 = this._createRuinPillar(2.6);
      p1.position.set(-w * 0.38, topY, d * 0.32);
      const p2 = this._createRuinPillar(1.8);
      p2.position.set(w * 0.38, topY, d * 0.32);
      g.add(p1, p2);
    }

    this.worldGroup.add(g);
    this._addCollider(p.id, g, p.size);
  }

  _buildSteppingStone(p) {
    const [w, h, d] = p.size;
    const g = new THREE.Group();
    g.position.set(...p.pos);

    const slab = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.matCarvedStone);
    slab.castShadow = true;
    slab.receiveShadow = true;
    g.add(slab);

    // Tapered carved stone under-base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(Math.min(w, d) * 0.45, Math.min(w, d) * 0.22, h * 1.1, 6), this.matCliff);
    base.position.y = -h * 0.9;
    g.add(base);

    this.worldGroup.add(g);
    this._addCollider(p.id, g, p.size);
  }

  _buildMovingPlatform(p) {
    const [w, h, d] = p.size;
    const g = new THREE.Group();
    g.position.set(...p.pos);

    const slab = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.matCarvedStone);
    slab.castShadow = true;
    slab.receiveShadow = true;
    g.add(slab);

    // Golden rune frame around moving Aether platform
    const rim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.18, h * 0.45, d + 0.18), this.matGold);
    rim.position.y = 0.05;
    g.add(rim);

    // Glowing Aether thruster crystal underneath
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), this.matCrystal);
    core.position.y = -h * 0.72;
    g.add(core);

    this.worldGroup.add(g);
    const col = this._addCollider(p.id, g, p.size);
    this.movingPlatforms.push({
      obj: g,
      collider: col,
      start: new THREE.Vector3(...p.pos),
      end: new THREE.Vector3(...(p.moveTo || p.pos)),
      speed: p.speed || 2,
      phase: Math.random() * Math.PI * 2
    });
  }

  _buildCrumblingStone(p) {
    const [w, h, d] = p.size;
    const g = new THREE.Group();
    g.position.set(...p.pos);

    const mat = this.matCrumble.clone();
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    slab.castShadow = true;
    slab.receiveShadow = true;
    g.add(slab);

    this.worldGroup.add(g);
    const col = this._addCollider(p.id, g, p.size, { isCrumbling: true });
    this.crumblingStones.push({
      id: p.id,
      obj: g,
      mesh: slab,
      mat,
      collider: col,
      basePos: new THREE.Vector3(...p.pos),
      state: 'solid', // solid -> shaking -> gone
      timer: 0
    });
  }

  _buildWindGeyser(p) {
    const [w, h, d] = p.size;
    const g = new THREE.Group();
    g.position.set(...p.pos);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(w * 0.45, 0.16, 10, 22), this.matGold);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);

    const windMat = new THREE.MeshBasicMaterial({
      color: 0x9cfcff,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
    const vortex = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.36, w * 0.2, 3.2, 14, 1, true), windMat);
    vortex.position.y = 1.6;
    g.add(vortex);

    this.worldGroup.add(g);
    this.animatedSpinners.push({ obj: vortex, speedY: 4.5 });
    this.geysers.push({
      pos: new THREE.Vector3(...p.pos),
      radius: w * 0.52,
      power: p.power || 18.5
    });
  }

  _buildCorruptedRift(p) {
    const [w, h, d] = p.size;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.matRift);
    mesh.position.set(...p.pos);
    this.worldGroup.add(mesh);
    this.hazards.push({
      pos: new THREE.Vector3(...p.pos),
      halfW: w / 2,
      halfH: h / 2 + 0.3,
      halfD: d / 2
    });
  }

  _buildCheckpoint(p) {
    const [w, h, d] = p.size;
    const g = new THREE.Group();
    g.position.set(...p.pos);

    // Base island slab
    const topCap = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.35, d), this.matGrass);
    topCap.position.y = h * 0.32;
    topCap.receiveShadow = true;
    const base = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, h * 0.65, d * 0.96), this.matCarvedStone);
    base.position.y = -h * 0.18;
    base.receiveShadow = true;
    base.castShadow = true;
    g.add(topCap, base);

    // Waystone Pedestal + Floating Rune Crystal
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.58, 1.05, 8), this.matCarvedStone);
    ped.position.set(w * 0.3, h / 2 + 0.52, 0);
    ped.castShadow = true;
    g.add(ped);

    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x76b8ff,
      emissive: 0x2e64c4,
      emissiveIntensity: 0.7,
      roughness: 0.2
    });
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), crystalMat);
    crystal.scale.set(0.75, 1.5, 0.75);
    crystal.position.set(w * 0.3, h / 2 + 1.65, 0);
    g.add(crystal);

    this.worldGroup.add(g);
    this._addCollider(p.id, g, p.size);
    this.animatedSpinners.push({ obj: crystal, speedY: 1.6, bobBase: h / 2 + 1.65, bobAmp: 0.14 });

    this.checkpoints.push({
      id: p.id,
      pos: new THREE.Vector3(p.pos[0], p.pos[1] + h / 2 + 1.2, p.pos[2]),
      triggerPos: new THREE.Vector3(...p.pos),
      radius: Math.max(w, d) * 0.52,
      crystalMat,
      activated: false
    });
  }

  _buildAetherRelic(p) {
    const g = new THREE.Group();
    g.position.set(...p.pos);

    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), this.matCrystal);
    crystal.scale.set(0.82, 1.38, 0.82);
    g.add(crystal);

    // Spinning golden ring around the crystal (matching concept art!)
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.065, 10, 24), this.matGold);
    g.add(ring);

    const glowSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.textures.glow,
        color: 0x74fff2,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending
      })
    );
    glowSprite.scale.set(2.1, 2.1, 1);
    g.add(glowSprite);

    this.worldGroup.add(g);
    this.animatedSpinners.push({ obj: crystal, speedY: 2.2 });
    this.animatedSpinners.push({ obj: ring, speedY: -1.6, speedX: 1.1 });

    this.relics.push({
      id: p.id,
      tag: p.tag || 'aether_relic',
      obj: g,
      pos: new THREE.Vector3(...p.pos),
      baseY: p.pos[1],
      collected: false
    });
  }

  _buildRuneSwitch(p) {
    const [w, h, d] = p.size;
    const g = new THREE.Group();
    g.position.set(...p.pos);

    const frame = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.52, w * 0.58, h, 8), this.matCarvedStone);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0xffa63d,
      emissive: 0xd96b16,
      emissiveIntensity: 0.9,
      roughness: 0.3
    });
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.38, w * 0.38, h + 0.08, 8), padMat);
    g.add(frame, pad);

    this.worldGroup.add(g);
    this.switches.push({
      id: p.id,
      bridgeId: p.bridgeId,
      pos: new THREE.Vector3(...p.pos),
      radius: w * 0.65,
      padMat,
      activated: false
    });
  }

  _buildLightBridge(p) {
    const [w, h, d] = p.size;
    const mat = new THREE.MeshStandardMaterial({
      color: 0x6bf7ff,
      emissive: 0x26e2ff,
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.14,
      roughness: 0.15
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(...p.pos);
    this.worldGroup.add(mesh);

    const col = this._addCollider(p.id, mesh, p.size, { solid: false });
    this.bridges.set(p.id, { mesh, mat, collider: col, active: false });
  }

  activateBridge(bridgeId) {
    const b = this.bridges.get(bridgeId);
    if (!b || b.active) return false;
    b.active = true;
    b.collider.solid = true;
    b.mat.opacity = 0.78;
    b.mat.emissiveIntensity = 1.4;
    for (const sw of this.switches) {
      if (sw.bridgeId === bridgeId) {
        sw.activated = true;
        sw.padMat.color.set('#38ffd6');
        sw.padMat.emissive.set('#14cfa8');
      }
    }
    return true;
  }

  _buildPortal(p, isGoal) {
    const [w, h] = p.size;
    const g = new THREE.Group();
    g.position.set(...p.pos);

    const accentHex = p.color || (isGoal ? '#38ffe6' : '#ffb84d');

    // Stone archway pillars + ornate lintel + diamond keystone (matching concept art!)
    const pillarL = new THREE.Mesh(new THREE.BoxGeometry(0.68, h, 0.85), this.matCarvedStone);
    pillarL.position.set(-w / 2, 0, 0);
    const pillarR = pillarL.clone();
    pillarR.position.x = w / 2;

    const topArch = new THREE.Mesh(new THREE.BoxGeometry(w + 1.3, 0.75, 1.05), this.matCarvedStone);
    topArch.position.set(0, h / 2 + 0.2, 0);

    const goldTrim = new THREE.Mesh(new THREE.BoxGeometry(w + 1.45, 0.22, 1.12), this.matGold);
    goldTrim.position.set(0, h / 2 + 0.65, 0);

    const keystone = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), this.matCrystal);
    keystone.position.set(0, h / 2 + 1.05, 0.1);

    const steps = new THREE.Mesh(new THREE.BoxGeometry(w + 1.2, 0.35, 1.8), this.matCarvedStone);
    steps.position.set(0, -h / 2 + 0.15, 0);

    [pillarL, pillarR, topArch, goldTrim, steps].forEach((m) => {
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
    });
    g.add(keystone);

    // Swirling luminous portal plane!
    const vortexMat = new THREE.MeshBasicMaterial({
      map: this.textures.portal,
      color: new THREE.Color(accentHex),
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide
    });
    const vortex = new THREE.Mesh(new THREE.CircleGeometry(w * 0.48, 28), vortexMat);
    vortex.scale.set(1, h / w, 1);
    g.add(vortex);

    this.animatedSpinners.push({ obj: vortex, speedZ: -1.8 });

    // Floating portal label in Hub
    if (p.label) {
      const canvas = document.createElement('canvas');
      canvas.width = 420;
      canvas.height = 96;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(14, 24, 44, 0.8)';
      ctx.strokeStyle = accentHex;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(12, 12, 396, 72, 24);
      ctx.fill();
      ctx.stroke();
      ctx.font = '700 28px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.label, 210, 48);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
      sprite.position.set(0, h / 2 + 1.95, 0);
      sprite.scale.set(3.4, 0.78, 1);
      g.add(sprite);
    }

    this.worldGroup.add(g);

    const record = {
      id: p.id,
      missionId: p.missionId,
      label: p.label,
      pos: new THREE.Vector3(...p.pos),
      radius: w * 0.56
    };
    if (isGoal) this.goalPortals.push(record);
    else this.portals.push(record);
  }

  triggerCrumble(colliderId) {
    const stone = this.crumblingStones.find((c) => c.id === colliderId);
    if (!stone || stone.state !== 'solid') return;
    stone.state = 'shaking';
    stone.timer = 1.05;
  }

  update(dt, time) {
    // Moving platforms
    for (const mp of this.movingPlatforms) {
      const prev = mp.obj.position.clone();
      const t = (Math.sin(time * (mp.speed * 0.6) + mp.phase) + 1) * 0.5;
      mp.obj.position.lerpVectors(mp.start, mp.end, t);
      mp.collider.delta.copy(mp.obj.position).sub(prev);
    }

    // Crumbling stones
    for (const cs of this.crumblingStones) {
      if (cs.state === 'shaking') {
        cs.timer -= dt;
        cs.obj.position.set(
          cs.basePos.x + (Math.random() - 0.5) * 0.14,
          cs.basePos.y,
          cs.basePos.z + (Math.random() - 0.5) * 0.14
        );
        cs.mat.emissiveIntensity = 0.8 + Math.sin(time * 32) * 0.35;
        if (cs.timer <= 0) {
          cs.state = 'gone';
          cs.timer = 3.2;
          cs.obj.visible = false;
          cs.collider.solid = false;
        }
      } else if (cs.state === 'gone') {
        cs.timer -= dt;
        if (cs.timer <= 0) {
          cs.state = 'solid';
          cs.obj.position.copy(cs.basePos);
          cs.obj.visible = true;
          cs.collider.solid = true;
          cs.mat.emissiveIntensity = 0.22;
        }
      }
    }

    // Floating relics gentle hover
    for (const r of this.relics) {
      if (!r.collected) {
        r.obj.position.y = r.baseY + Math.sin(time * 2.6 + r.pos.x) * 0.22;
      }
    }

    // Animated crystals, rings, portal vortices
    for (const sp of this.animatedSpinners) {
      if (sp.speedY) sp.obj.rotation.y += sp.speedY * dt;
      if (sp.speedX) sp.obj.rotation.x += sp.speedX * dt;
      if (sp.speedZ) sp.obj.rotation.z += sp.speedZ * dt;
      if (sp.bobBase !== undefined) {
        sp.obj.position.y = sp.bobBase + Math.sin(time * 2.4) * sp.bobAmp;
      }
    }
  }
}
