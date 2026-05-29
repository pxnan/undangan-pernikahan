export type BrideGroom = {
  name: string;
  shortName: string;
  photoUrl: string;
  description: string;
  parents: string;
};

export type WeddingEvent = {
  title: string;
  date: string;
  time: string;
  venue: string;
};

export type FamilyGroup = {
  side: string;
  names: string[];
};

export type BankAccount = {
  bank: string;
  accountName: string;
  accountNumber: string;
};

export type GalleryImage = {
  imageUrl: string;
  caption: string;
};

export type WeddingContent = {
  heroImageUrl: string;
  musicUrl: string;
  couple: {
    bride: BrideGroom;
    groom: BrideGroom;
  };
  quran: {
    arabic: string;
    translation: string;
    source: string;
  };
  invitationText: string;
  events: WeddingEvent[];
  location: {
    title: string;
    address: string;
    latitude: string;
    longitude: string;
  };
  families: FamilyGroup[];
  gallery: {
    enabled: boolean;
    title: string;
    images: GalleryImage[];
  };
  bankAccounts: BankAccount[];
  thankYouText: string;
};

export type GuestMessage = {
  id: string;
  guest_name: string;
  message: string;
  created_at: string;
};
