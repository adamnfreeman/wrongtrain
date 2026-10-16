/* The WrongTrain Supabase project. Both values are public by design: they let the app reach the
   project, and the access rules in supabase/schema.sql decide what each signed-in person can do.
   Never put the secret (service_role) key here. */
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://wklwpihkpiuniazhidjz.supabase.co';
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable__D8Xs8wsZA97toBm2kvbSQ_ZjDo5c7u';
