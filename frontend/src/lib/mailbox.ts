import { apiFetch } from "./api";

export interface MailboxStatus {
  configured: boolean;
  connected: boolean;
  redirectUri?: string;
  acceptedAmount?: number;
  lastSyncAt: string | null;
  lastError: string | null;
}

export interface IncomingTransfer {
  id: number;
  amountCOP: number;
  payerName: string | null;
  concept: string | null;
  receivedAt: string;
  status: string;
  paymentId: number | null;
  authenticated: boolean;
  fromDomain: string;
}

export function getMailboxStatus() {
  return apiFetch<MailboxStatus>("/payments/mailbox");
}

export function connectMailbox() {
  return apiFetch<{ url: string }>("/payments/mailbox/connect");
}

export function saveGoogleCredentials(clientId: string, clientSecret: string) {
  return apiFetch<{ configured: boolean }>("/payments/mailbox/credentials", {
    method: "POST",
    body: JSON.stringify({ clientId, clientSecret }),
  });
}

export function syncMailbox() {
  return apiFetch<{ imported: number }>("/payments/mailbox/sync", {
    method: "POST",
  });
}

export function disconnectMailbox() {
  return apiFetch<{ connected: boolean }>("/payments/mailbox", {
    method: "DELETE",
  });
}

export function getIncomingTransfers() {
  return apiFetch<IncomingTransfer[]>("/payments/incoming");
}

export function assignIncomingTransfer(id: number, paymentId: number) {
  return apiFetch<{ assigned: boolean }>(`/payments/incoming/${id}/assign`, {
    method: "POST",
    body: JSON.stringify({ paymentId }),
  });
}
