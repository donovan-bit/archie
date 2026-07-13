export interface EventColor {
  id: string;
  name: string;
  bg: string;
  fg: string;
}

// Mirrors Google Calendar's fixed event color palette (colorId 1-11) so
// colors picked here round-trip correctly with the real Google Calendar --
// the `bg` values are darkened ~15% from Google's originals purely for
// local display, so white event text stays readable against them.
export const EVENT_COLORS: EventColor[] = [
  { id: "1", name: "Lavender", bg: "#6772ad", fg: "#ffffff" },
  { id: "2", name: "Sage", bg: "#2b9b67", fg: "#ffffff" },
  { id: "3", name: "Grape", bg: "#791f91", fg: "#ffffff" },
  { id: "4", name: "Flamingo", bg: "#c46962", fg: "#ffffff" },
  { id: "5", name: "Banana", bg: "#f6bf26", fg: "#1f1f1f" },
  { id: "6", name: "Tangerine", bg: "#cf451a", fg: "#ffffff" },
  { id: "7", name: "Peacock", bg: "#0384c3", fg: "#ffffff" },
  { id: "8", name: "Graphite", bg: "#525252", fg: "#ffffff" },
  { id: "9", name: "Blueberry", bg: "#36459a", fg: "#ffffff" },
  { id: "10", name: "Basil", bg: "#096d39", fg: "#ffffff" },
  { id: "11", name: "Tomato", bg: "#b50000", fg: "#ffffff" },
];

export const DEFAULT_EVENT_COLOR: EventColor = {
  id: "default",
  name: "Peacock (default)",
  bg: "#1662c5",
  fg: "#ffffff",
};

export function getEventColor(colorId?: string | null): EventColor {
  return EVENT_COLORS.find((c) => c.id === colorId) ?? DEFAULT_EVENT_COLOR;
}
