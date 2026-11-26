// Aetheris: Skyward Guild — Express REST API + Game Master Auth + Auto Random Mission Scheduler + Socket.IO Multiplayer
const crypto = require('crypto');
const http = require('http');
const path = require('path');
const express = require('express');
const { Server } = require('socket.io');
const { GameStore } = require('./store');

const PORT = Number(process.env.PORT) || 3000;
const GM_SECRET = process.env.GM_SECRET || 'AETHERIS-GM-2026';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  pingInterval: 5000,
  pingTimeout: 8000
});

const store = new GameStore();
const validGmTokens = new Set();

app.use(express.json({ limit: '1mb' }));
app.use('/vendor/three', express.static(path.join(__dirname, '..', 'node_modules', 'three')));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (req, res) => {
  res.json({ ok: true, online: countActivePlayers() });
});

function requireGameMaster(req, res, next) {
  const token = req.headers['x-gm-token'];
  if (!token || !validGmTokens.has(token)) {
    return res.status(403).json({ error: 'Akses ditolak: hanya Game Master yang dapat mengelola misi.' });
  }
  next();
}

function broadcastRotationUpdate(reason, missionTitle) {
  io.emit('missions_updated', {
    reason,
    missionTitle: missionTitle || null,
    missions: store.getActiveMissions(),
    rotation: store.getRotationInfo(),
    hub: store.getHub()
  });
}

// Automatic random mission scheduler tick (every 10 seconds)
setInterval(() => {
  const rotated = store.checkAutoRotation();
  if (rotated) {
    console.log(`[Scheduler] Auto-rotated to Cycle #${rotated.rotation.cycleNumber}: ${rotated.activeMissions.map((m) => m.title).join(', ')}`);
    broadcastRotationUpdate('auto_rotated');
  }
}, 10000);

// ======================== PUBLIC PLAYER API ========================

app.get('/api/bootstrap', (req, res) => {
  const player = store.getOrCreatePlayer(req.query.playerId, req.query.username, req.query.avatarId);
  res.json({
    player,
    hub: store.getHub(),
    missions: store.getActiveMissions(),
    rotation: store.getRotationInfo(),
    serverConfig: store.getServerConfig(),
    avatars: store.getAvatars(),
    costumes: store.getCostumes(),
    leaderboard: store.getLeaderboard()
  });
});

app.get('/api/missions', (req, res) => {
  res.json({
    missions: store.getActiveMissions(),
    rotation: store.getRotationInfo()
  });
});

app.get('/api/missions/:id', (req, res) => {
  const mission = store.getMission(req.params.id);
  if (!mission) return res.status(404).json({ error: 'Misi tidak ditemukan.' });
  res.json({ mission });
});

app.post('/api/player/:id/profile', (req, res) => {
  const username = req.body && req.body.username;
  const avatarId = req.body && req.body.avatarId;
  const player = store.getOrCreatePlayer(req.params.id, username, avatarId);
  res.json({ player });
});

