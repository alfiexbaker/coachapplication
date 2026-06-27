export type BookingWeatherTone = 'sunny' | 'cloudy' | 'rainy' | 'storm' | 'snow' | 'unknown';

export interface BookingWeatherState {
  loading: boolean;
  available: boolean;
  summary?: string;
  temperatureText?: string;
  precipitationText?: string;
  sourceLabel?: string;
  tone?: BookingWeatherTone;
  reason?: string;
}

interface OpenMeteoGeoResponse {
  results?: {
    name: string;
    country?: string;
    admin1?: string;
    latitude: number;
    longitude: number;
  }[];
}

interface OpenMeteoForecastResponse {
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max?: number[];
  };
}

const weatherCache = new Map<string, BookingWeatherState>();

function unavailable(reason: string): BookingWeatherState {
  return {
    loading: false,
    available: false,
    reason,
  };
}

function getDateKey(iso: string): string {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDaysUntil(iso: string): number {
  const now = new Date();
  const target = new Date(iso);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTarget = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  ).getTime();
  return Math.round((startOfTarget - startOfToday) / (1000 * 60 * 60 * 24));
}

function mapWeatherCode(code: number): { summary: string; tone: BookingWeatherTone } {
  if (code === 0) return { summary: 'Clear', tone: 'sunny' };
  if ([1, 2].includes(code)) return { summary: 'Partly cloudy', tone: 'cloudy' };
  if (code === 3 || [45, 48].includes(code)) return { summary: 'Cloudy', tone: 'cloudy' };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 80, 81, 82].includes(code)) {
    return { summary: 'Rain likely', tone: 'rainy' };
  }
  if ([66, 67, 71, 73, 75, 77, 85, 86].includes(code)) {
    return { summary: 'Snow/ice risk', tone: 'snow' };
  }
  if ([95, 96, 99].includes(code)) return { summary: 'Thunderstorm risk', tone: 'storm' };
  return { summary: 'Forecast available', tone: 'unknown' };
}

export async function loadBookingWeather(
  locationLabel: string,
  bookingStartIso: string,
): Promise<BookingWeatherState> {
  const normalizedLocation = locationLabel.trim();
  if (!normalizedLocation) {
    return unavailable('No location set for this booking.');
  }

  const daysUntil = getDaysUntil(bookingStartIso);
  if (daysUntil < 0) {
    return unavailable('Weather forecast only shows upcoming bookings.');
  }
  if (daysUntil > 16) {
    return unavailable('Forecast is usually available within 16 days of the session.');
  }

  const targetDateKey = getDateKey(bookingStartIso);
  const cacheKey = `${normalizedLocation.toLowerCase()}|${targetDateKey}`;
  const cached = weatherCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=${encodeURIComponent(normalizedLocation)}`;
  const geoResponse = await fetch(geoUrl);
  if (!geoResponse.ok) {
    return unavailable('Weather forecast is unavailable right now.');
  }

  const geoData = (await geoResponse.json()) as OpenMeteoGeoResponse;
  const first = geoData.results?.[0];
  if (!first) {
    const noMatch = unavailable('No weather match found for this location.');
    weatherCache.set(cacheKey, noMatch);
    return noMatch;
  }

  const forecastUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${first.latitude}&longitude=${first.longitude}` +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=16&timezone=auto';
  const forecastResponse = await fetch(forecastUrl);
  if (!forecastResponse.ok) {
    return unavailable('Weather forecast is unavailable right now.');
  }

  const forecast = (await forecastResponse.json()) as OpenMeteoForecastResponse;
  const daily = forecast.daily;
  const index = daily?.time?.findIndex((date) => date === targetDateKey) ?? -1;

  if (!daily || index < 0) {
    const unavailableForDate = unavailable('Forecast for this date is not available yet.');
    weatherCache.set(cacheKey, unavailableForDate);
    return unavailableForDate;
  }

  const weatherCode = daily.weather_code[index] ?? -1;
  const maxTemp = daily.temperature_2m_max[index];
  const minTemp = daily.temperature_2m_min[index];
  const precip = daily.precipitation_probability_max?.[index];
  const mapped = mapWeatherCode(weatherCode);
  const sourceBits = [first.name, first.admin1, first.country].filter(Boolean);

  const loaded: BookingWeatherState = {
    loading: false,
    available: true,
    summary: mapped.summary,
    temperatureText:
      Number.isFinite(maxTemp) && Number.isFinite(minTemp)
        ? `${Math.round(minTemp)}\u00b0-${Math.round(maxTemp)}\u00b0C`
        : undefined,
    precipitationText:
      typeof precip === 'number' ? `${Math.round(precip)}% rain chance` : undefined,
    sourceLabel: sourceBits.join(', '),
    tone: mapped.tone,
  };
  weatherCache.set(cacheKey, loaded);
  return loaded;
}
