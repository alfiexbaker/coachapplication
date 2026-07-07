ALTER TABLE "GroupSession"
  ADD COLUMN "cancelledInstancesJson" JSONB;

ALTER TABLE "GroupSession"
  ADD CONSTRAINT "GroupSession_cancelledInstancesJson_array"
  CHECK ("cancelledInstancesJson" IS NULL OR jsonb_typeof("cancelledInstancesJson") = 'array');
