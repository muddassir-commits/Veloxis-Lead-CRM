/**
 * Compiles a message template by substituting double-curly brace variables.
 * @param {string} templateBody - The template body text containing {{variables}}.
 * @param {Object} data - The lead and settings data.
 * @returns {string} - Compiled message.
 */
function compileTemplate(templateBody, data = {}) {
  if (!templateBody || typeof templateBody !== 'string') {
    return '';
  }

  return templateBody.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, variableName) => {
    // If variable is found, return it, otherwise return empty string
    if (data[variableName] !== undefined && data[variableName] !== null) {
      return String(data[variableName]);
    }
    return '';
  });
}

module.exports = {
  compileTemplate
};
