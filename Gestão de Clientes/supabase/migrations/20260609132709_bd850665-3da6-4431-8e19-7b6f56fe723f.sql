
CREATE OR REPLACE FUNCTION public.cleanup_empty_course_slot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot_id uuid;
  v_active_count int;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_slot_id := OLD.slot_id;
  ELSE
    v_slot_id := NEW.slot_id;
  END IF;

  IF v_slot_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COUNT(*) INTO v_active_count
  FROM public.course_bookings
  WHERE slot_id = v_slot_id
    AND status = 'confirmed'
    AND COALESCE(course_status, '') <> 'cancelado';

  IF v_active_count = 0 THEN
    DELETE FROM public.course_slots WHERE id = v_slot_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_empty_slot_after_update ON public.course_bookings;
CREATE TRIGGER trg_cleanup_empty_slot_after_update
AFTER UPDATE OF status, course_status ON public.course_bookings
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_empty_course_slot();

DROP TRIGGER IF EXISTS trg_cleanup_empty_slot_after_delete ON public.course_bookings;
CREATE TRIGGER trg_cleanup_empty_slot_after_delete
AFTER DELETE ON public.course_bookings
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_empty_course_slot();
