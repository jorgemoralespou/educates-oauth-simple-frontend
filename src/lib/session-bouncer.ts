import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { getSiteConfig } from "./config";

export function generateVoucherUrl(
  workshopName: string,
  userEmail: string,
  userName: string,
  indexUrl: string
): string {
  const config = getSiteConfig();
  const bouncer = config.sessionBouncer;

  if (!bouncer) {
    throw new Error("sessionBouncer config is missing");
  }

  const signingKey =
    process.env.VOUCHER_SIGNING_KEY || bouncer.voucherSigningKey;

  if (!signingKey) {
    throw new Error(
      "No voucher signing key configured. Set VOUCHER_SIGNING_KEY env var or sessionBouncer.voucherSigningKey in site.json"
    );
  }

  const trustedVoucher = bouncer.trustedVoucher !== false;

  const claims: Record<string, unknown> = {
    iss: bouncer.issuer,
    workshop_name: workshopName,
    index_url: indexUrl,
    jti: randomUUID(),
  };

  if (trustedVoucher && userEmail) {
    claims.user_email = userEmail;
    claims.given_name = userName;
  }

  const token = jwt.sign(claims, signingKey, {
    algorithm: "HS256",
    expiresIn: "1h",
  });

  const bouncerUrl = bouncer.bouncerUrl.replace(/\/+$/, "");
  return `${bouncerUrl}/workshop/?voucher=${encodeURIComponent(token)}&index_url=${encodeURIComponent(indexUrl)}`;
}
