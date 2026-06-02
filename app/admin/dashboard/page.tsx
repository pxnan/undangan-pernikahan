"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { ImageIcon, LogOut, Menu, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { defaultContent } from "@/lib/defaultContent";
import { storageBucket, supabase } from "@/lib/supabase";
import type {
  BankAccount,
  BrideGroom,
  FamilyGroup,
  GalleryImage,
  GuestMessage,
  WeddingContent,
  WeddingEvent
} from "@/lib/types";

const contentId = "main";
const maxImageSizeBytes = 2 * 1024 * 1024;

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
    hero: { ...defaultContent.hero, ...content.hero },
    curtain: { ...defaultContent.curtain, ...content.curtain },
    quran: { ...defaultContent.quran, ...content.quran },
    location: { ...defaultContent.location, ...content.location },
    gallery: { ...defaultContent.gallery, ...content.gallery }
  };
}

function getStoragePathFromPublicUrl(url?: string) {
  if (!url) return null;

  try {
    const parsedUrl = new URL(url);
    const marker = `/storage/v1/object/public/${storageBucket}/`;
    const markerIndex = parsedUrl.pathname.indexOf(marker);

    if (markerIndex === -1) return null;

    return decodeURIComponent(parsedUrl.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

async function compressImage(file: File) {
  if (file.size <= maxImageSizeBytes) return file;

  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) return file;

  const longestSide = Math.max(image.width, image.height);
  let scale = Math.min(1, 2200 / longestSide);
  const baseName = file.name.replace(/\.[^.]+$/, "");
  let quality = 0.86;
  let blob: Blob;

  do {
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    quality = 0.86;
    blob = await canvasToBlob(canvas, quality);

    while (blob.size > maxImageSizeBytes && quality > 0.42) {
      quality -= 0.08;
      blob = await canvasToBlob(canvas, quality);
    }

    if (blob.size <= maxImageSizeBytes) break;
    scale *= 0.82;
  } while (blob.size > maxImageSizeBytes && Math.max(canvas.width, canvas.height) > 720);

  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Gambar gagal dibaca."));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Gambar gagal dikompres."));
      },
      "image/jpeg",
      quality
    );
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const [content, setContent] = useState<WeddingContent>(defaultContent);
  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"info" | "success" | "error">("info");
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{
    title: string;
    description: string;
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  useEffect(() => {
    async function bootstrap() {
      if (!supabase) {
        router.push("/admin/login");
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/admin/login");
        return;
      }

      const [{ data }, { data: messageData }] = await Promise.all([
        supabase.from("wedding_contents").select("content").eq("id", contentId).maybeSingle(),
        supabase
          .from("guest_messages")
          .select("id, guest_name, message, created_at")
          .order("created_at", { ascending: false })
      ]);

      if (data?.content) setContent(withContentDefaults(data.content as Partial<WeddingContent>));
      if (messageData) setMessages(messageData as GuestMessage[]);
      setLoading(false);
    }

    bootstrap();
  }, [router]);

  async function saveContent() {
    if (!supabase) return;
    setStatusType("info");
    setStatus("Menyimpan...");
    const { error } = await supabase
      .from("wedding_contents")
      .upsert({ id: contentId, content, updated_at: new Date().toISOString() });

    if (error) {
      setStatusType("error");
      setStatus(error.message);
      return;
    }

    setStatusType("success");
    setStatus("Konten berhasil disimpan.");
    window.setTimeout(() => setStatus(""), 3200);
  }

  async function logout() {
    if (supabase) await supabase.auth.signOut();
    router.push("/admin/login");
  }

  function requestDeleteConfirmation(title: string, description: string, onConfirm: () => Promise<void> | void) {
    setConfirmDelete({ title, description, onConfirm });
  }

  async function confirmDeleteAction() {
    if (!confirmDelete) return;
    await confirmDelete.onConfirm();
    setConfirmDelete(null);
  }

  async function deleteMessage(id: string) {
    if (!supabase) return;

    setStatus("Menghapus ucapan...");
    const { error } = await supabase.from("guest_messages").delete().eq("id", id);
    if (error) {
      setStatusType("error");
      setStatus(error.message);
      return;
    }

    setMessages((current) => current.filter((message) => message.id !== id));
    setStatusType("success");
    setStatus("Ucapan tamu berhasil dihapus.");
    window.setTimeout(() => setStatus(""), 3200);
  }

  async function uploadAsset(event: ChangeEvent<HTMLInputElement>, onUploaded: (url: string) => void, previousUrl?: string) {
    const file = event.target.files?.[0];
    if (!file || !supabase) return;

    setStatusType("info");
    setStatus(file.type.startsWith("image/") ? "Mengompres dan mengunggah gambar..." : "Mengunggah file...");

    let uploadFile: File;
    try {
      uploadFile = file.type.startsWith("image/") ? await compressImage(file) : file;
    } catch (error) {
      setStatusType("error");
      setStatus(error instanceof Error ? error.message : "File gagal diproses.");
      return;
    }
    const safeName = uploadFile.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
    const path = `${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from(storageBucket).upload(path, uploadFile, { upsert: true });

    if (error) {
      setStatusType("error");
      setStatus(error.message);
      return;
    }

    const { data } = supabase.storage.from(storageBucket).getPublicUrl(path);
    onUploaded(data.publicUrl);

    const previousPath = getStoragePathFromPublicUrl(previousUrl);
    if (previousPath && previousPath !== path) {
      const { error: removeError } = await supabase.storage.from(storageBucket).remove([previousPath]);
      if (removeError) {
        setStatusType("error");
        setStatus(`File baru berhasil diunggah, tetapi file lama gagal dihapus: ${removeError.message}`);
        return;
      }
    }

    setStatusType("success");
    setStatus("File berhasil diunggah.");
    window.setTimeout(() => setStatus(""), 3200);
    event.target.value = "";
  }

  function updatePerson(type: "bride" | "groom", patch: Partial<BrideGroom>) {
    setContent((current) => ({
      ...current,
      couple: {
        ...current.couple,
        [type]: { ...current.couple[type], ...patch }
      }
    }));
  }

  if (loading) {
    return <main className="grid min-h-screen place-items-center bg-blush-50 text-gray-600">Memuat dashboard...</main>;
  }

  return (
    <main className="min-h-screen bg-blush-50">
      <header className="sticky top-0 z-20 border-b border-blush-100 bg-white/88 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blush-100 text-blush-600 lg:hidden"
              aria-label="Buka menu admin"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blush-500">Dashboard Admin</p>
              <h1 className="truncate font-display text-2xl text-gray-800 sm:text-3xl">Kelola Undangan</h1>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button onClick={saveContent} className="inline-flex items-center gap-2 rounded-full bg-blush-500 px-3 py-2 text-sm font-semibold text-white sm:px-4">
              <Save size={16} />
              <span className="hidden min-[380px]:inline">Simpan</span>
            </button>
            <button onClick={logout} className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 sm:px-4">
              <LogOut size={16} />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      <AdminSidebar
        status={status}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <ConfirmDeleteDialog
        open={Boolean(confirmDelete)}
        title={confirmDelete?.title ?? ""}
        description={confirmDelete?.description ?? ""}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={confirmDeleteAction}
      />

      <div className="mx-auto grid w-full max-w-7xl gap-6 px-3 py-6 sm:px-4 sm:py-8 lg:grid-cols-[240px_1fr]">
        <div className="hidden lg:block" />
        <div className="min-w-0 space-y-6">
          <Panel id="hero" title="Landing Page">
            <Field label="URL Foto Background">
              <input className="admin-input" value={content.heroImageUrl} onChange={(event) => setContent({ ...content, heroImageUrl: event.target.value })} />
              <Uploader
                accept="image/*"
                onChange={(event) =>
                  uploadAsset(event, (url) => setContent((current) => ({ ...current, heroImageUrl: url })), content.heroImageUrl)
                }
              />
            </Field>
            <Field label="Label Hero">
              <input
                className="admin-input"
                value={content.hero.eyebrow}
                onChange={(event) => setContent({ ...content, hero: { ...content.hero, eyebrow: event.target.value } })}
              />
            </Field>
            <Field label="Deskripsi Hero">
              <textarea
                rows={3}
                className="admin-input"
                value={content.hero.description}
                onChange={(event) => setContent({ ...content, hero: { ...content.hero, description: event.target.value } })}
              />
            </Field>
            <Field label="URL Foto Tirai Awal">
              <input
                className="admin-input"
                value={content.curtain.imageUrl}
                onChange={(event) => setContent({ ...content, curtain: { ...content.curtain, imageUrl: event.target.value } })}
                placeholder="Kosongkan jika ingin memakai foto background hero"
              />
              <Uploader
                accept="image/*"
                onChange={(event) =>
                  uploadAsset(
                    event,
                    (url) => setContent((current) => ({ ...current, curtain: { ...current.curtain, imageUrl: url } })),
                    content.curtain.imageUrl
                  )
                }
              />
            </Field>
            <div className="grid gap-4 xl:grid-cols-2">
              <Field label="Label Tirai">
                <input
                  className="admin-input"
                  value={content.curtain.eyebrow}
                  onChange={(event) => setContent({ ...content, curtain: { ...content.curtain, eyebrow: event.target.value } })}
                />
              </Field>
              <Field label="Teks Tombol Tirai">
                <input
                  className="admin-input"
                  value={content.curtain.buttonLabel}
                  onChange={(event) => setContent({ ...content, curtain: { ...content.curtain, buttonLabel: event.target.value } })}
                />
              </Field>
            </div>
            <Field label="Deskripsi Tirai">
              <textarea
                rows={3}
                className="admin-input"
                value={content.curtain.description}
                onChange={(event) => setContent({ ...content, curtain: { ...content.curtain, description: event.target.value } })}
              />
            </Field>
            <Field label="URL Lagu Latar">
              <input className="admin-input" value={content.musicUrl} onChange={(event) => setContent({ ...content, musicUrl: event.target.value })} />
              <Uploader
                accept="audio/*"
                onChange={(event) =>
                  uploadAsset(event, (url) => setContent((current) => ({ ...current, musicUrl: url })), content.musicUrl)
                }
              />
            </Field>
          </Panel>

          <Panel id="ayat" title="Ayat Al-Quran">
            <Field label="Judul Section Ayat">
              <input className="admin-input" value={content.quran.title} onChange={(event) => setContent({ ...content, quran: { ...content.quran, title: event.target.value } })} />
            </Field>
            <Field label="Teks Arab">
              <textarea rows={3} className="admin-input" value={content.quran.arabic} onChange={(event) => setContent({ ...content, quran: { ...content.quran, arabic: event.target.value } })} />
            </Field>
            <Field label="Terjemahan">
              <textarea rows={4} className="admin-input" value={content.quran.translation} onChange={(event) => setContent({ ...content, quran: { ...content.quran, translation: event.target.value } })} />
            </Field>
            <Field label="Sumber Ayat">
              <input className="admin-input" value={content.quran.source} onChange={(event) => setContent({ ...content, quran: { ...content.quran, source: event.target.value } })} />
            </Field>
          </Panel>

          <Panel id="mempelai" title="Mempelai dan Undangan">
            <Field label="Kata Mengundang">
              <textarea rows={4} className="admin-input" value={content.invitationText} onChange={(event) => setContent({ ...content, invitationText: event.target.value })} />
            </Field>
            <div className="grid gap-5 xl:grid-cols-2">
              <PersonEditor
                title="Mempelai Wanita"
                person={content.couple.bride}
                onChange={(patch) => updatePerson("bride", patch)}
                onUpload={(event) => uploadAsset(event, (url) => updatePerson("bride", { photoUrl: url }), content.couple.bride.photoUrl)}
              />
              <PersonEditor
                title="Mempelai Pria"
                person={content.couple.groom}
                onChange={(patch) => updatePerson("groom", patch)}
                onUpload={(event) => uploadAsset(event, (url) => updatePerson("groom", { photoUrl: url }), content.couple.groom.photoUrl)}
              />
            </div>
          </Panel>

          <Panel id="acara" title="Tanggal Acara">
            <Repeater
              items={content.events}
              addLabel="Tambah Acara"
              createItem={() => ({ title: "Acara Baru", date: "2026-08-22", time: "10.00 WIB", venue: "Lokasi Acara" })}
              onChange={(events) => setContent({ ...content, events })}
              onRequestDelete={(remove) =>
                requestDeleteConfirmation("Hapus Acara?", "Data acara ini akan dihapus dari undangan setelah Anda menyimpan perubahan.", remove)
              }
              render={(event, index, update) => (
                <div className="grid gap-3 md:grid-cols-2">
                  <input className="admin-input" value={event.title} onChange={(e) => update({ ...event, title: e.target.value })} placeholder="Nama acara" />
                  <input type="date" className="admin-input" value={event.date} onChange={(e) => update({ ...event, date: e.target.value })} />
                  <input className="admin-input" value={event.time} onChange={(e) => update({ ...event, time: e.target.value })} placeholder="Jam" />
                  <input className="admin-input" value={event.venue} onChange={(e) => update({ ...event, venue: e.target.value })} placeholder="Tempat" />
                </div>
              )}
            />
          </Panel>

          <Panel id="lokasi" title="Lokasi dan Maps">
            <div className="grid gap-4 xl:grid-cols-2">
              <Field label="Nama Lokasi">
                <input className="admin-input" value={content.location.title} onChange={(event) => setContent({ ...content, location: { ...content.location, title: event.target.value } })} />
              </Field>
              <Field label="Alamat">
                <input className="admin-input" value={content.location.address} onChange={(event) => setContent({ ...content, location: { ...content.location, address: event.target.value } })} />
              </Field>
              <Field label="Latitude">
                <input className="admin-input" value={content.location.latitude} onChange={(event) => setContent({ ...content, location: { ...content.location, latitude: event.target.value } })} />
              </Field>
              <Field label="Longitude">
                <input className="admin-input" value={content.location.longitude} onChange={(event) => setContent({ ...content, location: { ...content.location, longitude: event.target.value } })} />
              </Field>
            </div>
            <p className="rounded-lg bg-blush-50 p-4 text-sm leading-6 text-gray-500">
              Maps akan memakai nama lokasi dan alamat terlebih dahulu. Latitude dan longitude bisa diisi angka desimal
              seperti -6.200000 dan 106.816666 sebagai cadangan; koordinat 0,0 akan diabaikan.
            </p>
          </Panel>

          <Panel id="keluarga" title="Daftar Keluarga">
            <Repeater
              items={content.families}
              addLabel="Tambah Kelompok Keluarga"
              createItem={() => ({ side: "Keluarga", names: ["Nama keluarga"] })}
              onChange={(families) => setContent({ ...content, families })}
              onRequestDelete={(remove) =>
                requestDeleteConfirmation("Hapus Keluarga?", "Kelompok keluarga ini akan dihapus dari daftar undangan setelah Anda menyimpan perubahan.", remove)
              }
              render={(family, index, update) => (
                <div className="space-y-3">
                  <input className="admin-input" value={family.side} onChange={(e) => update({ ...family, side: e.target.value })} />
                  <textarea rows={4} className="admin-input" value={family.names.join("\n")} onChange={(e) => update({ ...family, names: e.target.value.split("\n").filter(Boolean) })} />
                </div>
              )}
            />
          </Panel>

          <Panel id="gallery" title="Gallery">
            <label className="flex items-center justify-between gap-4 rounded-lg bg-blush-50 p-4">
              <span>
                <span className="block font-semibold text-gray-800">Tampilkan Gallery</span>
                <span className="mt-1 block text-sm text-gray-500">Matikan jika section gallery tidak ingin muncul di halaman undangan.</span>
              </span>
              <input
                type="checkbox"
                checked={content.gallery.enabled}
                onChange={(event) =>
                  setContent({ ...content, gallery: { ...content.gallery, enabled: event.target.checked } })
                }
                className="h-5 w-5 accent-blush-500"
              />
            </label>
            <Field label="Judul Gallery">
              <input
                className="admin-input"
                value={content.gallery.title}
                onChange={(event) => setContent({ ...content, gallery: { ...content.gallery, title: event.target.value } })}
              />
            </Field>
            <Repeater
              items={content.gallery.images}
              addLabel="Tambah Gambar"
              createItem={() => ({ imageUrl: "", caption: "Caption gallery" })}
              onChange={(images) => setContent({ ...content, gallery: { ...content.gallery, images } })}
              onRequestDelete={(remove) =>
                requestDeleteConfirmation("Hapus Gambar Gallery?", "Gambar ini akan dihapus dari daftar gallery setelah Anda menyimpan perubahan.", remove)
              }
              render={(image, index, update) => (
                <div className="grid gap-4 md:grid-cols-[160px_1fr]">
                  <div
                    className="h-36 rounded-lg bg-blush-50 bg-cover bg-center"
                    style={{ backgroundImage: image.imageUrl ? `url(${image.imageUrl})` : undefined }}
                  >
                    {!image.imageUrl ? (
                      <div className="grid h-full place-items-center text-blush-400">
                        <ImageIcon size={30} />
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-3">
                    <input
                      className="admin-input"
                      value={image.imageUrl}
                      onChange={(event) => update({ ...image, imageUrl: event.target.value })}
                      placeholder="URL gambar"
                    />
                    <Uploader
                      accept="image/*"
                      onChange={(event) =>
                        uploadAsset(event, (url) => update({ ...image, imageUrl: url }), image.imageUrl)
                      }
                    />
                    <input
                      className="admin-input"
                      value={image.caption}
                      onChange={(event) => update({ ...image, caption: event.target.value })}
                      placeholder="Caption"
                    />
                  </div>
                </div>
              )}
            />
          </Panel>

          <Panel id="ucapan" title="Ucapan Tamu">
            {messages.length ? (
              <div className="space-y-3">
                {messages.map((message) => (
                  <div key={message.id} className="rounded-lg border border-gray-100 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-semibold text-gray-800">{message.guest_name}</p>
                        <p className="mt-1 text-sm text-gray-400">
                          {new Intl.DateTimeFormat("id-ID", {
                            dateStyle: "medium",
                            timeStyle: "short"
                          }).format(new Date(message.created_at))}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          requestDeleteConfirmation(
                            "Hapus Ucapan Tamu?",
                            `Ucapan dari ${message.guest_name} akan dihapus permanen.`,
                            () => deleteMessage(message.id)
                          )
                        }
                        className="inline-flex w-fit items-center gap-2 rounded-full bg-red-50 px-3 py-2 text-sm font-semibold text-red-600"
                      >
                        <Trash2 size={15} />
                        Hapus
                      </button>
                    </div>
                    <p className="mt-3 leading-7 text-gray-600">{message.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-blush-50 p-5 text-gray-500">Belum ada ucapan dari tamu.</div>
            )}
          </Panel>

          <Panel id="rekening" title="Nomor Rekening">
            <Repeater
              items={content.bankAccounts}
              addLabel="Tambah Rekening"
              createItem={() => ({ bank: "Bank", accountName: "Nama Pemilik", accountNumber: "000000" })}
              onChange={(bankAccounts) => setContent({ ...content, bankAccounts })}
              onRequestDelete={(remove) =>
                requestDeleteConfirmation("Hapus Rekening?", "Rekening ini akan dihapus dari undangan setelah Anda menyimpan perubahan.", remove)
              }
              render={(account, index, update) => (
                <div className="grid gap-3 lg:grid-cols-3">
                  <input className="admin-input" value={account.bank} onChange={(e) => update({ ...account, bank: e.target.value })} />
                  <input className="admin-input" value={account.accountName} onChange={(e) => update({ ...account, accountName: e.target.value })} />
                  <input className="admin-input" value={account.accountNumber} onChange={(e) => update({ ...account, accountNumber: e.target.value })} />
                </div>
              )}
            />
          </Panel>

          <Panel id="penutup" title="Ucapan Terima Kasih">
            <textarea rows={5} className="admin-input" value={content.thankYouText} onChange={(event) => setContent({ ...content, thankYouText: event.target.value })} />
          </Panel>
        </div>
      </div>
      {status ? <Toast message={status} type={statusType} /> : null}
    </main>
  );
}

function Toast({ message, type }: { message: string; type: "info" | "success" | "error" }) {
  const style = {
    info: "border-blush-200 bg-white text-gray-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    error: "border-red-200 bg-red-50 text-red-700"
  }[type];

  return (
    <div className={`fixed bottom-5 left-1/2 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2 rounded-lg border px-5 py-4 text-sm font-semibold shadow-soft ${style}`}>
      {message}
    </div>
  );
}

function ConfirmDeleteDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel
}: {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-gray-950/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-white bg-white p-6 text-center shadow-soft">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <Trash2 size={20} />
        </div>
        <h2 className="mt-5 font-display text-3xl text-gray-800">{title}</h2>
        <p className="mt-3 leading-7 text-gray-500">{description}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600"
          >
            Ya, Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

const adminMenuItems = ["Hero", "Ayat", "Mempelai", "Acara", "Lokasi", "Keluarga", "Gallery", "Ucapan", "Rekening", "Penutup"];

function AdminSidebar({
  status,
  isOpen,
  onClose
}: {
  status: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <>
      <aside className="fixed bottom-6 left-[max(1rem,calc((100vw-80rem)/2+1rem))] top-24 z-10 hidden w-60 rounded-lg bg-white p-4 shadow-soft lg:block">
        <SidebarContent status={status} onNavigate={onClose} />
      </aside>

      <div
        className={`fixed inset-0 z-40 bg-gray-950/45 transition lg:hidden ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed bottom-0 left-0 top-0 z-50 w-[min(84vw,320px)] bg-white p-4 shadow-soft transition-transform duration-300 lg:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blush-500">Menu</p>
            <p className="font-display text-2xl text-gray-800">Admin</p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600"
            aria-label="Tutup menu admin"
          >
            <X size={20} />
          </button>
        </div>
        <SidebarContent status={status} onNavigate={onClose} />
      </aside>
    </>
  );
}

