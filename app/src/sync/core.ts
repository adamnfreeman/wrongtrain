/* What to do when a server copy of a shared trip arrives, as a pure function. The engine calls
   this for every copy it sees: from opening the app, coming back online, a live update, or a
   save that was refused because someone else saved first. */
import type { Trip } from '../model/types';
import type { SyncInfo } from '../model/store';
import { merge3, same } from '../model/merge';

export interface Remote { id: string; data: Trip; version: number }

export interface Outcome {
  trip: Trip;
  info: SyncInfo;
  /** This phone has changes the server does not have yet. */
  push: boolean;
}

export function receive(local: Trip | undefined, info: SyncInfo | undefined, remote: Remote): Outcome | null {
  const server: Trip = { ...remote.data, id: remote.id };
  /* a trip this phone has not seen yet (just joined, or shared from another phone) */
  if (!local || !info) return { trip: server, info: { version: remote.version, base: server, dirty: false }, push: false };
  /* nothing new: an echo of our own save, or an old message arriving late */
  if (remote.version <= info.version) return null;
  if (!info.dirty) return { trip: server, info: { version: remote.version, base: server, dirty: false }, push: false };
  const merged = merge3(info.base, local, server);
  const changed = !same(stripStamp(merged), stripStamp(server));
  return { trip: merged, info: { version: remote.version, base: server, dirty: changed }, push: changed };
}

/** After a save succeeds: the copy sent is now the server's; anything typed since is still to send. */
export function saved(sent: Trip, current: Trip, version: number): SyncInfo {
  return { version, base: sent, dirty: !same(stripStamp(sent), stripStamp(current)) };
}

const stripStamp = (t: Trip) => ({ ...t, updatedAt: '' });
