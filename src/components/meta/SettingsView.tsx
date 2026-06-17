import React, { useState, useEffect } from "react";
import { Save, Trash2, Key, Info, HelpCircle, CheckCircle2 } from "lucide-react";
import type { MetaCredentials } from "@/utils/meta/metaApi";

interface SettingsViewProps {
  credentials: MetaCredentials;
  onSave: (creds: MetaCredentials) => void;
  onClear: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ credentials, onSave, onClear }) => {
  const [pixelId, setPixelId] = useState(credentials.pixelId || "");
  const [capiToken, setCapiToken] = useState(credentials.capiToken || "");
  const [adAccountId, setAdAccountId] = useState(credentials.adAccountId || "");
  const [showSavedNotification, setShowSavedNotification] = useState(false);

  // Sincroniza com as props que vêm do App.tsx
  useEffect(() => {
    setPixelId(credentials.pixelId || "");
    setCapiToken(credentials.capiToken || "");
    setAdAccountId(credentials.adAccountId || "");
  }, [credentials]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      pixelId: pixelId.trim(),
      capiToken: capiToken.trim(),
      adAccountId: adAccountId.trim(),
    });
    
    setShowSavedNotification(true);
    setTimeout(() => {
      setShowSavedNotification(false);
    }, 3000);
  };

  const handleClear = () => {
    if (window.confirm("Deseja realmente limpar as credenciais salvas e voltar ao Modo de Simulação?")) {
      setPixelId("");
      setCapiToken("");
      setAdAccountId("");
      onClear();
    }
  };

  // Carrega as credenciais padrão de testes fornecidas pelo usuário
  const loadAvanteDefaultCredentials = () => {
    setPixelId("3118022051838271");
    setCapiToken("EAAJuG2qVusgBRlFszNPndh8lKKF5f2ZBBTEjvg8qaZBfFYze0scZAC7gi3nPdsiMAfh0TTDJ6GeTxbZCfovTdUJyOHH4uYB5epODNBoCFzKYp5UnBrCqyxjXQcnjhxmNRfo0k1KLGuvzVAIwEBoLfXRUK1ksYW1hem2RWWPQ8tEBYfny9MpJERvVT75lIAZDZD");
    setAdAccountId("821406542700599");
    
    addNotification("Credenciais de Teste da Avante preenchidas! Clique em 'Salvar Configurações' para gravar.");
  };

  const [notification, setNotification] = useState("");
  const addNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 4000);
  };

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
      
      {/* Alerta de salvamento */}
      {showSavedNotification && (
        <div className="simulation-banner" style={{ background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#a7f3d0", animation: "fadeIn 0.3s ease" }}>
          <CheckCircle2 style={{ color: "hsl(var(--color-revenue))" }} />
          <div className="simulation-banner-text">
            <h4>Configurações Salvas!</h4>
            <p>As credenciais da Meta foram persistidas com sucesso. O Modo de Dados Reais já pode ser ativado.</p>
          </div>
        </div>
      )}

      {notification && (
        <div className="simulation-banner" style={{ background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)", border: "1px solid rgba(59, 130, 246, 0.3)", color: "#93c5fd" }}>
          <Info style={{ color: "hsl(var(--color-spend))" }} />
          <div className="simulation-banner-text">
            <p>{notification}</p>
          </div>
        </div>
      )}

      <div className="simulator-container">
        {/* Formulário de Configuração */}
        <div className="glass-panel settings-card">
          <div className="settings-intro">
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <Key size={22} style={{ color: "hsl(var(--color-spend))" }} />
              <h3 style={{ fontSize: "18px", fontWeight: 700 }}>Credenciais da Meta API</h3>
            </div>
            <p>Insira os tokens de acesso e IDs da conta do cliente para integrar a dashboard ao Gerenciador de Negócios e Pixel da Meta.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>ID do Meta Pixel</span>
                <span style={{ fontSize: "11px", color: "hsl(var(--text-muted))", fontWeight: 500 }}>Requerido para CAPI</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={pixelId}
                onChange={(e) => setPixelId(e.target.value)}
                placeholder="Ex: 3118022051838271"
                required
              />
            </div>

            <div className="form-group">
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Token de Acesso Conversions API (CAPI)</span>
                <span style={{ fontSize: "11px", color: "hsl(var(--text-muted))", fontWeight: 500 }}>System User Token</span>
              </label>
              <textarea
                className="form-input"
                style={{ height: "100px", fontFamily: "monospace", fontSize: "12px", resize: "none" }}
                value={capiToken}
                onChange={(e) => setCapiToken(e.target.value)}
                placeholder="Começa com EAAJ..."
                required
              />
            </div>

            <div className="form-group">
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>ID da Ad Account (Conta de Anúncios)</span>
                <span style={{ fontSize: "11px", color: "hsl(var(--text-muted))", fontWeight: 500 }}>Para puxar faturamento/gastos reais</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={adAccountId}
                onChange={(e) => setAdAccountId(e.target.value)}
                placeholder="Ex: act_3118022051838271 ou 3118022051838271"
                required
              />
            </div>

            <div style={{ display: "flex", gap: "15px", marginTop: "30px" }}>
              <button type="submit" className="btn-primary" style={{ flexGrow: 2 }}>
                <Save size={18} />
                Salvar Configurações
              </button>
              
              <button
                type="button"
                className="form-input"
                style={{ width: "auto", display: "flex", alignItems: "center", justifyItems: "center", gap: "8px", border: "1px solid hsl(var(--color-danger))", color: "hsl(var(--color-danger))", background: "rgba(239, 68, 68, 0.05)", cursor: "pointer", fontWeight: 600 }}
                onClick={handleClear}
                title="Limpar Credenciais"
              >
                <Trash2 size={16} />
                Limpar
              </button>
            </div>
          </form>

          {/* Atalho Prático para Teste */}
          <div style={{ borderTop: "1px dashed hsl(var(--border-color))", marginTop: "30px", paddingTop: "25px", textAlign: "center" }}>
            <span style={{ fontSize: "13px", color: "hsl(var(--text-secondary))", display: "block", marginBottom: "12px" }}>
              Quer testar com as credenciais do Pixel da Avante?
            </span>
            <button
              type="button"
              className="toggle-btn"
              style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)", color: "hsl(var(--color-spend))", cursor: "pointer", padding: "8px 18px", borderRadius: "var(--radius-md)", fontWeight: 700 }}
              onClick={loadAvanteDefaultCredentials}
            >
              ⚡ Preencher Credenciais da Avante
            </button>
          </div>
        </div>

        {/* Guia Ilustrativo de Integração */}
        <div className="glass-panel settings-card" style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "25px" }}>
            <HelpCircle size={22} style={{ color: "hsl(var(--color-roas))" }} />
            <h3 style={{ fontSize: "18px", fontWeight: 700 }}>Passo a Passo da Configuração</h3>
          </div>

          <div className="steps-list" style={{ flexGrow: 1 }}>
            <div className="step-item">
              <div className="step-number">1</div>
              <div className="step-text">
                <h5>Localize o ID do Pixel</h5>
                <p>No Meta Business Suite, acesse **Configurações do Negócio &gt; Fontes de Dados &gt; Pixels**. Copie o identificador numérico de 15 dígitos correspondente e cole no primeiro campo.</p>
              </div>
            </div>

            <div className="step-item">
              <div className="step-number">2</div>
              <div className="step-text">
                <h5>Gere o CAPI Token</h5>
                <p>No **Gerenciador de Eventos (Events Manager)** da Meta, vá em **Configurações**. Role até a seção "Conversions API" e clique no botão <span className="code-snippet">Gerar Token de Acesso</span>. Salve e cole o token.</p>
              </div>
            </div>

            <div className="step-item">
              <div className="step-number">3</div>
              <div className="step-text">
                <h5>Obtenha o ID da Conta de Anúncios</h5>
                <p>No **Gerenciador de Anúncios (Ads Manager)**, localize o ID da conta ativa na barra superior de seleção de contas ou na URL do navegador contendo a string <span className="code-snippet">act_YOUR_ID</span>.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default SettingsView;
