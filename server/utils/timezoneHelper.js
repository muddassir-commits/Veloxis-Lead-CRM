/**
 * Helper to calculate timezone offsets and schedule sends at optimal times.
 */

// Simple mapping of target regions/countries to timezones and offsets from UTC in hours
const regionOffsets = {
  'india': 5.5,
  'singapore': 8,
  'australia': 10,
  'uk': 1,
  'london': 1,
  'united kingdom': 1,
  'usa east': -5,
  'us east': -5,
  'usa (east)': -5,
  'est': -5,
  'new york': -5,
  'usa west': -8,
  'us west': -8,
  'usa (west)': -8,
  'pst': -8,
  'california': -8,
  'canada': -5, // Defaulting to Toronto/EST
  'usa': -5 // Default to EST
};

/**
 * Returns UTC offset for a given country/city
 * @param {string} countryOrCity 
 * @returns {number} Offset in hours
 */
function getOffsetForRegion(countryOrCity) {
  if (!countryOrCity) return 5.5; // Default to India (IST)

  const region = countryOrCity.trim().toLowerCase();
  for (const [key, offset] of Object.entries(regionOffsets)) {
    if (region.includes(key)) {
      return offset;
    }
  }
  return 5.5; // Fallback to India (IST)
}

/**
 * Calculates the next optimal send time based on the recipient's timezone offset
 * @param {Object} scheduleSettings 
 * @param {Array<number>} scheduleSettings.allowed_days - Array of weekdays (0=Sun, 1=Mon, ..., 6=Sat)
 * @param {number} scheduleSettings.start_hour - Optimal hour to start sending (e.g. 9 for 9 AM)
 * @param {number} scheduleSettings.end_hour - Optimal hour to end sending (e.g. 18 for 6 PM)
 * @param {string} region - Country or City name of recipient
 * @param {number} [daysDelay=1] - Delay in days for next step (defaults to 1)
 * @returns {Date} - JS Date representing when the email should be sent in UTC
 */
function calculateNextSendTime(scheduleSettings, region, daysDelay = 1) {
  const offset = getOffsetForRegion(region); // e.g. -5 for USA East
  const allowedDays = scheduleSettings.allowed_days || [1, 2, 3, 4, 5, 6];
  const startHour = scheduleSettings.start_hour || 9;
  const endHour = scheduleSettings.end_hour || 18;

  // Start with a base target date: today + daysDelay
  let targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysDelay);

  // Set the target hour to the start_hour in the recipient's local time
  // To do this: Recipient Local Time = UTC + Offset.
  // Therefore, UTC Time = Recipient Local Time - Offset.
  // e.g. For New York: 9 AM Local - (-5) = 2 PM UTC.
  // e.g. For India: 9:30 AM Local - 5.5 = 4 AM UTC.
  
  // Set minutes/seconds to 0
  targetDate.setUTCHours(startHour - offset, 0, 0, 0);

  // Ensure target day is in the allowed days list, otherwise roll forward
  let safetyCounter = 0;
  while (!allowedDays.includes(targetDate.getUTCDay()) && safetyCounter < 14) {
    targetDate.setDate(targetDate.getDate() + 1);
    safetyCounter++;
  }

  // If calculated time is in the past, roll it to the next day
  const now = new Date();
  if (targetDate <= now) {
    targetDate.setDate(targetDate.getDate() + 1);
    while (!allowedDays.includes(targetDate.getUTCDay())) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
  }

  return targetDate;
}

module.exports = {
  getOffsetForRegion,
  calculateNextSendTime
};
