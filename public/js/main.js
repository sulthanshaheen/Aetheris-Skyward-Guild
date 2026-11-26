import * as THREE from 'three';
import { createProceduralTextures } from './textures.js';
import { SkyEnvironment } from './skyEnvironment.js';
import { HumanCharacter } from './humanCharacter.js';
import { WorldBuilder } from './worldBuilder.js';
import { ParticleSystem } from './particles.js';
import { PlayerController } from './playerController.js';

// ======================== STATE ========================

const state = {
  playerId: localStorage.getItem('aetheris_player_id') || 'pf-' + Math.random().toString(36).slice(2, 10),
  username: localStorage.getItem('aetheris_username') || '',
  selectedAvatarId: localStorage.getItem('aetheris_avatar_id') || 'kael_pathfinder',
  hasEnteredGame: false,
  showcaseYaw: 0.35,
  gmToken: sessionStorage.getItem('aetheris_gm_token') || null,
  player: null,
  avatars: [],
  costumes: [],
  missions: [],
  gmPool: [],
  rotation: null,
  hub: null,
  currentWorld: null,
  runStartMs: 0,
  collectedRelics: 0,
  totalRelics: 0,
  missionClearedThisRun: false,
  portalCooldown: 0
};
localStorage.setItem('aetheris_player_id', state.playerId);

const remotePlayers = new Map(); // socketId -> { character, targetPos, targetRotY, anim, speed, costumeId }

// ======================== THREE.JS CORE ========================

const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 450);

const textures = createProceduralTextures();
const skyEnv = new SkyEnvironment(scene, textures);
const particles = new ParticleSystem(scene, textures.glow);
const worldBuilder = new WorldBuilder(scene, textures);
const localCharacter = new HumanCharacter();
const controller = new PlayerController(localCharacter, camera, canvas, textures.shadow, particles);
controller.attachToScene(scene);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ======================== SOCKET.IO MULTIPLAYER ========================

const socket = window.io();

function getAvatarPreset(avatarId) {
  return state.avatars.find((a) => a.id === avatarId) || state.avatars[0] || null;
}

function getCostumeColors(costumeId) {
  if (!costumeId || costumeId === 'default_avatar') return null;
  const found = state.costumes.find((c) => c.id === costumeId);
  return found ? found.colors : null;
}

function clearRemotePlayers() {
  for (const rp of remotePlayers.values()) {
    scene.remove(rp.character.root);
  }
  remotePlayers.clear();
}

function addOrUpdateRemotePlayer(p) {
  if (!p || p.socketId === socket.id) return;
  let rp = remotePlayers.get(p.socketId);
  const avatarPreset = getAvatarPreset(p.avatarId);
  const overrideColors = getCostumeColors(p.costumeId);

  if (!rp) {
    const ch = new HumanCharacter({
      username: p.username || 'Pathfinder',
      avatar: avatarPreset,
      colors: overrideColors
    });
    ch.root.position.set(...(p.pos || [0, 3, 0]));
    scene.add(ch.root);
    rp = {
      character: ch,
      targetPos: new THREE.Vector3(...(p.pos || [0, 3, 0])),
      targetRotY: p.rotY || 0,
      anim: p.anim || 'idle',
      speed: p.speed || 0,
      username: p.username || 'Pathfinder',
      avatarId: p.avatarId || (avatarPreset && avatarPreset.id),
      costumeId: p.costumeId
    };
    remotePlayers.set(p.socketId, rp);
  } else {
    if (Array.isArray(p.pos)) rp.targetPos.set(p.pos[0], p.pos[1], p.pos[2]);
    if (typeof p.rotY === 'number') rp.targetRotY = p.rotY;
    if (p.anim) rp.anim = p.anim;
    if (typeof p.speed === 'number') rp.speed = p.speed;
    let tagNeedsUpdate = false;
    if (p.username && p.username !== rp.username) {
      rp.username = p.username;
      tagNeedsUpdate = true;
    }
    if (p.avatarId && p.avatarId !== rp.avatarId) {
      rp.avatarId = p.avatarId;
      rp.costumeId = p.costumeId;
      rp.character.setAvatar(getAvatarPreset(p.avatarId), getCostumeColors(p.costumeId));
      tagNeedsUpdate = true;
    } else if (p.costumeId !== undefined && p.costumeId !== rp.costumeId) {
      rp.costumeId = p.costumeId;
      if (p.costumeId === 'default_avatar') {
        rp.character.setAvatar(getAvatarPreset(rp.avatarId), null);
      } else {
        rp.character.applyCostume(getCostumeColors(p.costumeId));
      }
    }
    if (tagNeedsUpdate) {
      const av = getAvatarPreset(rp.avatarId);
      rp.character.setNametag(rp.username, av && av.name, av && av.role);
    }
  }
}

socket.on('room_joined', (data) => {
  clearRemotePlayers();
  loadWorldIntoScene(data.world);
  if (Array.isArray(data.activeBridges)) {
    data.activeBridges.forEach((bId) => worldBuilder.activateBridge(bId));
  }
  if (Array.isArray(data.players)) {
    data.players.forEach(addOrUpdateRemotePlayer);
  }
  updateOnlineCounter(data.onlineCount || 1);
});

socket.on('player_joined', (p) => {
  addOrUpdateRemotePlayer(p);
  addChatLine({ system: true, text: `${p.username} bergabung ke area ini.` });
});

