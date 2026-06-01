export const prerender = false;

import type { APIRoute } from 'astro';
import {
  getCalendarEvents,
  getAllCalendarEvents,
  type HubId,
} from '../../utils/google-calendar';

const VALID_HUBS: HubId[] = ['tauranga', 'lakes', 'online', 'whakatane'];
const ALL_HUB = 'all';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const hub = url.searchParams.get('hub');
  const yearParam = url.searchParams.get('year');
  const monthParam = url.searchParams.get('month');

  if (!hub || (hub !== ALL_HUB && !VALID_HUBS.includes(hub as HubId))) {
    return new Response(JSON.stringify({ error: 'Invalid or missing hub' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const now = new Date();
  const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();
  const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;

  if (
    isNaN(year) ||
    isNaN(month) ||
    month < 1 ||
    month > 12 ||
    year < 2020 ||
    year > 2100
  ) {
    return new Response(JSON.stringify({ error: 'Invalid year or month' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { events, availableTags } =
      hub === ALL_HUB
        ? await getAllCalendarEvents(year, month)
        : await getCalendarEvents(hub as HubId, year, month);

    return new Response(
      JSON.stringify({ hub, year, month, events, availableTags }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
        },
      },
    );
  } catch (err) {
    console.error('Calendar fetch error:', err);
    return new Response(
      JSON.stringify({
        error: 'Unable to load events. Please try again later.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
};
