import * as THREE from 'three';

const DEFAULT_AVATAR = {
  id: 'kael_pathfinder',
  hairStyle: 'spiky',
  accessory: 'compass',
  bodyType: 'standard',
  capeStyle: 'long',
  colors: {
    tunic: '#1d7a82',
    tunicTrim: '#e8b954',
    shirt: '#f4ecd8',
    cape: '#b32d3b',
    capeTrim: '#f0c45c',
    pants: '#2c3548',
    boots: '#6e472b',
    gloves: '#5a3a26',
    hair: '#7a4b2a',
    skin: '#f2c6a0',
    eyeIris: '#247a8c'
  }
};

function makeMat(hex, roughness = 0.62, metalness = 0.08, extra = {}) {
  return new THREE.MeshStandardMaterial(
    Object.assign({ color: new THREE.Color(hex), roughness, metalness }, extra)
  );
}

/**
 * Stylized Articulated Human Character supporting 6 distinct hero archetypes:
 * - Distinct hairstyles (spiky, ponytail with sway, swept_short, long_bob, hooded, twin_buns)
 * - Distinct accessories (compass, flight goggles, knight pauldrons & circlet, mage hat, hood visor, ranger sash)
 * - Body proportion profiles (slim, standard, athletic)
 * - Flowing cape or agile wind-scarf with dynamic physics
 */
export class HumanCharacter {
  constructor(options = {}) {
    this.root = new THREE.Group();
    this.rig = new THREE.Group();
    this.root.add(this.rig);

    this.avatar = Object.assign({}, DEFAULT_AVATAR, options.avatar || {});
    this.colors = Object.assign({}, DEFAULT_AVATAR.colors, this.avatar.colors || {}, options.colors || {});
    this.mats = {};
    this.capeSegments = [];
    this.ponytailPivot = null;
    this.animTime = Math.random() * 10;
    this.blinkTimer = 2 + Math.random() * 3;
    this.nametagSprite = null;

    this._createMaterials();
    this._buildBody();

    if (options.username) {
      this.setNametag(options.username, this.avatar && this.avatar.name, this.avatar && this.avatar.role);
    }
  }

  _createMaterials() {
    const c = this.colors;
    this.mats.skin = makeMat(c.skin, 0.58, 0.02);
    this.mats.hair = makeMat(c.hair, 0.52, 0.08);
    this.mats.tunic = makeMat(c.tunic, 0.65, 0.08);
    this.mats.tunicTrim = makeMat(c.tunicTrim, 0.30, 0.66);
    this.mats.shirt = makeMat(c.shirt, 0.78, 0.02);
    this.mats.cape = makeMat(c.cape, 0.68, 0.06, { side: THREE.DoubleSide });
    this.mats.capeTrim = makeMat(c.capeTrim, 0.35, 0.55, { side: THREE.DoubleSide });
    this.mats.pants = makeMat(c.pants, 0.72, 0.05);
    this.mats.boots = makeMat(c.boots, 0.55, 0.14);
    this.mats.gloves = makeMat(c.gloves, 0.6, 0.1);
    this.mats.leather = makeMat('#5a3922', 0.58, 0.12);
    this.mats.compassGlow = new THREE.MeshStandardMaterial({
      color: 0x3ef2df,
      emissive: 0x1ee6d6,
      emissiveIntensity: 1.35,
      roughness: 0.2,
      metalness: 0.3
    });
    this.mats.eyeWhite = makeMat('#ffffff', 0.25, 0.0);
    this.mats.eyeIris = makeMat(c.eyeIris || '#247a8c', 0.2, 0.15);
    this.mats.eyePupil = makeMat('#161b26', 0.1, 0.1);
    this.mats.goggleLens = new THREE.MeshStandardMaterial({
      color: 0x7ef7ff,
      emissive: 0x1cb8cc,
      emissiveIntensity: 0.75,
      roughness: 0.12,
      metalness: 0.5
    });
  }

  /**
   * Rebuilds the character geometry to match a brand-new hero archetype (hair, hat/goggles/pauldrons, cape, colors)
   */
  setAvatar(avatarPreset, overrideCostumeColors = null) {
    if (!avatarPreset) return;
    this.avatar = Object.assign({}, DEFAULT_AVATAR, avatarPreset);
    this.colors = Object.assign({}, DEFAULT_AVATAR.colors, this.avatar.colors || {}, overrideCostumeColors || {});

    // Clear old rig children cleanly
    while (this.rig.children.length > 0) {
      this.rig.remove(this.rig.children[0]);
    }
    this.capeSegments = [];
    this.ponytailPivot = null;

    this._createMaterials();
    this._buildBody();
  }