function SidebarContent({ status, onNavigate }: { status: string; onNavigate: () => void }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {adminMenuItems.map((item) => (
          <a
            key={item}
            href={`#${item.toLowerCase()}`}
            onClick={onNavigate}
            className="block rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-blush-50 hover:text-blush-600"
          >
            {item}
          </a>
        ))}
      </nav>
      {status ? <p className="mt-5 rounded-lg bg-blush-50 p-3 text-sm text-gray-600">{status}</p> : null}
    </div>
  );
}

function Panel({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="rounded-lg bg-white p-4 shadow-soft sm:p-6">
      <h2 className="font-display text-2xl text-gray-800 sm:text-3xl">{title}</h2>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-gray-700">{label}</span>
      {children}
    </label>
  );
}

function Uploader({ accept, onChange }: { accept: string; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
      <Upload size={16} />
      Upload File
      <input type="file" accept={accept} onChange={onChange} className="hidden" />
    </label>
  );
}

function PersonEditor({
  title,
  person,
  onChange,
  onUpload
}: {
  title: string;
  person: BrideGroom;
  onChange: (patch: Partial<BrideGroom>) => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="rounded-lg border border-gray-100 p-3 sm:p-4">
      <h3 className="font-semibold text-gray-800">{title}</h3>
      <div className="mt-4 space-y-3">
        <input className="admin-input" value={person.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="Nama lengkap" />
        <input className="admin-input" value={person.shortName} onChange={(event) => onChange({ shortName: event.target.value })} placeholder="Nama panggilan" />
        <input className="admin-input" value={person.parents} onChange={(event) => onChange({ parents: event.target.value })} placeholder="Nama orang tua" />
        <input className="admin-input" value={person.photoUrl} onChange={(event) => onChange({ photoUrl: event.target.value })} placeholder="URL foto" />
        <Uploader accept="image/*" onChange={onUpload} />
        <textarea rows={4} className="admin-input" value={person.description} onChange={(event) => onChange({ description: event.target.value })} placeholder="Deskripsi singkat" />
      </div>
    </div>
  );
}

function Repeater<T extends WeddingEvent | FamilyGroup | BankAccount | GalleryImage>({
  items,
  addLabel,
  createItem,
  onChange,
  onRequestDelete,
  render
}: {
  items: T[];
  addLabel: string;
  createItem: () => T;
  onChange: (items: T[]) => void;
  onRequestDelete: (remove: () => void) => void;
  render: (item: T, index: number, update: (item: T) => void) => React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="rounded-lg border border-gray-100 p-3 sm:p-4">
          <div className="mb-3 flex justify-end">
            <button
              onClick={() => onRequestDelete(() => onChange(items.filter((_, itemIndex) => itemIndex !== index)))}
              className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-2 text-sm font-semibold text-red-600"
            >
              <Trash2 size={15} />
              Hapus
            </button>
          </div>
          {render(item, index, (updatedItem) => onChange(items.map((current, itemIndex) => (itemIndex === index ? updatedItem : current))))}
        </div>
      ))}
      <button onClick={() => onChange([...items, createItem()])} className="inline-flex items-center gap-2 rounded-full bg-blush-100 px-4 py-2 text-sm font-semibold text-blush-600">
        <Plus size={16} />
        {addLabel}
      </button>
    </div>
  );
}
