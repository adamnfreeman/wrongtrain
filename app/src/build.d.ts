/* Filled in by vite.config.ts when the app is built. */
declare const __BUILD__: { n: string; commit: string; at: string };

declare module 'virtual:parse-trip' {
  /** The Japan page's sheet reader: the web app's { tabs } in, the page's trip data out. */
  export function parseTrip(raw: unknown): { days: unknown[] } & Record<string, unknown>;
}
