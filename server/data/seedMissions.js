// Aetheris: Skyward Guild — Hub World & Large Pool of 12 Distinct Parkour/Adventure Missions
// The server randomly schedules active missions from this pool on an automatic rotation timer!

const THEMES = {
  golden_sky: {
    theme: 'golden_sky',
    skyTop: '#1c77d6',
    skyMid: '#68b9f8',
    skyHorizon: '#ffe4b5',
    fogColor: '#cce6ff',
    sunColor: '#fff2cc',
    ambientColor: '#9eceff',
    gravity: -28
  },
  emerald_dawn: {
    theme: 'emerald_dawn',
    skyTop: '#14849e',
    skyMid: '#63d2d9',
    skyHorizon: '#fff2c2',
    fogColor: '#c9f3ec',
    sunColor: '#fff6d4',
    ambientColor: '#a6f0e8',
    gravity: -28
  },
  sunset_citadel: {
    theme: 'sunset_citadel',
    skyTop: '#2c3e8c',
    skyMid: '#c46c7e',
    skyHorizon: '#ffd28e',
    fogColor: '#f2c1a0',
    sunColor: '#ffcb88',
    ambientColor: '#cfa5c8',
    gravity: -28
  },
  crimson_dusk: {
    theme: 'crimson_dusk',
    skyTop: '#231942',
    skyMid: '#9f4a68',
    skyHorizon: '#ff9e6d',
    fogColor: '#d98a7c',
    sunColor: '#ffb578',
    ambientColor: '#d490a6',
    gravity: -28
  },
  twilight_astral: {
    theme: 'twilight_astral',
    skyTop: '#0d1538',
    skyMid: '#2f296e',
    skyHorizon: '#7e5ba6',
    fogColor: '#362e6e',
    sunColor: '#c2d8ff',
    ambientColor: '#7a75c9',
    gravity: -27
  }
};

function buildHubWorld(activeMissions) {
  const portalColors = ['#2ee6c5', '#ffb347', '#b366ff'];
  const portalPositions = [
    [-6.2, 4.4, -12.5],
    [0, 4.4, -13.2],
    [6.2, 4.4, -12.5]
  ];

  const dynamicPortals = (activeMissions || []).slice(0, 3).map((m, idx) => ({
    id: `portal_slot_${idx + 1}`,
    type: 'mission_portal',
    missionId: m.id,
    label: m.title,
    color: portalColors[idx % portalColors.length],
    pos: portalPositions[idx],
    size: [3.6, 4.6, 1.2]
  }));

  return {
    id: 'skyward-hub',
    version: 2,
    title: 'Skyward Guild Hub',
    subtitle: 'Pulau Pusat Para Penjelajah Aether',
    category: 'hub',
    difficulty: 'Santai',
    isPublished: true,
    environment: THEMES.golden_sky,
    spawn: [0, 2.5, 10],
    reward: { coins: 0, xp: 0 },
    objectives: [],
    pieces: [
      { id: 'hub_main', type: 'ancient_island', pos: [0, 0, 0], size: [26, 3.2, 26], trees: true, ruins: true },
      { id: 'hub_terrace', type: 'ancient_island', pos: [0, 1.4, -12], size: [18, 2.5, 8], ruins: true },
      { id: 'hub_step_1', type: 'stepping_stone', pos: [0, 0.7, -7.2], size: [4.2, 0.7, 2.6] },
      { id: 'hub_step_r1', type: 'stepping_stone', pos: [16, 1.2, 2], size: [3.2, 0.7, 3.2] },
      { id: 'hub_step_r2', type: 'aether_platform', pos: [21, 2.4, -2], size: [3.4, 0.7, 3.4], moveTo: [21, 2.4, 5], speed: 1.8 },
      { id: 'hub_outlook', type: 'ancient_island', pos: [27, 3.5, -2], size: [9, 2.2, 9], trees: true },
      { id: 'hub_geyser_return', type: 'wind_geyser', pos: [27, 4.7, 1.5], size: [2.6, 0.6, 2.6], power: 18 },
      { id: 'hub_left_isle', type: 'ancient_island', pos: [-22, 2.8, -6], size: [10, 2.5, 10], trees: true, ruins: true },
      { id: 'hub_step_l1', type: 'stepping_stone', pos: [-15.5, 1.4, -3], size: [3.4, 0.7, 3.4] },
      ...dynamicPortals
    ]
  };
}

// Helper to craft varied, well-tested parkour courses cleanly
function makeCourse(cfg) {
  return {
    id: cfg.id,
    version: 1,
    title: cfg.title,
    subtitle: cfg.subtitle,
    category: cfg.category,
    difficulty: cfg.difficulty,
    isPublished: true,
    reward: cfg.reward,
    objectives: [
      { id: 'obj_collect', type: 'collect', label: cfg.relicLabel || 'Kumpulkan Kristal Aether', targetTag: 'aether_relic', requiredCount: cfg.relicCount },
      { id: 'obj_goal', type: 'reach_zone', label: 'Masuki Gerbang Portal Puncak', targetId: 'finish_portal' }
    ],
    environment: THEMES[cfg.theme] || THEMES.golden_sky,
    spawn: [0, 2.5, 2],
    pieces: cfg.pieces
  };
}