socket.on('player_moved', (p) => {
  addOrUpdateRemotePlayer(p);
});

socket.on('player_left', ({ socketId }) => {
  const rp = remotePlayers.get(socketId);
  if (rp) {
    scene.remove(rp.character.root);
    remotePlayers.delete(socketId);
  }
});

socket.on('online_count', ({ count }) => {
  updateOnlineCounter(count);
});

socket.on('bridge_activated', ({ bridgeId, by }) => {
  if (worldBuilder.activateBridge(bridgeId)) {
    showToast(`Jembatan Cahaya diaktifkan oleh ${by}!`, 'info');
  }
});

socket.on('chat_broadcast', (msg) => {
  addChatLine(msg);
});

socket.on('missions_updated', ({ reason, missionTitle, missions, rotation, hub }) => {
  state.missions = missions || state.missions;
  if (rotation) state.rotation = rotation;
  if (hub) state.hub = hub;
  renderMissionBoard();
  updateRotationBanner();

  // If player is currently standing in the Skyward Hub, live-update the 3 physical Mission Portals!
  if (state.currentWorld && state.currentWorld.id === 'skyward-hub' && hub) {
    state.currentWorld = hub;
    worldBuilder.build(hub);
  }

  let text = 'Jadwal Misi Guild baru saja diperbarui!';
  if (reason === 'auto_rotated' || reason === 'gm_rotated') {
    text = `🎲 Rotasi Acak Siklus #${rotation ? rotation.cycleNumber : ''}! Misi baru telah muncul di Portal Hub!`;
  } else if (reason === 'gm_added' && missionTitle) {
    text = `🛡️ Game Master menambahkan misi "${missionTitle}" ke Guild!`;
  } else if (reason === 'schedule_updated') {
    text = '⏳ Jadwal rotasi acak diperbarui oleh Game Master.';
  }
  showToast(text, 'gold');
});

socket.on('mission_completed_ack', (res) => {
  state.player = res.player;
  updateProfileHUD();
  renderWardrobe();
  showVictoryModal(res);
});

// ======================== WORLD & MISSION FLOW ========================

function joinRoom(roomId) {
  closeAllModals();
  state.portalCooldown = 1.6;
  socket.emit('join_room', {
    roomId,
    playerId: state.playerId,
    username: state.username,
    avatarId: state.selectedAvatarId
  });
}

function loadWorldIntoScene(world) {
  state.currentWorld = world;
  state.collectedRelics = 0;
  state.missionClearedThisRun = false;
  state.runStartMs = performance.now();

  skyEnv.applyTheme(world.environment);
  worldBuilder.build(world);
  controller.setSpawn(world.spawn || [0, 3, 0], world.environment && world.environment.gravity);

  // Determine required relic count from mission objectives
  const collectObj = (world.objectives || []).find((o) => o.type === 'collect');
  state.totalRelics = collectObj ? collectObj.requiredCount : worldBuilder.relics.length;

  document.getElementById('hud-world-title').textContent = world.title;
  document.getElementById('hud-world-sub').textContent = world.subtitle || '';
  const isMission = world.category !== 'hub';
  document.getElementById('btn-return-hub').classList.toggle('hidden', !isMission);
  document.getElementById('mission-tracker').classList.toggle('hidden', !isMission);
  updateObjectiveTracker();
  showToast(isMission ? `Memulai Misi: ${world.title}` : 'Selamat datang di Skyward Guild Hub!', 'info');
}

function updateObjectiveTracker() {
  const world = state.currentWorld;
  if (!world || world.category === 'hub') return;

  const list = document.getElementById('objective-list');
  list.innerHTML = '';

  const relicsDone = state.collectedRelics >= state.totalRelics;

  if (state.totalRelics > 0) {
    const li = document.createElement('li');
    li.className = relicsDone ? 'done' : '';
    li.innerHTML = `<span class="obj-check">${relicsDone ? '✓' : '◆'}</span> Kumpulkan Kristal/Relik Aether <strong>${state.collectedRelics}/${state.totalRelics}</strong>`;
    list.appendChild(li);
  }

  const goalLi = document.createElement('li');
  goalLi.className = state.missionClearedThisRun ? 'done' : (relicsDone ? 'ready' : '');
  goalLi.innerHTML = `<span class="obj-check">${state.missionClearedThisRun ? '✓' : '◎'}</span> Masuki Gerbang Portal Puncak`;
  list.appendChild(goalLi);
}

