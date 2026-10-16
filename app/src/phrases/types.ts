export interface Phrase {
  en: string;
  /** The phrase in the local language and script. */
  ja: string;
  /** Romanised reading. */
  ro: string;
  /** Sounds-like spelling for English speakers. */
  say?: string;
  when?: string;
  /** What to speak, when it differs from the written phrase (a reading in kana, say). */
  tts?: string;
}

export interface PhrasePack {
  lang: string;
  /** BCP 47 tag for the phone's voices, e.g. "ja-JP". */
  speechLang: string;
  name: string;
  /** Path to recorded clips beside the app, if any. */
  audio?: string;
  intro: string;
  dictionary?: { label: string; url: string };
  groups: { cat: string; items: Phrase[] }[];
}
