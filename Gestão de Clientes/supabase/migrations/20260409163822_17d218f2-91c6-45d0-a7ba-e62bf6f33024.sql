ALTER TABLE public.user_permissions
ADD COLUMN can_access_bookings boolean NOT NULL DEFAULT true;