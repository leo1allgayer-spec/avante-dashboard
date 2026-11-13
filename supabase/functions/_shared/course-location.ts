export const COHORT_COURSE_NAME = "Curso em Turma";

export const COHORT_COURSE_LOCATION =
  "Cond. Edifício São Joaquim\nR. Mariano de Matos, 137 - Centro, Novo Hamburgo - RS, 93510-040";

export function courseLocation(courseName: string | null | undefined): string | null {
  return courseName === COHORT_COURSE_NAME ? COHORT_COURSE_LOCATION : null;
}