app.post('/api/player/:id/costume', (req, res) => {
  try {
    const player = store.equipOrBuyCostume(req.params.id, req.body && req.body.costumeId);
    res.json({ player });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/leaderboard', (req, res) => {
  res.json({ leaderboard: store.getLeaderboard(req.query.missionId) });
});

// ======================== GAME MASTER ONLY API ========================

function getOnlinePlayerList() {
  const list = [];
  for (const [roomId, roomMap] of rooms.entries()) {
    const mission = store.getMission(roomId);
    for (const meta of roomMap.values()) {
      const p = store.db.players[meta.playerId];
      list.push({
        socketId: meta.socketId,
        playerId: meta.playerId,
        username: meta.username,
        avatarId: meta.avatarId,
        roomId,
        roomTitle: mission ? mission.title : roomId,
        level: p ? p.level : 1,
        coins: p ? p.coins : 0
      });
    }
  }
  return list;
}

app.post('/api/gm/login', (req, res) => {
  const secret = String((req.body && req.body.secret) || '').trim();
  if (secret !== GM_SECRET) {
    return res.status(401).json({ error: 'Kata sandi Game Master salah!' });
  }
  const token = crypto.randomBytes(24).toString('hex');
  validGmTokens.add(token);
  res.json({
    token,
    pool: store.listAllPoolMissions(),
    rotation: store.getRotationInfo(),
    serverConfig: store.getServerConfig(),
    stats: store.getStats(),
    onlinePlayers: getOnlinePlayerList()
  });
});

app.get('/api/gm/pool', requireGameMaster, (req, res) => {
  res.json({
    pool: store.listAllPoolMissions(),
    rotation: store.getRotationInfo(),
    serverConfig: store.getServerConfig(),
    stats: store.getStats(),
    onlinePlayers: getOnlinePlayerList()
  });
});

app.post('/api/gm/missions/:id/activate', requireGameMaster, (req, res) => {
  try {
    const result = store.activateMissionNow(req.params.id);
    broadcastRotationUpdate('gm_featured', result.mission.title);
    res.json({
      missions: result.activeMissions,
      rotation: result.rotation,
      pool: store.listAllPoolMissions(),
      stats: store.getStats()
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/gm/missions/:id/toggle', requireGameMaster, (req, res) => {
  try {
    const result = store.toggleMissionPublished(req.params.id);
    broadcastRotationUpdate('gm_toggled', result.mission.title);
    res.json({
      missions: result.activeMissions,
      rotation: result.rotation,
      pool: store.listAllPoolMissions(),
      stats: store.getStats()
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/gm/announce', requireGameMaster, (req, res) => {
  const text = String((req.body && req.body.text) || '').trim().slice(0, 160);
  if (!text) return res.status(400).json({ error: 'Pesan pengumuman tidak boleh kosong.' });
  io.emit('gm_announcement', { text, at: Date.now() });
  io.emit('chat_broadcast', { system: true, text: `📢 [GAME MASTER] ${text}` });
  res.json({ ok: true });
});

app.post('/api/gm/event-config', requireGameMaster, (req, res) => {
  const cfg = store.updateServerConfig(req.body || {});
  io.emit('server_config_updated', { serverConfig: cfg });
  if (cfg.rewardMultiplier > 1) {
    io.emit('gm_announcement', {
      text: `⚡ EVENT AKTIF: Bonus Hadiah ${cfg.rewardMultiplier}x Koin & XP untuk semua misi!${cfg.eventBanner ? ' — ' + cfg.eventBanner : ''}`,
      at: Date.now()
    });
  }
  res.json({ serverConfig: cfg });
});

app.post('/api/gm/players/:playerId/gift', requireGameMaster, (req, res) => {
  try {
    const amount = Number(req.body && req.body.amount) || 100;
    const { player } = store.giftPlayerCoins(req.params.playerId, amount);
    // Notify the gifted player live if online
    for (const roomMap of rooms.values()) {
      for (const [sid, meta] of roomMap.entries()) {
        if (meta.playerId === player.id) {
          const sock = io.sockets.sockets.get(sid);
          if (sock) sock.emit('gm_gift_received', { amount, player });
        }
      }
    }
    res.json({ player, onlinePlayers: getOnlinePlayerList() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/gm/players/:socketId/teleport-hub', requireGameMaster, (req, res) => {
  const sock = io.sockets.sockets.get(req.params.socketId);
  if (!sock) return res.status(404).json({ error: 'Pemain tidak sedang online.' });
  sock.emit('gm_force_hub', { reason: 'Kamu dipanggil kembali ke Skyward Guild Hub oleh Game Master.' });
  res.json({ ok: true });
});

app.post('/api/gm/rotate', requireGameMaster, (req, res) => {
  const result = store.rotateMissionsRandomly();
  broadcastRotationUpdate('gm_rotated');
  res.json({
    missions: result.activeMissions,
    rotation: result.rotation,
    pool: store.listAllPoolMissions()
  });
});

app.post('/api/gm/rotation-config', requireGameMaster, (req, res) => {
  const rotation = store.updateRotationConfig(req.body || {});
  broadcastRotationUpdate('schedule_updated');
  res.json({
    rotation,
    missions: store.getActiveMissions(),
    pool: store.listAllPoolMissions()
  });
});

app.post('/api/missions', requireGameMaster, (req, res) => {
  try {
    const mission = store.upsertMission(req.body);
    broadcastRotationUpdate('gm_added', mission.title);
    res.status(201).json({
      mission,
      missions: store.getActiveMissions(),
      pool: store.listAllPoolMissions(),
      rotation: store.getRotationInfo()
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/missions/:id', requireGameMaster, (req, res) => {
  try {
    const mission = store.upsertMission(Object.assign({}, req.body, { id: req.params.id }));
    broadcastRotationUpdate('gm_updated', mission.title);
    res.json({
      mission,
      missions: store.getActiveMissions(),
      pool: store.listAllPoolMissions(),
      rotation: store.getRotationInfo()
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/missions/:id', requireGameMaster, (req, res) => {
  const ok = store.deleteMission(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Misi tidak ditemukan.' });
  broadcastRotationUpdate('gm_deleted');
  res.json({
    ok: true,
    missions: store.getActiveMissions(),
    pool: store.listAllPoolMissions(),
    rotation: store.getRotationInfo()
  });
});

// ======================== REALTIME MULTIPLAYER ========================

const rooms = new Map();
const roomBridges = new Map();
const INACTIVE_TIMEOUT_MS = 15000;

function getRoomMap(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Map());
  return rooms.get(roomId);
}

function getRoomBridges(roomId) {
  if (!roomBridges.has(roomId)) roomBridges.set(roomId, new Set());
  return roomBridges.get(roomId);
}

function countActivePlayers() {
  let total = 0;
  for (const roomMap of rooms.values()) {
    total += roomMap.size;
  }
  return total;
}

function broadcastOnlineCount() {
  io.emit('online_count', { count: countActivePlayers() });
}

function evictFromRoom(roomId, socketId) {
  const roomMap = rooms.get(roomId);
  if (!roomMap || !roomMap.has(socketId)) return false;
  const old = roomMap.get(socketId);
  roomMap.delete(socketId);
  if (roomMap.size === 0) {
    rooms.delete(roomId);
    roomBridges.delete(roomId);
  }
  io.to(roomId).emit('player_left', { socketId, username: old && old.username });
  return true;
}

// Sweep inactive / backgrounded / ghost players every 5 seconds
setInterval(() => {
  const now = Date.now();
  let removedAny = false;
  for (const [roomId, roomMap] of Array.from(rooms.entries())) {
    for (const [sid, meta] of Array.from(roomMap.entries())) {
      if (now - (meta.lastSeenAt || 0) > INACTIVE_TIMEOUT_MS) {
        if (evictFromRoom(roomId, sid)) {
          removedAny = true;
          const sock = io.sockets.sockets.get(sid);
          if (sock) sock.leave(roomId);
        }
      }
    }
  }
  if (removedAny) {
    broadcastOnlineCount();
  }
}, 5000);

io.on('connection', (socket) => {
  let currentRoom = null;
  let playerMeta = {
    socketId: socket.id,
    playerId: null,
    username: 'Pathfinder',
    costumeId: 'default_avatar',
    pos: [0, 3, 10],
    rotY: 0,
    anim: 'idle',
    speed: 0,
    lastSeenAt: Date.now()
  };

  function leaveCurrentRoom() {
    if (!currentRoom) return;
    evictFromRoom(currentRoom, socket.id);
    socket.leave(currentRoom);
    currentRoom = null;
  }

  socket.on('join_room', (payload) => {
    leaveCurrentRoom();
    const roomId = (payload && payload.roomId) || 'skyward-hub';
    const world = store.getMission(roomId);
    if (!world) return;

    const p = store.getOrCreatePlayer(payload && payload.playerId, payload && payload.username, payload && payload.avatarId);

    // Evict any stale ghost socket with the same playerId (e.g., quick tab reload)
    for (const [rId, rMap] of Array.from(rooms.entries())) {
      for (const [sid, meta] of Array.from(rMap.entries())) {
        if (sid !== socket.id && meta.playerId === p.id) {
          evictFromRoom(rId, sid);
          const staleSock = io.sockets.sockets.get(sid);
          if (staleSock) staleSock.leave(rId);
        }
      }
    }

    currentRoom = roomId;
    playerMeta = {
      socketId: socket.id,
      playerId: p.id,
      username: p.username,
      avatarId: p.avatarId || 'kael_pathfinder',
      costumeId: p.equippedCostume,
      pos: world.spawn.slice(),
      rotY: 0,
      anim: 'idle',
      speed: 0,
      runStartedAt: Date.now(),
      lastSeenAt: Date.now()
    };

    socket.join(roomId);
    const roomMap = getRoomMap(roomId);
    roomMap.set(socket.id, playerMeta);

    const others = [];
    for (const [sid, data] of roomMap.entries()) {
      if (sid !== socket.id) others.push(data);
    }

    socket.emit('room_joined', {
      roomId,
      world,
      players: others,
      activeBridges: Array.from(getRoomBridges(roomId)),
      onlineCount: countActivePlayers()
    });

    socket.to(roomId).emit('player_joined', playerMeta);
    broadcastOnlineCount();
  });

  socket.on('player_state', (state) => {
    if (!currentRoom || !state) return;
    const roomMap = rooms.get(currentRoom);
    if (!roomMap || !roomMap.has(socket.id)) return;

    playerMeta.lastSeenAt = Date.now();
    if (Array.isArray(state.pos) && state.pos.length === 3) playerMeta.pos = state.pos;
    if (typeof state.rotY === 'number') playerMeta.rotY = state.rotY;
    if (typeof state.anim === 'string') playerMeta.anim = state.anim;
    if (typeof state.speed === 'number') playerMeta.speed = state.speed;
    if (typeof state.costumeId === 'string') playerMeta.costumeId = state.costumeId;
    if (typeof state.avatarId === 'string') playerMeta.avatarId = state.avatarId;
    if (typeof state.username === 'string') playerMeta.username = state.username.slice(0, 24);

    socket.to(currentRoom).emit('player_moved', {
      socketId: socket.id,
      pos: playerMeta.pos,
      rotY: playerMeta.rotY,
      anim: playerMeta.anim,
      speed: playerMeta.speed,
      avatarId: playerMeta.avatarId,
      costumeId: playerMeta.costumeId,
      username: playerMeta.username
    });
  });

  socket.on('activate_switch', (payload) => {
    if (!currentRoom || !payload || !payload.bridgeId) return;
    const bridges = getRoomBridges(currentRoom);
    if (!bridges.has(payload.bridgeId)) {
      bridges.add(payload.bridgeId);
      io.to(currentRoom).emit('bridge_activated', {
        bridgeId: payload.bridgeId,
        by: playerMeta.username
      });
    }
  });

  socket.on('chat_message', (payload) => {
    if (!currentRoom || !payload || !payload.text) return;
    const text = String(payload.text).trim().slice(0, 140);
    if (!text) return;
    io.to(currentRoom).emit('chat_broadcast', {
      socketId: socket.id,
      username: playerMeta.username,
      text,
      at: Date.now()
    });
  });

  socket.on('player_emote', (payload) => {
    if (!currentRoom || !payload || !payload.emote) return;
    const allowed = {
      emote_wave: { emoji: '👋', verb: 'melambai ramah!' },
      emote_cheer: { emoji: '🎉', verb: 'bersorak penuh semangat!' },
      emote_dance: { emoji: '💃', verb: 'sedang menari ceria!' },
      emote_salute: { emoji: '🫡', verb: 'memberi hormat Guild!' }
    };
    const info = allowed[payload.emote];
    if (!info) return;

    playerMeta.anim = payload.emote;
    io.to(currentRoom).emit('player_emote_broadcast', {
      socketId: socket.id,
      username: playerMeta.username,
      emote: payload.emote,
      emoji: info.emoji
    });
    io.to(currentRoom).emit('chat_broadcast', {
      system: true,
      text: `${info.emoji} ${playerMeta.username} ${info.verb}`
    });
  });

  socket.on('complete_mission', (payload) => {
    if (!currentRoom || !payload || !playerMeta.playerId) return;
    const mission = store.getMission(currentRoom);
    if (!mission || mission.category === 'hub') return;

    const elapsedMs = Math.max(Date.now() - (playerMeta.runStartedAt || Date.now()), Number(payload.timeMs) || 3000);
    try {
      const result = store.recordCompletion(playerMeta.playerId, currentRoom, elapsedMs);
      socket.emit('mission_completed_ack', Object.assign({ missionId: currentRoom, missionTitle: mission.title }, result));
      socket.to(currentRoom).emit('chat_broadcast', {
        system: true,
        text: `${playerMeta.username} berhasil menyelesaikan "${mission.title}" dalam ${(elapsedMs / 1000).toFixed(1)} dtk!`
      });
    } catch (err) {
      socket.emit('mission_error', { error: err.message });
    }
  });

  socket.on('disconnect', () => {
    leaveCurrentRoom();
    broadcastOnlineCount();
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const rot = store.getRotationInfo();
  console.log(`\n✨ Aetheris: Skyward Guild running at http://0.0.0.0:${PORT}`);
  console.log(`🎲 Mission Pool: ${rot.poolTotal} misi | Aktif sekarang (Siklus #${rot.cycleNumber}): ${store.getActiveMissions().map((m) => m.title).join(', ')}`);
  console.log(`🛡️  Game Master Key: ${GM_SECRET}\n`);
});
