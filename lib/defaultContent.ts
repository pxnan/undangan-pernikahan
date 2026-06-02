import type { WeddingContent } from "./types";

export const defaultContent: WeddingContent = {
  heroImageUrl: "",
  musicUrl: "",
  hero: {
    eyebrow: "",
    description: ""
  },
  curtain: {
    imageUrl: "",
    eyebrow: "",
    description: "",
    buttonLabel: ""
  },
  couple: {
    bride: {
      name: "",
      shortName: "",
      photoUrl: "",
      description: "",
      parents: ""
    },
    groom: {
      name: "",
      shortName: "",
      photoUrl: "",
      description: "",
      parents: ""
    }
  },
  quran: {
    title: "",
    arabic: "",
    translation: "",
    source: ""
  },
  invitationText: "",
  events: [],
  location: {
    title: "",
    address: "",
    latitude: "",
    longitude: ""
  },
  families: [],
  gallery: {
    enabled: false,
    title: "",
    images: []
  },
  bankAccounts: [],
  thankYouText: ""
};
