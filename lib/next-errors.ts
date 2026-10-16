// Next.js сообщает о переходе страницы в динамический режим через исключение.
// Его нельзя перехватывать как обычную ошибку, иначе страница сохранится пустой.
export function rethrowIfNextInternal(e: unknown): void {
  const digest = (e as any)?.digest;
  if (typeof digest === 'string' && (digest === 'DYNAMIC_SERVER_USAGE' || digest.startsWith('NEXT_'))) throw e;
}
