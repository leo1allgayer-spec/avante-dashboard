update public.survey_responses
set curso_realizado = 'Curso de Meta Ads Avançado'
where cpf = '013.697.180-63'
   or regexp_replace(coalesce(cpf, ''), '\\D', '', 'g') = '01369718063';
