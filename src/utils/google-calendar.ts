import {
  GOOGLE_CALENDAR_ID_TAURANGA,
  GOOGLE_CALENDAR_ID_LAKES,
  GOOGLE_CALENDAR_ID_ONLINE,
  GOOGLE_CALENDAR_ID_WHAKATANE,
} from 'astro:env/server';
import { getAccessToken, fetchWithRetry } from './google-auth';

export type HubId = 'tauranga' | 'lakes' | 'online' | 'whakatane';

export interface CalendarEvent {
  id: string;
  title: string;
  tags: string[];
  start: string;
  end: string;
  isAllDay: boolean;
  location: string | null;
  description: string | null;
  isRecurring: boolean;
  hub?: HubId;
}

interface GoogleCalendarDateTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

interface GoogleCalendarItem {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: GoogleCalendarDateTime;
  end: GoogleCalendarDateTime;
  recurringEventId?: string;
  status?: string;
}

interface GoogleCalendarResponse {
  kind: string;
  items?: GoogleCalendarItem[];
}

interface EventsCache {
  events: CalendarEvent[];
  availableTags: string[];
  cachedAt: number;
}

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3/calendars';
const CALENDAR_CACHE_TTL_MS = 5 * 60 * 1000;

// UTC+12 offset — NZ Standard Time. During NZDT (UTC+13, Oct–Mar) this is
// off by one hour, which is acceptable for a community events calendar.
const NZST_OFFSET_MS = 12 * 60 * 60 * 1000;

const eventsCache = new Map<string, EventsCache>();

function getCalendarId(hub: HubId): string {
  const ids: Record<HubId, string> = {
    tauranga: GOOGLE_CALENDAR_ID_TAURANGA,
    lakes: GOOGLE_CALENDAR_ID_LAKES,
    online: GOOGLE_CALENDAR_ID_ONLINE,
    whakatane: GOOGLE_CALENDAR_ID_WHAKATANE,
  };
  return ids[hub];
}

function parseTags(rawTitle: string): { tags: string[]; title: string } {
  const tags: string[] = [];
  let remaining = rawTitle.trim();
  const tagPattern = /^\[([^\]]+)\]\s*/;

  let match: RegExpExecArray | null;
  while ((match = tagPattern.exec(remaining)) !== null) {
    tags.push(match[1].toLowerCase().trim());
    remaining = remaining.slice(match[0].length);
  }

  return { tags, title: remaining || rawTitle.trim() };
}

export async function getCalendarEvents(
  hub: HubId,
  year: number,
  month: number,
): Promise<{ events: CalendarEvent[]; availableTags: string[] }> {
  const cacheKey = `${hub}-${year}-${month}`;
  const cached = eventsCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CALENDAR_CACHE_TTL_MS) {
    return { events: cached.events, availableTags: cached.availableTags };
  }

  const calendarId = getCalendarId(hub);

  // NZ midnight on the 1st of the requested month and the 1st of the next month
  const timeMin = new Date(
    Date.UTC(year, month - 1, 1) - NZST_OFFSET_MS,
  ).toISOString();
  const timeMax = new Date(
    Date.UTC(year, month, 1) - NZST_OFFSET_MS,
  ).toISOString();

  const url = new URL(
    `${CALENDAR_API_BASE}/${encodeURIComponent(calendarId)}/events`,
  );
  url.searchParams.set('timeMin', timeMin);
  url.searchParams.set('timeMax', timeMax);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '250');
  url.searchParams.set('timeZone', 'Pacific/Auckland');

  const token = await getAccessToken(CALENDAR_SCOPE);
  const response = await fetchWithRetry(
    url.toString(),
    { headers: { Authorization: `Bearer ${token}` } },
    CALENDAR_SCOPE,
    'Google Calendar API',
  );

  const data = (await response.json()) as GoogleCalendarResponse;

  const events: CalendarEvent[] = (data.items ?? [])
    .filter((item) => item.status !== 'cancelled')
    .map((item) => {
      const { tags, title } = parseTags(item.summary ?? '');
      const isAllDay = !item.start.dateTime;

      return {
        id: item.id,
        title,
        tags,
        start: item.start.dateTime ?? item.start.date ?? '',
        end: item.end.dateTime ?? item.end.date ?? '',
        isAllDay,
        location: item.location ?? null,
        description: item.description ?? null,
        isRecurring: !!item.recurringEventId,
      };
    });

  const availableTags = [...new Set(events.flatMap((e) => e.tags))].sort();

  eventsCache.set(cacheKey, { events, availableTags, cachedAt: Date.now() });

  return { events, availableTags };
}

export async function getAllCalendarEvents(
  year: number,
  month: number,
): Promise<{ events: CalendarEvent[]; availableTags: string[] }> {
  const hubs: HubId[] = ['tauranga', 'lakes', 'online', 'whakatane'];
  const results = await Promise.all(
    hubs.map((hub) => getCalendarEvents(hub, year, month)),
  );

  const allEvents = results
    .flatMap((result, i) =>
      result.events.map((event) => ({ ...event, hub: hubs[i] })),
    )
    .sort((a, b) => a.start.localeCompare(b.start));

  const availableTags = [...new Set(allEvents.flatMap((e) => e.tags))].sort();

  return { events: allEvents, availableTags };
}
