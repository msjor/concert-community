/**
 * Schema types for migrations 001–003
 */

export type AttendeeStatus = "going" | "interested";

export type ChatChannel = "general" | "setlist_pit";

export type BoardSide = "want" | "offer";
export type BoardCategory = "company" | "ticket" | "ride" | "merch" | "other";
export type BoardStatus = "open" | "claimed" | "closed";

export type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  favorite_genres: string[] | null;
  favorite_bands: string[] | null;
  bio: string | null;
  city: string | null;
  usually_goes_alone: boolean;
  open_to_meet?: boolean;
  can_drive?: boolean;
  created_at?: string;
};

export type Event = {
  id: string;
  title: string;
  band_name: string;
  venue: string;
  city: string;
  date: string;
  genre: string;
  doors_at: string | null;
  venue_address: string | null;
  ticket_url: string | null;
  price_range: string | null;
  age_restriction: string | null;
  support_acts: string[] | null;
  transit_notes: string | null;
  map_url: string | null;
  image_url?: string | null;
  created_at?: string;
};

export type EventSummary = Pick<
  Event,
  | "id"
  | "title"
  | "band_name"
  | "venue"
  | "city"
  | "date"
  | "genre"
  | "price_range"
  | "image_url"
> & {
  alone_count?: number;
  going_count?: number;
  chat_count?: number;
  going_faces?: { avatar_url: string | null; username: string | null }[];
  my_status?: AttendeeStatus | null;
};

export type Follow = {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
};

export type BandFollow = {
  id: string;
  user_id: string;
  band_name: string;
  created_at: string;
};

export type PublicProfileCard = Pick<
  Profile,
  | "id"
  | "username"
  | "avatar_url"
  | "city"
  | "bio"
  | "favorite_genres"
  | "favorite_bands"
  | "usually_goes_alone"
  | "open_to_meet"
  | "can_drive"
> & {
  overlap_score?: number;
};

export type Attendee = {
  id: string;
  event_id: string;
  user_id: string;
  status: AttendeeStatus;
  looking_for_ride: boolean;
  looking_for_company: boolean;
  has_tickets: boolean;
  offering_ride: boolean;
  ride_from: string | null;
  ride_seats: number | null;
  going_alone: boolean;
  hide_name: boolean;
  created_at?: string;
};

export type AttendeeWithProfile = Attendee & {
  profiles: Pick<
    Profile,
    "id" | "username" | "avatar_url" | "city" | "usually_goes_alone"
  > | null;
};

export type EventPost = {
  id: string;
  event_id: string;
  user_id: string;
  channel: ChatChannel;
  content: string;
  created_at: string;
  /** Set when this message belongs to a looking-for board thread. */
  thread_id?: string | null;
};

export type EventPostWithProfile = EventPost & {
  profiles: Pick<Profile, "id" | "username" | "avatar_url"> | null;
};

export type EventPin = {
  id: string;
  event_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

export type EventPinWithProfile = EventPin & {
  profiles: Pick<Profile, "id" | "username" | "avatar_url"> | null;
};

export type EventBoardPost = {
  id: string;
  event_id: string;
  user_id: string;
  side: BoardSide;
  category: BoardCategory;
  status: BoardStatus;
  title: string;
  details: string | null;
  created_at: string;
  updated_at: string;
};

export type EventBoardPostWithProfile = EventBoardPost & {
  profiles: Pick<Profile, "id" | "username" | "avatar_url"> | null;
};

export type EventMeetup = {
  id: string;
  event_id: string;
  user_id: string;
  title: string;
  location: string;
  meetup_at: string;
  notes: string | null;
  created_at: string;
};

export type EventMeetupWithProfile = EventMeetup & {
  profiles: Pick<Profile, "id" | "username" | "avatar_url"> | null;
};

export type AttendeeWithEvent = Attendee & {
  events: EventSummary | null;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  created_at: string;
};

/** Show UI: About | Going | Chat | Looking for (each board post is a thread). */
export type ShowSurface = "about" | "going" | "chat" | "looking";

export const SHOW_SURFACES: {
  id: ShowSurface;
  label: string;
  description: string;
  /** Canonical ?channel= value for deep links */
  channelParam: string;
}[] = [
  {
    id: "about",
    label: "About",
    description: "Date, venue, tickets & tips",
    channelParam: "info",
  },
  {
    id: "going",
    label: "Going",
    description: "Who's going & RSVP",
    channelParam: "going",
  },
  {
    id: "chat",
    label: "Chat",
    description: "Live show chat",
    channelParam: "general",
  },
  {
    id: "looking",
    label: "Looking for",
    description: "Pinned requests, each its own thread",
    channelParam: "looking-for",
  },
];

export function resolveShowSurface(
  channelParam: string | null | undefined,
  hasGoingRsvp: boolean,
): ShowSurface {
  const raw = channelParam?.trim() || null;
  if (!raw) {
    return hasGoingRsvp ? "chat" : "going";
  }
  if (raw === "info" || raw === "about") return "about";
  if (raw === "going" || raw === "attendees") return "going";
  if (raw === "looking-for" || raw === "looking") return "looking";
  if (
    raw === "general" ||
    raw === "chat" ||
    raw === "meetups" ||
    raw === "setlist-pit"
  ) {
    return "chat";
  }
  return hasGoingRsvp ? "chat" : "going";
}