const SEED_MISSIONS = [
  // 1. Pemula — Golden Sky
  makeCourse({
    id: 'emerald-steps',
    title: 'Jejak Batu Zamrud',
    subtitle: 'Lintasi batu terapung kuno & kumpulkan 3 Kristal Aether.',
    category: 'daily',
    difficulty: 'Pemula',
    theme: 'golden_sky',
    relicCount: 3,
    reward: { coins: 150, xp: 120, costumeUnlock: 'sunlit_vanguard' },
    pieces: [
      { id: 'start', type: 'ancient_island', pos: [0, 0, 0], size: [10, 2.4, 10], trees: true, ruins: true },
      { id: 's1', type: 'stepping_stone', pos: [0, 0.7, -8], size: [3.6, 0.75, 3.6] },
      { id: 's2', type: 'stepping_stone', pos: [2.2, 1.3, -13.5], size: [3.4, 0.75, 3.4] },
      { id: 'r1', type: 'aether_relic', tag: 'aether_relic', pos: [2.2, 3.0, -13.5] },
      { id: 's3', type: 'stepping_stone', pos: [-1.5, 2.0, -19], size: [3.4, 0.75, 3.4] },
      { id: 'm1', type: 'aether_platform', pos: [0, 2.4, -26], size: [4.2, 0.8, 4.2], moveTo: [5.5, 2.4, -26], speed: 2.1 },
      { id: 'cp1', type: 'waystone_checkpoint', pos: [0, 3.0, -34], size: [7, 1.8, 7] },
      { id: 'side_s1', type: 'stepping_stone', pos: [-7.5, 3.3, -34], size: [3.2, 0.75, 3.2] },
      { id: 'side_isle', type: 'ancient_island', pos: [-14.5, 3.6, -34], size: [6.5, 2.0, 6.5], trees: true },
      { id: 'r2', type: 'aether_relic', tag: 'aether_relic', pos: [-14.5, 5.6, -34] },
      { id: 'c1', type: 'crumbling_stone', pos: [0, 3.4, -41.5], size: [3.6, 0.8, 3.6] },
      { id: 'c2', type: 'crumbling_stone', pos: [0, 3.9, -47.5], size: [3.6, 0.8, 3.6] },
      { id: 'mid_isle', type: 'ancient_island', pos: [0, 4.2, -55.5], size: [8, 2.2, 8], ruins: true },
      { id: 'geyser1', type: 'wind_geyser', pos: [0, 5.4, -57.5], size: [3.0, 0.6, 3.0], power: 19.5 },
      { id: 'high_s1', type: 'stepping_stone', pos: [0, 9.8, -64.5], size: [4.2, 0.8, 4.2] },
      { id: 'r3', type: 'aether_relic', tag: 'aether_relic', pos: [0, 11.6, -64.5] },
      { id: 'goal_isle', type: 'ancient_island', pos: [0, 10.2, -74.5], size: [12, 2.8, 12], trees: true, ruins: true },
      { id: 'finish_portal', type: 'goal_portal', pos: [0, 13.6, -77.5], size: [4.2, 5.2, 1.4] }
    ]
  }),

  // 2. Pemula — Emerald Dawn
  makeCourse({
    id: 'morning-cloud-garden',
    title: 'Taman Awan Pagi',
    subtitle: 'Jelajahi pulau taman zamrud dan kumpulkan 3 Embun Aether.',
    category: 'daily',
    difficulty: 'Pemula',
    theme: 'emerald_dawn',
    relicCount: 3,
    relicLabel: 'Kumpulkan Embun Aether',
    reward: { coins: 140, xp: 110, costumeUnlock: 'sunlit_vanguard' },
    pieces: [
      { id: 'start', type: 'ancient_island', pos: [0, 0, 0], size: [10, 2.4, 10], trees: true },
      { id: 's1', type: 'stepping_stone', pos: [-2.5, 0.5, -7.5], size: [3.8, 0.75, 3.8] },
      { id: 's2', type: 'stepping_stone', pos: [2.5, 1.1, -13], size: [3.8, 0.75, 3.8] },
      { id: 'r1', type: 'aether_relic', tag: 'aether_relic', pos: [2.5, 2.8, -13] },
      { id: 'garden_1', type: 'ancient_island', pos: [0, 1.6, -22], size: [9, 2.2, 9], trees: true, ruins: true },
      { id: 'm1', type: 'aether_platform', pos: [0, 2.0, -31], size: [4.2, 0.8, 4.2], moveTo: [0, 2.0, -37], speed: 2.0 },
      { id: 'cp1', type: 'waystone_checkpoint', pos: [0, 2.4, -44], size: [7.5, 1.8, 7.5] },
      { id: 's3', type: 'stepping_stone', pos: [5.5, 3.0, -49], size: [3.4, 0.75, 3.4] },
      { id: 'r2', type: 'aether_relic', tag: 'aether_relic', pos: [5.5, 4.7, -49] },
      { id: 's4', type: 'stepping_stone', pos: [0, 3.6, -54], size: [3.6, 0.75, 3.6] },
      { id: 'r3', type: 'aether_relic', tag: 'aether_relic', pos: [0, 5.3, -54] },
      { id: 'goal_isle', type: 'ancient_island', pos: [0, 4.0, -64], size: [12, 2.6, 12], trees: true, ruins: true },
      { id: 'finish_portal', type: 'goal_portal', pos: [0, 7.3, -67], size: [4.2, 5.2, 1.4] }
    ]
  }),

  // 3. Pemula — Golden Sky (Rune Bridge intro)
  makeCourse({
    id: 'golden-skybridge',
    title: 'Jembatan Emas Langit',
    subtitle: 'Aktifkan pelat rune kuno untuk membangkitkan jembatan cahaya.',
    category: 'daily',
    difficulty: 'Pemula',
    theme: 'golden_sky',
    relicCount: 3,
    reward: { coins: 170, xp: 135 },
    pieces: [
      { id: 'start', type: 'ancient_island', pos: [0, 0, 0], size: [10, 2.4, 10], ruins: true },
      { id: 's1', type: 'stepping_stone', pos: [0, 0.6, -8], size: [3.8, 0.75, 3.8] },
      { id: 'hub_mid', type: 'ancient_island', pos: [0, 1.2, -16], size: [8, 2.0, 8], trees: true },
      { id: 'sw_step', type: 'stepping_stone', pos: [7, 1.5, -16], size: [3.2, 0.7, 3.2] },
      { id: 'sw_isle', type: 'ancient_island', pos: [13, 1.8, -16], size: [6, 1.8, 6] },
      { id: 'rune_sw_1', type: 'rune_switch', bridgeId: 'gold_bridge', pos: [13, 2.85, -16], size: [2.4, 0.4, 2.4] },
      { id: 'r1', type: 'aether_relic', tag: 'aether_relic', pos: [13, 4.4, -16] },
      { id: 'gold_bridge', type: 'light_bridge', pos: [0, 1.8, -26.5], size: [4.2, 0.6, 13] },
      { id: 'r2', type: 'aether_relic', tag: 'aether_relic', pos: [0, 3.5, -26.5] },
      { id: 'cp1', type: 'waystone_checkpoint', pos: [0, 2.2, -37], size: [7, 1.8, 7] },
      { id: 'm1', type: 'aether_platform', pos: [-3, 2.8, -45], size: [4.0, 0.8, 4.0], moveTo: [3, 2.8, -45], speed: 2.0 },
      { id: 'r3', type: 'aether_relic', tag: 'aether_relic', pos: [0, 4.6, -45] },
      { id: 'goal_isle', type: 'ancient_island', pos: [0, 3.2, -55], size: [12, 2.6, 12], trees: true, ruins: true },
      { id: 'finish_portal', type: 'goal_portal', pos: [0, 6.5, -58], size: [4.2, 5.2, 1.4] }
    ]
  }),

  // 4. Pemula — Emerald Dawn (Geyser fun)
  makeCourse({
    id: 'wind-geyser-valley',
    title: 'Lembah Geyser Angin',
    subtitle: 'Manfaatkan pusaran angin untuk melesat antar pulau bertingkat!',
    category: 'daily',
    difficulty: 'Pemula',
    theme: 'emerald_dawn',
    relicCount: 3,
    reward: { coins: 180, xp: 145 },
    pieces: [
      { id: 'start', type: 'ancient_island', pos: [0, 0, 0], size: [10, 2.4, 10], trees: true },
      { id: 'g1', type: 'wind_geyser', pos: [0, 1.3, -3.2], size: [3.2, 0.6, 3.2], power: 18.5 },
      { id: 'p1', type: 'ancient_island', pos: [0, 5.2, -12], size: [8, 2.0, 8], ruins: true },
      { id: 'r1', type: 'aether_relic', tag: 'aether_relic', pos: [0, 7.2, -12] },
      { id: 's1', type: 'stepping_stone', pos: [0, 5.6, -20], size: [3.8, 0.75, 3.8] },
      { id: 'cp1', type: 'waystone_checkpoint', pos: [0, 6.0, -28], size: [7.5, 1.8, 7.5] },
      { id: 'g2', type: 'wind_geyser', pos: [0, 7.0, -30.2], size: [3.2, 0.6, 3.2], power: 19.5 },
      { id: 'p2', type: 'ancient_island', pos: [0, 11.4, -39], size: [8, 2.0, 8], trees: true },
      { id: 'r2', type: 'aether_relic', tag: 'aether_relic', pos: [0, 13.4, -39] },
      { id: 'm1', type: 'aether_platform', pos: [0, 12.0, -47.5], size: [4.2, 0.8, 4.2], moveTo: [4.5, 12.0, -47.5], speed: 2.0 },
      { id: 'r3', type: 'aether_relic', tag: 'aether_relic', pos: [2.5, 13.8, -47.5] },
      { id: 'goal_isle', type: 'ancient_island', pos: [0, 12.4, -57.5], size: [12, 2.6, 12], trees: true, ruins: true },
      { id: 'finish_portal', type: 'goal_portal', pos: [0, 15.7, -60.5], size: [4.2, 5.2, 1.4] }
    ]
  }),

  // 5. Menengah — Sunset Citadel
  makeCourse({
    id: 'wind-citadel',
    title: 'Benteng Angin Kuno',
    subtitle: 'Aktifkan Rune Cahaya, hindari Celah Korup & raih 4 Relik!',
    category: 'weekly',
    difficulty: 'Menengah',
    theme: 'sunset_citadel',
    relicCount: 4,
    relicLabel: 'Kumpulkan Relik Angin',
    reward: { coins: 300, xp: 240, costumeUnlock: 'storm_strider' },
    pieces: [
      { id: 'start', type: 'ancient_island', pos: [0, 0, 0], size: [10, 2.4, 10], trees: true, ruins: true },
      { id: 's1', type: 'stepping_stone', pos: [0, 0.8, -8.5], size: [3.4, 0.75, 3.4] },
      { id: 'm1', type: 'aether_platform', pos: [-4, 1.5, -15], size: [3.8, 0.8, 3.8], moveTo: [4, 1.5, -15], speed: 2.6 },
      { id: 'r1', type: 'aether_relic', tag: 'aether_relic', pos: [0, 3.4, -15] },
      { id: 'hazard_isle', type: 'ancient_island', pos: [0, 1.8, -24], size: [9, 2.0, 10] },
      { id: 'haz1', type: 'corrupted_rift', pos: [0, 2.95, -24], size: [8.4, 0.4, 2.6] },
      { id: 'r2', type: 'aether_relic', tag: 'aether_relic', pos: [0, 4.6, -24] },
      { id: 'cp1', type: 'waystone_checkpoint', pos: [0, 2.5, -34], size: [7.5, 1.8, 7.5] },
      { id: 'switch_isle', type: 'ancient_island', pos: [9.5, 2.8, -34], size: [6, 1.8, 6] },
      { id: 'switch_step', type: 'stepping_stone', pos: [5.2, 2.6, -34], size: [2.6, 0.7, 2.6] },
      { id: 'rune_sw_1', type: 'rune_switch', bridgeId: 'light_bridge_1', pos: [9.5, 3.85, -34], size: [2.4, 0.4, 2.4] },
      { id: 'r3', type: 'aether_relic', tag: 'aether_relic', pos: [9.5, 5.4, -34] },
      { id: 'light_bridge_1', type: 'light_bridge', pos: [0, 2.8, -44], size: [3.8, 0.6, 12.5] },
      { id: 'c1', type: 'crumbling_stone', pos: [-2.2, 3.4, -54], size: [3.3, 0.8, 3.3] },
      { id: 'c2', type: 'crumbling_stone', pos: [2.2, 4.1, -60], size: [3.3, 0.8, 3.3] },
      { id: 'm2', type: 'aether_platform', pos: [0, 4.8, -67.5], size: [3.8, 0.8, 3.8], moveTo: [0, 8.8, -67.5], speed: 2.2 },
      { id: 'r4', type: 'aether_relic', tag: 'aether_relic', pos: [0, 10.6, -67.5] },
      { id: 'goal_isle', type: 'ancient_island', pos: [0, 9.0, -78], size: [12, 2.8, 12], trees: true, ruins: true },
      { id: 'finish_portal', type: 'goal_portal', pos: [0, 12.4, -81], size: [4.2, 5.2, 1.4] }
    ]
  }),

  // 6. Menengah — Sunset Citadel (Crumbling gauntlet)
  makeCourse({
    id: 'crumbling-labyrinth',
    title: 'Labirin Batu Rapuh',
    subtitle: 'Jangan berhenti berlari! Lintasi rangkaian batu retak sebelum runtuh.',
    category: 'weekly',
    difficulty: 'Menengah',
    theme: 'sunset_citadel',
    relicCount: 4,
    reward: { coins: 290, xp: 230 },
    pieces: [
      { id: 'start', type: 'ancient_island', pos: [0, 0, 0], size: [10, 2.4, 10], ruins: true },
      { id: 'c1', type: 'crumbling_stone', pos: [0, 0.6, -7.5], size: [3.5, 0.8, 3.5] },
      { id: 'c2', type: 'crumbling_stone', pos: [3.2, 1.2, -13], size: [3.4, 0.8, 3.4] },
      { id: 'r1', type: 'aether_relic', tag: 'aether_relic', pos: [3.2, 2.9, -13] },
      { id: 'c3', type: 'crumbling_stone', pos: [-1.5, 1.8, -18.5], size: [3.4, 0.8, 3.4] },
      { id: 'c4', type: 'crumbling_stone', pos: [0, 2.4, -24], size: [3.4, 0.8, 3.4] },
      { id: 'cp1', type: 'waystone_checkpoint', pos: [0, 2.8, -32], size: [7.5, 1.8, 7.5] },
      { id: 'r2', type: 'aether_relic', tag: 'aether_relic', pos: [0, 4.8, -32] },
      { id: 'c5', type: 'crumbling_stone', pos: [-3.5, 3.4, -39.5], size: [3.3, 0.8, 3.3] },
      { id: 'c6', type: 'crumbling_stone', pos: [0, 4.0, -45.5], size: [3.3, 0.8, 3.3] },
      { id: 'r3', type: 'aether_relic', tag: 'aether_relic', pos: [0, 5.7, -45.5] },
      { id: 'c7', type: 'crumbling_stone', pos: [3.5, 4.6, -51.5], size: [3.3, 0.8, 3.3] },
      { id: 'm1', type: 'aether_platform', pos: [0, 5.2, -59], size: [3.8, 0.8, 3.8], moveTo: [0, 5.2, -64], speed: 2.5 },
      { id: 'r4', type: 'aether_relic', tag: 'aether_relic', pos: [0, 7.0, -61.5] },
      { id: 'goal_isle', type: 'ancient_island', pos: [0, 5.6, -72], size: [12, 2.6, 12], trees: true, ruins: true },
      { id: 'finish_portal', type: 'goal_portal', pos: [0, 8.9, -75], size: [4.2, 5.2, 1.4] }
    ]
  }),

  // 7. Menengah — Golden Sky (Dual Rune Puzzle)
  makeCourse({
    id: 'shattered-rune-temple',
    title: 'Kuil Rune Terpecah',
    subtitle: 'Cari dua pelat rune tersembunyi di sayap kiri & kanan kuil!',
    category: 'weekly',
    difficulty: 'Menengah',
    theme: 'golden_sky',
    relicCount: 4,
    reward: { coins: 320, xp: 260, costumeUnlock: 'storm_strider' },
    pieces: [
      { id: 'start', type: 'ancient_island', pos: [0, 0, 0], size: [10, 2.4, 10], trees: true, ruins: true },
      { id: 's1', type: 'stepping_stone', pos: [0, 0.7, -8], size: [3.6, 0.75, 3.6] },
      { id: 'plaza', type: 'ancient_island', pos: [0, 1.2, -17], size: [9, 2.2, 9], ruins: true },
      // Left wing switch
      { id: 'l_s1', type: 'stepping_stone', pos: [-7.5, 1.7, -17], size: [3.0, 0.75, 3.0] },
      { id: 'l_isle', type: 'ancient_island', pos: [-14, 2.0, -17], size: [6.5, 1.8, 6.5], trees: true },
      { id: 'sw_left', type: 'rune_switch', bridgeId: 'bridge_a', pos: [-14, 3.05, -17], size: [2.4, 0.4, 2.4] },
      { id: 'r1', type: 'aether_relic', tag: 'aether_relic', pos: [-14, 4.6, -17] },
      // Right wing switch
      { id: 'r_s1', type: 'stepping_stone', pos: [7.5, 1.7, -17], size: [3.0, 0.75, 3.0] },
      { id: 'r_isle', type: 'ancient_island', pos: [14, 2.0, -17], size: [6.5, 1.8, 6.5], trees: true },
      { id: 'sw_right', type: 'rune_switch', bridgeId: 'bridge_b', pos: [14, 3.05, -17], size: [2.4, 0.4, 2.4] },
      { id: 'r2', type: 'aether_relic', tag: 'aether_relic', pos: [14, 4.6, -17] },
      // Sequential bridges forward
      { id: 'bridge_a', type: 'light_bridge', pos: [0, 1.8, -28], size: [3.8, 0.6, 12] },
      { id: 'cp1', type: 'waystone_checkpoint', pos: [0, 2.2, -38], size: [7, 1.8, 7] },
      { id: 'r3', type: 'aether_relic', tag: 'aether_relic', pos: [0, 4.2, -38] },
      { id: 'bridge_b', type: 'light_bridge', pos: [0, 2.6, -48.5], size: [3.8, 0.6, 12] },
      { id: 'r4', type: 'aether_relic', tag: 'aether_relic', pos: [0, 4.4, -48.5] },
      { id: 'goal_isle', type: 'ancient_island', pos: [0, 3.0, -61], size: [12, 2.8, 12], trees: true, ruins: true },
      { id: 'finish_portal', type: 'goal_portal', pos: [0, 6.4, -64], size: [4.2, 5.2, 1.4] }
    ]
  }),

  // 8. Menengah — Crimson Dusk
  makeCourse({
    id: 'crimson-dusk-gate',
    title: 'Gerbang Senja Merah',
    subtitle: 'Lompati celah energi merah di bawah langit senja membara.',
    category: 'weekly',
    difficulty: 'Menengah',
    theme: 'crimson_dusk',
    relicCount: 4,
    reward: { coins: 310, xp: 250 },
    pieces: [
      { id: 'start', type: 'ancient_island', pos: [0, 0, 0], size: [10, 2.4, 10], ruins: true },
      { id: 'm1', type: 'aether_platform', pos: [0, 0.9, -9], size: [3.8, 0.8, 3.8], moveTo: [5, 0.9, -9], speed: 2.5 },
      { id: 'r1', type: 'aether_relic', tag: 'aether_relic', pos: [2.5, 2.7, -9] },
      { id: 'haz_i1', type: 'ancient_island', pos: [0, 1.4, -19], size: [9, 2.0, 10] },
      { id: 'haz1', type: 'corrupted_rift', pos: [0, 2.55, -17.5], size: [8.4, 0.4, 2.0] },
      { id: 'haz2', type: 'corrupted_rift', pos: [0, 2.55, -21], size: [8.4, 0.4, 2.0] },
      { id: 'r2', type: 'aether_relic', tag: 'aether_relic', pos: [0, 4.3, -19.2] },
      { id: 'cp1', type: 'waystone_checkpoint', pos: [0, 2.0, -30], size: [7.5, 1.8, 7.5] },
      { id: 'g1', type: 'wind_geyser', pos: [0, 3.0, -32.2], size: [2.8, 0.6, 2.8], power: 19 },
      { id: 's_hi', type: 'stepping_stone', pos: [0, 7.6, -40], size: [4.0, 0.8, 4.0] },
      { id: 'r3', type: 'aether_relic', tag: 'aether_relic', pos: [0, 9.4, -40] },
      { id: 'c1', type: 'crumbling_stone', pos: [-2.8, 8.0, -46.5], size: [3.4, 0.8, 3.4] },
      { id: 'c2', type: 'crumbling_stone', pos: [2.8, 8.4, -52.5], size: [3.4, 0.8, 3.4] },
      { id: 'r4', type: 'aether_relic', tag: 'aether_relic', pos: [2.8, 10.2, -52.5] },
      { id: 'goal_isle', type: 'ancient_island', pos: [0, 8.8, -62.5], size: [12, 2.8, 12], trees: true, ruins: true },
      { id: 'finish_portal', type: 'goal_portal', pos: [0, 12.2, -65.5], size: [4.2, 5.2, 1.4] }
    ]
  }),

  // 9. Mahir — Twilight Astral
  makeCourse({
    id: 'astral-spire',
    title: 'Menara Astral Terapung',
    subtitle: 'Event Spesial! Daki pusaran langit & kumpulkan 5 Relik Astral.',
    category: 'event',
    difficulty: 'Mahir',
    theme: 'twilight_astral',
    relicCount: 5,
    relicLabel: 'Kumpulkan Relik Astral',
    reward: { coins: 500, xp: 400, costumeUnlock: 'astral_scholar' },
    pieces: [
      { id: 'start', type: 'ancient_island', pos: [0, 0, 0], size: [10, 2.4, 10], ruins: true },
      { id: 'g1', type: 'wind_geyser', pos: [0, 1.3, -3], size: [3.0, 0.6, 3.0], power: 18.5 },
      { id: 's1', type: 'stepping_stone', pos: [0, 5.5, -10.5], size: [3.6, 0.8, 3.6] },
      { id: 'r1', type: 'aether_relic', tag: 'aether_relic', pos: [0, 7.2, -10.5] },
      { id: 'c1', type: 'crumbling_stone', pos: [4.5, 6.2, -16], size: [3.2, 0.8, 3.2] },
      { id: 'm1', type: 'aether_platform', pos: [9, 6.8, -22], size: [3.6, 0.8, 3.6], moveTo: [0, 6.8, -22], speed: 2.8 },
      { id: 'r2', type: 'aether_relic', tag: 'aether_relic', pos: [4.5, 8.6, -22] },
      { id: 'cp1', type: 'waystone_checkpoint', pos: [-3, 7.4, -29.5], size: [7, 1.8, 7] },
      { id: 'haz_plat', type: 'ancient_island', pos: [-3, 8.2, -39], size: [8, 2.0, 9] },
      { id: 'haz1', type: 'corrupted_rift', pos: [-3, 9.35, -37.2], size: [7.4, 0.4, 2.0] },
      { id: 'haz2', type: 'corrupted_rift', pos: [-3, 9.35, -41.0], size: [7.4, 0.4, 2.0] },
      { id: 'r3', type: 'aether_relic', tag: 'aether_relic', pos: [-3, 11.2, -39] },
      { id: 'm2', type: 'aether_platform', pos: [-3, 9.0, -47.5], size: [3.6, 0.8, 3.6], moveTo: [4, 12.5, -47.5], speed: 2.4 },
      { id: 'r4', type: 'aether_relic', tag: 'aether_relic', pos: [4, 14.3, -47.5] },
      { id: 'cp2', type: 'waystone_checkpoint', pos: [4, 13.0, -55.5], size: [6.5, 1.8, 6.5] },
      { id: 'g2', type: 'wind_geyser', pos: [4, 14.0, -57.5], size: [2.8, 0.6, 2.8], power: 20.5 },
      { id: 'c2', type: 'crumbling_stone', pos: [0, 19.2, -65], size: [3.6, 0.8, 3.6] },
      { id: 'r5', type: 'aether_relic', tag: 'aether_relic', pos: [0, 21.0, -65] },
      { id: 'goal_isle', type: 'ancient_island', pos: [0, 19.5, -75], size: [12, 2.8, 12], ruins: true },
      { id: 'finish_portal', type: 'goal_portal', pos: [0, 22.9, -78], size: [4.2, 5.2, 1.4] }
    ]
  }),

  // 10. Mahir — Twilight Astral (Starlight Rift)
  makeCourse({
    id: 'starlight-rift',
    title: 'Celah Korup Bintang',
    subtitle: 'Uji ketangkasan di antara platform bergerak cepat & celah korup!',
    category: 'event',
    difficulty: 'Mahir',
    theme: 'twilight_astral',
    relicCount: 4,
    reward: { coins: 460, xp: 370 },
    pieces: [
      { id: 'start', type: 'ancient_island', pos: [0, 0, 0], size: [10, 2.4, 10], ruins: true },
      { id: 'm1', type: 'aether_platform', pos: [-5, 0.8, -8.5], size: [3.5, 0.8, 3.5], moveTo: [5, 0.8, -8.5], speed: 3.1 },
      { id: 'm2', type: 'aether_platform', pos: [5, 1.8, -15.5], size: [3.5, 0.8, 3.5], moveTo: [-5, 1.8, -15.5], speed: 3.1 },
      { id: 'r1', type: 'aether_relic', tag: 'aether_relic', pos: [0, 3.6, -15.5] },
      { id: 'cp1', type: 'waystone_checkpoint', pos: [0, 2.4, -24], size: [7, 1.8, 7] },
      { id: 'c1', type: 'crumbling_stone', pos: [-3, 3.2, -31.5], size: [3.1, 0.8, 3.1] },
      { id: 'c2', type: 'crumbling_stone', pos: [3, 4.0, -37.5], size: [3.1, 0.8, 3.1] },
      { id: 'r2', type: 'aether_relic', tag: 'aether_relic', pos: [3, 5.8, -37.5] },
      { id: 'haz_i', type: 'ancient_island', pos: [0, 4.6, -47], size: [8.5, 2.0, 10] },
      { id: 'h1', type: 'corrupted_rift', pos: [0, 5.75, -45], size: [8, 0.4, 2.2] },
      { id: 'h2', type: 'corrupted_rift', pos: [0, 5.75, -49], size: [8, 0.4, 2.2] },
      { id: 'r3', type: 'aether_relic', tag: 'aether_relic', pos: [0, 7.6, -47] },
      { id: 'm3', type: 'aether_platform', pos: [0, 5.4, -56.5], size: [3.4, 0.8, 3.4], moveTo: [0, 10.2, -56.5], speed: 2.7 },
      { id: 'r4', type: 'aether_relic', tag: 'aether_relic', pos: [0, 12.0, -56.5] },
      { id: 'goal_isle', type: 'ancient_island', pos: [0, 10.4, -67], size: [12, 2.8, 12], ruins: true },
      { id: 'finish_portal', type: 'goal_portal', pos: [0, 13.8, -70], size: [4.2, 5.2, 1.4] }
    ]
  }),

  // 11. Mahir — Crimson Dusk (Storm Peak)
  makeCourse({
    id: 'aether-storm-peak',
    title: 'Puncak Badai Aether',
    subtitle: 'Pendakian beruntun dengan tiga Geyser Angin & batu rapuh!',
    category: 'event',
    difficulty: 'Mahir',
    theme: 'crimson_dusk',
    relicCount: 5,
    reward: { coins: 480, xp: 390, costumeUnlock: 'astral_scholar' },
    pieces: [
      { id: 'start', type: 'ancient_island', pos: [0, 0, 0], size: [10, 2.4, 10], trees: true },
      { id: 'g1', type: 'wind_geyser', pos: [0, 1.3, -3.2], size: [3.0, 0.6, 3.0], power: 19.5 },
      { id: 'p1', type: 'stepping_stone', pos: [0, 6.0, -11], size: [3.6, 0.8, 3.6] },
      { id: 'r1', type: 'aether_relic', tag: 'aether_relic', pos: [0, 7.8, -11] },
      { id: 'c1', type: 'crumbling_stone', pos: [-3.5, 6.8, -17.5], size: [3.2, 0.8, 3.2] },
      { id: 'c2', type: 'crumbling_stone', pos: [0, 7.6, -24], size: [3.2, 0.8, 3.2] },
      { id: 'r2', type: 'aether_relic', tag: 'aether_relic', pos: [0, 9.4, -24] },
      { id: 'cp1', type: 'waystone_checkpoint', pos: [0, 8.2, -32], size: [7, 1.8, 7] },
      { id: 'g2', type: 'wind_geyser', pos: [0, 9.2, -34.2], size: [2.8, 0.6, 2.8], power: 20.0 },
      { id: 'p2', type: 'ancient_island', pos: [0, 14.0, -43], size: [8, 2.0, 8], ruins: true },
      { id: 'r3', type: 'aether_relic', tag: 'aether_relic', pos: [0, 16.0, -43] },
      { id: 'm1', type: 'aether_platform', pos: [-4, 14.6, -51.5], size: [3.5, 0.8, 3.5], moveTo: [4, 14.6, -51.5], speed: 3.0 },
      { id: 'r4', type: 'aether_relic', tag: 'aether_relic', pos: [0, 16.5, -51.5] },
      { id: 'g3', type: 'wind_geyser', pos: [0, 15.2, -59], size: [2.8, 0.6, 2.8], power: 20.5 },
      { id: 's_top', type: 'stepping_stone', pos: [0, 20.4, -67], size: [3.8, 0.8, 3.8] },
      { id: 'r5', type: 'aether_relic', tag: 'aether_relic', pos: [0, 22.2, -67] },
      { id: 'goal_isle', type: 'ancient_island', pos: [0, 20.8, -77], size: [12, 2.8, 12], trees: true, ruins: true },
      { id: 'finish_portal', type: 'goal_portal', pos: [0, 24.2, -80], size: [4.2, 5.2, 1.4] }
    ]
  }),

  // 12. Mahir — Twilight Astral (Ancient Sky Throne)
  makeCourse({
    id: 'ancient-sky-throne',
    title: 'Singgasana Langit Kuno',
    subtitle: 'Tantangan pamungkas: gabungkan puzzle rune, celah korup & parkour langit!',
    category: 'event',
    difficulty: 'Mahir',
    theme: 'twilight_astral',
    relicCount: 5,
    reward: { coins: 550, xp: 450, costumeUnlock: 'astral_scholar' },
    pieces: [
      { id: 'start', type: 'ancient_island', pos: [0, 0, 0], size: [10, 2.4, 10], ruins: true },
      { id: 'c1', type: 'crumbling_stone', pos: [0, 0.8, -7.5], size: [3.2, 0.8, 3.2] },
      { id: 'm1', type: 'aether_platform', pos: [-4, 1.6, -14.5], size: [3.6, 0.8, 3.6], moveTo: [4, 1.6, -14.5], speed: 2.8 },
      { id: 'r1', type: 'aether_relic', tag: 'aether_relic', pos: [0, 3.4, -14.5] },
      { id: 'cp1', type: 'waystone_checkpoint', pos: [0, 2.2, -23], size: [7.5, 1.8, 7.5] },
      { id: 'sw_s1', type: 'crumbling_stone', pos: [-6.5, 2.8, -23], size: [2.8, 0.75, 2.8] },
      { id: 'sw_isle', type: 'ancient_island', pos: [-13, 3.2, -23], size: [6, 1.8, 6] },
      { id: 'rune_sw_throne', type: 'rune_switch', bridgeId: 'throne_bridge', pos: [-13, 4.25, -23], size: [2.4, 0.4, 2.4] },
      { id: 'r2', type: 'aether_relic', tag: 'aether_relic', pos: [-13, 5.8, -23] },
      { id: 'throne_bridge', type: 'light_bridge', pos: [0, 2.8, -33.5], size: [3.6, 0.6, 13] },
      { id: 'r3', type: 'aether_relic', tag: 'aether_relic', pos: [0, 4.5, -33.5] },
      { id: 'haz_i', type: 'ancient_island', pos: [0, 3.4, -45], size: [8.5, 2.0, 9] },
      { id: 'haz1', type: 'corrupted_rift', pos: [0, 4.55, -45], size: [8.0, 0.4, 2.8] },
      { id: 'r4', type: 'aether_relic', tag: 'aether_relic', pos: [0, 6.4, -45] },
      { id: 'g1', type: 'wind_geyser', pos: [0, 4.6, -48], size: [2.8, 0.6, 2.8], power: 20.5 },
      { id: 's_top', type: 'stepping_stone', pos: [0, 9.8, -56.5], size: [3.6, 0.8, 3.6] },
      { id: 'r5', type: 'aether_relic', tag: 'aether_relic', pos: [0, 11.6, -56.5] },
      { id: 'goal_isle', type: 'ancient_island', pos: [0, 10.2, -67], size: [12, 2.8, 12], trees: true, ruins: true },
      { id: 'finish_portal', type: 'goal_portal', pos: [0, 13.6, -70], size: [4.2, 5.2, 1.4] }
    ]
  })
];

module.exports = { THEMES, buildHubWorld, SEED_MISSIONS };
