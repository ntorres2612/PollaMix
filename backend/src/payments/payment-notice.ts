const DEFAULT_NOTICE_DOMAINS = [
  'dale.com.co',
  'dale.co',
  'avalpay.com.co',
  'avalsolucionesdigitales.com',
  'grupoaval.com',
  'bancodebogota.com.co',
  'bancodebogota.com',
  'bancolombia.com.co',
  'bancolombia.com',
  'nequi.com.co',
  'nequi.com',
  'davivienda.com',
  'daviplata.com',
  'bbva.com.co',
  'bbva.com',
];

export type ParsedPaymentNotice = {
  looksLikeCredit: boolean;
  amountCOP: number | null;
  payerName: string | null;
  concept: string | null;
  bankReference: string | null;
  paymentCode: number | null;
  ambiguousCode: boolean;
};

export type NoticeDecision = {
  status: 'OMITIDO' | 'NUEVO' | 'REVISAR' | 'DUPLICADO' | 'ASIGNADO';
  approve: boolean;
  reason: string;
};

export function noticeDomains(raw = process.env.PAYMENT_NOTICE_DOMAINS): string[] {
  if (!raw?.trim()) return DEFAULT_NOTICE_DOMAINS;
  return raw
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function domainAllowed(domain: string, list: string[]): boolean {
  const host = domain.toLowerCase();
  return list.some((item) => host === item || host.endsWith(`.${item}`));
}

export function fromDomain(fromHeader: string): string {
  const match = fromHeader.match(/@([a-z0-9.-]+\.[a-z]{2,})/i);
  return match?.[1]?.toLowerCase() ?? '';
}

export function senderAuthenticated(
  headers: Array<{ name: string; value: string }>,
  domain: string,
): boolean {
  const host = domain.toLowerCase();
  if (!host) return false;

  const blob = headers
    .filter((header) => header.name.toLowerCase() === 'authentication-results')
    .map((header) => header.value.toLowerCase())
    .join('\n');
  if (!blob) return false;

  const dmarc = blob.match(
    /dmarc=pass\b[\s\S]{0,180}?header\.from=([a-z0-9.-]+)/,
  );
  if (dmarc && domainAligns(host, dmarc[1])) return true;

  const dkim = blob.match(
    /dkim=pass\b[\s\S]{0,240}?header\.d=([a-z0-9.-]+)/,
  );
  return Boolean(dkim && domainAligns(host, dkim[1]));
}

export function parsePaymentNotice(subject: string, body: string): ParsedPaymentNotice {
  const text = visibleText(`${subject}\n${body}`).slice(0, 15000);
  const incoming =
    /recibiste|te envi[oó]|te han enviado|abono recibido|transferencia recibida|pago recibido|entrada de dinero/i.test(
      text,
    );
  const outgoing =
    /enviaste|transferencia enviada|pagaste a|env[ií]o exitoso/i.test(text);

  return {
    looksLikeCredit: incoming && !outgoing,
    amountCOP: chooseAmount(text),
    payerName: readPayer(text),
    concept: readField(text, /(?:mensaje|concepto|descripci[oó]n)\s*[:\-]\s*([^\n]{1,80})/i),
    bankReference: readReference(text),
    ...readPaymentCode(text),
  };
}

export const INSCRIPTION_COP = 16000;

export function readTestAmount(
  raw = process.env.PAYMENT_TEST_AMOUNT,
  nodeEnv = process.env.NODE_ENV,
  allowInProduction = process.env.PAYMENT_TEST_AMOUNT_IN_PRODUCTION === 'true',
): number | null {
  if (nodeEnv === 'production' && !allowInProduction) return null;
  if (!raw?.trim()) return null;
  const value = Number(raw.trim());
  if (!Number.isInteger(value) || value <= 0 || value >= INSCRIPTION_COP) {
    return null;
  }
  return value;
}

export function isExpectedAmount(amount: number, testAmount: number | null) {
  return amount === INSCRIPTION_COP || amount === testAmount;
}

export function amountFits(
  incoming: number,
  paymentAmount: number,
  testAmount: number | null,
) {
  return incoming === Math.round(paymentAmount) || incoming === testAmount;
}

export function namesMatch(payer: string, user: string) {
  const payerWords = personWords(payer);
  const userWords = personWords(user);
  if (payerWords.length < 2 || userWords.length < 2) return false;
  return wordsInOrder(payerWords, userWords) || wordsInOrder(userWords, payerWords);
}

function wordsInOrder(needle: string[], haystack: string[]) {
  let index = 0;
  for (const word of needle) {
    const found = haystack.findIndex(
      (item, itemIndex) => itemIndex >= index && samePersonWord(word, item),
    );
    if (found < 0) return false;
    index = found + 1;
  }
  return true;
}

function samePersonWord(left: string, right: string) {
  if (left === right) return true;
  const short = left.length <= right.length ? left : right;
  const long = left.length <= right.length ? right : left;
  return short.length >= 5 && long.startsWith(short);
}

function personWords(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1);
}

