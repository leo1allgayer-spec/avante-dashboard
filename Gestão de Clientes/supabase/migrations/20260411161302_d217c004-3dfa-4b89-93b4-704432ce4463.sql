-- Remove duplicates keeping the oldest (smallest id)
DELETE FROM course_enrollments a
USING course_enrollments b
WHERE a.id > b.id
  AND a.student_name = b.student_name
  AND a.course_type = b.course_type
  AND COALESCE(a.date, '') = COALESCE(b.date, '')
  AND COALESCE(a.time, '') = COALESCE(b.time, '');

-- Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX idx_unique_enrollment 
ON course_enrollments (student_name, course_type, date, time);
