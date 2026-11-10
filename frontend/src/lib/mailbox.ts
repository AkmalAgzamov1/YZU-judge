// Microsoft's filter often puts mail from a new sender in Junk Email, and YZU
// student mail runs on Microsoft 365 too (its MX is mail.protection.outlook.com).
const MICROSOFT_DOMAIN = /^(outlook|hotmail|live|msn)(\.[a-z]{2,3}){1,2}$/;
const MICROSOFT_HOSTED = new Set(["mail.yzu.edu.tw"]);

export function isMicrosoftMailbox(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@").pop() ?? "";
  return MICROSOFT_DOMAIN.test(domain) || MICROSOFT_HOSTED.has(domain);
}
