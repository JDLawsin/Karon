import { servicePricingSchema } from "@/features/services/service-schemas";
import {
  currencyFractionDigits,
  formatClinicMoney
} from "@/lib/clinic/regional-settings";

const priceMajorToMinor = (priceMajor: number, currencyCode: string) => {
  const fractionDigits = currencyFractionDigits(currencyCode);
  const factor = 10 ** fractionDigits;
  const scaled = priceMajor * factor;
  const priceMinor = Math.round(scaled);

  if (Math.abs(scaled - priceMinor) > 1e-7) {
    throw new Error(
      `Use no more than ${fractionDigits} decimal ${fractionDigits === 1 ? "place" : "places"}.`
    );
  }

  return servicePricingSchema.shape.priceMinor.parse(priceMinor);
};

const priceMinorToMajor = (priceMinor: number, currencyCode: string) =>
  priceMinor / 10 ** currencyFractionDigits(currencyCode);

const currencyInputStep = (currencyCode: string) =>
  1 / 10 ** currencyFractionDigits(currencyCode);

const formatServicePrice = (
  priceMinor: number,
  currencyCode: string,
  locale: string
) => formatClinicMoney(priceMinor, currencyCode, locale);

export {
  currencyInputStep,
  formatServicePrice,
  priceMajorToMinor,
  priceMinorToMajor
};
