export interface CopyToastEventDetail {
  id: number;
  message: string;
  label?: string;
}

const COPY_EVENT_NAME = 'shayarilok:copied';
let eventSeq = 1;

function fallbackExecCommandCopy(text: string): boolean {
  if (typeof document === 'undefined') return false;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  } finally {
    textarea.remove();
  }
  return ok;
}

export async function copyTextWithFeedback(
  text: string,
  label?: string
): Promise<boolean> {
  let copied = false;
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      copied = fallbackExecCommandCopy(text);
    }
  } else {
    copied = fallbackExecCommandCopy(text);
  }

  if (copied && typeof window !== 'undefined') {
    const detail: CopyToastEventDetail = {
      id: eventSeq++,
      message: 'Copied Successfully!',
      label,
    };
    window.dispatchEvent(new CustomEvent<CopyToastEventDetail>(COPY_EVENT_NAME, { detail }));
  }

  return copied;
}

export function subscribeCopyToast(
  listener: (detail: CopyToastEventDetail) => void
): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (event: Event) => {
    const custom = event as CustomEvent<CopyToastEventDetail>;
    if (custom.detail) {
      listener(custom.detail);
    }
  };
  window.addEventListener(COPY_EVENT_NAME, handler);
  return () => window.removeEventListener(COPY_EVENT_NAME, handler);
}
