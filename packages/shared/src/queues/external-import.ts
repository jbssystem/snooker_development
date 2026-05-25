export const EXTERNAL_IMPORT_QUEUE = 'external-import';
export const SYNC_PLAYER_EXTERNAL_DATA_JOB = 'sync-player-external-data';

export type SyncPlayerExternalDataJob = {
  externalPlayerLinkId: string;
  importJobId: string;
};
