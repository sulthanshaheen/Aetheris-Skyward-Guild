// Persistent JSON database + Automatic Random Mission Scheduler for Aetheris: Skyward Guild
const fs = require('fs');
const path = require('path');
const { buildHubWorld, SEED_MISSIONS } = require('./data/seedMissions');

const DB_PATH = path.join(__dirname, 'data', 'db.json');

const AVATAR_CATALOG = [
  {
    id: 'kael_pathfinder',
    name: 'Kael',
    role: 'Skyward Pathfinder',
    icon: '🧭',
    description: 'Penjelajah pemberani berjubah merah-emas dengan kompas Aether bercahaya.',
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
  },
  {
    id: 'lyra_scout',
    name: 'Lyra',
    role: 'Windrunner Scout',
    icon: '🍃',
    description: 'Pramuka angin gesit berkuncir kuda dengan kacamata terbang emas.',
    hairStyle: 'ponytail',
    accessory: 'goggles',
    bodyType: 'slim',
    capeStyle: 'scarf',
    colors: {
      tunic: '#238a6b',
      tunicTrim: '#f2cf66',
      shirt: '#f7f3e3',
      cape: '#25b8c7',
      capeTrim: '#fff0a8',
      pants: '#273842',
      boots: '#7c5332',
      gloves: '#5e3d24',
      hair: '#d99838',
      skin: '#f6ceb0',
      eyeIris: '#26a67b'
    }
  },
  {
    id: 'ronan_paladin',
    name: 'Ronan',
    role: 'Sunlit Paladin',
    icon: '🛡️',
    description: 'Ksatria langit berbahu baja emas dengan jubah biru royal megah.',
    hairStyle: 'swept_short',
    accessory: 'knight_pauldrons',
    bodyType: 'athletic',
    capeStyle: 'long',
    colors: {
      tunic: '#e6edf7',
      tunicTrim: '#f2bd3f',
      shirt: '#265396',
      cape: '#1d66c9',
      capeTrim: '#ffe078',
      pants: '#25314a',
      boots: '#6e4a28',
      gloves: '#54391f',
      hair: '#c98e32',
      skin: '#eec09c',
      eyeIris: '#2a6fd1'
    }
  },
  {
    id: 'sora_mage',
    name: 'Sora',
    role: 'Astral Mage',
    icon: '🔮',
    description: 'Cendekiawan bintang bertopi penyihir langit dengan jubah ungu berkilau.',
    hairStyle: 'long_bob',
    accessory: 'mage_hat',
    bodyType: 'slim',
    capeStyle: 'long',
    colors: {
      tunic: '#4a2c7a',
      tunicTrim: '#ffd66b',
      shirt: '#ebe3ff',
      cape: '#6a38b8',
      capeTrim: '#7ce8ff',
      pants: '#22183a',
      boots: '#4d336e',
      gloves: '#3c2954',
      hair: '#cfe0ff',
      skin: '#f5d2bc',
      eyeIris: '#7c5cff'
    }
  },
  {
    id: 'zayn_strider',
    name: 'Zayn',
    role: 'Shadow Strider',
    icon: '⚡',
    description: 'Pelari parkour bertudung gelap dengan aksen zamrud bercahaya.',
    hairStyle: 'hooded',
    accessory: 'hood_visor',
    bodyType: 'standard',
    capeStyle: 'scarf',
    colors: {
      tunic: '#242c42',
      tunicTrim: '#34f0c8',
      shirt: '#394463',
      cape: '#16857d',
      capeTrim: '#7afce3',
      pants: '#191e2e',
      boots: '#342d40',
      gloves: '#252130',
      hair: '#222636',
      skin: '#e5b28c',
      eyeIris: '#2ee6c5'
    }
  },
  {
    id: 'maya_ranger',
    name: 'Maya',
    role: 'Ember Ranger',
    icon: '🔥',
    description: 'Penjelajah senja ceria berambut cepol dua dengan selempang petualang.',
    hairStyle: 'twin_buns',
    accessory: 'ranger_sash',
    bodyType: 'slim',
    capeStyle: 'scarf',
    colors: {
      tunic: '#9e2e3c',
      tunicTrim: '#f2b84b',
      shirt: '#fae9cf',
      cape: '#e07a34',
      capeTrim: '#ffe28a',
      pants: '#362730',
      boots: '#693b24',
      gloves: '#4f2c1b',
      hair: '#3a221c',
      skin: '#ebba96',
      eyeIris: '#c95e24'
    }
  }
];

