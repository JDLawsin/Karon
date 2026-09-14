import type { ServiceIconKey } from "@/features/services/service-icons";

/**
 * Common services for small PH dental clinics (Cebu beachhead).
 * Drawn from typical PH clinic menus + PhilHealth preventive oral-health set:
 * consultation, oral prophylaxis, fillings, extraction, X-ray, fluoride, sealants,
 * plus frequent restorative/cosmetic bookings (RCT, crown, dentures, braces, whitening).
 */
type DentalServiceSuggestion = {
  name: string;
  description: string;
  icon: ServiceIconKey;
};

const COMMON_DENTAL_SERVICES = [
  {
    name: "Consultation",
    description: "Check-up and treatment planning with the dentist.",
    icon: "consult"
  },
  {
    name: "Oral prophylaxis",
    description: "Professional cleaning to remove plaque and tartar.",
    icon: "cleaning"
  },
  {
    name: "Dental filling",
    description: "Tooth-colored restoration for cavities and small chips.",
    icon: "filling"
  },
  {
    name: "Tooth extraction",
    description: "Simple removal of a tooth under local anesthesia.",
    icon: "extraction"
  },
  {
    name: "Wisdom tooth removal",
    description: "Surgical or simple removal of a third molar.",
    icon: "wisdom"
  },
  {
    name: "Root canal treatment",
    description: "Clean and seal an infected tooth to save it.",
    icon: "rootCanal"
  },
  {
    name: "Dental crown",
    description: "Cap that restores a damaged or root-treated tooth.",
    icon: "crown"
  },
  {
    name: "Dentures",
    description: "Removable replacement for missing teeth.",
    icon: "denture"
  },
  {
    name: "Braces adjustment",
    description: "Orthodontic visit to adjust wires or clear aligners.",
    icon: "braces"
  },
  {
    name: "Teeth whitening",
    description: "In-clinic bleaching for a brighter smile.",
    icon: "whitening"
  },
  {
    name: "Dental X-ray",
    description: "Radiograph to check roots, bone, and hidden decay.",
    icon: "xray"
  },
  {
    name: "Fluoride treatment",
    description: "Protective fluoride to strengthen enamel.",
    icon: "fluoride"
  },
  {
    name: "Pit and fissure sealant",
    description: "Protective coating on chewing surfaces to prevent cavities.",
    icon: "sealant"
  },
  {
    name: "Pediatric dental care",
    description: "Check-up and care tailored for children.",
    icon: "pediatric"
  },
  {
    name: "Veneers",
    description: "Thin shells that improve the look of front teeth.",
    icon: "veneer"
  },
  {
    name: "Dental implant",
    description: "Consult or placement for a permanent tooth replacement.",
    icon: "implant"
  }
] as const satisfies readonly DentalServiceSuggestion[];

const SUGGESTED_SERVICE_NAMES = [
  COMMON_DENTAL_SERVICES[1]!.name,
  COMMON_DENTAL_SERVICES[3]!.name,
  COMMON_DENTAL_SERVICES[2]!.name
] as const;

const filterDentalServiceSuggestions = (query: string) => {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return [...COMMON_DENTAL_SERVICES];
  }

  return COMMON_DENTAL_SERVICES.filter((service) => {
    const haystack = `${service.name} ${service.description}`.toLowerCase();
    return haystack.includes(normalized);
  });
};

const matchDentalServiceSuggestion = (name: string) => {
  const normalized = name.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  return (
    COMMON_DENTAL_SERVICES.find(
      (service) => service.name.toLowerCase() === normalized
    ) ?? null
  );
};

export {
  COMMON_DENTAL_SERVICES,
  SUGGESTED_SERVICE_NAMES,
  filterDentalServiceSuggestions,
  matchDentalServiceSuggestion
};
export type { DentalServiceSuggestion };
