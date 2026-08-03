BEGIN;

DO $$
DECLARE
  metadata_redaction_count integer := 0;
  resource_redaction_count integer := 0;
BEGIN
  UPDATE "AuditEvent"
  SET "metadataJson" =
    (COALESCE("metadataJson", '{}'::jsonb) - 'code')
    || jsonb_build_object(
      'codeReference', 'invite_code:historical_redacted',
      'historicalCodeRedacted', TRUE
    )
  WHERE "action" IN (
      'club_invite_code.create',
      'club_invite_code.remove',
      'club.join.resolve',
      'club.join'
    )
    AND COALESCE("metadataJson", '{}'::jsonb) ? 'code';

  GET DIAGNOSTICS metadata_redaction_count = ROW_COUNT;

  UPDATE "AuditEvent" audit
  SET "resourceId" = invite."clubId" || ':invite_code:historical_redacted'
  FROM "ClubInviteCode" invite
  WHERE audit."action" IN ('club_invite_code.create', 'club_invite_code.remove')
    AND audit."resourceId" = invite."clubId" || ':' || invite."code";

  GET DIAGNOSTICS resource_redaction_count = ROW_COUNT;

  INSERT INTO "AuditEvent" (
    "id",
    "occurredAt",
    "action",
    "resourceType",
    "resourceId",
    "result",
    "sensitiveRead",
    "metadataJson"
  )
  VALUES (
    'aev_migration_invite_code_redaction_20260801',
    CURRENT_TIMESTAMP,
    'audit.invite_code.redaction',
    'audit_event',
    NULL,
    'SUCCESS',
    FALSE,
    jsonb_build_object(
      'metadataRowsRedacted', metadata_redaction_count,
      'resourceRowsRedacted', resource_redaction_count,
      'migration', '20260801143000_redact_invite_codes_from_audit'
    )
  );
END $$;

COMMIT;
