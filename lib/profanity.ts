const profanityTerms = [
  "anjing",
  "anjir",
  "asu",
  "babi",
  "bangsat",
  "bajingan",
  "brengsek",
  "kampret",
  "kontol",
  "memek",
  "ngentot",
  "peler",
  "pepek",
  "goblok",
  "goblog",
  "tolol",
  "bego",
  "bodoh",
  "idiot",
  "jancuk",
  "cok",
  "cuk",
  "kehed",
  "kimak",
  "puki",
  "pukimak",
  "puki mak",
  "puki mai",
  "cuki",
  "cuki mak",
  "cuki mai",
  "setan",
  "iblis",
  "fuck",
  "fucking",
  "shit",
  "bitch",
  "asshole",
  "bastard",
  "dick",
  "cunt",
  "motherfucker",
  "moron",
  "stupid"
];

const leetMap: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  "$": "s",
  "!": "i"
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[013457@$!]/g, (match) => leetMap[match] ?? match)
    .replace(/(.)\1{2,}/g, "$1$1")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactText(value: string) {
  return normalizeText(value).replace(/\s+/g, "");
}

export function containsProfanity(value: string) {
  const normalized = normalizeText(value);
  const compacted = compactText(value);

  return profanityTerms.some((term) => {
    const normalizedTerm = normalizeText(term);
    const compactedTerm = compactText(term);

    if (normalizedTerm.includes(" ")) {
      return normalized.includes(normalizedTerm) || compacted.includes(compactedTerm);
    }

    const wordPattern = new RegExp(`(^|\\s)${normalizedTerm}(\\s|$)`);
    const spacedPattern = new RegExp(`(^|\\s)${normalizedTerm.split("").join("\\s*")}(\\s|$)`);
    return wordPattern.test(normalized) || spacedPattern.test(normalized);
  });
}
