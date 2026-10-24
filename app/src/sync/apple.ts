/* What the iPhone itself can do, free and with no signal (ios/App/App/WrongTrainNative.swift): read
   text through the camera, translate on the phone, and run Apple's on-device language model for small
   jobs. Each is checked per device; elsewhere (older iPhones, the web, Android) the app falls back to
   Google Translate or Claude. */
import { Capacitor, registerPlugin } from '@capacitor/core';

export interface AppleCaps { scanner: boolean; translate: boolean; ai: boolean; aiWhy?: string }
interface Native {
  capabilities(): Promise<AppleCaps>;
  scanText(o: { languages: string[]; target: string }): Promise<{ pairs: { from: string; to: string }[] }>;
  translate(o: { texts: string[]; source?: string; target: string }): Promise<{ texts: string[] }>;
  pickNearby(o: { instructions: string; prompt: string }): Promise<{ picks: { id: string; why: string }[] }>;
  quickFile(o: { instructions: string; prompt: string }): Promise<{ kind: string; text: string; placeKind: string; city: string }>;
}
const N = registerPlugin<Native>('WrongTrainNative');
const NONE: AppleCaps = { scanner: false, translate: false, ai: false };

let caps: Promise<AppleCaps> | null = null;
export const appleCaps = (): Promise<AppleCaps> =>
  Capacitor.isNativePlatform() ? (caps ||= N.capabilities().catch(() => NONE)) : Promise.resolve(NONE);

/** The camera: tap lines to translate them over the camera; Done gives back what was translated. */
export const scanText = (languages: string[], target = 'en') => N.scanText({ languages, target });
export const translateOnPhone = (texts: string[], target: string, source?: string) => N.translate({ texts, target, source }).then(r => r.texts);
export const pickNearbyOnPhone = (instructions: string, prompt: string) => N.pickNearby({ instructions, prompt });
export const quickFileOnPhone = (instructions: string, prompt: string) => N.quickFile({ instructions, prompt });