function checkWorldInteractions() {
  const p = controller.pos;

  // 1. Collect Aether Relics
  for (const r of worldBuilder.relics) {
    if (r.collected) continue;
    if (p.distanceTo(r.obj.position) < 1.85) {
      r.collected = true;
      r.obj.visible = false;
      state.collectedRelics += 1;
      particles.burst(r.obj.position, { count: 22, color: 0x52fff0, speed: 5.2, size: 0.45, upward: 3.0, life: 0.75 });
      updateObjectiveTracker();
      if (state.collectedRelics >= state.totalRelics) {
        showToast('Semua Relik terkumpul! Menuju Gerbang Portal Puncak!', 'gold');
      } else {
        showToast(`Relik Aether ditemukan (${state.collectedRelics}/${state.totalRelics})`, 'info');
      }
    }
  }

  // 2. Waystone Checkpoints
  for (const cp of worldBuilder.checkpoints) {
    if (cp.activated) continue;
    if (p.distanceTo(cp.triggerPos) < cp.radius) {
      cp.activated = true;
      cp.crystalMat.color.set('#ffe46b');
      cp.crystalMat.emissive.set('#ffae19');
      cp.crystalMat.emissiveIntensity = 1.45;
      controller.setCheckpoint(cp.pos);
      particles.burst(cp.pos, { count: 24, color: 0xffe46b, speed: 4.8, size: 0.48, upward: 3.5, life: 0.8 });
      showToast('Waystone Checkpoint diaktifkan!', 'gold');
    }
  }

  // 3. Rune Switches (synced co-op via Socket.IO!)
  for (const sw of worldBuilder.switches) {
    if (sw.activated) continue;
    if (p.distanceTo(sw.pos) < sw.radius + 0.6) {
      worldBuilder.activateBridge(sw.bridgeId);
      socket.emit('activate_switch', { bridgeId: sw.bridgeId });
      particles.burst(sw.pos, { count: 24, color: 0x38ffd6, speed: 5.0, size: 0.45, upward: 3.2, life: 0.8 });
      showToast('Rune diaktifkan! Jembatan Cahaya telah terbuka!', 'gold');
    }
  }

  // 4. Hub Mission Portals
  if (state.portalCooldown <= 0) {
    for (const portal of worldBuilder.portals) {
      if (p.distanceTo(portal.pos) < portal.radius) {
        joinRoom(portal.missionId);
        return;
      }
    }
  }

  // 5. Mission Goal Portal
  if (!state.missionClearedThisRun && state.currentWorld && state.currentWorld.category !== 'hub') {
    for (const gp of worldBuilder.goalPortals) {
      if (p.distanceTo(gp.pos) < gp.radius + 0.6) {
        if (state.collectedRelics < state.totalRelics) {
          if (state.portalCooldown <= 0) {
            state.portalCooldown = 2.0;
            showToast(`Kumpulkan ${state.totalRelics - state.collectedRelics} Relik Aether lagi sebelum masuk portal!`, 'warn');
          }
        } else {
          state.missionClearedThisRun = true;
          updateObjectiveTracker();
          particles.burst(gp.pos, { count: 36, color: 0xffdf70, speed: 6.5, size: 0.55, upward: 4.5, life: 1.0 });
          const elapsedMs = Math.round(performance.now() - state.runStartMs);
          socket.emit('complete_mission', { timeMs: elapsedMs });
        }
      }
    }
  }
}

// ======================== UI RENDERERS ========================

function updateOnlineCounter(count) {
  document.getElementById('hud-online').textContent = `${count} Online`;
}

function updateProfileHUD() {
  if (!state.player) return;
  document.getElementById('hud-username').textContent = state.player.username;
  document.getElementById('hud-level').textContent = `Lv.${state.player.level}`;
  document.getElementById('hud-coins').textContent = state.player.coins;
  state.selectedAvatarId = state.player.avatarId || state.selectedAvatarId;
  const preset = getAvatarPreset(state.selectedAvatarId);
  const override = getCostumeColors(state.player.equippedCostume);
  localCharacter.setAvatar(preset, override);
  if (state.hasEnteredGame) {
    localCharacter.setNametag(state.player.username, preset && preset.name, preset && preset.role);
  }
}

function renderAvatarCards(containerId, activeId, onSelect) {
  const grid = document.getElementById(containerId);
  if (!grid) return;
  grid.innerHTML = '';

  for (const av of state.avatars) {
    const selected = av.id === activeId;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `avatar-card ${selected ? 'selected' : ''}`;
    btn.innerHTML = `
      <div class="avatar-card-top">
        <span class="avatar-icon">${av.icon || '✦'}</span>
        <div class="swatch-row">
          <span class="swatch" style="width:16px;height:16px;background:${av.colors.tunic}"></span>
          <span class="swatch" style="width:16px;height:16px;background:${av.colors.cape}"></span>
          <span class="swatch" style="width:16px;height:16px;background:${av.colors.tunicTrim}"></span>
        </div>
      </div>
      <div class="avatar-card-name">${av.name}</div>
      <div class="avatar-card-role">${av.role}</div>
    `;
    btn.addEventListener('click', () => onSelect(av));
    grid.appendChild(btn);
  }
}

function previewEntryAvatar(av) {
  state.selectedAvatarId = av.id;
  localCharacter.setAvatar(av, null);
  particles.burst(new THREE.Vector3(controller.pos.x, controller.pos.y + 1.0, controller.pos.z), {
    count: 18,
    color: 0xffdf70,
    speed: 3.6,
    size: 0.38,
    upward: 2.2,
    life: 0.6
  });
  document.getElementById('spotlight-name').textContent = av.name;
  document.getElementById('spotlight-role').textContent = av.role;
  document.getElementById('spotlight-desc').textContent = av.description;
  renderAvatarCards('entry-avatar-grid', av.id, previewEntryAvatar);
}

