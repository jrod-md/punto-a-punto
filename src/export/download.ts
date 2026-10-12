export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = name.replace(/[^\p{L}\p{N} ._-]/gu, '_');
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return; }
  const field = document.createElement('textarea'); field.value = text; field.style.position = 'fixed'; field.style.opacity = '0';
  document.body.append(field); field.select();
  try { if (!document.execCommand('copy')) throw new Error('No se pudo copiar el patrón.'); }
  finally { field.remove(); }
}
