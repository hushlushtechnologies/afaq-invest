-- Apply only AFTER migrating the new compliance_settings table.
-- Mirrors COMPLIANCE_DEFAULTS in packages/types/src/kyc.ts.
INSERT INTO "compliance_settings"
    ("id", "minimum_age", "review_months_low", "review_months_medium",
     "review_months_high", "max_document_bytes", "investor_invitation_days",
     "created_at", "updated_at")
VALUES ('global', 18, 36, 24, 12, 10485760, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