function renderMissionBoard() {
  const container = document.getElementById('mission-cards');
  container.innerHTML = '';

  const categoryLabels = {
    daily: { text: 'MISI HARIAN', cls: 'tag-daily' },
    weekly: { text: 'MISI MINGGUAN', cls: 'tag-weekly' },
    event: { text: 'EVENT SPESIAL', cls: 'tag-event' },
    permanent: { text: 'PERMANEN', cls: 'tag-perm' }
  };

  for (const m of state.missions) {
    const tag = categoryLabels[m.category] || categoryLabels.daily;
    const cleared = state.player && state.player.completedMissions && state.player.completedMissions[m.id];

    const card = document.createElement('div');
    card.className = 'mission-card';
    card.innerHTML = `
      <div class="mission-card-top">
        <span class="mission-tag ${tag.cls}">${tag.text}</span>
        <span class="mission-diff">${m.difficulty || 'Menengah'} • v${m.version || 1}</span>
      </div>
      <h3>${m.title}</h3>
      <p>${m.subtitle || ''}</p>
      <div class="mission-reward">
        <span>🪙 +${m.reward.coins} Koin</span>
        <span>✨ +${m.reward.xp} XP</span>
        ${cleared ? `<span class="cleared-pill">✓ Rekor ${(cleared.bestTimeMs / 1000).toFixed(1)}d</span>` : ''}
      </div>
      <button class="btn-primary btn-play-mission">Masuki Portal Misi</button>
    `;
    card.querySelector('.btn-play-mission').addEventListener('click', () => joinRoom(m.id));
    container.appendChild(card);
  }
}

function renderWardrobe() {
  // 1. Avatar switcher inside Wardrobe
  renderAvatarCards('wardrobe-avatar-grid', state.selectedAvatarId, async (av) => {
    const resp = await fetch(`/api/player/${encodeURIComponent(state.playerId)}/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatarId: av.id })
    });
    const data = await resp.json();
    if (!resp.ok) return;
    state.player = data.player;
    state.selectedAvatarId = av.id;
    localStorage.setItem('aetheris_avatar_id', av.id);
    updateProfileHUD();
    renderWardrobe();
    showToast(`Karakter diganti menjadi ${av.name} (${av.role})!`, 'gold');
  });

  // 2. Bonus costume color overrides
  const grid = document.getElementById('wardrobe-grid');
  grid.innerHTML = '';
  if (!state.player) return;

  for (const c of state.costumes) {
    const unlocked = state.player.unlockedCostumes.includes(c.id);
    const equipped = state.player.equippedCostume === c.id;

    const card = document.createElement('div');
    card.className = `wardrobe-card ${equipped ? 'equipped' : ''}`;
    card.innerHTML = `
      <div class="swatch-row">
        <span class="swatch" style="background:${c.colors.tunic}"></span>
        <span class="swatch" style="background:${c.colors.cape}"></span>
        <span class="swatch" style="background:${c.colors.tunicTrim}"></span>
        <span class="swatch" style="background:${c.colors.hair}"></span>
      </div>
      <h4>${c.name}</h4>
      <p>${c.description}</p>
      <button class="${equipped ? 'btn-equipped' : 'btn-primary'}">
        ${equipped ? 'Sedang Dipakai' : (unlocked ? 'Pakai Kostum' : `Buka (${c.price} Koin)`)}
      </button>
    `;
    card.querySelector('button').addEventListener('click', async () => {
      if (equipped) return;
      const resp = await fetch(`/api/player/${encodeURIComponent(state.playerId)}/costume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ costumeId: c.id })
      });
      const data = await resp.json();
      if (!resp.ok) {
        showToast(data.error || 'Gagal mengganti kostum.', 'warn');
        return;
      }
      state.player = data.player;
      updateProfileHUD();
      renderWardrobe();
      showToast(`Kostum "${c.name}" dipakai!`, 'gold');
    });
    grid.appendChild(card);
  }
}

async function renderLeaderboard() {
  const resp = await fetch('/api/leaderboard');
  const data = await resp.json();
  const list = document.getElementById('leaderboard-list');
  list.innerHTML = '';
  if (!data.leaderboard || data.leaderboard.length === 0) {
    list.innerHTML = '<p class="muted">Belum ada catatan penjelajah. Selesaikan misi pertamamu!</p>';
    return;
  }
  data.leaderboard.forEach((row, idx) => {
    const el = document.createElement('div');
    el.className = 'lb-row';
    el.innerHTML = `
      <span class="lb-rank">#${idx + 1}</span>
      <span class="lb-name">${row.username} <small>Lv.${row.level}</small></span>
      <span class="lb-stat">${row.xp} XP • ${row.clearedCount} Misi</span>
    `;
    list.appendChild(el);
  });
}

function showVictoryModal(res) {
  const modal = document.getElementById('modal-victory');
  document.getElementById('victory-title').textContent = `Misi Selesai: ${res.missionTitle}!`;
  document.getElementById('victory-details').innerHTML = `
    <div class="victory-stats">
      <div><strong>+${res.coinsEarned}</strong><span>Koin</span></div>
      <div><strong>+${res.xpEarned}</strong><span>XP</span></div>
      <div><strong>${(res.bestTimeMs / 1000).toFixed(1)} dtk</strong><span>Rekor Terbaik</span></div>
    </div>
    ${res.unlockedCostume ? `<div class="unlock-banner">🎉 Kostum Baru Terbuka: <strong>${res.unlockedCostume.replace('_', ' ')}</strong>!</div>` : ''}
  `;
  modal.classList.remove('hidden');
}

