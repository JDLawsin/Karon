import ImageUploadField from "@/lib/forms/image-upload-field";
import { LOGO_IMAGE_OPTIONS } from "@/lib/images/prepare-image";

type Props = {
  id: string;
  file: File | null;
  remoteUrl: string | null;
  error: string | null;
  onFileChange: (file: File | null, error: string | null) => void;
};

const ClinicLogoField = ({ id, file, remoteUrl, error, onFileChange }: Props) => (
  <ImageUploadField
    chooseLabel="Choose image"
    emptyLabel="Drop a logo here, or choose an image"
    error={error}
    file={file}
    hint="PNG, JPEG, or WebP. Large photos are shrunk to under 512 KB."
    id={id}
    label="Logo"
    onFileChange={onFileChange}
    optional
    options={LOGO_IMAGE_OPTIONS}
    previewAlt="Clinic logo preview"
    remoteUrl={remoteUrl}
    removeLabel="Remove logo"
  />
);

export default ClinicLogoField;