export function decideNotice(input: {
  looksLikeCredit: boolean;
  amountCOP: number | null;
  allowlisted: boolean;
  authenticated: boolean;
  paymentCode: number | null;
  ambiguousCode: boolean;
  referenceAlreadyUsed: boolean;
  paymentStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'MISSING' | null;
  amountMatches: boolean;
  hasEntry: boolean;
  identified?: boolean;
  expectedAmount?: boolean;
}): NoticeDecision {
  const worthReading =
    input.looksLikeCredit &&
    input.amountCOP !== null &&
    input.amountCOP > 0 &&
    (input.allowlisted || input.paymentCode !== null || input.ambiguousCode);

  if (!worthReading) {
    return {
      status: 'OMITIDO',
      approve: false,
      reason: 'El mensaje no es un aviso de abono.',
    };
  }

  if (input.referenceAlreadyUsed) {
    return {
      status: 'DUPLICADO',
      approve: false,
      reason: 'Ese abono ya se había registrado.',
    };
  }

  if (input.ambiguousCode) {
    return {
      status: 'REVISAR',
      approve: false,
      reason: 'El aviso trae más de un código de pronóstico.',
    };
  }

  if (input.paymentCode === null) {
    if (!input.expectedAmount) {
      return {
        status: 'OMITIDO',
        approve: false,
        reason: 'El valor no corresponde a la inscripción.',
      };
    }

    if (!input.allowlisted || !input.authenticated) {
      return {
        status: 'REVISAR',
        approve: false,
        reason: 'El valor coincide, pero el banco no firmó el aviso.',
      };
    }

    if (input.identified && input.paymentStatus === 'APPROVED') {
      return {
        status: 'DUPLICADO',
        approve: false,
        reason: 'Esa polla ya estaba pagada.',
      };
    }

    if (
      input.identified &&
      input.paymentStatus === 'PENDING' &&
      input.hasEntry &&
      input.amountMatches
    ) {
      return {
        status: 'ASIGNADO',
        approve: true,
        reason: 'El remitente y el valor coinciden. La polla quedó habilitada.',
      };
    }

    return {
      status: 'REVISAR',
      approve: false,
      reason: 'El valor coincide, pero el remitente no identifica una sola polla.',
    };
  }

  if (!input.authenticated || !input.allowlisted) {
    return {
      status: 'REVISAR',
      approve: false,
      reason: 'El aviso trae un código, pero el banco no lo firmó.',
    };
  }

  if (input.paymentStatus === 'MISSING' || input.paymentStatus === null) {
    return {
      status: 'REVISAR',
      approve: false,
      reason: 'El código no corresponde a un pago de Total Gol.',
    };
  }

  if (input.paymentStatus === 'APPROVED') {
    return {
      status: 'DUPLICADO',
      approve: false,
      reason: 'Ese pronóstico ya estaba pagado.',
    };
  }

  if (input.paymentStatus !== 'PENDING' || !input.hasEntry) {
    return {
      status: 'REVISAR',
      approve: false,
      reason: 'Ese pago no se puede aprobar solo.',
    };
  }

  if (!input.amountMatches) {
    return {
      status: 'REVISAR',
      approve: false,
      reason: 'El valor que entró no coincide con la inscripción.',
    };
  }

  return {
    status: 'ASIGNADO',
    approve: true,
    reason: 'El abono coincide con el pronóstico y quedó pagado.',
  };
}

