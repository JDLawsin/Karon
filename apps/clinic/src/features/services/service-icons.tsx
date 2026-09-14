import type { ReactElement, SVGProps } from "react";

type ServiceIcon = (props: SVGProps<SVGSVGElement>) => ReactElement;

const svgProps = (props: SVGProps<SVGSVGElement>) => ({
  fill: "none" as const,
  height: 24,
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  strokeWidth: 2,
  viewBox: "0 0 24 24",
  width: 24,
  ...props
});

/** Custom dental glyphs — Lucide-style stroke icons (MIT-compatible original SVGs). */
const ToothIcon: ServiceIcon = (props) => (
  <svg {...svgProps(props)}>
    <path d="M8 3.5c-1.8 0-3 1.4-3 3.2 0 1.6.6 2.8 1.2 4.2.5 1.2.8 2.4.8 3.8V20a1 1 0 0 0 1.8.6L10 18.5l1.2 2.1a1 1 0 0 0 1.8 0L14 18.5l1.2 2.1A1 1 0 0 0 17 20v-5.3c0-1.4.3-2.6.8-3.8.6-1.4 1.2-2.6 1.2-4.2 0-1.8-1.2-3.2-3-3.2-1.1 0-2 .4-3 1.1C11.9 3.9 11 3.5 10 3.5Z" />
  </svg>
);

const CleaningIcon: ServiceIcon = (props) => (
  <svg {...svgProps(props)}>
    <path d="M9 3.8c-1.5 0-2.5 1.2-2.5 2.7 0 1.3.5 2.3 1 3.5.4 1 .7 2 .7 3.2V18a.8.8 0 0 0 1.5.5l.8-1.4.8 1.4a.8.8 0 0 0 1.5 0l.8-1.4.8 1.4A.8.8 0 0 0 16 18v-4.8c0-1.2.3-2.2.7-3.2.5-1.2 1-2.2 1-3.5 0-1.5-1-2.7-2.5-2.7-.9 0-1.6.3-2.4.9-.8-.6-1.5-.9-2.4-.9Z" />
    <path d="M5 8.5c1.2-.8 2.2-1 3.2-.7" />
    <path d="M19 8.5c-1.2-.8-2.2-1-3.2-.7" />
    <path d="M4.5 12h3" />
    <path d="M16.5 12h3" />
  </svg>
);

const FillingIcon: ServiceIcon = (props) => (
  <svg {...svgProps(props)}>
    <path d="M8 3.5c-1.8 0-3 1.4-3 3.2 0 1.6.6 2.8 1.2 4.2.5 1.2.8 2.4.8 3.8V20a1 1 0 0 0 1.8.6L10 18.5l1.2 2.1a1 1 0 0 0 1.8 0L14 18.5l1.2 2.1A1 1 0 0 0 17 20v-5.3c0-1.4.3-2.6.8-3.8.6-1.4 1.2-2.6 1.2-4.2 0-1.8-1.2-3.2-3-3.2-1.1 0-2 .4-3 1.1C11.9 3.9 11 3.5 10 3.5Z" />
    <path d="M10 10h4v3.5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V10Z" />
  </svg>
);

const ExtractionIcon: ServiceIcon = (props) => (
  <svg {...svgProps(props)}>
    <path d="M9.5 4c-1.4 0-2.4 1.1-2.4 2.5 0 1.2.5 2.1.9 3.2.4.9.6 1.9.6 3v4.2a.8.8 0 0 0 1.4.5l.7-1.2.7 1.2a.8.8 0 0 0 1.4 0l.7-1.2.7 1.2a.8.8 0 0 0 1.4-.5V12.7c0-1.1.2-2.1.6-3 .4-1.1.9-2 .9-3.2 0-1.4-1-2.5-2.4-2.5-.8 0-1.5.3-2.2.8-.7-.5-1.4-.8-2.2-.8Z" />
    <path d="m4 5 16 14" />
    <path d="m20 5-5.5 4.8" />
  </svg>
);

