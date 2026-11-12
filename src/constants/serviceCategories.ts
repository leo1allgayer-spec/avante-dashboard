import {COURSE_CATALOG,findCourse,normalizeCourseAlias} from './courseCatalog';
export const COURSE_PRODUCTS:string[] = COURSE_CATALOG.map(course=>course.financialName);

export const SUPPORT_PRODUCTS = ["Suporte Extra"];
export const PRODUCT_OPTIONS = [...COURSE_PRODUCTS, ...SUPPORT_PRODUCTS];

export const SERVICE_OPTIONS = [
  "Mentoria Meta Ads",
  "Assessoria 360",
  "Social Media",
  "Gestão de Tráfego Pago - Meta Ads",
  "Gestão de Tráfego Pago - Google Ads",
  "Captacao/Edicao de Conteudo",
  "CRM/Treinamento Comercial",
  "Desenvolvimento de Site",
];

export const GENERAL_SERVICE_OPTIONS = [
  "Assessoria 360",
  "Social Media",
  "Mentoria Meta Ads",
];

export const SERVICE_CATEGORIES = [...PRODUCT_OPTIONS, ...SERVICE_OPTIONS];

const normalizeCategoryText = (value?: string | null) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const CATEGORY_ALIASES: Array<{ canonical: string; aliases: string[] }> = [
  { canonical: "Suporte Extra", aliases: ["suporte extra", "suporte"] },
  { canonical: "Mentoria Meta Ads", aliases: ["mentoria meta ads"] },
  { canonical: "Assessoria 360", aliases: ["assessoria 360"] },
  { canonical: "Social Media", aliases: ["social media", "serviço de social media", "servico de social media", "gestão de social media", "gestao de social media"] },
  { canonical: "Gestão de Tráfego Pago - Meta Ads", aliases: ["gestao de trafego", "gestao de trafego pago", "gestao de trafego pago - meta ads", "trafego", "tráfego", "meta ads"] },
  { canonical: "Gestão de Tráfego Pago - Google Ads", aliases: ["gestao de trafego pago - google ads", "gestao google ads", "tráfego google ads"] },
  { canonical: "Captacao/Edicao de Conteudo", aliases: ["captacao/edicao de conteudo", "captacao", "captação", "captação/edição de conteúdo"] },
  { canonical: "CRM/Treinamento Comercial", aliases: ["crm/treinamento comercial", "crm", "treinamento comercial"] },
  { canonical: "Desenvolvimento de Site", aliases: ["desenvolvimento de site", "site"] },
];

export function canonicalizeSaleCategory(value?: string | null) {
  const normalized = normalizeCategoryText(value);
  if (!normalized) return "Sem categoria";
  const course=findCourse(value);
  if(course&&!(course.id==='social_media'&&!normalizeCourseAlias(value).startsWith('curso ')))return course.financialName;

  for (const entry of CATEGORY_ALIASES) {
    if (entry.aliases.some((alias) => normalizeCategoryText(alias) === normalized)) {
      return entry.canonical;
    }
  }

  return value?.trim() || "Sem categoria";
}

export function isCourseCategory(value?: string | null) {
  const canonical = canonicalizeSaleCategory(value);
  return COURSE_PRODUCTS.some((item) => normalizeCategoryText(item) === normalizeCategoryText(canonical));
}

export function isServiceCategory(value?: string | null) {
  const canonical = canonicalizeSaleCategory(value);
  return SERVICE_OPTIONS.some((item) => normalizeCategoryText(item) === normalizeCategoryText(canonical));
}
