-- Hard-delete related anonymous data when an installation is wiped (self-service deletion).
ALTER TABLE "assistant_conversations" DROP CONSTRAINT "assistant_conversations_deviceId_fkey";
ALTER TABLE "assistant_conversations"
  ADD CONSTRAINT "assistant_conversations_deviceId_fkey"
  FOREIGN KEY ("deviceId") REFERENCES "anonymous_devices"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "analytics_events" DROP CONSTRAINT "analytics_events_deviceId_fkey";
ALTER TABLE "analytics_events"
  ADD CONSTRAINT "analytics_events_deviceId_fkey"
  FOREIGN KEY ("deviceId") REFERENCES "anonymous_devices"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_feedback" DROP CONSTRAINT "product_feedback_deviceId_fkey";
ALTER TABLE "product_feedback"
  ADD CONSTRAINT "product_feedback_deviceId_fkey"
  FOREIGN KEY ("deviceId") REFERENCES "anonymous_devices"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
