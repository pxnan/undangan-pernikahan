# Undangan Pernikahan Digital

Website undangan pernikahan dinamis dengan Next.js, Tailwind CSS, dan Supabase.

## Fitur

- Halaman undangan publik single page application.
- Landing page foto, ayat Al-Quran, profil mempelai, jadwal acara dinamis, Google Maps, keluarga, ucapan tamu, rekening, dan penutup.
- Animasi saat scroll dan pemutar lagu latar.
- Dashboard admin dengan login Supabase Auth.
- Upload foto dan lagu ke Supabase Storage.
- Konten undangan dapat diedit dari dashboard admin.

## Setup

1. Install dependency:

```bash
npm install
```

2. Buat file `.env.local` dari `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_STORAGE_BUCKET=wedding-assets
```

3. Jalankan SQL di `supabase/schema.sql` melalui Supabase SQL Editor.

4. Buat akun admin di Supabase Dashboard melalui Authentication > Users.

5. Jalankan development server:

```bash
npm run dev
```

Halaman publik ada di `/`, login admin di `/admin/login`, dan dashboard di `/admin/dashboard`.
