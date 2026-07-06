import crypto from "crypto";

export function generateMomoSignature(
  rawSignature: string,
  secretKey: string
): string {
  return crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");
}
