-- Migration: Create annotations table
-- Created: 2026-04-01

CREATE TYPE annotation_category AS ENUM ('observation', 'incident', 'maintenance', 'alert_auto');
CREATE TYPE annotation_visibility AS ENUM ('public', 'private');

CREATE TABLE IF NOT EXISTS annotations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id  UUID NOT NULL REFERENCES channels(id) ON UPDATE CASCADE ON DELETE CASCADE,
    from_ts     BIGINT NOT NULL,
    to_ts       BIGINT NOT NULL,
    text        TEXT NOT NULL,
    category    annotation_category NOT NULL DEFAULT 'observation',
    visibility  annotation_visibility NOT NULL DEFAULT 'public',
    author_id   UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS annotations_channel_id_idx      ON annotations (channel_id);
CREATE INDEX IF NOT EXISTS annotations_author_id_idx       ON annotations (author_id);
CREATE INDEX IF NOT EXISTS annotations_channel_range_idx   ON annotations (channel_id, from_ts, to_ts);
