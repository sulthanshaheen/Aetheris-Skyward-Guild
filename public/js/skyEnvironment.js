import * as THREE from 'three';

export class SkyEnvironment {
  constructor(scene, textures) {
    this.scene = scene;
    this.textures = textures;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.clouds = [];
    this.motes = null;
    this.sunLight = null;
    this.hemiLight = null;
    this.rimLight = null;
    this.skyMat = null;
    this.sunMesh = null;

    this._initLights();
    this._initSkyDome();
    this._initClouds();
    this._initLightMotes();
  }

  _initLights() {
    this.hemiLight = new THREE.HemisphereLight(0xbbe0ff, 0x6ea858, 1.15);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff1cc, 1.9);
    this.sunLight.position.set(35, 65, 28);
    this.sunLight.castShadow = true;
    const shadowRes = window.innerWidth <= 900 ? 1024 : 2048;
    this.sunLight.shadow.mapSize.width = shadowRes;
    this.sunLight.shadow.mapSize.height = shadowRes;
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 180;
    const d = 46;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Warm golden rim light so character silhouette pops cleanly
    this.rimLight = new THREE.DirectionalLight(0x88e6ff, 0.55);
    this.rimLight.position.set(-28, 22, -35);
    this.scene.add(this.rimLight);
  }

  _initSkyDome() {
    const skyGeo = new THREE.SphereGeometry(280, 32, 24);
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color('#1c77d6') },
        midColor: { value: new THREE.Color('#68b9f8') },
        horizonColor: { value: new THREE.Color('#ffe4b5') },
        sunDir: { value: new THREE.Vector3(0.45, 0.55, -0.68).normalize() }
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 horizonColor;
        uniform vec3 sunDir;
        varying vec3 vWorldPos;
        void main() {
          vec3 dir = normalize(vWorldPos);
          float h = clamp(dir.y, -0.35, 1.0);
          vec3 col = mix(horizonColor, midColor, smoothstep(-0.22, 0.06, h));
          col = mix(col, topColor, smoothstep(0.05, 0.48, h));

          float sunDot = max(dot(dir, normalize(sunDir)), 0.0);
          col += vec3(1.0, 0.94, 0.78) * pow(sunDot, 22.0) * 0.42;
          col += vec3(1.0, 0.98, 0.9) * pow(sunDot, 220.0) * 0.95;

          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
    const dome = new THREE.Mesh(skyGeo, this.skyMat);
    this.group.add(dome);
  }

  _initClouds() {
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0.0,
      emissive: 0xffe8cc,
      emissiveIntensity: 0.14
    });

    const puffGeo = new THREE.SphereGeometry(1, 14, 12);

    for (let i = 0; i < 34; i++) {
      const cluster = new THREE.Group();
      const puffs = 4 + Math.floor(Math.random() * 4);
      for (let p = 0; p < puffs; p++) {
        const m = new THREE.Mesh(puffGeo, cloudMat);
        const r = 3.2 + Math.random() * 4.5;
        m.scale.set(r * 1.35, r * 0.72, r * 1.15);
        m.position.set(
          (Math.random() - 0.5) * 11,
          (Math.random() - 0.5) * 2.5,
          (Math.random() - 0.5) * 7
        );
        cluster.add(m);
      }
      const angle = (i / 34) * Math.PI * 2 + Math.random() * 0.2;
      const dist = 34 + Math.random() * 110;
      const y = i < 16 ? -14 - Math.random() * 14 : 14 + Math.random() * 34;
      cluster.position.set(Math.cos(angle) * dist, y, Math.sin(angle) * dist - 30);
      cluster.userData = {
        speed: 0.45 + Math.random() * 0.9,
        baseY: y,
        phase: Math.random() * Math.PI * 2
      };
      this.group.add(cluster);
      this.clouds.push(cluster);
    }
  }

  _initLightMotes() {
    const count = 220;
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 90;
      positions[i * 3 + 1] = -2 + Math.random() * 34;
      positions[i * 3 + 2] = 15 - Math.random() * 115;
      phases[i] = Math.random() * Math.PI * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

    const mat = new THREE.PointsMaterial({
      size: 0.85,
      map: this.textures.glow,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0xfff3c4
    });

    this.motes = new THREE.Points(geo, mat);
    this.group.add(this.motes);
  }

  applyTheme(env) {
    if (!env) return;
    this.skyMat.uniforms.topColor.value.set(env.skyTop || '#1c77d6');
    this.skyMat.uniforms.midColor.value.set(env.skyMid || '#68b9f8');
    this.skyMat.uniforms.horizonColor.value.set(env.skyHorizon || '#ffe4b5');

    const fogColor = new THREE.Color(env.fogColor || '#cce6ff');
    this.scene.fog = new THREE.FogExp2(fogColor, env.theme === 'twilight_astral' ? 0.0062 : 0.0052);
    this.sunLight.color.set(env.sunColor || '#fff2cc');
    this.hemiLight.color.set(env.ambientColor || '#9eceff');
    if (this.motes) {
      this.motes.material.color.set(env.theme === 'twilight_astral' ? '#8bf4ff' : '#fff3c4');
    }
  }

  update(dt, time, focusPos) {
    // Keep shadow frustum centered around player for crisp shadows everywhere!
    if (focusPos && this.sunLight) {
      this.sunLight.position.set(focusPos.x + 32, focusPos.y + 52, focusPos.z + 24);
      this.sunLight.target.position.copy(focusPos);
      this.sunLight.target.updateMatrixWorld();
    }

    for (const c of this.clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 135) c.position.x = -135;
      c.position.y = c.userData.baseY + Math.sin(time * 0.35 + c.userData.phase) * 0.7;
    }

    if (this.motes) {
      const posAttr = this.motes.geometry.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        let y = posAttr.getY(i) + dt * 0.42;
        if (y > 32) y = -2;
        posAttr.setY(i, y);
      }
      posAttr.needsUpdate = true;
    }
  }
}
