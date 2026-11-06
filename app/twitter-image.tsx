import { OG_ALT, OG_SIZE, renderOg } from "@/components/og";

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg();
}
