import * as THREE from 'three';

function makeCanvas(size = 256) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return { canvas: c, ctx: c.getContext('2d') };
}

function finalizeTexture(canvas, repeatX = 1, repeatY = 1) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createProceduralTextures() {
  // 1. Lush Stylized Emerald Grass (100% seamless tileable)
  const grass = makeCanvas(256);
  {
    const { ctx } = grass;
    ctx.fillStyle = '#5cbe47';
    ctx.fillRect(0, 0, 256, 256);

    // Seamless soft organic patches (wrapped across all 4 edges)
    for (let i = 0; i < 36; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const r = 24 + Math.random() * 34;
      const col = i % 2 === 0 ? 'rgba(118,214,76,0.22)' : 'rgba(66,148,50,0.20)';
      for (const ox of [-256, 0, 256]) {
        for (const oy of [-256, 0, 256]) {
          const g = ctx.createRadialGradient(x + ox, y + oy, 2, x + ox, y + oy, r);
          g.addColorStop(0, col);
          g.addColorStop(1, 'rgba(92,190,71,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Stylized painterly blade strokes
    for (let i = 0; i < 420; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const len = 5 + Math.random() * 9;
      ctx.strokeStyle = i % 3 === 0 ? 'rgba(165,235,98,0.45)' : 'rgba(46,115,38,0.30)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 4, y - len);
      ctx.stroke();
    }
    // Tiny sunlit clover/flower dots
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,244,178,0.75)' : 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.arc(Math.random() * 256, Math.random() * 256, 1.5 + Math.random() * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 2. Carved Ancient Mossy Stone Slab (matching concept art stepping stones!)
  const carvedStone = makeCanvas(256);
  {
    const { ctx, canvas } = carvedStone;
    ctx.fillStyle = '#c9c2ad';
    ctx.fillRect(0, 0, 256, 256);

    // Subtle stone grain
    for (let i = 0; i < 600; i++) {
      const v = 175 + Math.floor(Math.random() * 38);
      ctx.fillStyle = `rgba(${v},${v - 5},${v - 16},0.28)`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 4 + Math.random() * 8, 4 + Math.random() * 8);
    }

    // Carved outer frame & inner ancient spiral motifs
    ctx.strokeStyle = '#8b836f';
    ctx.lineWidth = 7;
    ctx.strokeRect(16, 16, 224, 224);

    ctx.strokeStyle = '#dfd9c4';
    ctx.lineWidth = 3;
    ctx.strokeRect(22, 22, 212, 212);

    ctx.strokeStyle = '#7e7663';
    ctx.lineWidth = 5;
    ctx.strokeRect(48, 48, 160, 160);

    // Inner rune medallion
    ctx.beginPath();
    ctx.arc(128, 128, 46, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(128, 128, 24, 0, Math.PI * 2);
    ctx.stroke();

    // Mossy patches along borders & corners
    for (let i = 0; i < 36; i++) {
      const edge = i % 4;
      let x = Math.random() * 256;
      let y = Math.random() * 256;
      if (edge === 0) y = Math.random() * 34;
      if (edge === 1) y = 222 + Math.random() * 34;
      if (edge === 2) x = Math.random() * 34;
      if (edge === 3) x = 222 + Math.random() * 34;
      const r = 10 + Math.random() * 20;
      const g = ctx.createRadialGradient(x, y, 2, x, y, r);
      g.addColorStop(0, 'rgba(92,168,54,0.82)');
      g.addColorStop(1, 'rgba(92,168,54,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3. Cliff Rock Underside
  const cliffRock = makeCanvas(256);
  {
    const { ctx } = cliffRock;
    ctx.fillStyle = '#9c9283';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 120; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const w = 18 + Math.random() * 44;
      const h = 14 + Math.random() * 32;
      const shade = 120 + Math.floor(Math.random() * 55);
      ctx.fillStyle = `rgba(${shade},${shade - 7},${shade - 16},0.45)`;
      ctx.fillRect(x, y, w, h);
    }
    ctx.strokeStyle = 'rgba(72,64,56,0.35)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 24; i++) {
      ctx.beginPath();
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 60, y + 20 + Math.random() * 40);
      ctx.stroke();
    }
  }

  // 4. Portal Swirling Vortex Texture
  const portal = makeCanvas(256);
  {
    const { ctx } = portal;
    const cx = 128;
    const cy = 128;
    const bg = ctx.createRadialGradient(cx, cy, 8, cx, cy, 126);
    bg.addColorStop(0, '#ffffff');
    bg.addColorStop(0.25, '#92fff3');
    bg.addColorStop(0.6, '#23c2c9');
    bg.addColorStop(0.9, '#195c8c');
    bg.addColorStop(1, 'rgba(25,92,140,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 256, 256);

    // Spirals
    ctx.save();
    ctx.translate(cx, cy);
    for (let arm = 0; arm < 5; arm++) {
      ctx.rotate((Math.PI * 2) / 5);
      ctx.beginPath();
      for (let t = 0; t < 52; t++) {
        const angle = t * 0.14;
        const rad = t * 2.25;
        const x = Math.cos(angle) * rad;
        const y = Math.sin(angle) * rad;
        if (t === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = arm % 2 === 0 ? 'rgba(255,250,210,0.7)' : 'rgba(130,255,245,0.65)';
      ctx.lineWidth = 6;
      ctx.stroke();
    }
    ctx.restore();
  }

  // 5. Corrupted Rift Energy Texture
  const rift = makeCanvas(256);
  {
    const { ctx } = rift;
    ctx.fillStyle = '#240b24';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 45; i++) {
      ctx.strokeStyle = i % 2 === 0 ? '#ff3b6b' : '#b83bff';
      ctx.lineWidth = 3 + Math.random() * 4;
      ctx.beginPath();
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 90, y + (Math.random() - 0.5) * 90);
      ctx.stroke();
    }
  }

  // 6. Soft Radial Glow Sprite (for light motes, particles, blob shadow)
  const glow = makeCanvas(128);
  {
    const { ctx } = glow;
    const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,248,215,0.7)');
    g.addColorStop(1, 'rgba(255,248,215,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }

  // 7. Soft Blob Shadow under character feet for crisp parkour landing depth!
  const shadow = makeCanvas(128);
  {
    const { ctx } = shadow;
    const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 58);
    g.addColorStop(0, 'rgba(18, 28, 42, 0.52)');
    g.addColorStop(0.65, 'rgba(18, 28, 42, 0.22)');
    g.addColorStop(1, 'rgba(18, 28, 42, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }

  return {
    grass: finalizeTexture(grass.canvas, 2, 2),
    carvedStone: finalizeTexture(carvedStone.canvas, 1, 1),
    cliffRock: finalizeTexture(cliffRock.canvas, 2, 1),
    portal: finalizeTexture(portal.canvas, 1, 1),
    rift: finalizeTexture(rift.canvas, 2, 1),
    glow: finalizeTexture(glow.canvas, 1, 1),
    shadow: finalizeTexture(shadow.canvas, 1, 1)
  };
}