const COSTUME_CATALOG = [
  {
    id: 'skyward_pathfinder',
    name: 'Skyward Pathfinder',
    description: 'Kostum standar Penjelajah Guild: tunik teal-krem & jubah merah emas.',
    price: 0,
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
      skin: '#f2c6a0'
    }
  },
  {
    id: 'sunlit_vanguard',
    name: 'Sunlit Vanguard',
    description: 'Kostum ksatria cahaya keemasan dengan jubah biru langit.',
    price: 150,
    colors: {
      tunic: '#e8eef5',
      tunicTrim: '#f2be42',
      shirt: '#2a5a9e',
      cape: '#1f6fd4',
      capeTrim: '#ffd966',
      pants: '#28324a',
      boots: '#7c5328',
      gloves: '#614122',
      hair: '#d99a3a',
      skin: '#f4ccb0'
    }
  },
  {
    id: 'storm_strider',
    name: 'Storm Strider',
    description: 'Kostum pelari angin senja dengan aksen zamrud bercahaya.',
    price: 300,
    colors: {
      tunic: '#2b3148',
      tunicTrim: '#34e8c4',
      shirt: '#3f4a6b',
      cape: '#19948b',
      capeTrim: '#7afce3',
      pants: '#1b2030',
      boots: '#3d3345',
      gloves: '#292433',
      hair: '#2a2d3d',
      skin: '#ebba96'
    }
  },
  {
    id: 'astral_scholar',
    name: 'Astral Scholar',
    description: 'Jubah cendekiawan bintang ungu-emas dari Menara Astral.',
    price: 500,
    colors: {
      tunic: '#4a2c7a',
      tunicTrim: '#ffd66b',
      shirt: '#ebe3ff',
      cape: '#6d39b8',
      capeTrim: '#7ce8ff',
      pants: '#22183a',
      boots: '#4e356b',
      gloves: '#3c2954',
      hair: '#d6e4ff',
      skin: '#f2cab0'
    }
  }
];

