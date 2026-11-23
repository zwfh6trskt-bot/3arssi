// Refined line icons (24×24, 1.5 stroke). Names are stored in the database
// (events.icon, categories.icon, service_types.icon), so admins can pick them.
import type { CSSProperties } from "react";

const P: Record<string, string> = {
  // content icons
  chest: "M4 10h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9Zm0 0V8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2M10 13h4",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Zm9.5 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  hands: "M7 11.5V6.8a1.3 1.3 0 0 1 2.6 0V11m0-1.5V5.3a1.3 1.3 0 0 1 2.6 0V11m0-4.2a1.3 1.3 0 0 1 2.6 0V12m0-3.2a1.3 1.3 0 0 1 2.6 0v5.4a6 6 0 0 1-6 6h-.6a6 6 0 0 1-4.9-2.6L4.5 14.2a1.4 1.4 0 0 1 2.2-1.7L8 14",
  ring: "M12 21a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm-3-12 1.5-4h3L15 9M10.5 5 12 7l1.5-2",
  gift: "M4 11h16v9H4v-9Zm-1-4h18v4H3V7Zm9 0v13M12 7c-1.5-3-5-3.4-5-1.2C7 7 9.5 7 12 7Zm0 0c1.5-3 5-3.4 5-1.2C17 7 14.5 7 12 7Z",
  document: "M6 3h8l4 4v14H6V3Zm8 0v4h4M9 12h6M9 15.5h6M9 9h2",
  hand: "M8 13V5.5a1.5 1.5 0 0 1 3 0V11m0-6.5V4a1.5 1.5 0 0 1 3 0v7m0-5.5a1.5 1.5 0 0 1 3 0V12m0-2.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.2a6 6 0 0 1-4.7-2.3L4.6 14a1.5 1.5 0 0 1 2.3-1.9L8 13.5",
  drop: "M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5Zm-2.5 11a2.5 2.5 0 0 0 2.5 2.5",
  venue: "M4 21V10l8-6 8 6v11M4 21h16M9 21v-6a3 3 0 0 1 6 0v6",
  hanger: "M12 7.5a2 2 0 1 1 2-2M12 7.5v1.5L3 15.5a1 1 0 0 0 .6 1.8h16.8a1 1 0 0 0 .6-1.8L12 9",
  needle: "M19.5 4.5 7 17l-2.5 2.5M17 3l4 4M6 13c-2.5 0-3.5 2-3 3.5s3 1.5 3.5-1c.6-3 3-4.5 6.5-4",
  "heart-line": "M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10Z",
  shoe: "M3 16.5V10l3-1 3 4.5c2.5.5 7 1 10 2.2 1.4.6 2 1.5 2 2.8H4a1 1 0 0 1-1-1Zm0 0h18",
  brush: "M14.5 4.5l5 5-7.5 7.5-5-5 7.5-7.5ZM7 12l-2.5 2.5C3 16 3.5 19 3 21c2-.5 5 0 6.5-1.5L12 17",
  comb: "M4 9h16v3H4V9Zm2 3v6m3-6v6m3-6v6m3-6v6m3-6v6",
  sweets: "M6 14h12l-1.2 6H7.2L6 14Zm0 0a6 6 0 0 1 12 0M9.5 8.5 12 4l2.5 4.5",
  cup: "M5 8h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V8Zm11 1h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5v2m3-2v2m3-2v2M4 21h13",
  people: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9a6 6 0 0 1 12 0M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14a6 6 0 0 1 3 6",
  home: "M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-9.5Z",
  camera: "M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Zm8 9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
  video: "M3 7h12v10H3V7Zm12 3.5 6-3v9l-6-3",
  dish: "M3 16h18M5 16a7 7 0 0 1 14 0M12 9V7m-2 0h4M4 19h16",
  cake: "M5 12h14v8H5v-8Zm0 4c2 1 3-1 5 0s3 1 4 0 3-1 5 0M8 12V9m4 3V9m4 3V9M8 6.5v.5m4-.5v.5m4-.5v.5",
  flower: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0 0c0-3 1.5-5 0-5.5S12 6 12 9Zm3 3c3 0 5 1.5 5.5 0S18 12 15 12Zm-3 3c0 3-1.5 5 0 5.5S12 18 12 15Zm-3-3c-3 0-5-1.5-5.5 0S6 12 9 12Z",
  music: "M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm11-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM9 9l11-2",
  car: "M3 16v-3.5L5 7h14l2 5.5V16M3 16h18M3 16v2.5h3V16m12 0v2.5h3V16M6.5 12.5h1.5m8 0h1.5",
  tray: "M3 15h18M4.5 15a7.5 7.5 0 0 1 15 0M12 7.5V6M2 18h20",
  basket: "M3 10h18l-2 10H5L3 10Zm4 0 3-6m7 6-3-6M9 14v3m6-3v3",
  calendar: "M4 6h16v15H4V6Zm0 4h16M8 3v4m8-4v4",
  // ui icons
  back: "M15 5 8 12l7 7",
  chevron: "M9 5l7 7-7 7",
  down: "M6 9l6 6 6-6",
  up: "M6 15l6-6 6 6",
  plus: "M12 5v14M5 12h14",
  check: "M5 12.5 10 17 19 7.5",
  close: "M6 6l12 12M18 6 6 18",
  search: "M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Zm5.5-2 5 5",
  filter: "M4 6h16M7 12h10M10 18h4",
  wallet: "M4 7h15a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7Zm0 0V6a2 2 0 0 1 2-2h11M16 13.5h.5",
  bookmark: "M6 4h12v17l-6-4-6 4V4Z",
  "bookmark-fill": "M6 4h12v17l-6-4-6 4V4Z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7.5 9a7.5 7.5 0 0 1 15 0",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-9-9h18M12 3c2.5 2.5 3.5 5.5 3.5 9S14.5 18.5 12 21c-2.5-2.5-3.5-5.5-3.5-9S9.5 5.5 12 3Z",
  phone: "M5 4h3.5l1.5 4.5-2.2 1.3a11 11 0 0 0 6.4 6.4l1.3-2.2L20 15.5V19a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1Z",
  whatsapp: "M4 20l1.2-4.1A8.5 8.5 0 1 1 8.4 19L4 20Zm5.2-11.6c-.4.9-.3 2.4 1.2 4.1 1.6 1.8 3.3 2.4 4.3 2.1l.9-1.4-1.8-1-.9.8c-.8-.3-1.9-1.3-2.3-2.2l.7-.9-.8-1.9-1.3.4Z",
  instagram: "M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm5 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm5-9.5h.01",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  edit: "M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4",
  trash: "M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13",
  copy: "M8 8h11v11H8V8Zm-3 8V5h11",
  "eye-off": "M3 3l18 18M10.6 6.1A9.5 9.5 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-3 3.6M6.5 7.5A16 16 0 0 0 2.5 12S6 18 12 18a9 9 0 0 0 4-.9M9.9 10a3 3 0 0 0 4.1 4.1",
  pin: "M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-10v5.5M12 7.8v.2",
  alert: "M12 4 2.5 20h19L12 4Zm0 6v4.5m0 2.7v.1",
  star: "M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8L12 3.8Z",
  shield: "M12 3 5 6v5.5c0 4.4 3 8 7 9.5 4-1.5 7-5.1 7-9.5V6l-7-3Zm-3 9 2 2 4-4",
  image: "M4 5h16v14H4V5Zm0 11 4.5-4.5 3.5 3.5 2.5-2.5L20 17M15.5 9.5h.01",
  logout: "M10 5H5v14h5M14 8l4 4-4 4M18 12H9",
  list: "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01",
  grid: "M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z",
  tag: "M3 12V4h8l10 10-8 8L3 12Zm5-4.5h.01",
  minus: "M5 12h14",
  external: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  refresh: "M20 11a8 8 0 0 0-14.5-4.5L4 8m0-4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16m0 4v-4h-4",
  database: "M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3Zm8-3v14c0 1.7-3.6 3-8 3s-8-1.3-8-3V5m16 7c0 1.7-3.6 3-8 3s-8-1.3-8-3",
  key: "M15 9a4 4 0 1 0-5.7 3.6L4 18v2h3v-2h2v-2h2l1.4-1.4A4 4 0 0 0 15 9Zm1-1.5h.01",
  arch: "M5 21V11a7 7 0 0 1 14 0v10M5 21h14M9 21v-8a3 3 0 0 1 6 0v8",
  more: "M12 6.5h.01M12 12h.01M12 17.5h.01",
};

export const ICON_NAMES = [...Object.keys(P).slice(0, 29), "arch", "star", "tag"];

export function Icon({ name, size = 22, className, style, title, fill }: {
  name: string; size?: number; className?: string; style?: CSSProperties; title?: string; fill?: boolean;
}) {
  const d = P[name] ?? P.arch;
  const filled = fill || name === "bookmark-fill";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor"
      strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} style={style}
      aria-hidden={title ? undefined : true} role={title ? "img" : undefined}>
      {title && <title>{title}</title>}
      <path d={d} />
    </svg>
  );
}
