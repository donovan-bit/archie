export interface EventColor {
  id: string;
  name: string;
  bg: string;
  fg: string;
}

// Mirrors Google Calendar's fixed event color palette (colorId 1-11) so
// colors picked here round-trip correctly with the real Google Calendar.
export const EVENT_COLORS: EventColor[] = [
  { id: "1", name: "Lavender", bg: "#7986cb", fg: "#ffffff" },
  { id: "2", name: "Sage", bg: "#33b679", fg: "#ffffff" },
  { id: "3", name: "Grape", bg: "#8e24aa", fg: "#ffffff" },
  { id: "4", name: "Flamingo", bg: "#e67c73", fg: "#ffffff" },
  { id: "5", name: "Banana", bg: "#f6bf26", fg: "#1f1f1f" },
  { id: "6", name: "Tangerine", bg: "#f4511e", fg: "#ffffff" },
  { id: "7", name: "Peacock", bg: "#039be5", fg: "#ffffff" },
  { id: "8", name: "Graphite", bg: "#616161", fg: "#ffffff" },
  { id: "9", name: "Blueberry", bg: "#3f51b5", fg: "#ffffff" },
  { id: "10", name: "Basil", bg: "#0b8043", fg: "#ffffff" },
  { id: "11", name: "Tomato", bg: "#d50000", fg: "#ffffff" },
];

export const DEFAULT_EVENT_COLOR: EventColor = {
  id: "default",
  name: "Peacock (default)",
  bg: "#1a73e8",
  fg: "#ffffff",
};

export function getEventColor(colorId?: string | null): EventColor {
  return EVENT_COLORS.find((c) => c.id === colorId) ?? DEFAULT_EVENT_COLOR;
}