function shuffle(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

function createDefaultDb() {
  return {
    missions: SEED_MISSIONS.slice(),
    rotation: {
      slots: 3,
      intervalMinutes: 30,
      cycleNumber: 0,
      activeMissionIds: [],
      lastRotatedAt: 0,
      nextRotationAt: 0
    },
    players: {},
    completions: []
  };
}

class GameStore {
  constructor() {
    this.db = this.load();
    this._ensurePoolAndRotation();
  }

  load() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.missions)) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('[Store] Failed to load db.json, recreating:', err.message);
    }
    const fresh = createDefaultDb();
    this.save(fresh);
    return fresh;
  }

  _ensurePoolAndRotation() {
    let changed = false;

    // Ensure all 12 built-in seed missions exist in the pool
    const existingIds = new Set(this.db.missions.map((m) => m.id));
    for (const seed of SEED_MISSIONS) {
      if (!existingIds.has(seed.id)) {
        this.db.missions.push(seed);
        changed = true;
      }
    }

    if (!this.db.rotation) {
      this.db.rotation = {
        slots: 3,
        intervalMinutes: 30,
        cycleNumber: 0,
        activeMissionIds: [],
        lastRotatedAt: 0,
        nextRotationAt: 0
      };
      changed = true;
    }

    // Trigger initial random schedule if none active or expired
    const validActive = (this.db.rotation.activeMissionIds || []).filter((id) =>
      this.db.missions.some((m) => m.id === id && m.isPublished !== false)
    );
    if (validActive.length === 0 || Date.now() >= (this.db.rotation.nextRotationAt || 0)) {
      this.rotateMissionsRandomly();
    } else if (changed) {
      this.save();
    }
  }

  save(data) {
    const target = data || this.db;
    const tmpPath = DB_PATH + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(target, null, 2), 'utf8');
    fs.renameSync(tmpPath, DB_PATH);
  }

  /**
   * Randomly selects a balanced fresh batch of missions from the Mission Pool!
   * Avoids immediately repeating the previous cycle's missions whenever possible,
   * and tries to include varied difficulties (Pemula / Menengah / Mahir).
   */
  rotateMissionsRandomly() {
    const published = this.db.missions.filter((m) => m.isPublished !== false);
    const slots = Math.max(1, Math.min(6, Number(this.db.rotation.slots) || 3));
    const prevSet = new Set(this.db.rotation.activeMissionIds || []);

    const freshCandidates = published.filter((m) => !prevSet.has(m.id));
    const pool = freshCandidates.length >= slots ? freshCandidates : published;

    const chosen = [];
    const chosenIds = new Set();

    // Try picking 1 from each difficulty tier for balanced fun when slots >= 3
    if (slots >= 3) {
      for (const tier of ['Pemula', 'Menengah', 'Mahir']) {
        const tierList = shuffle(pool.filter((m) => m.difficulty === tier && !chosenIds.has(m.id)));
        if (tierList.length > 0 && chosen.length < slots) {
          chosen.push(tierList[0]);
          chosenIds.add(tierList[0].id);
        }
      }
    }

    // Fill any remaining slots randomly from remaining pool
    const remaining = shuffle(pool.filter((m) => !chosenIds.has(m.id)));
    for (const m of remaining) {
      if (chosen.length >= slots) break;
      chosen.push(m);
      chosenIds.add(m.id);
    }

    // Fallback if freshCandidates had fewer than slots
    if (chosen.length < slots) {
      const backup = shuffle(published.filter((m) => !chosenIds.has(m.id)));
      for (const m of backup) {
        if (chosen.length >= slots) break;
        chosen.push(m);
        chosenIds.add(m.id);
      }
    }

    const now = Date.now();
    const intervalMs = Math.max(1, Number(this.db.rotation.intervalMinutes) || 30) * 60 * 1000;

    this.db.rotation.activeMissionIds = chosen.map((m) => m.id);
    this.db.rotation.cycleNumber = (this.db.rotation.cycleNumber || 0) + 1;
    this.db.rotation.lastRotatedAt = now;
    this.db.rotation.nextRotationAt = now + intervalMs;
    this.save();

    return {
      activeMissions: this.getActiveMissions(),
      rotation: this.getRotationInfo()
    };
  }

  checkAutoRotation() {
    if (Date.now() >= (this.db.rotation.nextRotationAt || 0)) {
      return this.rotateMissionsRandomly();
    }
    return null;
  }

  updateRotationConfig({ slots, intervalMinutes }) {
    if (slots !== undefined) {
      this.db.rotation.slots = Math.max(1, Math.min(6, Number(slots) || 3));
    }
    if (intervalMinutes !== undefined) {
      this.db.rotation.intervalMinutes = Math.max(1, Math.min(10080, Number(intervalMinutes) || 30));
    }
    const intervalMs = this.db.rotation.intervalMinutes * 60 * 1000;
    this.db.rotation.nextRotationAt = Date.now() + intervalMs;
    this.save();
    return this.getRotationInfo();
  }

  getRotationInfo() {
    return {
      slots: this.db.rotation.slots,
      intervalMinutes: this.db.rotation.intervalMinutes,
      cycleNumber: this.db.rotation.cycleNumber,
      activeMissionIds: this.db.rotation.activeMissionIds,
      lastRotatedAt: this.db.rotation.lastRotatedAt,
      nextRotationAt: this.db.rotation.nextRotationAt,
      poolTotal: this.db.missions.length
    };
  }

  getActiveMissions() {
    const activeIds = this.db.rotation.activeMissionIds || [];
    return activeIds
      .map((id) => this.db.missions.find((m) => m.id === id))
      .filter(Boolean);
  }

  listAllPoolMissions() {
    const activeSet = new Set(this.db.rotation.activeMissionIds || []);
    return this.db.missions.map((m) => Object.assign({}, m, { isActiveNow: activeSet.has(m.id) }));
  }

  getHub() {
    return buildHubWorld(this.getActiveMissions());
  }

  getCostumes() {
    return COSTUME_CATALOG;
  }

  getAvatars() {
    return AVATAR_CATALOG;
  }

  getMission(id) {
    if (id === 'skyward-hub') return this.getHub();
    return this.db.missions.find((m) => m.id === id) || null;
  }

  // Game Master only: add or update a mission in the pool
  upsertMission(missionInput) {
    if (!missionInput || !missionInput.title) {
      throw new Error('Judul misi wajib diisi.');
    }
    const cleanId =
      missionInput.id && String(missionInput.id).trim()
        ? String(missionInput.id).trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-')
        : 'gm-' + Date.now();

    const existingIdx = this.db.missions.findIndex((m) => m.id === cleanId);

    const mission = {
      id: cleanId,
      version: existingIdx >= 0 ? (this.db.missions[existingIdx].version || 1) + 1 : 1,
      title: String(missionInput.title).slice(0, 80),
      subtitle: String(missionInput.subtitle || 'Misi baru dari Game Master Aetheris!').slice(0, 160),
      category: ['daily', 'weekly', 'event', 'permanent'].includes(missionInput.category)
        ? missionInput.category
        : 'daily',
      difficulty: ['Pemula', 'Menengah', 'Mahir'].includes(missionInput.difficulty)
        ? missionInput.difficulty
        : 'Menengah',
      isPublished: missionInput.isPublished !== false,
      reward: {
        coins: Math.max(25, Math.min(2000, Number((missionInput.reward && missionInput.reward.coins) || 200))),
        xp: Math.max(25, Math.min(2000, Number((missionInput.reward && missionInput.reward.xp) || 150))),
        costumeUnlock: (missionInput.reward && missionInput.reward.costumeUnlock) || null
      },
      objectives: Array.isArray(missionInput.objectives) && missionInput.objectives.length > 0
        ? missionInput.objectives
        : [
            { id: 'obj_collect', type: 'collect', label: 'Kumpulkan Kristal Aether', targetTag: 'aether_relic', requiredCount: 3 },
            { id: 'obj_goal', type: 'reach_zone', label: 'Masuki Gerbang Portal Puncak', targetId: 'finish_portal' }
          ],
      environment: missionInput.environment || SEED_MISSIONS[0].environment,
      spawn: Array.isArray(missionInput.spawn) ? missionInput.spawn : [0, 2.5, 2],
      pieces: Array.isArray(missionInput.pieces) && missionInput.pieces.length > 0
        ? missionInput.pieces
        : SEED_MISSIONS[0].pieces
    };

    if (existingIdx >= 0) {
      this.db.missions[existingIdx] = mission;
    } else {
      this.db.missions.unshift(mission);
    }

    // Optional: immediately feature the new mission in slot 1 if GM checked "featureNow"
    if (missionInput.featureNow) {
      const ids = (this.db.rotation.activeMissionIds || []).filter((id) => id !== mission.id);
      ids.unshift(mission.id);
      this.db.rotation.activeMissionIds = ids.slice(0, this.db.rotation.slots || 3);
    }

    this.save();
    return mission;
  }

  deleteMission(id) {
    const idx = this.db.missions.findIndex((m) => m.id === id);
    if (idx < 0) return false;
    this.db.missions.splice(idx, 1);
    this.db.rotation.activeMissionIds = (this.db.rotation.activeMissionIds || []).filter((mid) => mid !== id);
    if (this.db.rotation.activeMissionIds.length === 0 && this.db.missions.length > 0) {
      this.rotateMissionsRandomly();
    } else {
      this.save();
    }
    return true;
  }

  getOrCreatePlayer(playerId, username, avatarId) {
    const id = String(playerId || 'guest-' + Math.random().toString(36).slice(2, 9));
    const validAvatar = AVATAR_CATALOG.find((a) => a.id === avatarId);
    if (!this.db.players[id]) {
      this.db.players[id] = {
        id,
        username: String(username || 'Pathfinder').slice(0, 24),
        avatarId: validAvatar ? validAvatar.id : AVATAR_CATALOG[0].id,
        coins: 50,
        xp: 0,
        level: 1,
        equippedCostume: 'default_avatar',
        unlockedCostumes: ['default_avatar', 'skyward_pathfinder'],
        completedMissions: {},
        createdAt: new Date().toISOString()
      };
      this.save();
    } else {
      let changed = false;
      if (!this.db.players[id].avatarId) {
        this.db.players[id].avatarId = AVATAR_CATALOG[0].id;
        changed = true;
      }
      if (username && String(username).trim()) {
        this.db.players[id].username = String(username).trim().slice(0, 24);
        changed = true;
      }
      if (validAvatar) {
        this.db.players[id].avatarId = validAvatar.id;
        this.db.players[id].equippedCostume = 'default_avatar';
        changed = true;
      }
      if (changed) this.save();
    }
    return this.db.players[id];
  }

  equipOrBuyCostume(playerId, costumeId) {
    const player = this.getOrCreatePlayer(playerId);
    if (costumeId === 'default_avatar') {
      player.equippedCostume = 'default_avatar';
      this.save();
      return player;
    }
    const costume = COSTUME_CATALOG.find((c) => c.id === costumeId);
    if (!costume) throw new Error('Kostum tidak ditemukan.');

    if (!player.unlockedCostumes.includes(costumeId)) {
      if (player.coins < costume.price) {
        throw new Error('Koin belum cukup untuk membuka kostum ini.');
      }
      player.coins -= costume.price;
      player.unlockedCostumes.push(costumeId);
    }
    player.equippedCostume = costumeId;
    this.save();
    return player;
  }

  recordCompletion(playerId, missionId, timeMs) {
    const player = this.getOrCreatePlayer(playerId);
    const mission = this.getMission(missionId);
    if (!mission || mission.category === 'hub') {
      throw new Error('Misi tidak valid.');
    }

    const safeTime = Math.max(1500, Math.round(Number(timeMs) || 30000));
    const prev = player.completedMissions[missionId];
    const isFirstClear = !prev;
    const rewardMultiplier = isFirstClear ? 1 : 0.4;
    const coinsEarned = Math.round((mission.reward.coins || 100) * rewardMultiplier);
    const xpEarned = Math.round((mission.reward.xp || 80) * rewardMultiplier);

    player.coins += coinsEarned;
    player.xp += xpEarned;
    player.level = 1 + Math.floor(player.xp / 250);

    let unlockedCostume = null;
    if (mission.reward.costumeUnlock && !player.unlockedCostumes.includes(mission.reward.costumeUnlock)) {
      player.unlockedCostumes.push(mission.reward.costumeUnlock);
      unlockedCostume = mission.reward.costumeUnlock;
    }

    const bestTimeMs = prev ? Math.min(prev.bestTimeMs, safeTime) : safeTime;
    player.completedMissions[missionId] = {
      bestTimeMs,
      clears: (prev ? prev.clears : 0) + 1,
      lastClearedAt: new Date().toISOString()
    };

    this.db.completions.push({
      playerId: player.id,
      username: player.username,
      missionId,
      missionTitle: mission.title,
      timeMs: safeTime,
      at: new Date().toISOString()
    });
    if (this.db.completions.length > 200) {
      this.db.completions = this.db.completions.slice(-200);
    }

    this.save();
    return {
      player,
      coinsEarned,
      xpEarned,
      isFirstClear,
      bestTimeMs,
      unlockedCostume
    };
  }

  getLeaderboard(missionId) {
    const entries = [];
    for (const p of Object.values(this.db.players)) {
      if (missionId) {
        const rec = p.completedMissions[missionId];
        if (rec) {
          entries.push({
            username: p.username,
            level: p.level,
            bestTimeMs: rec.bestTimeMs,
            clears: rec.clears
          });
        }
      } else {
        entries.push({
          username: p.username,
          level: p.level,
          xp: p.xp,
          coins: p.coins,
          clearedCount: Object.keys(p.completedMissions).length
        });
      }
    }
    if (missionId) {
      entries.sort((a, b) => a.bestTimeMs - b.bestTimeMs);
    } else {
      entries.sort((a, b) => b.xp - a.xp || b.coins - a.coins);
    }
    return entries.slice(0, 10);
  }
}

module.exports = { GameStore, COSTUME_CATALOG, AVATAR_CATALOG };
