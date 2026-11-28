-- Apply once to the existing D1 database; preserve all historic rows.
ALTER TABLE community_leads ADD COLUMN device_type TEXT;
ALTER TABLE community_leads ADD COLUMN operating_system TEXT;
ALTER TABLE community_leads ADD COLUMN country_code TEXT;
ALTER TABLE community_leads ADD COLUMN region_code TEXT;
ALTER TABLE community_leads ADD COLUMN metadata_opt_in INTEGER NOT NULL DEFAULT 0 CHECK(metadata_opt_in IN (0,1));