function addChatLine(msg) {
  const box = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = msg.system ? 'chat-line system' : 'chat-line';
  div.innerHTML = msg.system
    ? `<span>✨ ${escapeHtml(msg.text)}</span>`
    : `<strong>${escapeHtml(msg.username)}:</strong> ${escapeHtml(msg.text)}`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  while (box.children.length > 35) box.removeChild(box.firstChild);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

let toastTimer = null;
function showToast(text, kind = 'info') {
  const el = document.getElementById('toast');
  el.textContent = text;
  el.className = `toast show toast-${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3600);
}

// ======================== LIVE-OPS MISSION STUDIO (ADD NEW MISSION LIVE!) ========================

function buildProceduralMissionPieces(theme, difficulty, relicCount) {
  const pieces = [
    { id: 'start', type: 'ancient_island', pos: [0, 0, 0], size: [10, 2.4, 10], trees: true, ruins: true }
  ];
  let z = -8;
  let y = 0.8;
  let x = 0;
  const steps = difficulty === 'Pemula' ? 6 : (difficulty === 'Menengah' ? 8 : 10);

  for (let i = 0; i < steps; i++) {
    const isMoving = i % 3 === 1;
    const isCrumble = difficulty !== 'Pemula' && i % 3 === 2;
    const shiftX = (i % 2 === 0 ? 1 : -1) * (difficulty === 'Pemula' ? 1.8 : 3.2);
    x = shiftX;
    y += 0.75;

    if (isMoving) {
      pieces.push({
        id: `mp_${i}`,
        type: 'aether_platform',
        pos: [x - 3, y, z],
        size: [3.8, 0.8, 3.8],
        moveTo: [x + 3, y, z],
        speed: 2.3
      });
    } else if (isCrumble) {
      pieces.push({ id: `cr_${i}`, type: 'crumbling_stone', pos: [x, y, z], size: [3.4, 0.8, 3.4] });
    } else {
      pieces.push({ id: `st_${i}`, type: 'stepping_stone', pos: [x, y, z], size: [3.6, 0.8, 3.6] });
    }

    if (i < relicCount) {
      pieces.push({ id: `rel_${i}`, type: 'aether_relic', tag: 'aether_relic', pos: [x, y + 1.8, z] });
    }

    if (i === Math.floor(steps / 2)) {
      z -= 7.5;
      pieces.push({ id: 'cp_mid', type: 'waystone_checkpoint', pos: [0, y + 0.4, z], size: [7, 1.8, 7] });
      if (difficulty === 'Mahir') {
        pieces.push({ id: 'gey_mid', type: 'wind_geyser', pos: [0, y + 1.5, z - 2], size: [2.8, 0.6, 2.8], power: 19 });
        y += 4.2;
      }
    }
    z -= 6.5;
  }

  pieces.push({ id: 'goal_isle', type: 'ancient_island', pos: [0, y + 0.5, z - 4], size: [12, 2.8, 12], trees: true, ruins: true });
  pieces.push({ id: 'finish_portal', type: 'goal_portal', pos: [0, y + 3.9, z - 7], size: [4.2, 5.2, 1.4] });
  return pieces;
}

function updateRotationBanner() {
  const rot = state.rotation;
  if (!rot) return;
  const cycleEl = document.getElementById('rotation-cycle');
  const cdEl = document.getElementById('rotation-countdown');
  if (cycleEl) {
    cycleEl.textContent = `🎲 Siklus Acak #${rot.cycleNumber} • ${state.missions.length} dari ${rot.poolTotal} misi aktif`;
  }
  if (cdEl) {
    const diffSec = Math.max(0, Math.floor((rot.nextRotationAt - Date.now()) / 1000));
    const hrs = Math.floor(diffSec / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);
    const secs = diffSec % 60;
    const pad = (n) => String(n).padStart(2, '0');
    cdEl.textContent = hrs > 0
      ? `⏳ Rotasi dalam ${pad(hrs)}:${pad(mins)}:${pad(secs)}`
      : `⏳ Rotasi dalam ${pad(mins)}:${pad(secs)}`;
  }
}

setInterval(updateRotationBanner, 1000);

function renderGmPool() {
  const list = document.getElementById('gm-pool-list');
  const countEl = document.getElementById('gm-pool-count');
  if (!list) return;
  countEl.textContent = state.gmPool.length;
  list.innerHTML = '';

  if (state.rotation) {
    document.getElementById('gm-slots').value = String(state.rotation.slots || 3);
    document.getElementById('gm-interval').value = String(state.rotation.intervalMinutes || 30);
  }

  for (const m of state.gmPool) {
    const row = document.createElement('div');
    row.className = `gm-pool-item ${m.isActiveNow ? 'active-now' : ''}`;
    row.innerHTML = `
      <div class="gm-pool-info">
        <strong>${escapeHtml(m.title)}</strong>
        <span>${m.difficulty} • 🪙 ${m.reward.coins} Koin • ${m.environment ? m.environment.theme : 'golden_sky'}</span>
      </div>
      <div class="gm-pool-badges">
        <span class="${m.isActiveNow ? 'badge-active' : 'badge-vault'}">${m.isActiveNow ? 'AKTIF SEKARANG' : 'DI POOL'}</span>
        <button class="hud-btn btn-gm-test" title="Coba mainkan misi ini">▶</button>
        <button class="hud-btn danger btn-gm-del" title="Hapus dari pool">✕</button>
      </div>
    `;
    row.querySelector('.btn-gm-test').addEventListener('click', () => joinRoom(m.id));
    row.querySelector('.btn-gm-del').addEventListener('click', async () => {
      if (!window.confirm(`Hapus misi "${m.title}" dari pool?`)) return;
      const resp = await fetch(`/api/missions/${encodeURIComponent(m.id)}`, {
        method: 'DELETE',
        headers: { 'X-GM-Token': state.gmToken || '' }
      });
      const data = await resp.json();
      if (!resp.ok) {
        showToast(data.error || 'Gagal menghapus misi.', 'warn');
        return;
      }
      state.missions = data.missions;
      state.gmPool = data.pool;
      state.rotation = data.rotation;
      renderGmPool();
      renderMissionBoard();
    });
    list.appendChild(row);
  }
}

