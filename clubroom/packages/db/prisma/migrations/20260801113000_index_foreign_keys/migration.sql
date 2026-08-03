CREATE INDEX "AuthSession_userDeviceId_idx"
  ON "AuthSession"("userDeviceId");

CREATE INDEX "CoachAthleteRosterEntry_createdByUserId_idx"
  ON "CoachAthleteRosterEntry"("createdByUserId");

CREATE INDEX "CoachAthleteRosterEntry_updatedByUserId_idx"
  ON "CoachAthleteRosterEntry"("updatedByUserId");

CREATE INDEX "VerificationDocument_coachVerificationId_idx"
  ON "VerificationDocument"("coachVerificationId");

CREATE INDEX "SelfAssessmentEntry_bookingId_idx"
  ON "SelfAssessmentEntry"("bookingId");

CREATE INDEX "SelfAssessmentEntry_promptId_idx"
  ON "SelfAssessmentEntry"("promptId");

CREATE INDEX "AthleteSkillAssessment_skillDefinitionId_idx"
  ON "AthleteSkillAssessment"("skillDefinitionId");

CREATE INDEX "AthleteBadge_badgeDefinitionId_idx"
  ON "AthleteBadge"("badgeDefinitionId");

CREATE INDEX "DrillAssignment_drillId_idx"
  ON "DrillAssignment"("drillId");

CREATE INDEX "AssignmentSubmission_mediaObjectId_idx"
  ON "AssignmentSubmission"("mediaObjectId");

CREATE INDEX "SessionMediaAsset_thumbnailMediaObjectId_idx"
  ON "SessionMediaAsset"("thumbnailMediaObjectId");

CREATE INDEX "UploadSession_mediaObjectId_idx"
  ON "UploadSession"("mediaObjectId");

CREATE INDEX "Video_mediaObjectId_idx"
  ON "Video"("mediaObjectId");

CREATE INDEX "RetentionRun_retentionPolicyId_idx"
  ON "RetentionRun"("retentionPolicyId");
