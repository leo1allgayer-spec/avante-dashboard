
-- Remove duplicates keeping the one with highest id
DELETE FROM daily_metrics a
USING daily_metrics b
WHERE a.user_id = b.user_id
  AND a.date = b.date
  AND a.id < b.id;

-- Add unique constraint to prevent future duplicates
ALTER TABLE daily_metrics ADD CONSTRAINT daily_metrics_user_id_date_unique UNIQUE (user_id, date);