async function openGmPanel() {
  window.closeAllModals();
  document.getElementById('modal-gm').classList.remove('hidden');
  document.getElementById('gm-login-error').classList.add('hidden');

  if (state.gmToken) {
    const resp = await fetch('/api/gm/pool', { headers: { 'X-GM-Token': state.gmToken } });
    if (resp.ok) {
      const data = await resp.json();
      state.gmPool = data.pool;
      state.rotation = data.rotation;
      document.getElementById('gm-login-form').classList.add('hidden');
      document.getElementById('gm-dashboard').classList.remove('hidden');
      renderGmPool();
      return;
    }
    state.gmToken = null;
    sessionStorage.removeItem('aetheris_gm_token');
  }

  document.getElementById('gm-login-form').classList.remove('hidden');
  document.getElementById('gm-dashboard').classList.add('hidden');
  document.getElementById('gm-secret-input').focus();
}

const THEME_PRESETS = {
  golden_sky: { theme: 'golden_sky', skyTop: '#1c77d6', skyMid: '#68b9f8', skyHorizon: '#ffe4b5', fogColor: '#cce6ff', sunColor: '#fff2cc', ambientColor: '#9eceff', gravity: -28 },
  emerald_dawn: { theme: 'emerald_dawn', skyTop: '#14849e', skyMid: '#63d2d9', skyHorizon: '#fff2c2', fogColor: '#c9f3ec', sunColor: '#fff6d4', ambientColor: '#a6f0e8', gravity: -28 },
  sunset_citadel: { theme: 'sunset_citadel', skyTop: '#2c3e8c', skyMid: '#c46c7e', skyHorizon: '#ffd28e', fogColor: '#f2c1a0', sunColor: '#ffcb88', ambientColor: '#cfa5c8', gravity: -28 },
  crimson_dusk: { theme: 'crimson_dusk', skyTop: '#231942', skyMid: '#9f4a68', skyHorizon: '#ff9e6d', fogColor: '#d98a7c', sunColor: '#ffb578', ambientColor: '#d490a6', gravity: -28 },
  twilight_astral: { theme: 'twilight_astral', skyTop: '#0d1538', skyMid: '#2f296e', skyHorizon: '#7e5ba6', fogColor: '#362e6e', sunColor: '#c2d8ff', ambientColor: '#7a75c9', gravity: -27 }
};

