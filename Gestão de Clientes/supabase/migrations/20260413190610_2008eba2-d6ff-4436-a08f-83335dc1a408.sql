
-- Drop the admin-only update policy
DROP POLICY "Admins can update bookings" ON public.course_bookings;

-- Create a new policy allowing all authenticated users to update course_status
CREATE POLICY "Authenticated can update booking course_status"
ON public.course_bookings
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
