/**
 * Interactive Visual Parkour Course Editor for Game Masters
 * Top-down grid canvas (Z horizontal: Start left -> Goal right, X vertical)
 * Supports placing, dragging, selecting, adjusting height (Y), deleting,
 * loading existing missions for editing, and auto-generating templates.
 */

const PIECE_TYPES = {
  ancient_island: { label: 'Pulau Kuno', icon: '🌿', color: '#4cb548', defaultSize: [9, 2.2, 9] },
  stepping_stone: { label: 'Batu Loncatan', icon: '🪨', color: '#b8b09c', defaultSize: [3.6, 0.8, 3.6] },
  aether_platform: { label: 'Platform Gerak', icon: '✨', color: '#e8bc52', defaultSize: [3.8, 0.8, 3.8] },
  crumbling_stone: { label: 'Batu Rapuh', icon: '🧱', color: '#d98a54', defaultSize: [3.4, 0.8, 3.4] },
  wind_geyser: { label: 'Geyser Angin', icon: '🌪️', color: '#6df5ff', defaultSize: [3.0, 0.6, 3.0] },
  corrupted_rift: { label: 'Celah Korup', icon: '🔥', color: '#ff3b6b', defaultSize: [6.0, 0.4, 2.2] },
  waystone_checkpoint: { label: 'Checkpoint', icon: '🗿', color: '#78b7ff', defaultSize: [7, 1.8, 7] },
  aether_relic: { label: 'Kristal Relik', icon: '💎', color: '#38ffe6', defaultSize: [1.6, 1.6, 1.6] },
  goal_portal: { label: 'Portal Puncak', icon: '🌀', color: '#b366ff', defaultSize: [4.2, 5.2, 1.4] }
};

export class GmMapEditor {
  constructor(canvasEl, onChange) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.onChange = onChange || (() => {});

    this.pieces = [];
    this.activeTool = 'stepping_stone';
    this.selectedIdx = -1;
    this.dragging = false;

    // World coordinate bounds mapped onto canvas:
    // Z goes from +12 (left) to -92 (right); X goes from -24 (top) to +24 (bottom)
    this.zMin = -92;
    this.zMax = 12;
    this.xMin = -24;
    this.xMax = 24;

