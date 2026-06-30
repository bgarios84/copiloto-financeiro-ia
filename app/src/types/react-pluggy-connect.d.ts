/**
 * Type declarations for react-pluggy-connect
 *
 * Instalar antes de rodar:
 *   npm install react-pluggy-connect
 *
 * Fonte: https://www.npmjs.com/package/react-pluggy-connect
 *
 * O pacote tem tipos nativos — este stub permite tsc antes do install.
 * Apos instalar, os tipos do pacote substituem este arquivo.
 */
declare module "react-pluggy-connect" {
  export interface PluggyConnectProps {
    /** Connect token gerado pelo backend (TTL 30 min). Obrigatorio. */
    connectToken: string;
    /** Exibir conectores sandbox (so para desenvolvimento). */
    includeSandbox?: boolean;
    /** ID de um item existente para re-autorizar conexao. */
    updateItem?: string;
    /** Filtrar por tipos de conector. */
    connectorTypes?: string[];
    /** Filtrar por codigos de pais (ISO 3166-1 alpha-2). */
    countries?: string[];
    /** Idioma do widget (ex: "pt-BR"). Padrao: idioma do browser. */
    language?: string;
    /** Chamado quando um item e criado/atualizado com sucesso. */
    onSuccess?: (data: { item: { id: string; [key: string]: unknown } }) => void;
    /** Chamado em caso de erro geral ou status nao bem-sucedido. */
    onError?: (error: {
      message: string;
      data?: { item: { id: string } };
    }) => void;
    /** Chamado quando o modal e aberto. */
    onOpen?: () => void;
    /** Chamado quando o modal e fechado. */
    onClose?: () => void;
    /** Chamado para eventos customizados de interacao. */
    onEvent?: (event: string, metadata: { timestamp: number }) => void;
  }

  export function PluggyConnect(props: PluggyConnectProps): JSX.Element;
}