function bindUI() {
  const modals = ['modal-missions', 'modal-wardrobe', 'modal-gm', 'modal-leaderboard', 'modal-victory'];
  window.closeAllModals = () => {
    modals.forEach((id) => document.getElementById(id).classList.add('hidden'));
  };

  function openModal(id) {
    window.closeAllModals();
    document.getElementById(id).classList.remove('hidden');
  }

  document.getElementById('btn-missions').addEventListener('click', () => {
    renderMissionBoard();
    updateRotationBanner();
    openModal('modal-missions');
  });
  document.getElementById('btn-wardrobe').addEventListener('click', () => {
    renderWardrobe();
    openModal('modal-wardrobe');
  });
  document.getElementById('btn-gm').addEventListener('click', openGmPanel);
  document.getElementById('btn-leaderboard').addEventListener('click', () => {
    renderLeaderboard();
    openModal('modal-leaderboard');
  });
  document.getElementById('btn-return-hub').addEventListener('click', () => joinRoom('skyward-hub'));
  document.getElementById('btn-victory-hub').addEventListener('click', () => joinRoom('skyward-hub'));
  document.getElementById('btn-victory-replay').addEventListener('click', () => {
    if (state.currentWorld) joinRoom(state.currentWorld.id);
  });

  document.querySelectorAll('.modal-close').forEach((btn) => {
    btn.addEventListener('click', () => window.closeAllModals());
  });

  // Drag on 3D canvas during Entry Showcase to spin avatar 360°!
  let entryDragging = false;
  let entryLastX = 0;
  canvas.addEventListener('pointerdown', (e) => {
    if (!state.hasEnteredGame) {
      entryDragging = true;
      entryLastX = e.clientX;
    }
  });
  window.addEventListener('pointerup', () => { entryDragging = false; });
  window.addEventListener('pointermove', (e) => {
    if (!state.hasEnteredGame && entryDragging) {
      const dx = e.clientX - entryLastX;
      entryLastX = e.clientX;
      state.showcaseYaw += dx * 0.012;
    }
  });

  // Mandatory Entry Form Submit (Name + Selected Avatar)
  document.getElementById('entry-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('entry-username').value.trim();
    const errEl = document.getElementById('entry-error');
    errEl.classList.add('hidden');

    if (nameInput.length < 2) {
      errEl.textContent = 'Nama pemain minimal 2 karakter!';
      errEl.classList.remove('hidden');
      return;
    }

    state.username = nameInput.slice(0, 20);
    localStorage.setItem('aetheris_username', state.username);
    localStorage.setItem('aetheris_avatar_id', state.selectedAvatarId);

    const resp = await fetch(`/api/player/${encodeURIComponent(state.playerId)}/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: state.username, avatarId: state.selectedAvatarId })
    });
    const data = await resp.json();
    if (!resp.ok) {
      errEl.textContent = data.error || 'Gagal menyimpan profil pemain.';
      errEl.classList.remove('hidden');
      return;
    }

    state.player = data.player;
    state.hasEnteredGame = true;
    document.getElementById('entry-screen').classList.add('hidden');
    document.getElementById('hud-top').classList.remove('hidden');
    document.getElementById('chat-panel').classList.remove('hidden');
    document.getElementById('controls-hint').classList.remove('hidden');

    controller.inputEnabled = true;
    controller.facingYaw = Math.PI;
    controller.camYaw = Math.PI;
    updateProfileHUD();
    renderMissionBoard();
    updateRotationBanner();
    renderWardrobe();
    joinRoom('skyward-hub');
  });

  // GM Login
  document.getElementById('gm-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const secret = document.getElementById('gm-secret-input').value.trim();
    const errEl = document.getElementById('gm-login-error');
    errEl.classList.add('hidden');

    const resp = await fetch('/api/gm/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret })
    });
    const data = await resp.json();
    if (!resp.ok) {
      errEl.textContent = data.error || 'Kata sandi salah.';
      errEl.classList.remove('hidden');
      return;
    }
    state.gmToken = data.token;
    sessionStorage.setItem('aetheris_gm_token', data.token);
    state.gmPool = data.pool;
    state.rotation = data.rotation;
    document.getElementById('gm-secret-input').value = '';
    document.getElementById('gm-login-form').classList.add('hidden');
    document.getElementById('gm-dashboard').classList.remove('hidden');
    renderGmPool();
    showToast('🛡️ Login Game Master berhasil!', 'gold');
  });

  document.getElementById('btn-gm-logout').addEventListener('click', () => {
    state.gmToken = null;
    sessionStorage.removeItem('aetheris_gm_token');
    window.closeAllModals();
    showToast('Keluar dari mode Game Master.', 'info');
  });

  // GM Dashboard Tabs
  document.querySelectorAll('.gm-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.gm-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      document.getElementById('gm-tab-pool').classList.toggle('hidden', target !== 'pool');
      document.getElementById('gm-tab-create').classList.toggle('hidden', target !== 'create');
    });
  });

  // GM Save Rotation Config
  document.getElementById('btn-gm-save-schedule').addEventListener('click', async () => {
    const slots = Number(document.getElementById('gm-slots').value);
    const intervalMinutes = Number(document.getElementById('gm-interval').value);
    const resp = await fetch('/api/gm/rotation-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-GM-Token': state.gmToken || '' },
      body: JSON.stringify({ slots, intervalMinutes })
    });
    const data = await resp.json();
    if (!resp.ok) {
      showToast(data.error || 'Gagal menyimpan jadwal.', 'warn');
      return;
    }
    state.rotation = data.rotation;
    state.gmPool = data.pool;
    updateRotationBanner();
    showToast(`Jadwal disimpan: ${slots} slot, rotasi acak tiap ${intervalMinutes} menit.`, 'gold');
  });

  // GM Force Random Rotation Now
  document.getElementById('btn-gm-rotate-now').addEventListener('click', async () => {
    const resp = await fetch('/api/gm/rotate', {
      method: 'POST',
      headers: { 'X-GM-Token': state.gmToken || '' }
    });
    const data = await resp.json();
    if (!resp.ok) {
      showToast(data.error || 'Gagal merotasi misi.', 'warn');
      return;
    }
    state.missions = data.missions;
    state.rotation = data.rotation;
    state.gmPool = data.pool;
    renderGmPool();
    renderMissionBoard();
    updateRotationBanner();
  });

  // Editable adventurer name
  document.getElementById('hud-username').addEventListener('click', async () => {
    const next = window.prompt('Ubah nama Penjelajahmu:', state.username);
    if (!next || !next.trim()) return;
    state.username = next.trim().slice(0, 24);
    localStorage.setItem('aetheris_username', state.username);
    const resp = await fetch(`/api/player/${encodeURIComponent(state.playerId)}/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: state.username })
    });
    const data = await resp.json();
    state.player = data.player;
    updateProfileHUD();
    showToast(`Nama diubah menjadi ${state.username}!`, 'info');
  });

  // Chat submit
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    socket.emit('chat_message', { text });
    chatInput.value = '';
    chatInput.blur();
  });

  // GM-Only Add Mission to Pool Form
  document.getElementById('studio-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('st-title').value.trim();
    const subtitle = document.getElementById('st-subtitle').value.trim();
    const category = document.getElementById('st-category').value;
    const difficulty = document.getElementById('st-difficulty').value;
    const theme = document.getElementById('st-theme').value;
    const coins = Number(document.getElementById('st-coins').value) || 200;
    const relicCount = Math.max(1, Math.min(6, Number(document.getElementById('st-relics').value) || 3));
    const featureNow = document.getElementById('st-feature-now').checked;

    const payload = {
      title,
      subtitle: subtitle || `Tantangan ${difficulty} baru dari Game Master!`,
      category,
      difficulty,
      featureNow,
      reward: { coins, xp: Math.round(coins * 0.8) },
      objectives: [
        { id: 'obj_rel', type: 'collect', label: 'Kumpulkan Kristal Aether', targetTag: 'aether_relic', requiredCount: relicCount },
        { id: 'obj_goal', type: 'reach_zone', label: 'Masuki Gerbang Portal Puncak', targetId: 'finish_portal' }
      ],
      environment: THEME_PRESETS[theme] || THEME_PRESETS.golden_sky,
      spawn: [0, 2.5, 2],
      pieces: buildProceduralMissionPieces(theme, difficulty, relicCount)
    };

    const resp = await fetch('/api/missions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GM-Token': state.gmToken || ''
      },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();
    if (!resp.ok) {
      showToast(data.error || 'Gagal menyimpan misi (butuh akses GM).', 'warn');
      return;
    }
    state.missions = data.missions;
    state.gmPool = data.pool;
    state.rotation = data.rotation;
    renderGmPool();
    renderMissionBoard();
    document.getElementById('studio-form').reset();
    document.querySelector('.gm-tab[data-tab="pool"]').click();
    showToast(`🛡️ Misi "${data.mission.title}" berhasil ditambahkan ke Pool!`, 'gold');
  });
}

