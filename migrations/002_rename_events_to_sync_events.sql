DO $$
BEGIN
  IF to_regclass('public.sync_events') IS NULL AND to_regclass('public.events') IS NOT NULL THEN
    ALTER TABLE events RENAME TO sync_events;
  END IF;

  IF to_regclass('public.idx_events_occurred') IS NOT NULL AND to_regclass('public.idx_sync_events_occurred') IS NULL THEN
    ALTER INDEX idx_events_occurred RENAME TO idx_sync_events_occurred;
  END IF;

  IF to_regclass('public.idx_events_status') IS NOT NULL AND to_regclass('public.idx_sync_events_status') IS NULL THEN
    ALTER INDEX idx_events_status RENAME TO idx_sync_events_status;
  END IF;
END $$;