function domainAligns(fromHost: string, signed: string) {
  return (
    fromHost === signed ||
    fromHost.endsWith(`.${signed}`) ||
    signed.endsWith(`.${fromHost}`)
  );
}

function visibleText(raw: string) {
  return raw
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#(\d+);/g, (_, value: string) => {
      const code = Number(value);
      return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : ' ';
    })
    .replace(/[ \t]{2,}/g, ' ');
}

function chooseAmount(text: string): number | null {
  const found: Array<{ value: number; index: number }> = [];
  const pattern =
    /(?:\$|cop)\s*([0-9]{1,3}(?:[.\s][0-9]{3})+(?:,[0-9]{2})?|[0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{2})?|[0-9]{4,9}(?:,[0-9]{2})?)/gi;

  for (const match of text.matchAll(pattern)) {
    const value = parseCop(match[1]);
    if (value !== null && match.index !== undefined) {
      found.push({ value, index: match.index });
    }
  }

  const unique = [...new Set(found.map((item) => item.value))];
  if (unique.length === 1) return unique[0];

  const anchors = [...text.matchAll(/recibiste|te envi[oó]|valor|monto/gi)].map(
    (match) => match.index ?? 0,
  );
  const near = found.filter((item) =>
    anchors.some((anchor) => Math.abs(anchor - item.index) < 48),
  );
  const nearUnique = [...new Set(near.map((item) => item.value))];
  if (nearUnique.length === 1) return nearUnique[0];

  // Nequi escribe "Recibiste 500 de ..." sin el signo de pesos.
  const received = text.match(
    /recibiste\s+(?:\$|cop)?\s*([0-9]{1,3}(?:[.\s][0-9]{3})+(?:,[0-9]{2})?|[0-9]{1,9}(?:,[0-9]{2})?)/i,
  );
  return received ? parseCop(received[1]) : null;
}

function parseCop(token: string): number | null {
  let value = token.replace(/\s/g, '');
  if (/^\d{1,3}(\.\d{3})+(,\d{2})?$/.test(value)) {
    value = value.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(,\d{3})+(\.\d{2})?$/.test(value)) {
    value = value.replace(/,/g, '');
  } else if (/^\d+(,\d{2})$/.test(value)) {
    value = value.replace(',', '.');
  }

  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 500_000_000) {
    return null;
  }
  return amount;
}

function readPayer(text: string): string | null {
  const sent = text.match(
    /([A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ .'-]{2,60}?)\s+te envi[oó]/i,
  );
  const from = text.match(
    /\bde\s+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ .'-]{2,60}?)(?=\s*(?:el\s+\d|\.|,|\n|$|por\b|con\b))/i,
  );
  const raw = (sent?.[1] ?? from?.[1] ?? '').replace(/\s+/g, ' ').trim();
  if (!raw || /@|https?:|^\s*GP\d/i.test(raw)) return null;
  if (
    /^(tu cuenta|la cuenta|un pago|una transferencia|el banco|dale|bancolombia|nequi)$/i.test(
      raw,
    )
  ) {
    return null;
  }
  return raw.slice(0, 80);
}

function readField(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  const value = match?.[1]?.replace(/\s+/g, ' ').trim() ?? '';
  return value ? value.slice(0, 120) : null;
}

function readReference(text: string): string | null {
  const value = readField(
    text,
    /(?:referencia|id de la transferencia|n[uú]mero de comprobante)\s*[:#]?\s*([A-Z0-9-]{6,40})/i,
  );
  if (!value || /^GP\d+$/i.test(value)) return null;
  return value.toUpperCase();
}

function readPaymentCode(text: string) {
  const codes = [
    ...new Set(
      [...text.matchAll(/\bGP\s*0*(\d{1,8})\b/gi)].map((match) => Number(match[1])),
    ),
  ].filter((code) => Number.isSafeInteger(code) && code > 0);

  return {
    paymentCode: codes.length === 1 ? codes[0] : null,
    ambiguousCode: codes.length > 1,
  };
}