// ======================== MAIN GAME LOOP ========================

const clock = new THREE.Clock();
let netSyncTimer = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  if (state.portalCooldown > 0) state.portalCooldown -= dt;

  worldBuilder.update(dt, elapsed);

  if (!state.hasEnteredGame) {
    // Live 3D Character Showcase Mode before player enters the game!
    state.showcaseYaw += dt * 0.28;
    localCharacter.root.position.set(0, 1.6, 10);
    localCharacter.root.rotation.y = state.showcaseYaw;
    localCharacter.update(dt, 'idle', 0, 0);
    controller.pos.set(0, 1.6, 10);
    controller.shadowMesh.visible = true;
    controller.shadowMesh.position.set(0, 1.63, 10);
    controller.shadowMesh.scale.setScalar(1.0);
    controller.shadowMesh.material.opacity = 0.8;

    // Frame character cleanly in the left-center of the screen so the right entry panel never covers them
    camera.position.set(0.85, 2.85, 13.7);
    camera.lookAt(0.85, 2.55, 10);

    skyEnv.update(dt, elapsed, localCharacter.root.position);
    particles.update(dt);
    renderer.render(scene, camera);
    return;
  }

  const hSpeed = controller.update(dt, worldBuilder, {
    onFall: () => showToast('Jatuh ke lautan awan! Kembali ke Checkpoint...', 'warn')
  });
  skyEnv.update(dt, elapsed, controller.pos);
  particles.update(dt);
  checkWorldInteractions();

  // Update mission timer HUD
  if (state.currentWorld && state.currentWorld.category !== 'hub' && !state.missionClearedThisRun) {
    const secs = ((performance.now() - state.runStartMs) / 1000).toFixed(1);
    document.getElementById('mission-timer').textContent = `${secs} dtk`;
  }

  // Smoothly interpolate remote multiplayer characters
  for (const rp of remotePlayers.values()) {
    rp.character.root.position.lerp(rp.targetPos, Math.min(1, 12 * dt));
    let diff = rp.targetRotY - rp.character.root.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    rp.character.root.rotation.y += diff * Math.min(1, 12 * dt);
    rp.character.update(dt, rp.anim, rp.speed, rp.anim === 'fall' ? -8 : 0);
  }

  // Send local player state at ~18 Hz
  netSyncTimer += dt;
  if (netSyncTimer >= 0.055 && state.currentWorld) {
    netSyncTimer = 0;
    socket.emit('player_state', {
      pos: [
        Number(controller.pos.x.toFixed(2)),
        Number(controller.pos.y.toFixed(2)),
        Number(controller.pos.z.toFixed(2))
      ],
      rotY: Number(controller.facingYaw.toFixed(2)),
      anim: controller.animState,
      speed: Number(hSpeed.toFixed(2)),
      avatarId: state.selectedAvatarId,
      costumeId: state.player ? state.player.equippedCostume : 'default_avatar',
      username: state.username
    });
  }

  renderer.render(scene, camera);
}

// ======================== BOOTSTRAP ========================

async function boot() {
  bindUI();
  controller.inputEnabled = false;

  const resp = await fetch(`/api/bootstrap?playerId=${encodeURIComponent(state.playerId)}`);
  const data = await resp.json();
  state.player = data.player;
  state.avatars = data.avatars || [];
  state.costumes = data.costumes || [];
  state.missions = data.missions || [];
  state.rotation = data.rotation;
  state.hub = data.hub;

  // Build Skyward Hub backdrop immediately for the live 3D Character Selection showcase!
  skyEnv.applyTheme(state.hub.environment);
  worldBuilder.build(state.hub);

  const initialAvatar = getAvatarPreset(state.selectedAvatarId) || state.avatars[0];
  if (initialAvatar) {
    previewEntryAvatar(initialAvatar);
  }

  // Pre-fill saved name if returning, or leave empty for new player
  const savedName = localStorage.getItem('aetheris_username') || '';
  if (savedName && !savedName.startsWith('Pathfinder-')) {
    document.getElementById('entry-username').value = savedName;
  }

  animate();
}

boot();