  applyCostume(colors) {
    if (!colors) return;
    Object.assign(this.colors, colors);
    this.mats.skin.color.set(this.colors.skin);
    this.mats.hair.color.set(this.colors.hair);
    this.mats.tunic.color.set(this.colors.tunic);
    this.mats.tunicTrim.color.set(this.colors.tunicTrim);
    this.mats.shirt.color.set(this.colors.shirt);
    this.mats.cape.color.set(this.colors.cape);
    this.mats.capeTrim.color.set(this.colors.capeTrim);
    this.mats.pants.color.set(this.colors.pants);
    this.mats.boots.color.set(this.colors.boots);
    this.mats.gloves.color.set(this.colors.gloves);
    if (this.colors.eyeIris) this.mats.eyeIris.color.set(this.colors.eyeIris);
  }

  _shadow(mesh) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  _buildBody() {
    const bt = this.avatar.bodyType || 'standard';
    const shoulderW = bt === 'athletic' ? 0.28 : (bt === 'slim' ? 0.228 : 0.255);
    const chestScaleX = bt === 'athletic' ? 1.24 : (bt === 'slim' ? 0.96 : 1.12);
    const waistScaleX = bt === 'slim' ? 0.96 : 1.12;

    this.hips = new THREE.Group();
    this.hips.position.y = 0.88;
    this.rig.add(this.hips);

    const pelvisMesh = this._shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.162, 0.152, 0.16, 14), this.mats.pants));
    pelvisMesh.scale.set(waistScaleX, 1, 0.78);
    this.hips.add(pelvisMesh);

    // Flared Tunic Skirt / Coat Hem
    const skirtHeight = this.avatar.accessory === 'mage_hat' ? 0.36 : 0.26;
    const tunicSkirt = this._shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.172, 0.245, skirtHeight, 16, 1, true), this.mats.tunic));
    tunicSkirt.position.y = -skirtHeight * 0.34;
    tunicSkirt.scale.set(waistScaleX * 1.03, 1, 0.84);
    this.hips.add(tunicSkirt);

    const hemTrim = this._shadow(new THREE.Mesh(new THREE.TorusGeometry(0.232, 0.015, 8, 20), this.mats.tunicTrim));
    hemTrim.rotation.x = Math.PI / 2;
    hemTrim.position.y = -skirtHeight * 0.82;
    hemTrim.scale.set(waistScaleX * 1.03, 0.84, 1);
    this.hips.add(hemTrim);

    const underFlap = this._shadow(new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.24, 0.04), this.mats.shirt));
    underFlap.position.set(0, -0.09, 0.152);
    underFlap.rotation.x = -0.18;
    this.hips.add(underFlap);

    // Utility Belt + Gold Buckle + Glowing Aether Compass
    const belt = this._shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.182, 0.075, 16), this.mats.leather));
    belt.position.y = 0.06;
    belt.scale.set(waistScaleX * 1.03, 1, 0.84);
    this.hips.add(belt);

    const buckle = this._shadow(new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.085, 0.035), this.mats.tunicTrim));
    buckle.position.set(0, 0.06, 0.152);
    this.hips.add(buckle);

    const compassGroup = new THREE.Group();
    compassGroup.position.set(-0.20 * (waistScaleX / 1.12), -0.01, 0.06);
    compassGroup.rotation.z = 0.25;
    compassGroup.rotation.y = -0.45;
    const compassCase = this._shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.066, 0.032, 16), this.mats.tunicTrim));
    compassCase.rotation.x = Math.PI / 2;
    const compassFace = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.036, 16), this.mats.compassGlow);
    compassFace.rotation.x = Math.PI / 2;
    compassGroup.add(compassCase, compassFace);
    this.hips.add(compassGroup);

    const pouch = this._shadow(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.065), this.mats.leather));
    pouch.position.set(0.19 * (waistScaleX / 1.12), 0.01, 0.04);
    pouch.rotation.z = -0.15;
    this.hips.add(pouch);

    // ================= UPPER TORSO =================
    this.torso = new THREE.Group();
    this.torso.position.y = 0.08;
    this.hips.add(this.torso);

    const chest = this._shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.155, 0.44, 16), this.mats.tunic));
    chest.position.y = 0.22;
    chest.scale.set(chestScaleX, 1, 0.76);
    this.torso.add(chest);

    const chestInsert = this._shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.04, 0.22, 10), this.mats.shirt));
    chestInsert.position.set(0, 0.31, 0.125);
    chestInsert.scale.set(1, 1, 0.45);
    this.torso.add(chestInsert);

    const goldChevronL = this._shadow(new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.22, 0.024), this.mats.tunicTrim));
    goldChevronL.position.set(-0.06, 0.31, 0.152);
    goldChevronL.rotation.z = 0.34;
    const goldChevronR = goldChevronL.clone();
    goldChevronR.position.x = 0.06;
    goldChevronR.rotation.z = -0.34;
    this.torso.add(goldChevronL, goldChevronR);

    // Ranger cross-body sash (Maya)
    if (this.avatar.accessory === 'ranger_sash') {
      const sash = this._shadow(new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.52, 0.04), this.mats.leather));
      sash.position.set(0, 0.23, 0.145);
      sash.rotation.z = 0.62;
      const sashPin = this._shadow(new THREE.Mesh(new THREE.OctahedronGeometry(0.038, 0), this.mats.tunicTrim));
      sashPin.position.set(-0.08, 0.34, 0.17);
      this.torso.add(sash, sashPin);
    }

    // Knight chestplate emblem & ornate pauldrons (Ronan)
    if (this.avatar.accessory === 'knight_pauldrons') {
      const crest = this._shadow(new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), this.mats.tunicTrim));
      crest.scale.set(1.1, 1.35, 0.4);
      crest.position.set(0, 0.28, 0.165);
      this.torso.add(crest);
    }

    // Shoulder Mantle / Scarf Collar
    const mantle = this._shadow(new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.066, 12, 22), this.mats.cape));
    mantle.rotation.x = Math.PI / 2 + 0.16;
    mantle.position.set(0, 0.425, -0.01);
    mantle.scale.set(chestScaleX * 1.04, 0.92, 0.95);
    this.torso.add(mantle);

    const clasp = this._shadow(new THREE.Mesh(new THREE.OctahedronGeometry(0.034, 1), this.mats.tunicTrim));
    clasp.position.set(0, 0.39, 0.165);
    this.torso.add(clasp);

    // ================= FLOWING CAPE OR AGILE WIND-SCARF =================
    this.capeRoot = new THREE.Group();
    this.capeRoot.position.set(0, 0.41, -0.145);
    this.torso.add(this.capeRoot);

    const isScarf = this.avatar.capeStyle === 'scarf';
    const segWidths = isScarf ? [0.16, 0.15, 0.14, 0.11] : [0.34, 0.40, 0.46, 0.50];
    const segLen = isScarf ? 0.17 : 0.21;
    let parentSeg = this.capeRoot;

    for (let i = 0; i < 4; i++) {
      const segPivot = new THREE.Group();
      if (i > 0) segPivot.position.y = -segLen;

      const panel = this._shadow(new THREE.Mesh(new THREE.BoxGeometry(segWidths[i], segLen + 0.02, 0.022), this.mats.cape));
      panel.position.y = -segLen / 2;
      segPivot.add(panel);

      if (!isScarf) {
        const trimGeo = new THREE.BoxGeometry(0.02, segLen + 0.02, 0.026);
        const trimL = new THREE.Mesh(trimGeo, this.mats.capeTrim);
        trimL.position.set(-segWidths[i] / 2 + 0.01, -segLen / 2, 0);
        const trimR = trimL.clone();
        trimR.position.x = segWidths[i] / 2 - 0.01;
        segPivot.add(trimL, trimR);
      }

      if (i === 3) {
        const bottomTrim = new THREE.Mesh(new THREE.BoxGeometry(segWidths[i], 0.028, 0.026), this.mats.capeTrim);
        bottomTrim.position.y = -segLen;
        segPivot.add(bottomTrim);
      }

      parentSeg.add(segPivot);
      this.capeSegments.push(segPivot);
      parentSeg = segPivot;
    }

    // ================= NECK, HEAD, HAIRSTYLE & HEADGEAR =================
    this.headPivot = new THREE.Group();
    this.headPivot.position.set(0, 0.46, 0);
    this.torso.add(this.headPivot);

    const neck = this._shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.11, 12), this.mats.skin));
    neck.position.y = 0.04;
    this.headPivot.add(neck);

    const headGroup = new THREE.Group();
    headGroup.position.y = 0.21;
    this.headPivot.add(headGroup);

    const cranium = this._shadow(new THREE.Mesh(new THREE.SphereGeometry(0.165, 22, 18), this.mats.skin));
    cranium.scale.set(0.95, 1.04, 0.96);
    headGroup.add(cranium);

    const chin = this._shadow(new THREE.Mesh(new THREE.SphereGeometry(0.112, 16, 12), this.mats.skin));
    chin.position.set(0, -0.075, 0.025);
    chin.scale.set(0.84, 0.85, 0.9);
    headGroup.add(chin);

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.044, 8), this.mats.skin);
    nose.position.set(0, -0.012, 0.16);
    nose.rotation.x = Math.PI / 2 - 0.3;
    headGroup.add(nose);

    const earL = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), this.mats.skin);
    earL.scale.set(0.45, 1.1, 0.8);
    earL.position.set(-0.155, -0.01, -0.01);
    const earR = earL.clone();
    earR.position.x = 0.155;
    headGroup.add(earL, earR);

    // Expressive Stylized Eyes + Eyebrows
    this.eyesGroup = new THREE.Group();
    headGroup.add(this.eyesGroup);
    for (const side of [-1, 1]) {
      const eyeWrap = new THREE.Group();
      eyeWrap.position.set(side * 0.056, 0.015, 0.138);
      eyeWrap.rotation.y = side * 0.18;

      const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 10), this.mats.eyeWhite);
      sclera.scale.set(1.08, 1.16, 0.55);
      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 10), this.mats.eyeIris);
      iris.position.set(0, 0, 0.012);
      iris.scale.set(1, 1.12, 0.5);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), this.mats.eyePupil);
      pupil.position.set(0, 0, 0.018);
      pupil.scale.set(1, 1.1, 0.4);
      const glint = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), this.mats.eyeWhite);
      glint.position.set(0.008, 0.009, 0.022);

      eyeWrap.add(sclera, iris, pupil, glint);
      this.eyesGroup.add(eyeWrap);

      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.014, 0.018), this.mats.hair);
      brow.position.set(side * 0.058, 0.062, 0.145);
      brow.rotation.z = side * -0.1;
      brow.rotation.y = side * 0.18;
      headGroup.add(brow);
    }

    this._buildHairAndHeadgear(headGroup);

    // ================= ARMS =================
    const buildArm = (side) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * shoulderW, 0.39, 0);
      this.torso.add(shoulder);

      if (this.avatar.accessory === 'knight_pauldrons') {
        const bigPauldron = this._shadow(
          new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.65), this.mats.tunicTrim)
        );
        bigPauldron.position.set(side * 0.02, 0.025, 0);
        bigPauldron.rotation.z = side * -0.25;
        shoulder.add(bigPauldron);
      } else {
        const pauldron = this._shadow(new THREE.Mesh(new THREE.SphereGeometry(0.072, 12, 10), this.mats.tunic));
        shoulder.add(pauldron);
      }

      const upperArm = this._shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.046, 0.24, 12), this.mats.tunic));
      upperArm.position.y = -0.12;
      shoulder.add(upperArm);

      const cuff = this._shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.054, 0.065, 12), this.mats.shirt));
      cuff.position.y = -0.23;
      shoulder.add(cuff);

      const elbow = new THREE.Group();
      elbow.position.y = -0.25;
      shoulder.add(elbow);

      const forearm = this._shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.036, 0.20, 12), this.mats.skin));
      forearm.position.y = -0.10;
      elbow.add(forearm);

      const glove = this._shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.041, 0.11, 12), this.mats.gloves));
      glove.position.y = -0.21;
      elbow.add(glove);

      const hand = this._shadow(new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), this.mats.skin));
      hand.scale.set(0.85, 1.15, 0.72);
      hand.position.y = -0.28;
      elbow.add(hand);

      return { shoulder, elbow };
    };

    this.leftArm = buildArm(-1);
    this.rightArm = buildArm(1);

    // ================= LEGS =================
    const buildLeg = (side) => {
      const hip = new THREE.Group();
      hip.position.set(side * (bt === 'slim' ? 0.10 : 0.112), -0.05, 0);
      this.hips.add(hip);

      const thigh = this._shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.062, 0.38, 12), this.mats.pants));
      thigh.position.y = -0.19;
      hip.add(thigh);

      const knee = new THREE.Group();
      knee.position.y = -0.39;
      hip.add(knee);

      const kneeJoint = this._shadow(new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), this.mats.pants));
      knee.add(kneeJoint);

      const bootCuff = this._shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.062, 0.11, 12), this.mats.boots));
      bootCuff.position.y = -0.09;
      knee.add(bootCuff);

      const bootTrim = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.01, 8, 14), this.mats.tunicTrim);
      bootTrim.rotation.x = Math.PI / 2;
      bootTrim.position.y = -0.04;
      knee.add(bootTrim);

      const shinBoot = this._shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.05, 0.28, 12), this.mats.boots));
      shinBoot.position.y = -0.25;
      knee.add(shinBoot);

      const foot = this._shadow(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, 0.23), this.mats.boots));
      foot.position.set(0, -0.40, 0.045);
      knee.add(foot);

      const toeCap = this._shadow(new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), this.mats.boots));
      toeCap.scale.set(1.05, 0.82, 1.15);
      toeCap.position.set(0, -0.405, 0.145);
      knee.add(toeCap);

      return { hip, knee };
    };

    this.leftLeg = buildLeg(-1);
    this.rightLeg = buildLeg(1);
  }

  _buildHairAndHeadgear(headGroup) {
    const hs = this.avatar.hairStyle || 'spiky';
    const acc = this.avatar.accessory || 'compass';

    // Base hair cap (except hooded which wraps with a cloth hood!)
    const hairCap = this._shadow(new THREE.Mesh(new THREE.SphereGeometry(0.178, 18, 14), this.mats.hair));
    hairCap.position.set(0, 0.035, -0.025);
    hairCap.scale.set(1.02, 0.98, 1.05);
    headGroup.add(hairCap);

    const lockGeo = new THREE.ConeGeometry(1, 1, 7);
    const addLocks = (configs) => {
      for (const sc of configs) {
        const lock = this._shadow(new THREE.Mesh(lockGeo, this.mats.hair));
        lock.position.set(...sc.pos);
        lock.rotation.set(...sc.rot);
        lock.scale.set(...sc.scale);
        headGroup.add(lock);
      }
    };

    if (hs === 'spiky') {
      addLocks([
        { pos: [0.02, 0.18, 0.04], rot: [-0.95, 0.1, -0.2], scale: [0.08, 0.25, 0.08] },
        { pos: [-0.09, 0.17, 0.02], rot: [-0.82, -0.25, 0.42], scale: [0.075, 0.24, 0.075] },
        { pos: [0.11, 0.16, 0.0], rot: [-0.95, 0.35, -0.48], scale: [0.072, 0.23, 0.072] },
        { pos: [0, 0.15, -0.14], rot: [-1.52, 0, 0], scale: [0.095, 0.28, 0.085] },
        { pos: [-0.12, 0.09, -0.12], rot: [-1.32, -0.45, 0.62], scale: [0.08, 0.24, 0.075] },
        { pos: [0.12, 0.09, -0.12], rot: [-1.32, 0.45, -0.62], scale: [0.08, 0.24, 0.075] },
        { pos: [-0.06, -0.02, -0.14], rot: [-2.15, -0.25, 0.32], scale: [0.068, 0.21, 0.065] },
        { pos: [0.06, -0.02, -0.14], rot: [-2.15, 0.25, -0.32], scale: [0.068, 0.21, 0.065] },
        { pos: [-0.06, 0.11, 0.135], rot: [0.55, 0.2, 0.45], scale: [0.048, 0.13, 0.045] },
        { pos: [0.05, 0.11, 0.135], rot: [0.55, -0.2, -0.42], scale: [0.05, 0.13, 0.045] }
      ]);
    } else if (hs === 'ponytail') {
      // Swept front bangs + high swinging ponytail!
      addLocks([
        { pos: [-0.07, 0.10, 0.135], rot: [0.5, 0.25, 0.5], scale: [0.05, 0.14, 0.045] },
        { pos: [0.07, 0.10, 0.135], rot: [0.5, -0.25, -0.5], scale: [0.05, 0.14, 0.045] },
        { pos: [-0.15, -0.02, 0.06], rot: [0.18, 0.1, 0.15], scale: [0.045, 0.18, 0.045] },
        { pos: [0.15, -0.02, 0.06], rot: [0.18, -0.1, -0.15], scale: [0.045, 0.18, 0.045] }
      ]);
      this.ponytailPivot = new THREE.Group();
      this.ponytailPivot.position.set(0, 0.09, -0.175);
      headGroup.add(this.ponytailPivot);

      const tie = this._shadow(new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.018, 8, 16), this.mats.tunicTrim));
      this.ponytailPivot.add(tie);

      const tailUpper = this._shadow(new THREE.Mesh(new THREE.SphereGeometry(0.088, 14, 12), this.mats.hair));
      tailUpper.scale.set(0.85, 1.45, 0.9);
      tailUpper.position.set(0, -0.08, -0.05);
      tailUpper.rotation.x = 0.45;
      const tailLower = this._shadow(new THREE.Mesh(new THREE.ConeGeometry(0.078, 0.34, 10), this.mats.hair));
      tailLower.position.set(0, -0.25, -0.11);
      tailLower.rotation.x = Math.PI - 0.28;
      this.ponytailPivot.add(tailUpper, tailLower);
    } else if (hs === 'swept_short') {
      addLocks([
        { pos: [0.0, 0.16, 0.06], rot: [-0.65, 0, -0.18], scale: [0.09, 0.18, 0.08] },
        { pos: [-0.08, 0.14, 0.04], rot: [-0.5, -0.2, 0.3], scale: [0.07, 0.16, 0.07] },
        { pos: [0.08, 0.14, 0.04], rot: [-0.5, 0.2, -0.3], scale: [0.07, 0.16, 0.07] }
      ]);
    } else if (hs === 'long_bob') {
      // Shoulder-length silky flowing hair panels
      const backCurtain = this._shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.21, 0.32, 16, 1, true, Math.PI * 0.72, Math.PI * 1.56), this.mats.hair));
      backCurtain.position.set(0, -0.07, -0.02);
      headGroup.add(backCurtain);
      addLocks([
        { pos: [-0.14, -0.08, 0.07], rot: [0.05, 0, 0.1], scale: [0.052, 0.22, 0.05] },
        { pos: [0.14, -0.08, 0.07], rot: [0.05, 0, -0.1], scale: [0.052, 0.22, 0.05] },
        { pos: [-0.05, 0.10, 0.14], rot: [0.5, 0.15, 0.4], scale: [0.048, 0.12, 0.042] },
        { pos: [0.06, 0.10, 0.14], rot: [0.5, -0.15, -0.4], scale: [0.048, 0.12, 0.042] }
      ]);
    } else if (hs === 'twin_buns') {
      for (const side of [-1, 1]) {
        const bun = this._shadow(new THREE.Mesh(new THREE.SphereGeometry(0.095, 14, 12), this.mats.hair));
        bun.position.set(side * 0.165, 0.13, -0.04);
        const ribbon = this._shadow(new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.016, 8, 16), this.mats.tunicTrim));
        ribbon.position.set(side * 0.145, 0.11, -0.035);
        ribbon.rotation.y = side * 0.7;
        headGroup.add(bun, ribbon);
      }
      addLocks([
        { pos: [-0.06, 0.10, 0.14], rot: [0.55, 0.2, 0.45], scale: [0.048, 0.13, 0.045] },
        { pos: [0.06, 0.10, 0.14], rot: [0.55, -0.2, -0.45], scale: [0.048, 0.13, 0.045] },
        { pos: [-0.14, -0.02, 0.06], rot: [0.15, 0, 0.12], scale: [0.042, 0.16, 0.042] },
        { pos: [0.14, -0.02, 0.06], rot: [0.15, 0, -0.12], scale: [0.042, 0.16, 0.042] }
      ]);
    } else if (hs === 'hooded') {
      // Sleek Adventurer Parkour Hood!
      const hoodOuter = this._shadow(new THREE.Mesh(new THREE.SphereGeometry(0.205, 18, 14), this.mats.tunic));
      hoodOuter.position.set(0, 0.03, -0.035);
      hoodOuter.scale.set(1.04, 1.06, 1.12);
      const hoodRim = this._shadow(new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.024, 10, 20), this.mats.tunicTrim));
      hoodRim.position.set(0, 0.01, 0.11);
      hoodRim.scale.set(1.0, 1.06, 0.85);
      const hoodTail = this._shadow(new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.25, 10), this.mats.tunic));
      hoodTail.position.set(0, 0.02, -0.23);
      hoodTail.rotation.x = -1.45;
      headGroup.add(hoodOuter, hoodRim, hoodTail);
    }

    // ================= HEADGEAR ACCESSORIES =================
    if (acc === 'goggles') {
      // Brass sky-scout goggles resting stylishly on forehead!
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.172, 0.018, 8, 22), this.mats.leather);
      strap.rotation.x = Math.PI / 2 - 0.18;
      strap.position.set(0, 0.11, 0.01);
      headGroup.add(strap);

      for (const side of [-1, 1]) {
        const ring = this._shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.032, 16), this.mats.tunicTrim));
        ring.rotation.x = Math.PI / 2 - 0.2;
        ring.position.set(side * 0.056, 0.125, 0.155);
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.036, 16), this.mats.goggleLens);
        lens.rotation.x = Math.PI / 2 - 0.2;
        lens.position.set(side * 0.056, 0.125, 0.158);
        headGroup.add(ring, lens);
      }
    } else if (acc === 'mage_hat') {
      // Wide-brimmed pointed Sky-Mage hat with glowing star gem!
      const hatGroup = new THREE.Group();
      hatGroup.position.set(0, 0.15, -0.02);
      hatGroup.rotation.x = -0.14;

      const brim = this._shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.025, 22), this.mats.tunic));
      const band = this._shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.185, 0.055, 18), this.mats.tunicTrim));
      band.position.y = 0.03;
      const cone = this._shadow(new THREE.Mesh(new THREE.ConeGeometry(0.175, 0.38, 16), this.mats.tunic));
      cone.position.set(0, 0.22, -0.03);
      cone.rotation.x = -0.18;
      const starGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 0), this.mats.compassGlow);
      starGem.position.set(0, 0.05, 0.18);

      hatGroup.add(brim, band, cone, starGem);
      headGroup.add(hatGroup);
    } else if (acc === 'knight_pauldrons') {
      // Golden Paladin Crown / Circlet
      const circlet = this._shadow(new THREE.Mesh(new THREE.TorusGeometry(0.172, 0.018, 8, 22), this.mats.tunicTrim));
      circlet.rotation.x = Math.PI / 2 - 0.1;
      circlet.position.set(0, 0.095, 0.0);
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.034, 0), this.mats.compassGlow);
      gem.position.set(0, 0.11, 0.172);
      headGroup.add(circlet, gem);
    } else if (acc === 'hood_visor') {
      // Glowing emerald half-mask / scarf across lower chin
      const mask = this._shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.135, 0.085, 14, 1, true, -1.1, 2.2), this.mats.cape));
      mask.position.set(0, -0.068, 0.04);
      headGroup.add(mask);
    }
  }

  setNametag(name, avatarName = null, avatarRole = null) {
    if (this.nametagSprite) {
      this.root.remove(this.nametagSprite);
      this.nametagSprite.material.map.dispose();
      this.nametagSprite.material.dispose();
      this.nametagSprite = null;
    }
    if (!name) return;

    const avName = avatarName || (this.avatar && this.avatar.name) || '';
    const avRole = avatarRole || (this.avatar && this.avatar.role) || '';
    const subLabel = avName ? (avRole ? `✦ ${avName} • ${avRole}` : `✦ ${avName}`) : '';

    const canvas = document.createElement('canvas');
    canvas.width = 420;
    canvas.height = subLabel ? 104 : 72;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(13, 24, 44, 0.78)';
    ctx.strokeStyle = 'rgba(240, 196, 92, 0.88)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(12, 8, canvas.width - 24, canvas.height - 16, 22);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (subLabel) {
      ctx.font = '700 29px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#fff9e6';
      ctx.fillText(String(name).slice(0, 20), canvas.width / 2, 37);

      ctx.font = '600 20px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#5cf5e0';
      ctx.fillText(subLabel.slice(0, 30), canvas.width / 2, 71);
    } else {
      ctx.font = '700 28px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#fff9e6';
      ctx.fillText(String(name).slice(0, 20), canvas.width / 2, canvas.height / 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    this.nametagSprite = new THREE.Sprite(mat);
    const hasTallHat = this.avatar && this.avatar.accessory === 'mage_hat';
    this.nametagSprite.position.set(0, hasTallHat ? 2.68 : 2.38, 0);
    this.nametagSprite.scale.set(2.15, subLabel ? 0.54 : 0.38, 1);
    this.root.add(this.nametagSprite);
  }

  update(dt, animState = 'idle', horizontalSpeed = 0, verticalVel = 0) {
    this.animTime += dt;
    const t = this.animTime;

    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.eyesGroup.scale.y = 0.12;
      if (this.blinkTimer < -0.11) {
        this.eyesGroup.scale.y = 1;
        this.blinkTimer = 2.6 + Math.random() * 3.2;
      }
    }

    const lerp = (cur, target, factor) => cur + (target - cur) * Math.min(1, factor * dt);

    let hipY = 0.88;
    let torsoPitch = 0;
    let torsoYaw = 0;
    let lHipX = 0, rHipX = 0, lKneeX = 0, rKneeX = 0;
    let lShX = 0, rShX = 0, lShZ = -0.14, rShZ = 0.14;
    let lElbX = -0.18, rElbX = -0.18;

    if (animState === 'run') {
      const freq = 9.5 + horizontalSpeed * 0.42;
      const s = Math.sin(t * freq);
      const c = Math.cos(t * freq);
      const amp = Math.min(1, horizontalSpeed / 9.5);

      hipY = 0.88 + Math.abs(c) * 0.08 * amp;
      torsoPitch = 0.18 * amp;
      torsoYaw = s * 0.14 * amp;

      lHipX = s * 0.82 * amp;
      rHipX = -s * 0.82 * amp;
      lKneeX = Math.max(0, -c) * 1.15 * amp;
      rKneeX = Math.max(0, c) * 1.15 * amp;

      lShX = -s * 0.72 * amp;
      rShX = s * 0.72 * amp;
      lElbX = -0.55 - Math.max(0, s) * 0.55;
      rElbX = -0.55 - Math.max(0, -s) * 0.55;
    } else if (animState === 'jump') {
      hipY = 0.92;
      torsoPitch = 0.14;
      lHipX = -0.78;
      lKneeX = 1.05;
      rHipX = 0.42;
      rKneeX = 0.35;
      lShX = -0.85;
      lShZ = -0.38;
      rShX = 0.55;
      rShZ = 0.36;
      lElbX = -0.45;
      rElbX = -0.65;
    } else if (animState === 'fall') {
      hipY = 0.90;
      torsoPitch = -0.06;
      lHipX = -0.35 + Math.sin(t * 6) * 0.08;
      rHipX = 0.25 - Math.sin(t * 6) * 0.08;
      lKneeX = 0.55;
      rKneeX = 0.45;
      lShX = -1.25;
      lShZ = -0.65;
      rShX = -1.25;
      rShZ = 0.65;
      lElbX = -0.3;
      rElbX = -0.3;
    } else {
      hipY = 0.88 + Math.sin(t * 2.2) * 0.015;
      torsoPitch = Math.sin(t * 2.2) * 0.025;
      lShZ = -0.14 - Math.sin(t * 2.2) * 0.03;
      rShZ = 0.14 + Math.sin(t * 2.2) * 0.03;
      lElbX = -0.22;
      rElbX = -0.22;
    }

    const rate = 14;
    this.hips.position.y = lerp(this.hips.position.y, hipY, rate);
    this.torso.rotation.x = lerp(this.torso.rotation.x, torsoPitch, rate);
    this.torso.rotation.y = lerp(this.torso.rotation.y, torsoYaw, rate);

    this.leftLeg.hip.rotation.x = lerp(this.leftLeg.hip.rotation.x, lHipX, rate);
    this.rightLeg.hip.rotation.x = lerp(this.rightLeg.hip.rotation.x, rHipX, rate);
    this.leftLeg.knee.rotation.x = lerp(this.leftLeg.knee.rotation.x, lKneeX, rate);
    this.rightLeg.knee.rotation.x = lerp(this.rightLeg.knee.rotation.x, rKneeX, rate);

    this.leftArm.shoulder.rotation.x = lerp(this.leftArm.shoulder.rotation.x, lShX, rate);
    this.rightArm.shoulder.rotation.x = lerp(this.rightArm.shoulder.rotation.x, rShX, rate);
    this.leftArm.shoulder.rotation.z = lerp(this.leftArm.shoulder.rotation.z, lShZ, rate);
    this.rightArm.shoulder.rotation.z = lerp(this.rightArm.shoulder.rotation.z, rShZ, rate);
    this.leftArm.elbow.rotation.x = lerp(this.leftArm.elbow.rotation.x, lElbX, rate);
    this.rightArm.elbow.rotation.x = lerp(this.rightArm.elbow.rotation.x, rElbX, rate);

    // Dynamic Cape / Scarf Physics
    const speedLift = Math.min(1.05, horizontalSpeed * 0.095);
    const fallLift = verticalVel < -1 ? Math.min(0.95, -verticalVel * 0.065) : 0;
    const baseAngle = 0.16 + speedLift + fallLift;

    for (let i = 0; i < this.capeSegments.length; i++) {
      const seg = this.capeSegments[i];
      const wave = Math.sin(t * (4.5 + horizontalSpeed * 0.5) - i * 0.85) * (0.06 + speedLift * 0.12);
      const targetX = i === 0 ? baseAngle + wave : 0.12 + wave * 1.15;
      seg.rotation.x = lerp(seg.rotation.x, targetX, 11);
    }

    // Swinging ponytail physics (Lyra!)
    if (this.ponytailPivot) {
      const ptTarget = 0.15 + speedLift * 0.75 + Math.sin(t * (5 + horizontalSpeed * 0.5)) * 0.12;
      this.ponytailPivot.rotation.x = lerp(this.ponytailPivot.rotation.x, ptTarget, 10);
    }
  }
}
