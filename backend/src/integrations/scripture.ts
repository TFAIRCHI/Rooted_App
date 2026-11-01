import { createHash } from 'node:crypto';

export interface ScriptureEvidence {
  reference: string;
  referenceExists: boolean;
  translation: string;
  edition: string;
  authorizedText: string | null;
  rightsConfirmed: boolean;
  licenseId: string | null;
  retrievedAt: string;
  sourceId: string;
}

export function verifyScripture(input: { reference: string; quote?: string; translation: string; edition: string }, evidence: ScriptureEvidence | null) {
  const referenceExists = Boolean(evidence && evidence.reference === input.reference && evidence.referenceExists && evidence.translation === input.translation && evidence.edition === input.edition);
  const authorized = Boolean(referenceExists && evidence?.rightsConfirmed && evidence.licenseId && evidence.authorizedText !== null);
  const exactLicensedText = Boolean(authorized && input.quote !== undefined && input.quote === evidence?.authorizedText);
  return {
    referenceExists,
    exactLicensedText,
    interpretationVerified: false as const,
    status: !referenceExists ? 'unverified_reference' as const : input.quote === undefined ? 'reference_exists' as const : exactLicensedText ? 'exact_licensed_text' as const : 'unverified_quotation' as const,
    textDigest: exactLicensedText ? createHash('sha256').update(input.quote!).digest('hex') : null,
    evidenceDigest: evidence ? createHash('sha256').update(JSON.stringify(evidence)).digest('hex') : null,
  };
}
