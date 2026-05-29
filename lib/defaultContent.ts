import type { WeddingContent } from "./types";

export const defaultContent: WeddingContent = {
  heroImageUrl:
    "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1800&q=80",
  musicUrl: "",
  couple: {
    bride: {
      name: "Aisyah Putri",
      shortName: "Aisyah",
      photoUrl:
        "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=900&q=80",
      description: "Putri pertama yang tumbuh dengan kelembutan, keteguhan, dan kasih keluarga.",
      parents: "Putri dari Bapak Ahmad dan Ibu Siti"
    },
    groom: {
      name: "Raka Pratama",
      shortName: "Raka",
      photoUrl:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80",
      description: "Putra pertama yang menjalani hidup dengan tanggung jawab, doa, dan kesungguhan.",
      parents: "Putra dari Bapak Budi dan Ibu Ratna"
    }
  },
  quran: {
    arabic: "وَمِنْ اٰيٰتِهٖٓ اَنْ خَلَقَ لَكُمْ مِّنْ اَنْفُسِكُمْ اَزْوَاجًا لِّتَسْكُنُوْٓا اِلَيْهَا",
    translation:
      "Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu pasangan-pasangan dari jenismu sendiri, supaya kamu cenderung dan merasa tenteram kepadanya.",
    source: "QS. Ar-Rum: 21"
  },
  invitationText:
    "Dengan memohon rahmat dan ridha Allah SWT, kami bermaksud mengundang Bapak/Ibu/Saudara/i untuk hadir dan memberikan doa restu pada acara pernikahan kami.",
  events: [
    {
      title: "Akad Nikah",
      date: "2026-08-22",
      time: "09.00 WIB",
      venue: "Masjid Agung"
    },
    {
      title: "Resepsi",
      date: "2026-08-22",
      time: "11.00 - 14.00 WIB",
      venue: "Gedung Serbaguna"
    }
  ],
  location: {
    title: "Gedung Serbaguna",
    address: "Jl. Mawar No. 12, Jakarta",
    latitude: "-6.200000",
    longitude: "106.816666"
  },
  families: [
    { side: "Keluarga Mempelai Wanita", names: ["Bapak Ahmad", "Ibu Siti", "Keluarga Besar Ahmad"] },
    { side: "Keluarga Mempelai Pria", names: ["Bapak Budi", "Ibu Ratna", "Keluarga Besar Budi"] }
  ],
  gallery: {
    enabled: true,
    title: "Galeri Cerita Kami",
    images: [
      {
        imageUrl:
          "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=80",
        caption: "Langkah kecil menuju hari bahagia"
      },
      {
        imageUrl:
          "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80",
        caption: "Momen yang ingin selalu dikenang"
      },
      {
        imageUrl:
          "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=1200&q=80",
        caption: "Doa dan cinta dari keluarga"
      }
    ]
  },
  bankAccounts: [
    { bank: "BCA", accountName: "Aisyah Putri", accountNumber: "1234567890" },
    { bank: "Mandiri", accountName: "Raka Pratama", accountNumber: "9876543210" }
  ],
  thankYouText:
    "Merupakan kebahagiaan dan kehormatan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu. Terima kasih atas cinta dan doa yang diberikan."
};