    this._bindPointer();
    this.loadDefaultTemplate();
  }

  static getPieceTypes() {
    return PIECE_TYPES;
  }

  setTool(type) {
    this.activeTool = type;
  }

  loadDefaultTemplate() {
    this.pieces = [
      { id: 'start', type: 'ancient_island', pos: [0, 0, 0], size: [10, 2.4, 10], trees: true, ruins: true },
      { id: 's1', type: 'stepping_stone', pos: [0, 0.8, -9], size: [3.6, 0.8, 3.6] },
      { id: 'm1', type: 'aether_platform', pos: [-3, 1.6, -17], size: [3.8, 0.8, 3.8], moveTo: [3, 1.6, -17], speed: 2.3 },
      { id: 'r1', type: 'aether_relic', tag: 'aether_relic', pos: [0, 3.4, -17] },
      { id: 'cp1', type: 'waystone_checkpoint', pos: [0, 2.2, -27], size: [7, 1.8, 7] },
      { id: 'c1', type: 'crumbling_stone', pos: [2.5, 3.0, -36], size: [3.4, 0.8, 3.4] },
      { id: 'r2', type: 'aether_relic', tag: 'aether_relic', pos: [2.5, 4.8, -36] },
      { id: 'g1', type: 'wind_geyser', pos: [0, 3.6, -44], size: [3.0, 0.6, 3.0], power: 19 },
      { id: 's2', type: 'stepping_stone', pos: [0, 8.2, -53], size: [4.0, 0.8, 4.0] },
      { id: 'r3', type: 'aether_relic', tag: 'aether_relic', pos: [0, 10.0, -53] },
      { id: 'goal_isle', type: 'ancient_island', pos: [0, 8.5, -64], size: [12, 2.8, 12], trees: true, ruins: true },
      { id: 'finish_portal', type: 'goal_portal', pos: [0, 11.9, -67], size: [4.2, 5.2, 1.4] }
    ];
    this.selectedIdx = -1;
    this.render();
    this.onChange();
  }

  loadPieces(piecesArr) {
    this.pieces = JSON.parse(JSON.stringify(piecesArr || []));
    this.selectedIdx = -1;
    this.render();
    this.onChange();
  }

  getPieces() {
    return JSON.parse(JSON.stringify(this.pieces));
  }

  getRelicCount() {
    return this.pieces.filter((p) => p.type === 'aether_relic').length;
  }

  getSelected() {
    return this.selectedIdx >= 0 ? this.pieces[this.selectedIdx] : null;
  }

  updateSelectedY(deltaY) {
    const p = this.getSelected();
    if (!p) return;
    p.pos[1] = Number((p.pos[1] + deltaY).toFixed(1));
    if (p.moveTo) p.moveTo[1] = p.pos[1];
    this.render();
    this.onChange();
  }

  deleteSelected() {
    if (this.selectedIdx < 0) return;
    this.pieces.splice(this.selectedIdx, 1);
    this.selectedIdx = -1;
    this.render();
    this.onChange();
  }

  worldToCanvas(x, z) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = ((this.zMax - z) / (this.zMax - this.zMin)) * w;
    const cy = ((x - this.xMin) / (this.xMax - this.xMin)) * h;
    return { cx, cy };
  }

  canvasToWorld(cx, cy) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const z = Math.round(this.zMax - (cx / w) * (this.zMax - this.zMin));
    const x = Math.round(this.xMin + (cy / h) * (this.xMax - this.xMin));
    return { x, z };
  }

  _hitTest(cx, cy) {
    // Check relics & small items first (from end to start)
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const p = this.pieces[i];
      const pt = this.worldToCanvas(p.pos[0], p.pos[2]);
      const radius = p.type === 'ancient_island' ? 24 : 15;
      if (Math.hypot(cx - pt.cx, cy - pt.cy) <= radius) {
        return i;
      }
    }
    return -1;
  }

  _bindPointer() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      return {
        cx: ((e.clientX - rect.left) / rect.width) * this.canvas.width,
        cy: ((e.clientY - rect.top) / rect.height) * this.canvas.height
      };
    };

    this.canvas.addEventListener('pointerdown', (e) => {
      const { cx, cy } = getPos(e);
      const hit = this._hitTest(cx, cy);
      if (hit >= 0) {
        this.selectedIdx = hit;
        this.dragging = true;
        this.render();
        this.onChange();
        return;
      }

      // Place a new piece at clicked position!
      const { x, z } = this.canvasToWorld(cx, cy);
      const meta = PIECE_TYPES[this.activeTool] || PIECE_TYPES.stepping_stone;
      const baseY = this.selectedIdx >= 0 && this.pieces[this.selectedIdx] ? this.pieces[this.selectedIdx].pos[1] : 2.0;
      const newPiece = {
        id: `${this.activeTool}_${Date.now().toString(36).slice(-4)}`,
        type: this.activeTool,
        pos: [x, this.activeTool === 'aether_relic' ? Number((baseY + 1.8).toFixed(1)) : baseY, z],
        size: meta.defaultSize.slice()
      };
      if (this.activeTool === 'aether_relic') {
        newPiece.tag = 'aether_relic';
        delete newPiece.size;
      } else if (this.activeTool === 'aether_platform') {
        newPiece.moveTo = [x + 5, baseY, z];
        newPiece.speed = 2.4;
      } else if (this.activeTool === 'wind_geyser') {
        newPiece.power = 19.5;
      } else if (this.activeTool === 'ancient_island') {
        newPiece.trees = true;
      } else if (this.activeTool === 'goal_portal') {
        newPiece.id = 'finish_portal';
      }

      this.pieces.push(newPiece);
      this.selectedIdx = this.pieces.length - 1;
      this.render();
      this.onChange();
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.dragging || this.selectedIdx < 0) return;
      const { cx, cy } = getPos(e);
      const { x, z } = this.canvasToWorld(cx, cy);
      const p = this.pieces[this.selectedIdx];
      const dx = x - p.pos[0];
      const dz = z - p.pos[2];
      p.pos[0] = x;
      p.pos[2] = z;
      if (p.moveTo) {
        p.moveTo[0] += dx;
        p.moveTo[2] += dz;
      }
      this.render();
      this.onChange();
    });

    window.addEventListener('pointerup', () => {
      this.dragging = false;
    });
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#0c182c';
    ctx.fillRect(0, 0, w, h);

    // Subtle blueprint grid
    ctx.strokeStyle = 'rgba(104, 185, 248, 0.12)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= w; gx += 36) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, h);
      ctx.stroke();
    }
    for (let gy = 0; gy <= h; gy += 36) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    // Center axis guide line (X = 0)
    const axis = this.worldToCanvas(0, 0);
    ctx.strokeStyle = 'rgba(240, 196, 92, 0.22)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, axis.cy);
    ctx.lineTo(w, axis.cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Direction labels (explicitly reset textAlign so re-renders never clip!)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('START (Spawn)', 10, 8);
    ctx.textAlign = 'right';
    ctx.fillText('ARAH PUNCAK PORTAL →', w - 10, 8);

    // Draw pieces
    this.pieces.forEach((p, idx) => {
      const meta = PIECE_TYPES[p.type] || { icon: '⬛', color: '#8899bb', defaultSize: [3, 1, 3] };
      const pt = this.worldToCanvas(p.pos[0], p.pos[2]);
      const size = p.size || meta.defaultSize;
      const rw = Math.max(18, (size[2] / (this.zMax - this.zMin)) * w);
      const rh = Math.max(18, (size[0] / (this.xMax - this.xMin)) * h);

      // Moving platform travel path line
      if (p.moveTo) {
        const dest = this.worldToCanvas(p.moveTo[0], p.moveTo[2]);
        ctx.strokeStyle = 'rgba(240, 196, 92, 0.7)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(pt.cx, pt.cy);
        ctx.lineTo(dest.cx, dest.cy);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.fillStyle = meta.color;
      ctx.globalAlpha = p.type === 'aether_relic' ? 0.95 : 0.78;
      if (p.type === 'aether_relic' || p.type === 'wind_geyser') {
        ctx.beginPath();
        ctx.arc(pt.cx, pt.cy, 11, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(pt.cx - rw / 2, pt.cy - rh / 2, rw, rh);
      }
      ctx.globalAlpha = 1;

      if (idx === this.selectedIdx) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(pt.cx - rw / 2 - 3, pt.cy - rh / 2 - 3, rw + 6, rh + 6);
      }

      ctx.font = '13px system-ui, Apple Color Emoji, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(meta.icon, pt.cx, pt.cy);

      // Small height badge
      ctx.font = '700 9.5px system-ui, sans-serif';
      ctx.fillStyle = '#ffe8a3';
      ctx.fillText(`Y:${p.pos[1]}`, pt.cx, pt.cy + rh / 2 + 9);
    });
  }
}
