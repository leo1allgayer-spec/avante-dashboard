import { courseDisplayName } from "@/constants/courseCatalog";
import { isDisparoOrigin } from "@/constants/saleOrigins";

export interface CourseSaleOrigin {
  cliente: string;
  produto?: string | null;
  servico?: string | null;
  aluno_futuro_item?: string | null;
  origem?: string | null;
  data?: string | null;
  created_at?: string | null;
}

const normalized = (value?: string | null) => (value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

export function isDisparoCourseSale(sales: CourseSaleOrigin[], studentName: string, courseName: string, courseDate?: string) {
  const student = normalized(studentName);
  const course = normalized(courseDisplayName(courseName));
  if (!student || !course) return false;
  const matches = sales.filter((sale) => {
    if (normalized(sale.cliente) !== student) return false;
    const saleCourse = sale.aluno_futuro_item || sale.produto || sale.servico;
    return normalized(courseDisplayName(saleCourse)) === course;
  });
  matches.sort((a, b) => {
    const aDate = a.data || a.created_at?.slice(0, 10) || "";
    const bDate = b.data || b.created_at?.slice(0, 10) || "";
    const aEligible = !courseDate || aDate <= courseDate;
    const bEligible = !courseDate || bDate <= courseDate;
    if (aEligible !== bEligible) return aEligible ? -1 : 1;
    if (aDate !== bDate) return bDate.localeCompare(aDate);
    return (b.created_at || "").localeCompare(a.created_at || "");
  });
  return matches.length > 0 && isDisparoOrigin(matches[0].origem);
}
