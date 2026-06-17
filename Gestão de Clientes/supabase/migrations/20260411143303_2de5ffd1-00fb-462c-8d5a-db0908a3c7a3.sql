ALTER TABLE public.meetings
ADD COLUMN origin text DEFAULT '' NOT NULL,
ADD COLUMN modality text DEFAULT 'presencial' NOT NULL,
ADD COLUMN has_closing boolean DEFAULT false NOT NULL;