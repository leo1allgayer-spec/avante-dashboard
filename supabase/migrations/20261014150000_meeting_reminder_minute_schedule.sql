-- Minute checks allow the final Webster reminder to run close to five minutes before.
select cron.alter_job(job_id := jobid, schedule := '* * * * *')
from cron.job where jobname = 'meeting-reminder-every-5-minutes';
