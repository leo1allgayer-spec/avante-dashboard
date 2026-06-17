
-- 1) Restrict meeting_reminder_logs INSERT to authenticated only
DROP POLICY IF EXISTS "Service can insert reminder logs" ON public.meeting_reminder_logs;
CREATE POLICY "Authenticated can insert reminder logs"
ON public.meeting_reminder_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2) Revoke EXECUTE from public/anon/authenticated on trigger-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user_permissions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_booking_to_enrollment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_enrollment_on_booking_delete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_empty_course_slot() FROM PUBLIC, anon, authenticated;
