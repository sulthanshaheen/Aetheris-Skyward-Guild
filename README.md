# Aetheris: Skyward Guild

Game Web 3D petualangan **Obby / Parkour & Misi Langit** bergaya *stylized 3D* (Three.js) dengan dukungan **Multiplayer Online Realtime**, **6 Karakter Manusia Pilihan**, **Pool 12 Misi Unik dengan Rotasi Acak Otomatis**, serta **Panel Khusus Game Master**.

## Fitur Utama
- **Dunia 3D Kepulauan Langit:** Langit gradien shader dinamis (5 tema atmosfer), awan melayang, rumput prosedural mulus, reruntuhan batu berlumut, *wind geyser*, *crumbling stone*, *waystone checkpoint*, *rune switch* + jembatan cahaya co-op, dan portal kuno.
- **Layar Profil Wajib & 6 Avatar Manusia:** Pemain wajib mengisi nama dan memilih karakter sebelum masuk dunia — **Kael** (*Skyward Pathfinder*), **Lyra** (*Windrunner Scout*), **Ronan** (*Sunlit Paladin*), **Sora** (*Astral Mage*), **Zayn** (*Shadow Strider*), dan **Maya** (*Ember Ranger*) — lengkap dengan gaya rambut, aksesori, jubah dinamis, dan nametag 3D.
- **Pool 12 Misi & Penjadwalan Rotasi Acak:** Server secara otomatis merotasi misi aktif dari koleksi 12 misi (Pemula, Menengah, Mahir) dan langsung memperbarui 3 portal fisik di Skyward Guild Hub ke seluruh pemain online.
- **Panel Khusus Game Master (`🛡️ GM`):** Hanya Game Master yang dapat mengelola pool misi, menambah/menghapus misi, mengatur jumlah slot/interval rotasi, atau memutar jadwal acak secara instan.
- **Multiplayer Realtime (Socket.IO):** Sinkronisasi posisi, animasi, avatar, kostum, chat ruangan, dan mekanik tombol jembatan co-op.

## Cara Menjalankan

```bash
npm install
npm start
```

Lalu buka browser ke `http://localhost:3000`. Buka beberapa tab untuk langsung mencoba multiplayer realtime!

### Konfigurasi Game Master
Kata sandi default Game Master untuk pengujian lokal adalah `AETHERIS-GM-2026`. Kamu bisa mengubahnya lewat environment variable:

```bash
GM_SECRET=rahasia-gm-kamu npm start
```

## Kontrol
- **W A S D / Panah:** Gerak
- **Space:** Lompat / *Double Jump*
- **Shift:** *Sprint*
- **Drag Mouse / Q & E:** Putar kamera (Scroll untuk zoom)
