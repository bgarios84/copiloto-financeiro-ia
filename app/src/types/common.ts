/**
 * Tipos comuns compartilhados entre todos os domínios.
 *
 * Arquivo canônico para ServiceResult<T>.
 * Todos os outros types/ devem importar daqui — nunca redefinir.
 */

/**
 * Resultado discriminado de Server Actions e Services.
 *
 * Uso:
 *   const result: ServiceResult<User[]> = await getUsers();
 *   if (result.error) { ... } else { result.data }
 */
export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };
