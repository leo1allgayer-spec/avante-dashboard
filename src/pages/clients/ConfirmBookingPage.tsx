import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CalendarDays, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabaseClients as supabase } from "@/integrations/supabase/clientsClient";
import avanteLogo from "@/assets/logo-full.svg";

type ConfirmResult = {
  success: boolean;
  message: string;
  student_name: string | null;
  course_name: string | null;
  course_date: string | null;
  course_time: string | null;
  course_status: string | null;
};

function formatDate(date: string | null) {
  if (!date) return "";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export default function ConfirmBookingPage() {
  const [params] = useSearchParams();
  const bookingId = params.get("id");
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ConfirmResult | null>(null);

  useEffect(() => {
    async function confirmBooking() {
      if (!bookingId) {
        setResult({
          success: false,
          message: "Link de confirmacao invalido.",
          student_name: null,
          course_name: null,
          course_date: null,
          course_time: null,
          course_status: null,
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc("confirm_course_booking", {
        p_booking_id: bookingId,
      });

      if (error) {
        setResult({
          success: false,
          message: "Nao foi possivel confirmar sua presenca. Tente novamente ou chame a equipe.",
          student_name: null,
          course_name: null,
          course_date: null,
          course_time: null,
          course_status: null,
        });
      } else {
        setResult((data?.[0] || null) as ConfirmResult | null);
      }
      setLoading(false);
    }

    confirmBooking();
  }, [bookingId]);

  const success = !!result?.success;

  return (
    <div className="min-h-screen bg-background text-foreground dot-pattern">
      <div className="flex min-h-screen items-center justify-center bg-background/85 px-4 py-8">
        <Card className="w-full max-w-xl rounded-2xl border-border/60 bg-card/80 shadow-xl shadow-black/15 backdrop-blur-lg">
          <CardContent className="space-y-6 p-6 text-center sm:p-8">
            <div className="flex flex-col items-center gap-3">
              <img src={avanteLogo} alt="Avante Digital" className="h-16 w-auto object-contain" />
              <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground/70">Avante Digital</p>
            </div>

            {loading ? (
              <div className="space-y-4">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                <div>
                  <h1 className="font-display text-2xl font-bold">Confirmando presenca...</h1>
                  <p className="mt-2 text-sm text-muted-foreground">Aguarde um momento.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${
                  success ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                }`}>
                  {success ? <CheckCircle2 className="h-9 w-9" /> : <XCircle className="h-9 w-9" />}
                </div>

                <div>
                  <h1 className="font-display text-2xl font-bold">
                    {success ? "Presenca confirmada!" : "Nao foi possivel confirmar"}
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {result?.message || "Tente novamente ou chame a equipe."}
                  </p>
                </div>

                {success && (
                  <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-left">
                    <p className="text-xs text-muted-foreground">Agendamento</p>
                    <p className="mt-1 font-semibold">{result?.course_name}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <span>{result?.student_name}</span>
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDate(result?.course_date)} {result?.course_time ? `- ${result.course_time}` : ""}
                      </span>
                    </div>
                  </div>
                )}

                <Button asChild variant="outline">
                  <Link to="/agendar">Voltar para agenda</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
