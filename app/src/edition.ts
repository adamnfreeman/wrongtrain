/* Which app this build is. The Japan edition (npm run build:japan, published at wrongtrain.lol/japan)
   shows the Japan 2026 trip straight from its Google Sheet (sheet/live.ts), for the group on that
   trip; everything else is the normal app. */
export const JAPAN = import.meta.env.VITE_EDITION === 'japan';
