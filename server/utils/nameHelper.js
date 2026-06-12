/**
 * Name & Company Greeting Cleaner Helper
 */

// Suffixes and business indicators to remove
const BUSINESS_SUFFIXES = [
  'llc', 'inc', 'ltd', 'pvt', 'corp', 'co', 'corporation', 'group', 
  'holdings', 'partners', 'incorporated', 'limited', 'private', 'company'
];

// Common business categories to truncate around
const CATEGORY_KEYWORDS = [
  'gym', 'fitness', 'pilates', 'yoga', 'crossfit', 'studio', 'center', 
  'clinic', 'dental', 'dentist', 'academy', 'institute', 'school', 'university',
  'college', 'services', 'agency', 'office', 'developers', 'builders', 'properties',
  'real estate', 'shop', 'store', 'boutique', 'salon', 'spa', 'massage',
  'cafe', 'restaurant', 'bar', 'hotel', 'club', 'care', 'implant', 'hospital'
];

// Geographic words to clean if they appear at the end of business names
const GEOGRAPHIC_KEYWORDS = [
  'lucknow', 'delhi', 'mumbai', 'bangalore', 'sydney', 'melbourne', 
  'london', 'new york', 'ny', 'la', 'brisbane', 'perth', 'adelaide'
];

/**
 * Strips punctuation and returns lowercase array of words
 */
function getWords(str) {
  return str.toLowerCase().replace(/[^\w\s]/g, ' ').trim().split(/\s+/);
}

/**
 * Checks if a string looks like a business name rather than a person's name
 */
function isLikelyBusiness(name, company) {
  if (!name) return false;
  
  // If name matches company, it's definitely a business listing
  if (company && name.trim().toLowerCase() === company.trim().toLowerCase()) {
    return true;
  }

  const words = getWords(name);
  
  // If the name is very long (4+ words), it's highly likely a business
  if (words.length >= 4) return true;

  // Check if it contains any category keywords
  const hasCategory = words.some(w => CATEGORY_KEYWORDS.includes(w) || BUSINESS_SUFFIXES.includes(w));
  if (hasCategory) return true;

  return false;
}

/**
 * Truncates and cleans a business name to make it look natural
 */
function cleanBusinessName(businessName) {
  if (!businessName) return '';

  let clean = businessName.trim();

  // 1. Strip trailing zip codes, phone numbers, or brackets
  clean = clean.replace(/\s*\([^)]*\)/g, ''); // strip content in parentheses
  clean = clean.replace(/[\d\s+-]{8,}$/g, ''); // strip trailing phone numbers

  // 2. Split into words to analyze category cutoffs
  const words = clean.split(/\s+/);
  const lowercaseWords = words.map(w => w.toLowerCase().replace(/[^\w]/g, ''));

  // Find the first index of a category keyword (e.g. "Gym", "Clinic")
  let cutIndex = -1;
  for (let i = 0; i < lowercaseWords.length; i++) {
    const w = lowercaseWords[i];
    
    // We want to slice AT the category keyword or just after it if it's the second word
    if (CATEGORY_KEYWORDS.includes(w) || BUSINESS_SUFFIXES.includes(w)) {
      cutIndex = i;
      break;
    }
  }

  // If a category keyword is found, truncate there
  if (cutIndex !== -1) {
    // If it's the very first word, keep it, otherwise take everything before it
    if (cutIndex > 0) {
      clean = words.slice(0, cutIndex).join(' ');
    } else {
      // e.g. "Gym Lucknow" -> Keep "Gym"
      clean = words[0];
    }
  }

  // 3. Clean up trailing geographic words, symbols, and punctuation
  let lastWords = clean.split(/\s+/);
  while (lastWords.length > 0) {
    const lastWordClean = lastWords[lastWords.length - 1].toLowerCase().replace(/[^\w]/g, '');
    if (GEOGRAPHIC_KEYWORDS.includes(lastWordClean) || BUSINESS_SUFFIXES.includes(lastWordClean)) {
      lastWords.pop();
    } else {
      break;
    }
  }

  clean = lastWords.join(' ');

  // Strip trailing punctuation symbols (like -, &, +, comma)
  clean = clean.replace(/[\s&|+,.-]+$/g, '').trim();

  // If we ended up with nothing, fallback to original
  if (!clean) {
    clean = businessName.trim().split(/\s+/).slice(0, 2).join(' ');
  }

  // Ensure first letters capitalized
  return clean.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

/**
 * Extracts a clean greeting name for outbound messages
 */
function getCleanGreetingName(name, company) {
  if (!name) return 'there';

  const trimmedName = name.trim();

  // Check if it's a business name listing
  if (isLikelyBusiness(trimmedName, company)) {
    return cleanBusinessName(trimmedName);
  }

  // Person Name: Extract first name
  const words = trimmedName.split(/\s+/);
  if (words.length > 0) {
    const firstName = words[0].replace(/[^\w]/g, '');
    if (firstName) {
      // Capitalize first name
      return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    }
  }

  return trimmedName;
}

/**
 * Extracts a clean company name
 */
function getCleanCompanyName(company) {
  if (!company) return 'your business';
  
  return cleanBusinessName(company);
}

module.exports = {
  isLikelyBusiness,
  cleanBusinessName,
  getCleanGreetingName,
  getCleanCompanyName
};
