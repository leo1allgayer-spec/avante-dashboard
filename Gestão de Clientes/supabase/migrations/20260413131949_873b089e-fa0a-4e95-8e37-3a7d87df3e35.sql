
-- Drop the admin-only SELECT policy
DROP POLICY "Admins can view bookings" ON public.course_bookings;

-- Create a new policy allowing all authenticated users to view bookings
CREATE POLICY "Authenticated users can view bookings"
ON public.course_bookings
FOR SELECT
TO authenticated
USING (true);
