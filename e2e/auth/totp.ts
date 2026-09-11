import * as OTPAuth from "otpauth";

const totpFromSecret = (secret: string) =>
  new OTPAuth.TOTP({
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret.replaceAll(" ", ""))
  });

export { totpFromSecret };
