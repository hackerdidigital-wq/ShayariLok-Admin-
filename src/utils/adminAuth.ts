export const PRIMARY_ADMIN_EMAIL = 'bamniyad749@gmail.com';

export interface FirebaseAuthErrorDiagnostic {
  code: string;
  title: string;
  message: string;
  hint: string;
}

export function normalizeEmail(email: string | null | undefined): string {
  return String(email ?? '').trim().toLowerCase();
}

export function isAuthorizedAdminEmail(
  email: string | null | undefined,
  emailVerified: boolean | undefined,
  extraAdmins: ReadonlyArray<string> = []
): boolean {
  if (!emailVerified) return false;
  const clean = normalizeEmail(email);
  if (!clean) return false;
  if (clean === PRIMARY_ADMIN_EMAIL) return true;
  return extraAdmins.some((entry) => normalizeEmail(entry) === clean);
}

export function isLocalPreviewHost(hostname: string): boolean {
  const host = (hostname || '').trim().toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host.endsWith('.run.app')
  );
}

export function hasSandboxQueryFlag(search: string, hash: string): boolean {
  const combined = `${search || ''}&${(hash || '').split('?')[1] ?? ''}`.toLowerCase();
  return (
    combined.includes('autostart=1') ||
    combined.includes('sandbox=1') ||
    combined.includes('demo=1')
  );
}

export function classifyFirebaseAuthError(
  error: unknown,
  currentHostname = ''
): FirebaseAuthErrorDiagnostic {
  const rawMessage = error instanceof Error ? error.message : String(error ?? '');
  const codeMatch = rawMessage.match(/auth\/[a-z0-9-]+/i);
  const code = (
    (error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '') ||
    codeMatch?.[0] ||
    'auth/unknown'
  ).toLowerCase();

  if (code === 'auth/unauthorized-domain') {
    const host = currentHostname || 'your-github-pages-domain';
    return {
      code,
      title: 'Domain Not Authorized in Firebase',
      message: `डोमेन "${host}" अभी Firebase Authentication के Authorized Domains में जुड़ा नहीं है।`,
      hint: `Firebase Console -> Authentication -> Settings -> Authorized domains में "${host}" जोड़ें।`,
    };
  }

  if (code === 'auth/popup-blocked') {
    return {
      code,
      title: 'Sign-In Popup Blocked',
      message: 'ब्राउज़र ने Google Sign-In पॉपअप को ब्लॉक कर दिया है।',
      hint: 'ब्राउज़र सेटिंग में इस साइट के लिए Popups Allow करें और दोबारा क्लिक करें।',
    };
  }

  if (code === 'auth/popup-closed-by-user') {
    return {
      code,
      title: 'Sign-In Cancelled',
      message: 'Google Sign-In पॉपअप पूरा होने से पहले बंद कर दिया गया।',
      hint: 'दोबारा "Sign in with Google" बटन दबाकर अपना एडमिन अकाउंट चुनें।',
    };
  }

  if (code === 'auth/network-request-failed') {
    return {
      code,
      title: 'Network Error',
      message: 'Firebase Auth सर्वर से संपर्क नहीं हो पा रहा है।',
      hint: 'अपना इंटरनेट कनेक्शन जांचें और दोबारा प्रयास करें।',
    };
  }

  return {
    code,
    title: 'Authentication Error',
    message: rawMessage || 'Google Sign-In विफल रहा।',
    hint: 'कृपया अपनी Firebase प्रोजेक्ट और Google Auth सेटिंग्स की जांच करें।',
  };
}
