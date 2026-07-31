import { ArrowRight, ExternalLink, QrCode, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const GOOGLE_REVIEW_URL =
  import.meta.env.VITE_GOOGLE_REVIEW_URL ||
  "https://www.google.com/search?q=Avante+Digital+S%C3%A3o+Leopoldo+avalia%C3%A7%C3%A3o+Google";

const qrImage = (url: string, size = 360) =>
  `https://quickchart.io/qr?text=${encodeURIComponent(url)}&size=${size}&margin=2`;

export default function QrPage() {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://dashboard-avante.pages.dev";
  const formUrl = `${origin}/pesquisa`;

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 dot-pattern opacity-30" />
      <div className="absolute left-[-18rem] top-[-16rem] h-[34rem] w-[34rem] rounded-full bg-accent/20 blur-3xl" />
      <div className="absolute right-[-20rem] bottom-[-18rem] h-[38rem] w-[38rem] rounded-full bg-primary/15 blur-3xl" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <Card className="w-full max-w-4xl border-border/70 bg-card/80 shadow-2xl backdrop-blur-xl">
          <CardContent className="p-6 sm:p-10">
            <div className="mb-8 flex flex-col items-center text-center">
              <img src="/favicon.svg" alt="Avante Digital" className="mb-5 h-16 w-16" />
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-lg shadow-accent/30">
                <QrCode className="h-8 w-8" />
              </div>
              <h1 className="font-display text-3xl font-bold sm:text-4xl">Formulário Pré-Venda</h1>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
                Escaneie o QR Code para acessar o formulário ou avaliar no Google.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <section className="rounded-2xl border border-border bg-secondary/30 p-5 text-center">
                <div className="mx-auto mb-4 w-fit rounded-2xl bg-white p-3 shadow-xl">
                  <img src={qrImage(formUrl)} alt="QR Code do formulário" className="h-56 w-56 sm:h-64 sm:w-64" />
                </div>
                <Button asChild className="h-12 w-full gap-2 text-base font-semibold">
                  <a href={formUrl}>
                    Formulário <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
                <p className="mt-3 break-all text-xs text-muted-foreground">{formUrl}</p>
              </section>

              <section className="rounded-2xl border border-border bg-secondary/30 p-5 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 text-accent">
                  <Star className="h-6 w-6" />
                </div>
                <div className="mx-auto mb-4 w-fit rounded-2xl bg-white p-3 shadow-xl">
                  <img src={qrImage(GOOGLE_REVIEW_URL)} alt="QR Code para avaliação no Google" className="h-56 w-56 sm:h-64 sm:w-64" />
                </div>
                <Button asChild variant="secondary" className="h-12 w-full gap-2 text-base font-semibold">
                  <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noopener noreferrer">
                    Avalie no Google <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                <p className="mt-3 text-xs text-muted-foreground">Sua avaliação nos ajuda muito.</p>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
