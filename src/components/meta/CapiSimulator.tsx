import React, { useState, useRef, useEffect } from "react";
import { Send, Trash2, Cpu, ShieldAlert } from "lucide-react";
import type { MetaCredentials } from "@/utils/meta/metaApi";
import { sendCapiEvent } from "@/utils/meta/metaApi";
import { hashUserData } from "@/utils/meta/crypto";

interface CapiSimulatorProps {
  credentials: MetaCredentials;
  isSimulatedMode: boolean;
}

interface LogEntry {
  id: string;
  timestamp: string;
  type: "info" | "success" | "error";
  tag: string;
  content: string;
}

export const CapiSimulator: React.FC<CapiSimulatorProps> = ({ credentials, isSimulatedMode }) => {
  const [eventName, setEventName] = useState<"Lead" | "Purchase" | "InitiateCheckout" | "Contact">("Lead");
  const [email, setEmail] = useState("cliente.teste@avante.digital");
  const [phone, setPhone] = useState("(11) 99888-7766");
  const [firstName, setFirstName] = useState("Matheus");
  const [lastName, setLastName] = useState("Ramos");
  const [value, setValue] = useState("197.00");
  const [testEventCode, setTestEventCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para o final do terminal de logs
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = (type: "info" | "success" | "error", tag: string, content: string) => {
    const timestamp = new Date().toLocaleTimeString("pt-BR");
    const newLog: LogEntry = {
      id: `${Date.now()}_${Math.random()}`,
      timestamp,
      type,
      tag,
      content,
    };
    setLogs((prev) => [...prev, newLog]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  // Helper para colorir sintaxe de JSON
  const syntaxHighlightJson = (json: string) => {
    if (!json) return "";
    return json.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        let cls = "number";
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = "key";
          } else {
            cls = "string";
          }
        } else if (/true|false/.test(match)) {
          cls = "boolean";
        } else if (/null/.test(match)) {
          cls = "null";
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    addLog("info", "Preparação", `Iniciando disparo do evento "${eventName}"...`);

    // 1. Normalização e Hash
    addLog("info", "Criptografia", "Normalizando dados pessoais do lead e criptografando em SHA-256 locais...");
    
    try {
      const hashedData = await hashUserData({
        email,
        phone,
        firstName,
        lastName,
        clientUserAgent: navigator.userAgent,
        clientIpAddress: "127.0.0.1",
      });

      const clientPayload = {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "chat",
        user_data: hashedData,
        custom_data: value ? { value: Number(value), currency: "BRL" } : undefined,
        test_event_code: testEventCode ? testEventCode.trim() : undefined,
      };

      addLog(
        "info",
        "Payload Seguro",
        JSON.stringify(clientPayload, null, 2)
      );

      // 2. Disparo Fictício ou Real
      if (isSimulatedMode) {
        addLog("info", "Simulador", "Enviando dados via sandbox local...");
        
        await new Promise((resolve) => setTimeout(resolve, 1500)); // Simula latência
        
        addLog(
          "success",
          "Resposta Meta (Simulada)",
          JSON.stringify(
            {
              events_received: 1,
              messages: [],
              fbtrace_id: "FfakeTraceId12345ABC",
              status: "success",
              info: "Disparo simulado com sucesso. Credenciais reais não configuradas.",
            },
            null,
            2
          )
        );
      } else {
        if (!credentials.pixelId || !credentials.capiToken) {
          addLog("error", "Erro Validação", "Pixel ID ou Token do CAPI ausentes nas configurações.");
          setLoading(false);
          return;
        }

        addLog("info", "Meta API", `Enviando requisição real para o Pixel ID: ${credentials.pixelId}...`);
        
        const response = await sendCapiEvent(credentials, {
          eventName,
          email,
          phone,
          firstName,
          lastName,
          value: value ? Number(value) : undefined,
          currency: "BRL",
          testEventCode: testEventCode ? testEventCode : undefined,
        });

        if (response.success) {
          addLog("success", "Sucesso Meta CAPI", JSON.stringify(response.data, null, 2));
        } else {
          addLog("error", "Erro Meta CAPI", response.error || "Falha na comunicação.");
        }
      }
    } catch (err: any) {
      addLog("error", "Erro Execução", err.message || "Ocorreu um erro no processamento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
      {/* Alerta de Modo de Simulação */}
      {isSimulatedMode && (
        <div className="simulation-banner">
          <ShieldAlert />
          <div className="simulation-banner-text">
            <h4>Modo de Simulação Ativo</h4>
            <p>O simulador está rodando localmente. Configure suas credenciais reais na aba "Configurações" para testar o envio direto ao Gerenciador de Eventos da Meta.</p>
          </div>
        </div>
      )}

      <div className="simulator-container">
        {/* Formulário de Disparo */}
        <div className="glass-panel" style={{ padding: "26px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "25px" }}>
            <Cpu size={22} style={{ color: "hsl(var(--color-roas))" }} />
            <h3 style={{ fontSize: "18px", fontWeight: 700 }}>Disparar Evento CAPI</h3>
          </div>

          <form onSubmit={handleSimulate}>
            <div className="form-group">
              <label>Nome do Evento (Event Name)</label>
              <select
                className="form-input"
                value={eventName}
                onChange={(e) => setEventName(e.target.value as any)}
              >
                <option value="Lead">Lead (Contato/Interesse)</option>
                <option value="Purchase">Purchase (Compra Concluída)</option>
                <option value="InitiateCheckout">Initiate Checkout (Início de Pagamento)</option>
                <option value="Contact">Contact (WhatsApp/Conversa Iniciada)</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>E-mail do Cliente</label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: cliente@email.com"
                  required
                />
              </div>

              <div className="form-group">
                <label>Telefone (WhatsApp)</label>
                <input
                  type="text"
                  className="form-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="ex: (11) 99999-8888"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Primeiro Nome</label>
                <input
                  type="text"
                  className="form-input"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="ex: Matheus"
                />
              </div>

              <div className="form-group">
                <label>Sobrenome</label>
                <input
                  type="text"
                  className="form-input"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="ex: Ramos"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Valor da Venda / Evento (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="ex: 197.00"
                />
              </div>

              <div className="form-group">
                <label>Código de Teste do Events Manager</label>
                <input
                  type="text"
                  className="form-input"
                  value={testEventCode}
                  onChange={(e) => setTestEventCode(e.target.value)}
                  placeholder="ex: TEST82103 (Opcional)"
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              <Send size={18} />
              {loading ? "Processando e Enviando..." : "Disparar Conversão à Meta"}
            </button>
          </form>
        </div>

        {/* Terminal Logs Debug */}
        <div className="terminal-window">
          <div className="terminal-header">
            <div className="terminal-dots">
              <div className="dot red"></div>
              <div className="dot yellow"></div>
              <div className="dot green"></div>
            </div>
            <div className="terminal-title">META_CAPI_DEBUGGER_CONSOLE.log</div>
            <button
              onClick={clearLogs}
              style={{ background: "transparent", border: "none", color: "hsl(var(--text-muted))", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
              title="Limpar Console"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <div className="terminal-body">
            {logs.length === 0 ? (
              <div style={{ color: "hsl(var(--text-muted))", textAlign: "center", marginTop: "120px", fontFamily: "monospace" }}>
                &gt;_ Console ocioso. Preencha o formulário e dispare um evento para ver a hashificação e a comunicação de rede em tempo real.
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="log-entry">
                  <div className="log-header">
                    <span className={`log-tag log-tag-${log.type} ${log.type === "success" ? "success" : log.type === "info" ? "info" : "error"}`}>
                      [{log.tag}]
                    </span>
                    <span>{log.timestamp}</span>
                  </div>
                  {log.content.startsWith("{") || log.content.startsWith("[") ? (
                    <pre
                      className="log-payload"
                      dangerouslySetInnerHTML={{ __html: syntaxHighlightJson(log.content) }}
                    />
                  ) : (
                    <div style={{ color: log.type === "error" ? "hsl(var(--color-danger))" : log.type === "success" ? "hsl(var(--color-revenue))" : "#e2e8f0" }}>
                      {log.content}
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
};
export default CapiSimulator;
