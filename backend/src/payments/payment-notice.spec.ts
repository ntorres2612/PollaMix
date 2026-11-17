import {
  decideNotice,
  namesMatch,
  parsePaymentNotice,
  readTestAmount,
  senderAuthenticated,
} from './payment-notice';
import { openToken, readMailboxState, sealToken, signMailboxState } from './mailbox-secret';

const signed = [
  {
    name: 'Authentication-Results',
    value:
      'mx.google.com; dkim=pass header.d=dale.com.co header.s=s1; dmarc=pass header.from=dale.com.co',
  },
];

describe('avisos de abono', () => {
  it('lee el valor, la persona y el código GP', () => {
    const notice = parsePaymentNotice(
      'Recibiste una transferencia',
      'Juan Pérez te envió $16.000\nMensaje: GP804\nReferencia: AB12CD34\nSaldo $1.200.000',
    );

    expect(notice.looksLikeCredit).toBe(true);
    expect(notice.amountCOP).toBe(16000);
    expect(notice.payerName).toBe('Juan Pérez');
    expect(notice.paymentCode).toBe(804);
    expect(notice.bankReference).toBe('AB12CD34');
  });

  it('acepta el valor en pesos con centavos en cero y formato de miles', () => {
    const notice = parsePaymentNotice(
      'Abono recibido',
      'Recibiste COP 16.000,00 de María Gómez. Concepto: pago GP 12',
    );

    expect(notice.amountCOP).toBe(16000);
    expect(notice.payerName).toBe('María Gómez');
    expect(notice.paymentCode).toBe(12);
  });

  it('lee el aviso de Nequi cuando el valor no trae signo de pesos', () => {
    const notice = parsePaymentNotice(
      '¡Recibiste plata por Bre-B!',
      'Recibiste 500 de Ana Gómez el 14 de noviembre de 2026 a las 2:24 p.m, desde el banco Dale.',
    );

    expect(notice.looksLikeCredit).toBe(true);
    expect(notice.amountCOP).toBe(500);
    expect(notice.payerName).toBe('Ana Gómez');
    expect(notice.paymentCode).toBeNull();
  });

  it('no toma un envío como si fuera un abono', () => {
    const notice = parsePaymentNotice(
      'Envío exitoso',
      'Enviaste $16.000 a Ana. Mensaje GP15',
    );

    expect(notice.looksLikeCredit).toBe(false);
  });

  it('no aprueba si el aviso trae dos códigos', () => {
    const notice = parsePaymentNotice(
      'Recibiste un pago',
      'Ana Gómez te envió $16.000. Mensaje GP10 y GP11',
    );

    expect(notice.ambiguousCode).toBe(true);
    expect(
      decideNotice({
        looksLikeCredit: true,
        amountCOP: 16000,
        allowlisted: true,
        authenticated: true,
        paymentCode: null,
        ambiguousCode: true,
        referenceAlreadyUsed: false,
        paymentStatus: 'PENDING',
        amountMatches: true,
        hasEntry: true,
      }).status,
    ).toBe('REVISAR');
  });

  it('aprueba solo cuando el banco firmó el aviso y el valor coincide', () => {
    expect(senderAuthenticated(signed, 'correo.dale.com.co')).toBe(true);
    expect(senderAuthenticated(signed, 'gmail.com')).toBe(false);

    expect(
      decideNotice({
        looksLikeCredit: true,
        amountCOP: 16000,
        allowlisted: true,
        authenticated: true,
        paymentCode: 804,
        ambiguousCode: false,
        referenceAlreadyUsed: false,
        paymentStatus: 'PENDING',
        amountMatches: true,
        hasEntry: true,
      }),
    ).toMatchObject({ status: 'ASIGNADO', approve: true });

    expect(
      decideNotice({
        looksLikeCredit: true,
        amountCOP: 16000,
        allowlisted: true,
        authenticated: true,
        paymentCode: 804,
        ambiguousCode: false,
        referenceAlreadyUsed: false,
        paymentStatus: 'PENDING',
        amountMatches: false,
        hasEntry: true,
      }).approve,
    ).toBe(false);
  });

  it('reconoce al remitente aunque el aviso traiga el nombre corto', () => {
    expect(namesMatch('Nolberth Torres', 'Nolberth Torres Quintero')).toBe(true);
    expect(namesMatch('Nolberth Torres Quintero', 'Nolberth Torres')).toBe(true);
    expect(namesMatch('Ana Gómez', 'ANA GOMEZ')).toBe(true);
    expect(namesMatch('Ana', 'Ana Gómez')).toBe(false);
    expect(namesMatch('Pedro Gómez', 'Ana Gómez')).toBe(false);
    expect(namesMatch('Nolberthx Torres', 'Nolberth Torres')).toBe(true);
  });

  it('habilita la polla cuando el remitente y el valor coinciden', () => {
    expect(
      decideNotice({
        looksLikeCredit: true,
        amountCOP: 100,
        allowlisted: true,
        authenticated: true,
        paymentCode: null,
        ambiguousCode: false,
        referenceAlreadyUsed: false,
        paymentStatus: 'PENDING',
        amountMatches: true,
        hasEntry: true,
        identified: true,
        expectedAmount: true,
      }),
    ).toMatchObject({ status: 'ASIGNADO', approve: true });
  });

  it('no habilita la polla si el valor no es el de la inscripción', () => {
    expect(
      decideNotice({
        looksLikeCredit: true,
        amountCOP: 250000,
        allowlisted: true,
        authenticated: true,
        paymentCode: null,
        ambiguousCode: false,
        referenceAlreadyUsed: false,
        paymentStatus: null,
        amountMatches: false,
        hasEntry: false,
        identified: false,
        expectedAmount: false,
      }).status,
    ).toBe('OMITIDO');
  });

  it('deja en revisión un valor válido cuando el remitente no identifica al jugador', () => {
    expect(
      decideNotice({
        looksLikeCredit: true,
        amountCOP: 16000,
        allowlisted: true,
        authenticated: true,
        paymentCode: null,
        ambiguousCode: false,
        referenceAlreadyUsed: false,
        paymentStatus: null,
        amountMatches: false,
        hasEntry: false,
        identified: false,
        expectedAmount: true,
      }).status,
    ).toBe('REVISAR');
  });

  it('en producción no acepta el valor de prueba', () => {
    expect(readTestAmount('100', 'development')).toBe(100);
    expect(readTestAmount('100', 'production')).toBeNull();
    expect(readTestAmount('100', 'production', false)).toBeNull();
    expect(readTestAmount('100', 'production', true)).toBe(100);
    expect(readTestAmount('16000', 'development')).toBeNull();
  });

  it('ignora un aviso sin código cuando el valor no está marcado como inscripción', () => {
    expect(
      decideNotice({
        looksLikeCredit: true,
        amountCOP: 16000,
        allowlisted: true,
        authenticated: true,
        paymentCode: null,
        ambiguousCode: false,
        referenceAlreadyUsed: false,
        paymentStatus: null,
        amountMatches: false,
        hasEntry: false,
      }).status,
    ).toBe('OMITIDO');
  });

  it('marca duplicado un pronóstico que ya estaba pagado', () => {
    expect(
      decideNotice({
        looksLikeCredit: true,
        amountCOP: 16000,
        allowlisted: true,
        authenticated: true,
        paymentCode: 804,
        ambiguousCode: false,
        referenceAlreadyUsed: false,
        paymentStatus: 'APPROVED',
        amountMatches: true,
        hasEntry: true,
      }).status,
    ).toBe('DUPLICADO');
  });

  it('cifra el token del buzón y vence el enlace de conexión', () => {
    const secret = 'secreto-de-prueba';
    expect(openToken(sealToken('refresh-1', secret), secret)).toBe('refresh-1');

    const state = signMailboxState(7, secret, 1_000);
    expect(readMailboxState(state, secret, 1_000)).toBe(7);
    expect(readMailboxState(state, secret, 1_000 + 11 * 60 * 1000)).toBeNull();
    expect(readMailboxState(`${state}x`, secret, 1_000)).toBeNull();
  });
});
