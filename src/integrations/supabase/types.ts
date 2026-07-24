export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          bairro: string | null
          celular: string | null
          consultor: string | null
          cpf: string | null
          created_at: string
          email: string | null
          endereco: string | null
          enviado: string | null
          exclusividade: boolean | null
          id: string
          instagram: string | null
          leads: number | null
          mql: number | null
          nome: string
          nota: number | null
          numero: string | null
          objetivo: string | null
          origem: string | null
          status: string
          tempo_decisao: string | null
          ultima_atividade: string | null
          updated_at: string
          user_id: string
          valor: number | null
        }
        Insert: {
          bairro?: string | null
          celular?: string | null
          consultor?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          enviado?: string | null
          exclusividade?: boolean | null
          id?: string
          instagram?: string | null
          leads?: number | null
          mql?: number | null
          nome: string
          nota?: number | null
          numero?: string | null
          objetivo?: string | null
          origem?: string | null
          status?: string
          tempo_decisao?: string | null
          ultima_atividade?: string | null
          updated_at?: string
          user_id: string
          valor?: number | null
        }
        Update: {
          bairro?: string | null
          celular?: string | null
          consultor?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          enviado?: string | null
          exclusividade?: boolean | null
          id?: string
          instagram?: string | null
          leads?: number | null
          mql?: number | null
          nome?: string
          nota?: number | null
          numero?: string | null
          objetivo?: string | null
          origem?: string | null
          status?: string
          tempo_decisao?: string | null
          ultima_atividade?: string | null
          updated_at?: string
          user_id?: string
          valor?: number | null
        }
        Relationships: []
      }
      criativos_resumo: {
        Row: {
          cac: number
          codigo: string | null
          created_at: string
          criativo: string
          custo_por_lead: number
          id: string
          leads_recebidos: number
          mes_ano: string
          quantidade_cursos: number
          quantidade_fechamentos: number
          roas: number
          status: string
          taxa_conversao: number
          updated_at: string
          user_id: string
          valor_fechado: number
          valor_gasto: number
        }
        Insert: {
          cac?: number
          codigo?: string | null
          created_at?: string
          criativo: string
          custo_por_lead?: number
          id?: string
          leads_recebidos?: number
          mes_ano: string
          quantidade_cursos?: number
          quantidade_fechamentos?: number
          roas?: number
          status?: string
          taxa_conversao?: number
          updated_at?: string
          user_id: string
          valor_fechado?: number
          valor_gasto?: number
        }
        Update: {
          cac?: number
          codigo?: string | null
          created_at?: string
          criativo?: string
          custo_por_lead?: number
          id?: string
          leads_recebidos?: number
          mes_ano?: string
          quantidade_cursos?: number
          quantidade_fechamentos?: number
          roas?: number
          status?: string
          taxa_conversao?: number
          updated_at?: string
          user_id?: string
          valor_fechado?: number
          valor_gasto?: number
        }
        Relationships: []
      }
      criativos_vendas: {
        Row: {
          codigo: string | null
          created_at: string
          criativo: string
          data: string
          id: string
          nome_aluno: string
          quantidade_cursos: number
          roas: number
          sinal: number
          status: string
          updated_at: string
          user_id: string
          valor_ads: number
          valor_curso: number
        }
        Insert: {
          codigo?: string | null
          created_at?: string
          criativo: string
          data?: string
          id?: string
          nome_aluno: string
          quantidade_cursos?: number
          roas?: number
          sinal?: number
          status?: string
          updated_at?: string
          user_id: string
          valor_ads?: number
          valor_curso?: number
        }
        Update: {
          codigo?: string | null
          created_at?: string
          criativo?: string
          data?: string
          id?: string
          nome_aluno?: string
          quantidade_cursos?: number
          roas?: number
          sinal?: number
          status?: string
          updated_at?: string
          user_id?: string
          valor_ads?: number
          valor_curso?: number
        }
        Relationships: []
      }
      cursos_dados: {
        Row: {
          comissao_extra: number
          created_at: string
          data: string
          id: string
          instrutor: string
          nome_aluno: string
          tipo_curso: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comissao_extra?: number
          created_at?: string
          data?: string
          id?: string
          instrutor: string
          nome_aluno: string
          tipo_curso: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comissao_extra?: number
          created_at?: string
          data?: string
          id?: string
          instrutor?: string
          nome_aluno?: string
          tipo_curso?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_metrics: {
        Row: {
          ads: number
          avaliacao_google: number | null
          cac: number | null
          created_at: string
          curso_feito: number | null
          curso_marcado: number | null
          custo_por_lead: number | null
          custo_por_lead_mql: number | null
          date: string
          faturamento_dia: number | null
          faturamento_marcado: number | null
          id: string
          lead_mql: number | null
          leads: number | null
          meta_crm: number | null
          meta_cursos: number | null
          meta_diaria_prevista: number | null
          meta_diaria_realizada: number | null
          meta_mensal_prevista: number | null
          meta_mensal_realizada: number | null
          meta_negocio_local: number | null
          meta_site: number | null
          meta_upsell: number | null
          roas: number | null
          super_meta_crm: number | null
          super_meta_cursos: number | null
          super_meta_diaria: number | null
          super_meta_mensal: number | null
          super_meta_negocio_local: number | null
          super_meta_site: number | null
          super_meta_upsell: number | null
          super_valor_crm: number | null
          super_valor_cursos: number | null
          super_valor_negocio_local: number | null
          super_valor_site: number | null
          super_valor_upsell: number | null
          updated_at: string
          user_id: string
          valor_crm: number | null
          valor_cursos: number | null
          valor_negocio_local: number | null
          valor_site: number | null
          valor_upsell: number | null
        }
        Insert: {
          ads?: number
          avaliacao_google?: number | null
          cac?: number | null
          created_at?: string
          curso_feito?: number | null
          curso_marcado?: number | null
          custo_por_lead?: number | null
          custo_por_lead_mql?: number | null
          date?: string
          faturamento_dia?: number | null
          faturamento_marcado?: number | null
          id?: string
          lead_mql?: number | null
          leads?: number | null
          meta_crm?: number | null
          meta_cursos?: number | null
          meta_diaria_prevista?: number | null
          meta_diaria_realizada?: number | null
          meta_mensal_prevista?: number | null
          meta_mensal_realizada?: number | null
          meta_negocio_local?: number | null
          meta_site?: number | null
          meta_upsell?: number | null
          roas?: number | null
          super_meta_crm?: number | null
          super_meta_cursos?: number | null
          super_meta_diaria?: number | null
          super_meta_mensal?: number | null
          super_meta_negocio_local?: number | null
          super_meta_site?: number | null
          super_meta_upsell?: number | null
          super_valor_crm?: number | null
          super_valor_cursos?: number | null
          super_valor_negocio_local?: number | null
          super_valor_site?: number | null
          super_valor_upsell?: number | null
          updated_at?: string
          user_id: string
          valor_crm?: number | null
          valor_cursos?: number | null
          valor_negocio_local?: number | null
          valor_site?: number | null
          valor_upsell?: number | null
        }
        Update: {
          ads?: number
          avaliacao_google?: number | null
          cac?: number | null
          created_at?: string
          curso_feito?: number | null
          curso_marcado?: number | null
          custo_por_lead?: number | null
          custo_por_lead_mql?: number | null
          date?: string
          faturamento_dia?: number | null
          faturamento_marcado?: number | null
          id?: string
          lead_mql?: number | null
          leads?: number | null
          meta_crm?: number | null
          meta_cursos?: number | null
          meta_diaria_prevista?: number | null
          meta_diaria_realizada?: number | null
          meta_mensal_prevista?: number | null
          meta_mensal_realizada?: number | null
          meta_negocio_local?: number | null
          meta_site?: number | null
          meta_upsell?: number | null
          roas?: number | null
          super_meta_crm?: number | null
          super_meta_cursos?: number | null
          super_meta_diaria?: number | null
          super_meta_mensal?: number | null
          super_meta_negocio_local?: number | null
          super_meta_site?: number | null
          super_meta_upsell?: number | null
          super_valor_crm?: number | null
          super_valor_cursos?: number | null
          super_valor_negocio_local?: number | null
          super_valor_site?: number | null
          super_valor_upsell?: number | null
          updated_at?: string
          user_id?: string
          valor_crm?: number | null
          valor_cursos?: number | null
          valor_negocio_local?: number | null
          valor_site?: number | null
          valor_upsell?: number | null
        }
        Relationships: []
      }
      instagram_metrics: {
        Row: {
          abordagens_feitas: number
          cac_social_seller: number
          created_at: string
          custo_por_seguidor: number
          date: string
          fechamentos_social_seller: number
          id: string
          seguidores_mql: number
          seguidores_novos: number
          taxa_resposta_abordagem: number
          taxa_seguidores_mql: number
          updated_at: string
          user_id: string
        }
        Insert: {
          abordagens_feitas?: number
          cac_social_seller?: number
          created_at?: string
          custo_por_seguidor?: number
          date?: string
          fechamentos_social_seller?: number
          id?: string
          seguidores_mql?: number
          seguidores_novos?: number
          taxa_resposta_abordagem?: number
          taxa_seguidores_mql?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          abordagens_feitas?: number
          cac_social_seller?: number
          created_at?: string
          custo_por_seguidor?: number
          date?: string
          fechamentos_social_seller?: number
          id?: string
          seguidores_mql?: number
          seguidores_novos?: number
          taxa_resposta_abordagem?: number
          taxa_seguidores_mql?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pagamentos_variaveis: {
        Row: {
          cliente: string
          created_at: string
          dia_pagamento: number
          id: string
          mes_ano: string
          pessoa: string
          tipo: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          cliente: string
          created_at?: string
          dia_pagamento?: number
          id?: string
          mes_ano: string
          pessoa: string
          tipo?: string
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          cliente?: string
          created_at?: string
          dia_pagamento?: number
          id?: string
          mes_ano?: string
          pessoa?: string
          tipo?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      survey_responses: {
        Row: {
          atendimento_rapido: string | null
          cep: string | null
          cidade: string | null
          como_conheceu: string | null
          consultor: string | null
          conversou_outras_escolas: string | null
          cpf: string | null
          created_at: string
          data_curso: string | null
          dor_principal: string | null
          email: string | null
          endereco: string | null
          fator_determinante: string | null
          forma_atendimento: string | null
          id: string
          indicaria_alguem: string | null
          instagram: string | null
          motivacao_fechar: string | null
          nome: string
          nota_curso: number | null
          nota_indicacao: number | null
          nota_whatsapp: number | null
          objetivo_principal: string | null
          segmento: string | null
          sugestao_atendimento: string | null
          tempo_atendimento: string | null
          tempo_para_fechar: string | null
          user_id: string | null
          valor_curso_opiniao: string | null
          whatsapp: string | null
        }
        Insert: {
          atendimento_rapido?: string | null
          cep?: string | null
          cidade?: string | null
          como_conheceu?: string | null
          consultor?: string | null
          conversou_outras_escolas?: string | null
          cpf?: string | null
          created_at?: string
          data_curso?: string | null
          dor_principal?: string | null
          email?: string | null
          endereco?: string | null
          fator_determinante?: string | null
          forma_atendimento?: string | null
          id?: string
          indicaria_alguem?: string | null
          instagram?: string | null
          motivacao_fechar?: string | null
          nome: string
          nota_curso?: number | null
          nota_indicacao?: number | null
          nota_whatsapp?: number | null
          objetivo_principal?: string | null
          segmento?: string | null
          sugestao_atendimento?: string | null
          tempo_atendimento?: string | null
          tempo_para_fechar?: string | null
          user_id?: string | null
          valor_curso_opiniao?: string | null
          whatsapp?: string | null
        }
        Update: {
          atendimento_rapido?: string | null
          cep?: string | null
          cidade?: string | null
          como_conheceu?: string | null
          consultor?: string | null
          conversou_outras_escolas?: string | null
          cpf?: string | null
          created_at?: string
          data_curso?: string | null
          dor_principal?: string | null
          email?: string | null
          endereco?: string | null
          fator_determinante?: string | null
          forma_atendimento?: string | null
          id?: string
          indicaria_alguem?: string | null
          instagram?: string | null
          motivacao_fechar?: string | null
          nome?: string
          nota_curso?: number | null
          nota_indicacao?: number | null
          nota_whatsapp?: number | null
          objetivo_principal?: string | null
          segmento?: string | null
          sugestao_atendimento?: string | null
          tempo_atendimento?: string | null
          tempo_para_fechar?: string | null
          user_id?: string | null
          valor_curso_opiniao?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      fechamentos_diarios: {
        Row: {
          cliente: string
          created_at: string
          data: string
          id: string
          observacao: string | null
          previsao_entrada: string | null
          produto_servico: string
          status: string
          updated_at: string
          user_id: string
          valor_a_entrar: number
          valor_sinal: number
          vendedor: string
        }
        Insert: {
          cliente: string
          created_at?: string
          data?: string
          id?: string
          observacao?: string | null
          previsao_entrada?: string | null
          produto_servico?: string
          status?: string
          updated_at?: string
          user_id: string
          valor_a_entrar?: number
          valor_sinal?: number
          vendedor?: string
        }
        Update: {
          cliente?: string
          created_at?: string
          data?: string
          id?: string
          observacao?: string | null
          previsao_entrada?: string | null
          produto_servico?: string
          status?: string
          updated_at?: string
          user_id?: string
          valor_a_entrar?: number
          valor_sinal?: number
          vendedor?: string
        }
        Relationships: []
      }
      vendas: {
        Row: {
          cliente: string
          comissao: number
          created_at: string
          data: string
          id: string
          origem: string
          pagamento: string
          parcelas: string | null
          produto: string
          servico: string
          status: string
          updated_at: string
          user_id: string
          valor: number
          valor_com_juros: number | null
          vendedor: string
        }
        Insert: {
          cliente: string
          comissao?: number
          created_at?: string
          data?: string
          id?: string
          origem?: string
          pagamento?: string
          parcelas?: string | null
          produto?: string
          servico?: string
          status?: string
          updated_at?: string
          user_id: string
          valor?: number
          valor_com_juros?: number | null
          vendedor: string
        }
        Update: {
          cliente?: string
          comissao?: number
          created_at?: string
          data?: string
          id?: string
          origem?: string
          pagamento?: string
          parcelas?: string | null
          produto?: string
          servico?: string
          status?: string
          updated_at?: string
          user_id?: string
          valor?: number
          valor_com_juros?: number | null
          vendedor?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
