"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Copy,
  Gift,
  Heart,
  ImageIcon,
  Instagram,
  MapPin,
  Pause,
  Play,
  Send,
  Users
} from "lucide-react";
import { defaultContent } from "@/lib/defaultContent";
import { containsProfanity } from "@/lib/profanity";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { GuestMessage, WeddingContent } from "@/lib/types";

const contentId = "main";

function withContentDefaults(content: Partial<WeddingContent>): WeddingContent {
  return {
    ...defaultContent,
    ...content,
    couple: {
      ...defaultContent.couple,
      ...content.couple,
      bride: { ...defaultContent.couple.bride, ...content.couple?.bride },
      groom: { ...defaultContent.couple.groom, ...content.couple?.groom }
    },
    quran: { ...defaultContent.quran, ...content.quran },
    location: { ...defaultContent.location, ...content.location },
    gallery: { ...defaultContent.gallery, ...content.gallery }
  };
}

export default function Home() {
  const [content, setContent] = useState<WeddingContent>(defaultContent);
  const [isContentReady, setIsContentReady] = useState(false);
  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [guestName, setGuestName] = useState("");
  const [guestMessage, setGuestMessage] = useState("");
  const [messageWarning, setMessageWarning] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isMessageConfirmOpen, setIsMessageConfirmOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInvitationOpened, setIsInvitationOpened] = useState(false);
  const [isCurtainOpening, setIsCurtainOpening] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ambientRef = useRef<{ context: AudioContext; timers: number[] } | null>(null);

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll(".reveal"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        });
      },
      { threshold: 0.16 }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [content, messages]);

  useEffect(() => {
    document.body.style.overflow = isInvitationOpened ? "" : "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isInvitationOpened]);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo({ top: 0, left: 0 });
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!supabase) {
        setIsContentReady(true);
        return;
      }

      try {
        const [{ data: contentData }, { data: messageData }] = await Promise.all([
          supabase.from("wedding_contents").select("content").eq("id", contentId).maybeSingle(),
          supabase
            .from("guest_messages")
            .select("id, guest_name, message, created_at")
            .order("created_at", { ascending: false })
        ]);

        if (contentData?.content) setContent(withContentDefaults(contentData.content as Partial<WeddingContent>));
        if (messageData) setMessages(messageData as GuestMessage[]);
      } finally {
        setIsContentReady(true);
      }
    }

    loadData();
  }, []);

  const mapUrl = useMemo(() => {
    const { latitude, longitude } = content.location;
    return `https://maps.google.com/maps?q=${latitude},${longitude}&z=16&output=embed`;
  }, [content.location]);

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!guestName.trim() || !guestMessage.trim()) return;

    if (containsProfanity(`${guestName} ${guestMessage}`)) {
      setMessageWarning("Ucapan mengandung bahasa yang kurang pantas. Mohon gunakan kata-kata yang lebih baik.");
      return;
    }

    setMessageWarning("");
    setIsMessageConfirmOpen(true);
  }

  async function sendGuestMessage() {
    if (!guestName.trim() || !guestMessage.trim()) return;

    if (containsProfanity(`${guestName} ${guestMessage}`)) {
      setIsMessageConfirmOpen(false);
      setMessageWarning("Ucapan mengandung bahasa yang kurang pantas. Mohon gunakan kata-kata yang lebih baik.");
      return;
    }

    setIsMessageConfirmOpen(false);
    setIsSending(true);
    const optimisticMessage: GuestMessage = {
      id: crypto.randomUUID(),
      guest_name: guestName.trim(),
      message: guestMessage.trim(),
      created_at: new Date().toISOString()
    };

    if (!supabase) {
      setMessages((current) => [optimisticMessage, ...current]);
      setGuestName("");
      setGuestMessage("");
      setMessageWarning("");
      setIsSending(false);
      return;
    }

    const { data, error } = await supabase
      .from("guest_messages")
      .insert({ guest_name: guestName.trim(), message: guestMessage.trim() })
      .select("id, guest_name, message, created_at")
      .single();

    if (!error && data) {
      setMessages((current) => [data as GuestMessage, ...current]);
      setGuestName("");
      setGuestMessage("");
      setMessageWarning("");
    }
    setIsSending(false);
  }

  async function toggleAudio() {
    if (isPlaying) {
      pauseMusic();
      setIsPlaying(false);
      return;
    }

    await playMusic();
  }

  async function playMusic() {
    if (!content.musicUrl) {
      audioRef.current?.pause();
      const didStart = await startAmbientMusic();
      setIsPlaying(didStart);
      return;
    }

    if (!audioRef.current) return;
    stopAmbientMusic();

    try {
      audioRef.current.volume = 0.72;
      await audioRef.current.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  }

  function pauseMusic() {
    if (!content.musicUrl) {
      stopAmbientMusic();
      return;
    }

    audioRef.current?.pause();
  }

  async function startAmbientMusic() {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return false;

    if (ambientRef.current) {
      if (ambientRef.current.context.state === "suspended") {
        try {
          await ambientRef.current.context.resume();
        } catch {
          return false;
        }
      }

      return ambientRef.current.context.state === "running";
    }

    const context = new AudioContextClass();
    if (context.state === "suspended") {
      try {
        await context.resume();
      } catch {
        return false;
      }
    }

    const masterGain = context.createGain();
    masterGain.gain.value = 0.035;
    masterGain.connect(context.destination);

    const chords = [
      [261.63, 329.63, 392.0],
      [293.66, 349.23, 440.0],
      [246.94, 329.63, 392.0],
      [220.0, 293.66, 349.23]
    ];
    const timers: number[] = [];

    const playChord = (frequencies: number[]) => {
      frequencies.forEach((frequency) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, context.currentTime);
        gain.gain.linearRampToValueAtTime(0.65, context.currentTime + 0.8);
        gain.gain.linearRampToValueAtTime(0, context.currentTime + 4.6);
        oscillator.connect(gain);
        gain.connect(masterGain);
        oscillator.start();
        oscillator.stop(context.currentTime + 4.8);
      });
    };

    let chordIndex = 0;
    playChord(chords[chordIndex]);
    const interval = window.setInterval(() => {
      chordIndex = (chordIndex + 1) % chords.length;
      playChord(chords[chordIndex]);
    }, 4200);
    timers.push(interval);
    ambientRef.current = { context, timers };
    return context.state === "running";
  }

  function stopAmbientMusic() {
    if (!ambientRef.current) return;
    ambientRef.current.timers.forEach((timer) => window.clearInterval(timer));
    ambientRef.current.context.close();
    ambientRef.current = null;
  }

  async function copyAccount(accountNumber: string) {
    await navigator.clipboard.writeText(accountNumber);
    setCopiedAccount(accountNumber);
    window.setTimeout(() => setCopiedAccount(""), 1600);
  }

  async function openInvitation() {
    if (isCurtainOpening) return;
    setIsCurtainOpening(true);
    window.scrollTo({ top: 0, left: 0 });
    await playMusic();
    window.setTimeout(() => {
      setIsInvitationOpened(true);
      setIsCurtainOpening(false);
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0 });
      });
    }, 980);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-blush-50">
      {!isContentReady ? <InitialLoader /> : null}

      {content.musicUrl ? <audio ref={audioRef} src={content.musicUrl} loop /> : null}

      {isContentReady && !isInvitationOpened ? (
        <CurtainLanding content={content} isOpening={isCurtainOpening} onOpen={openInvitation} />
      ) : null}

      <section
        className="relative flex min-h-[92svh] items-center justify-center bg-cover bg-center px-4 text-center text-white md:min-h-screen"
        style={{ backgroundImage: `url(${content.heroImageUrl})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/20 to-black/5" />
        <div className="relative z-10 max-w-4xl pt-12 md:pt-16">
          <p className="reveal mb-4 text-md sm:text-xl  uppercase tracking-[0.32em]">The Wedding of</p>
          <h1 className="reveal font-display text-5xl leading-tight sm:text-6xl md:text-8xl">
            {content.couple.bride.shortName} & {content.couple.groom.shortName}
          </h1>
          <p className="reveal mx-auto mt-6 max-w-2xl text-base leading-7 text-white/88 md:text-lg">
            Dengan Rahmat Allah SWT, kami melangkah menuju ikatan suci yang dirdhai-Nya untuk mengawali perjalanan baru sebagai satu keluarga hingga menapaki Jannah-Nya.
          </p>
        </div>
        <div className="hero-bottom-fade absolute bottom-0 left-0 right-0 h-36 md:h-44" />
      </section>

      <FloatingMusicButton isPlaying={isPlaying} onClick={toggleAudio} />
      <ConfirmDialog
        open={isMessageConfirmOpen}
        title="Kirim Ucapan?"
        description="Ucapan Anda akan tampil di halaman undangan setelah dikirim dan tidak dapat dihapus. Pastikan ucapan sudah benar sebelum mengirim."
        confirmLabel={isSending ? "Mengirim..." : "Kirim Ucapan"}
        cancelLabel="Periksa Lagi"
        onCancel={() => setIsMessageConfirmOpen(false)}
        onConfirm={sendGuestMessage}
      />

      <section id="undangan" className="section-shell py-16 md:py-20">
        <div className="reveal mx-auto max-w-3xl text-center">
          <p className="font-display text-3xl leading-relaxed text-blush-600 md:text-5xl">
            {content.quran.arabic}
          </p>
          <p className="mt-7 text-base leading-8 text-gray-600 md:text-lg">{content.quran.translation}</p>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.22em] text-blush-500">
            {content.quran.source}
          </p>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="section-shell">
          <div className="reveal mx-auto max-w-3xl text-center">
            <div className="greeting-floral mx-auto">
              <span aria-hidden="true" className="greeting-flower greeting-flower-left">
                <span className="leaf leaf-a" />
                <span className="leaf leaf-b" />
                <span className="flower flower-large">
                  <span className="petal petal-1" />
                  <span className="petal petal-2" />
                  <span className="petal petal-3" />
                  <span className="petal petal-4" />
                  <span className="flower-center" />
                </span>
                <span className="flower flower-small">
                  <span className="petal petal-1" />
                  <span className="petal petal-2" />
                  <span className="petal petal-3" />
                  <span className="petal petal-4" />
                  <span className="flower-center" />
                </span>
              </span>
              <p className="relative z-10 font-display text-4xl text-gray-800 md:text-5xl">
                Assalamualaikum Warahmatullahi Wabarakatuh
              </p>
              <span aria-hidden="true" className="greeting-flower greeting-flower-right">
                <span className="leaf leaf-a" />
                <span className="leaf leaf-b" />
                <span className="flower flower-large">
                  <span className="petal petal-1" />
                  <span className="petal petal-2" />
                  <span className="petal petal-3" />
                  <span className="petal petal-4" />
                  <span className="flower-center" />
                </span>
                <span className="flower flower-small">
                  <span className="petal petal-1" />
                  <span className="petal petal-2" />
                  <span className="petal petal-3" />
                  <span className="petal petal-4" />
                  <span className="flower-center" />
                </span>
              </span>
            </div>
            <p className="mt-6 text-base leading-8 text-gray-600 md:text-lg">{content.invitationText}</p>
          </div>
          <div className="mx-auto mt-14 grid max-w-5xl gap-8 md:grid-cols-2">
            <CoupleCard person={content.couple.bride} />
            <CoupleCard person={content.couple.groom} />
          </div>
        </div>
      </section>

      <section className="section-shell py-16 md:py-20">
        <SectionTitle icon={<CalendarDays />} eyebrow="Tanggal Acara" title="Rangkaian Hari Bahagia" />
        <div className="mt-10 flex flex-wrap justify-center gap-6">
          {content.events.map((event, index) => (
            <div
              key={`${event.title}-${index}`}
              className="reveal relative w-full max-w-[360px] overflow-hidden rounded-lg border border-white bg-white px-5 py-8 text-center shadow-soft sm:px-7"
            >
              <div className="absolute inset-x-8 top-0 h-1 rounded-b-full bg-gradient-to-r from-blush-200 via-blush-500 to-blush-200" />
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blush-100 text-blush-600">
                <CalendarDays size={22} />
              </div>
              <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-blush-500">{event.title}</p>
              <p className="mx-auto mt-4 max-w-[260px] font-display text-2xl leading-tight text-gray-800 sm:text-3xl">
                {new Intl.DateTimeFormat("id-ID", {
                  dateStyle: "full"
                }).format(new Date(event.date))}
              </p>
              <div className="mx-auto my-5 h-px w-20 bg-blush-100" />
              <p className="font-semibold text-gray-700">{event.time}</p>
              <p className="mt-2 text-gray-500">{event.venue}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="section-shell grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div className="reveal">
            <SectionTitle icon={<MapPin />} eyebrow="Lokasi" title={content.location.title} align="left" />
            <p className="mt-6 text-lg leading-8 text-gray-600">{content.location.address}</p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${content.location.latitude},${content.location.longitude}`}
              target="_blank"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-blush-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blush-600"
            >
              <MapPin size={18} />
              Buka Maps
            </a>
          </div>
          <div className="reveal rounded-lg border border-white bg-white p-3 shadow-soft">
            <iframe
              title="Google Maps"
              src={mapUrl}
              className="h-[300px] w-full rounded-lg border-0 md:h-[360px]"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      <section className="section-shell py-16 md:py-20">
        <SectionTitle icon={<Users />} eyebrow="Keluarga" title="Turut Mengundang" />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {content.families.map((family) => (
            <div
              key={family.side}
              className="reveal relative overflow-hidden rounded-lg border border-white bg-white px-5 py-8 text-center shadow-soft sm:px-8 sm:py-9"
            >
              <div className="absolute inset-x-10 top-0 h-1 rounded-b-full bg-gradient-to-r from-blush-100 via-blush-400 to-blush-100" />
              <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-blush-100 text-blush-600">
                <Users size={20} />
              </div>
              <h3 className="font-display text-3xl text-gray-800">{family.side}</h3>
              <div className="mt-6 space-y-3 text-gray-600">
                {family.names.map((name) => (
                  <p key={name}>{name}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {content.gallery.enabled && content.gallery.images.length ? (
        <section className="bg-white py-16 md:py-20">
          <div className="section-shell">
            <SectionTitle icon={<ImageIcon />} eyebrow="Gallery" title={content.gallery.title} />
            <div className="mt-10 grid auto-rows-[220px] gap-4 sm:grid-cols-2 md:grid-cols-4">
              {content.gallery.images.map((image, index) => (
                <figure
                  key={`${image.imageUrl}-${index}`}
                  className={`reveal group relative overflow-hidden rounded-lg bg-blush-50 shadow-soft ${
                    index === 0 ? "sm:col-span-2 md:row-span-2" : ""
                  }`}
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-105"
                    style={{ backgroundImage: `url(${image.imageUrl})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950/55 via-transparent to-transparent" />
                  {image.caption ? (
                    <figcaption className="absolute bottom-0 left-0 right-0 p-5 text-sm font-semibold text-white">
                      {image.caption}
                    </figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
          </div>
        </section>
      ) : null}

        <section className="bg-white py-16 md:py-20">
        <div className="section-shell grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="reveal">
            <SectionTitle icon={<Send />} eyebrow="Ucapan" title="Doa dari Tamu" align="left" />
            <form onSubmit={submitMessage} className="mt-8 space-y-4">
              <input
                value={guestName}
                onChange={(event) => {
                  setGuestName(event.target.value);
                  if (messageWarning) setMessageWarning("");
                }}
                placeholder="Nama Anda"
                className="admin-input"
              />
              <textarea
                value={guestMessage}
                onChange={(event) => {
                  setGuestMessage(event.target.value);
                  if (messageWarning) setMessageWarning("");
                }}
                placeholder="Tulis ucapan dan doa terbaik"
                rows={5}
                className="admin-input resize-none"
              />
              {messageWarning ? (
                <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  {messageWarning}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={isSending}
                className="inline-flex items-center gap-2 rounded-full bg-blush-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blush-600 disabled:opacity-60"
              >
                <Send size={18} />
                {isSending ? "Mengirim..." : "Kirim Ucapan"}
              </button>
            </form>
            {!isSupabaseConfigured ? (
              <p className="mt-4 text-sm text-gray-500">Mode demo aktif. Hubungkan Supabase agar ucapan tersimpan.</p>
            ) : null}
          </div>
          <div className="reveal max-h-[520px] space-y-4 overflow-y-auto pr-1 sm:pr-2">
            {messages.length ? (
              messages.map((message) => (
                <GuestMessageCard key={message.id} message={message} />
              ))
            ) : (
              <div className="rounded-lg border border-blush-100 bg-blush-50 p-6 text-center text-gray-500">
                Jadilah yang pertama memberikan doa.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="section-shell py-16 md:py-20">
        <SectionTitle icon={<Gift />} eyebrow="Wedding Gift" title="Kirim Tanda Kasih" />
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {content.bankAccounts.map((account) => (
            <div
              key={`${account.bank}-${account.accountNumber}`}
              className="reveal relative overflow-hidden rounded-lg border border-white bg-white p-6 text-center shadow-soft sm:p-7"
            >
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-blush-100" />
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blush-100 text-blush-600">
                <Gift size={21} />
              </div>
              <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-blush-500">{account.bank}</p>
              <p className="mt-4 text-2xl font-bold text-gray-800">{account.accountNumber}</p>
              <p className="mt-1 text-gray-500">a.n. {account.accountName}</p>
              <button
                onClick={() => copyAccount(account.accountNumber)}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-blush-100 px-4 py-2 text-sm font-semibold text-blush-600 transition hover:bg-blush-200"
              >
                <Copy size={16} />
                {copiedAccount === account.accountNumber ? "Tersalin" : "Salin Nomor"}
              </button>
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-gray-900 px-4 py-16 text-center text-white md:py-20">
        <div className="reveal mx-auto max-w-3xl">
          <p className="font-display text-4xl md:text-5xl">Terima Kasih</p>
          <p className="mt-6 leading-8 text-white/76">{content.thankYouText}</p>
          <p className="mt-10 font-display text-4xl text-blush-200">
            {content.couple.bride.shortName} & {content.couple.groom.shortName}
          </p>
          <a
            href="https://www.instagram.com/pxnan_/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-blush-200/50 hover:text-blush-200"
          >
            <Instagram size={16} />
            created by @pxnan
          </a>
        </div>
      </footer>
    </main>
  );
}

function GuestMessageCard({ message }: { message: GuestMessage }) {
  const initial = message.guest_name.trim().charAt(0).toUpperCase() || "T";

  return (
    <article className="relative overflow-hidden rounded-lg border border-white bg-white p-5 shadow-soft">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-blush-100/70" />
      <div className="absolute bottom-0 left-0 h-full w-1 bg-gradient-to-b from-blush-200 via-blush-500 to-blush-100" />
      <div className="relative flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blush-100 font-display text-xl font-bold text-blush-600 ring-4 ring-blush-50">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-semibold text-gray-800">{message.guest_name}</p>
            <time className="text-xs font-semibold uppercase tracking-[0.14em] text-blush-400">
              {new Intl.DateTimeFormat("id-ID", {
                day: "2-digit",
                month: "short",
                year: "numeric"
              }).format(new Date(message.created_at))}
            </time>
          </div>
          <p className="mt-3 leading-7 text-gray-600">"{message.message}"</p>
        </div>
      </div>
    </article>
  );
}

function InitialLoader() {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-blush-50 px-4 text-center">
      <div>
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-blush-200 border-t-blush-500" />
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.22em] text-blush-500">Memuat Undangan</p>
      </div>
    </div>
  );
}

function CurtainLanding({
  content,
  isOpening,
  onOpen
}: {
  content: WeddingContent;
  isOpening: boolean;
  onOpen: () => void;
}) {
  return (
    <section
      className={`fixed inset-0 z-50 flex min-h-svh items-center justify-center overflow-hidden bg-blush-50 px-4 text-center text-white ${
        isOpening ? "curtain-open" : ""
      }`}
    >
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${content.heroImageUrl})` }} />
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950/55 via-gray-950/30 to-gray-950/30" />
      <div className="curtain-panel curtain-left absolute bottom-0 left-0 top-0 w-1/2" />
      <div className="curtain-panel curtain-right absolute bottom-0 right-0 top-0 w-1/2" />
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/30 shadow-[0_0_30px_rgba(255,255,255,0.55)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/24 to-transparent" />
      <FloralFrame />

      <div className={`relative z-10 mx-auto max-w-3xl transition duration-700 ${isOpening ? "scale-95 opacity-0" : "opacity-100"}`}>
        <p className="text-md font-semibold uppercase tracking-[0.32em] text-white/85 sm:text-xl">The Wedding of</p>
        <h1 className="mt-4 font-display text-5xl leading-tight sm:text-6xl md:text-8xl">
          {content.couple.bride.shortName} & {content.couple.groom.shortName}
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-white/86 md:text-lg">
          Dengan penuh kasih, kami mengundang Bapak/Ibu untuk turut hadir dan memberikan doa restu di hari bahagia kami.
        </p>
        <button
          type="button"
          onClick={onOpen}
          className="curtain-button mt-10 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-blush-600 shadow-soft transition hover:bg-blush-50"
        >
          <Heart size={18} />
          Buka Undangan
        </button>
      </div>
    </section>
  );
}

function FloralFrame() {
  const flowers = ["top-left", "top-right", "bottom-left", "bottom-right"];

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-3 z-[1] sm:inset-6">
      <div className="floral-frame absolute inset-0 rounded-[28px] sm:rounded-[36px]" />
      {flowers.map((position) => (
        <div key={position} className={`floral-cluster floral-${position}`}>
          <span className="leaf leaf-a" />
          <span className="leaf leaf-b" />
          <span className="flower flower-large">
            <span className="petal petal-1" />
            <span className="petal petal-2" />
            <span className="petal petal-3" />
            <span className="petal petal-4" />
            <span className="flower-center" />
          </span>
          <span className="flower flower-small">
            <span className="petal petal-1" />
            <span className="petal petal-2" />
            <span className="petal petal-3" />
            <span className="petal petal-4" />
            <span className="flower-center" />
          </span>
          <span className="bud bud-a" />
          <span className="bud bud-b" />
        </div>
      ))}
    </div>
  );
}

function FloatingMusicButton({
  isPlaying,
  onClick
}: {
  isPlaying: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label="Kontrol musik"
      className="fixed bottom-4 right-4 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-blush-600 shadow-soft transition hover:scale-105 sm:bottom-5 sm:right-5 sm:h-12 sm:w-12"
    >
      {isPlaying ? <Pause size={20} /> : <Play size={20} />}
    </button>
  );
}

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-gray-950/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-white bg-white p-6 text-center shadow-soft">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blush-100 text-blush-600">
          <Send size={20} />
        </div>
        <h2 className="mt-5 font-display text-3xl text-gray-800">{title}</h2>
        <p className="mt-3 leading-7 text-gray-500">{description}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-blush-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blush-600"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function CoupleCard({ person }: { person: WeddingContent["couple"]["bride"] }) {
  return (
    <article className="reveal overflow-hidden rounded-lg border border-white bg-white p-2 shadow-soft sm:p-3">
      <div className="relative h-80 overflow-hidden rounded-lg bg-cover bg-center sm:h-96" style={{ backgroundImage: `url(${person.photoUrl})` }}>
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/35 via-transparent to-transparent" />
      </div>
      <div className="px-4 pb-7 pt-6 text-center sm:px-6">
        <div className="mx-auto mb-5 h-px w-20 bg-blush-200" />
        <h2 className="font-display text-3xl text-gray-800 sm:text-4xl">{person.name}</h2>
        <p className="mt-3 font-semibold text-blush-500">{person.parents}</p>
        <p className="mt-5 leading-7 text-gray-600">{person.description}</p>
      </div>
    </article>
  );
}

function SectionTitle({
  icon,
  eyebrow,
  title,
  align = "center"
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  align?: "center" | "left";
}) {
  return (
    <div className={`reveal ${align === "center" ? "mx-auto text-center" : ""} max-w-2xl`}>
      <div
        className={`mb-4 inline-flex items-center gap-2 rounded-full bg-blush-100 px-4 py-2 text-sm font-semibold text-blush-600 ${
          align === "center" ? "justify-center" : ""
        }`}
      >
        {icon}
        {eyebrow}
      </div>
      <h2 className="font-display text-3xl leading-tight text-gray-800 sm:text-4xl md:text-5xl">{title}</h2>
    </div>
  );
}