const WisdomIcon: ServiceIcon = (props) => (
  <svg {...svgProps(props)}>
    <path d="M8 4c-1.8 0-3 1.4-3 3.1 0 1.5.6 2.6 1.1 3.9.5 1.1.8 2.3.8 3.6V19a1 1 0 0 0 1.8.6L10 17.8l1.2 1.8a1 1 0 0 0 1.8 0l1.2-1.8 1.2 1.8A1 1 0 0 0 17 19v-4.4c0-1.3.3-2.5.8-3.6.5-1.3 1.1-2.4 1.1-3.9 0-1.7-1.2-3.1-3-3.1-1.1 0-2 .4-3 1-.9-.6-1.8-1-2.9-1Z" />
    <circle cx="12" cy="10" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

const RootCanalIcon: ServiceIcon = (props) => (
  <svg {...svgProps(props)}>
    <path d="M9 3.5c-1.6 0-2.8 1.3-2.8 2.9 0 1.4.5 2.4 1 3.6.4 1.1.7 2.2.7 3.5v5.2c0 .6.5 1.1 1.1 1.1h.4L10.5 17l1 2.2a.8.8 0 0 0 1.5 0L14 17l1.1 2.8h.4c.6 0 1.1-.5 1.1-1.1v-5.2c0-1.3.3-2.4.7-3.5.5-1.2 1-2.2 1-3.6 0-1.6-1.2-2.9-2.8-2.9-1 0-1.8.4-2.7 1-.9-.6-1.7-1-2.8-1Z" />
    <path d="M12 8v8" />
    <path d="M10.2 11.5 12 13l1.8-1.5" />
  </svg>
);

const CrownIcon: ServiceIcon = (props) => (
  <svg {...svgProps(props)}>
    <path d="M5 9.5 7.5 5l2.2 3.2L12 4.5l2.3 3.7L16.5 5 19 9.5v2.2H5V9.5Z" />
    <path d="M6.5 11.7h11v2.3c0 1.4-1.3 2.5-2.8 2.5h-5.4c-1.5 0-2.8-1.1-2.8-2.5v-2.3Z" />
    <path d="M8.5 16.5c.4 1.5 1.5 2.8 3.5 2.8s3.1-1.3 3.5-2.8" />
  </svg>
);

const DentureIcon: ServiceIcon = (props) => (
  <svg {...svgProps(props)}>
    <path d="M4.5 10.5c0-2.8 3.2-4.5 7.5-4.5s7.5 1.7 7.5 4.5c0 1.2-.5 2.1-1.2 2.8-.4.4-.6.9-.6 1.5v1.4c0 .8-.7 1.5-1.5 1.5h-1.2c-.5 0-1-.3-1.2-.7L12.8 15l-1.1 1.8a1.4 1.4 0 0 1-1.2.7H9.3c-.8 0-1.5-.7-1.5-1.5v-1.4c0-.6-.2-1.1-.6-1.5-.7-.7-1.2-1.6-1.2-2.8Z" />
    <path d="M8 10.2h.01" />
    <path d="M10.5 9.8h.01" />
    <path d="M13.5 9.8h.01" />
    <path d="M16 10.2h.01" />
  </svg>
);

const BracesIcon: ServiceIcon = (props) => (
  <svg {...svgProps(props)}>
    <path d="M4 10h16" />
    <path d="M4 14h16" />
    <rect height="5" rx="1" width="3.2" x="5.2" y="9.5" />
    <rect height="5" rx="1" width="3.2" x="10.4" y="9.5" />
    <rect height="5" rx="1" width="3.2" x="15.6" y="9.5" />
    <path d="M6.8 7.5V6" />
    <path d="M12 7.5V6" />
    <path d="M17.2 7.5V6" />
    <path d="M6.8 16.5V18" />
    <path d="M12 16.5V18" />
    <path d="M17.2 16.5V18" />
  </svg>
);

const WhiteningIcon: ServiceIcon = (props) => (
  <svg {...svgProps(props)}>
    <path d="M9 5c-1.5 0-2.6 1.2-2.6 2.7 0 1.3.5 2.2.9 3.4.4 1 .6 2 .6 3.1V18a.8.8 0 0 0 1.4.5l.7-1.2.7 1.2a.8.8 0 0 0 1.4 0l.7-1.2.7 1.2a.8.8 0 0 0 1.4-.5v-3.8c0-1.1.2-2.1.6-3.1.4-1.2.9-2.1.9-3.4 0-1.5-1.1-2.7-2.6-2.7-.9 0-1.6.3-2.3.8-.7-.5-1.4-.8-2.3-.8Z" />
    <path d="M16.5 4.5 17.2 6l1.5.3-1.2 1 .4 1.5-1.4-.8-1.4.8.4-1.5-1.2-1 1.5-.3.7-1.5Z" />
    <path d="m19.5 9 .4.9.9.2-.7.6.2.9-.8-.5-.8.5.2-.9-.7-.6.9-.2.4-.9Z" />
  </svg>
);

const XrayIcon: ServiceIcon = (props) => (
  <svg {...svgProps(props)}>
    <rect height="14" rx="2" width="14" x="5" y="5" />
    <path d="M9 9c-.8 0-1.4.7-1.4 1.5 0 .7.3 1.2.5 1.8.2.5.4 1.1.4 1.7v1.8a.5.5 0 0 0 .9.3l.5-.8.5.8a.5.5 0 0 0 .9 0l.5-.8.5.8a.5.5 0 0 0 .9-.3v-1.8c0-.6.2-1.2.4-1.7.2-.6.5-1.1.5-1.8 0-.8-.6-1.5-1.4-1.5-.5 0-.9.2-1.3.5-.4-.3-.8-.5-1.3-.5Z" />
    <path d="M3 8h2" />
    <path d="M3 12h2" />
    <path d="M3 16h2" />
    <path d="M19 8h2" />
    <path d="M19 12h2" />
    <path d="M19 16h2" />
  </svg>
);

const FluorideIcon: ServiceIcon = (props) => (
  <svg {...svgProps(props)}>
    <path d="M12 3v3" />
    <path d="M8.5 5.5 10 7.2" />
    <path d="m15.5 5.5-1.5 1.7" />
    <path d="M9 9.5c-1.4 0-2.4 1.1-2.4 2.5 0 1.1.4 2 .8 3 .3.9.6 1.8.6 2.8V20a.7.7 0 0 0 1.3.4l.6-1 .6 1a.7.7 0 0 0 1.3 0l.6-1 .6 1a.7.7 0 0 0 1.3-.4v-2.2c0-1 .3-1.9.6-2.8.4-1 .8-1.9.8-3 0-1.4-1-2.5-2.4-2.5-.8 0-1.4.3-2 .7-.6-.4-1.2-.7-2-.7Z" />
  </svg>
);

const PediatricIcon: ServiceIcon = (props) => (
  <svg {...svgProps(props)}>
    <circle cx="12" cy="6.5" r="2.5" />
    <path d="M8.5 20v-1.2c0-1.8 1.6-3.3 3.5-3.3s3.5 1.5 3.5 3.3V20" />
    <path d="M9.5 12.8c-.9 0-1.6.7-1.6 1.6 0 .7.3 1.3.6 1.9.2.6.4 1.2.4 1.8v.9a.5.5 0 0 0 .9.3l.4-.7.4.7a.5.5 0 0 0 .9 0l.4-.7.4.7a.5.5 0 0 0 .9-.3v-.9c0-.6.2-1.2.4-1.8.3-.6.6-1.2.6-1.9 0-.9-.7-1.6-1.6-1.6-.5 0-.9.2-1.3.5-.4-.3-.8-.5-1.3-.5Z" />
  </svg>
);

const VeneerIcon: ServiceIcon = (props) => (
  <svg {...svgProps(props)}>
    <path d="M8.5 4.5c-1.5 0-2.6 1.2-2.6 2.8 0 1.4.5 2.4 1 3.6.4 1.1.7 2.2.7 3.4v4.4a.9.9 0 0 0 1.6.5l.9-1.5.9 1.5a.9.9 0 0 0 1.6 0l.9-1.5.9 1.5a.9.9 0 0 0 1.6-.5v-4.4c0-1.2.3-2.3.7-3.4.5-1.2 1-2.2 1-3.6 0-1.6-1.1-2.8-2.6-2.8-1 0-1.7.4-2.5 1-.8-.6-1.5-1-2.5-1Z" />
    <path d="M9.2 8.2h5.6" />
  </svg>
);

const ImplantIcon: ServiceIcon = (props) => (
  <svg {...svgProps(props)}>
    <path d="M9.5 3.8c-1.3 0-2.3 1-2.3 2.4 0 1.1.4 2 .8 3 .3.9.5 1.8.5 2.8v1.2h7V12c0-1 .2-1.9.5-2.8.4-1 .8-1.9.8-3 0-1.4-1-2.4-2.3-2.4-.8 0-1.4.3-2 .7-.6-.4-1.2-.7-2-.7Z" />
    <path d="M8.5 13h7" />
    <path d="M10 13v7.2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V13" />
    <path d="M10.8 16h2.4" />
    <path d="M10.8 18.2h2.4" />
  </svg>
);

const ConsultIcon: ServiceIcon = (props) => (
  <svg {...svgProps(props)}>
    <path d="M8 4h8a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2Z" />
    <path d="M10 9.2c-.7 0-1.2.6-1.2 1.3 0 .6.2 1 .4 1.5.2.5.3 1 .3 1.5v1.2a.4.4 0 0 0 .7.3l.4-.6.4.6a.4.4 0 0 0 .7 0l.4-.6.4.6a.4.4 0 0 0 .7-.3v-1.2c0-.5.1-1 .3-1.5.2-.5.4-.9.4-1.5 0-.7-.5-1.3-1.2-1.3-.4 0-.8.2-1.1.4-.3-.2-.7-.4-1.1-.4Z" />
  </svg>
);

const SealantIcon: ServiceIcon = (props) => (
  <svg {...svgProps(props)}>
    <path d="M9 4c-1.6 0-2.8 1.3-2.8 2.9 0 1.4.5 2.4 1 3.6.4 1.1.7 2.2.7 3.5V19a.9.9 0 0 0 1.6.5l.9-1.5.9 1.5a.9.9 0 0 0 1.6 0l.9-1.5.9 1.5a.9.9 0 0 0 1.6-.5v-4.9c0-1.3.3-2.4.7-3.5.5-1.2 1-2.2 1-3.6 0-1.6-1.2-2.9-2.8-2.9-1 0-1.8.4-2.7 1-.9-.6-1.7-1-2.8-1Z" />
    <path d="M9.5 10.5h5" />
    <path d="M10.2 12.5h3.6" />
  </svg>
);

const SERVICE_ICON_OPTIONS = {
  tooth: ToothIcon,
  cleaning: CleaningIcon,
  filling: FillingIcon,
  extraction: ExtractionIcon,
  wisdom: WisdomIcon,
  rootCanal: RootCanalIcon,
  crown: CrownIcon,
  denture: DentureIcon,
  braces: BracesIcon,
  whitening: WhiteningIcon,
  xray: XrayIcon,
  fluoride: FluorideIcon,
  pediatric: PediatricIcon,
  veneer: VeneerIcon,
  implant: ImplantIcon,
  consult: ConsultIcon,
  sealant: SealantIcon
} as const satisfies Record<string, ServiceIcon>;

type ServiceIconKey = keyof typeof SERVICE_ICON_OPTIONS;

const SERVICE_ICON_LABELS: Record<ServiceIconKey, string> = {
  tooth: "Tooth",
  cleaning: "Cleaning",
  filling: "Filling",
  extraction: "Extraction",
  wisdom: "Wisdom tooth",
  rootCanal: "Root canal",
  crown: "Crown",
  denture: "Denture",
  braces: "Braces",
  whitening: "Whitening",
  xray: "X-ray",
  fluoride: "Fluoride",
  pediatric: "Pediatric",
  veneer: "Veneer",
  implant: "Implant",
  consult: "Consult",
  sealant: "Sealant"
};

const serviceIconKeys = Object.keys(SERVICE_ICON_OPTIONS) as ServiceIconKey[];

const serviceIconLabel = (key: ServiceIconKey) => SERVICE_ICON_LABELS[key];

const isServiceIconKey = (value: string): value is ServiceIconKey =>
  value in SERVICE_ICON_OPTIONS;

const serviceIconOf = (key: string | null | undefined) => {
  if (!key || !isServiceIconKey(key)) {
    return null;
  }

  return SERVICE_ICON_OPTIONS[key];
};

export {
  SERVICE_ICON_OPTIONS,
  ToothIcon,
  isServiceIconKey,
  serviceIconKeys,
  serviceIconLabel,
  serviceIconOf
};
export type { ServiceIcon, ServiceIconKey };
