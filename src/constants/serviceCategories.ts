export const COURSE_PRODUCTS = [
  "Curso de Meta Ads",
  "Curso Meta Ads Avançado",
  "Curso Google Ads",
  "Curso de TikTok Ads",
  "Curso de YouTube Ads",
  "Curso de Social Midia",
  "Curso de IA",
  "Curso Canva para Empreendedores",
  "Curso Captacao/Edicao",
];

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
  "Gestão de Tráfego Pago - Meta Ads",
  "Gestão de Tráfego Pago - Google Ads",
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
  { canonical: "Curso de Meta Ads", aliases: ["curso de meta ads", "meta ads", "curso meta ads", "curso trafego pago meta ads", "curso de trafego pago meta ads"] },
  { canonical: "Curso Meta Ads Avançado", aliases: ["curso meta ads avancado", "curso de meta ads avancado", "meta ads avancado", "gestor pro", "curso de trafego gestor pro", "curso de trafego gestor pro+"] },
  { canonical: "Curso Google Ads", aliases: ["curso google ads", "curso de google ads", "curso trafego pago google ads", "curso de trafego pago google ads", "google ads"] },
  { canonical: "Curso de TikTok Ads", aliases: ["curso de tiktok ads", "curso tiktok ads", "tiktok ads"] },
  { canonical: "Curso de YouTube Ads", aliases: ["curso de youtube ads", "curso youtube ads", "youtube ads"] },
  { canonical: "Curso de Social Midia", aliases: ["curso de social midia", "curso de social media", "curso social midia", "curso social media", "social media", "social midia"] },
  { canonical: "Curso de IA", aliases: ["curso de ia", "curso ia", "curso de inteligencia artificial", "curso inteligencia artificial", "inteligencia artificial", "ia"] },
  { canonical: "Curso Canva para Empreendedores", aliases: ["curso canva para empreendedores", "curso de canva para empreendedores", "curso canva", "curso de canva", "canva"] },
  { canonical: "Curso Captacao/Edicao", aliases: ["curso captacao/edicao", "curso captacao/edicao de conteudo", "captacao/edicao", "curso captacao e edicao de video", "curso de captacao e edicao de video", "curso de edicao e captacao de videos", "curso edicao e captacao de videos", "curso captacao edicao", "captacao e edicao de video"] },
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
