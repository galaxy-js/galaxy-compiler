/**
 * Matches line feed
 *
 * @type {RegExp}
 */
const LINE_FEED_REGEX = /\r?\n/g

/**
 * Default highlight padding
 *
 * @type {number}
 */
const DEFAULT_PADDING = 25

/**
 * Simple codeframe implementation
 *
 * @param {string} code
 * @param {number} index
 * @param {number=} padding
 *
 * @return {string}
 */
export function highlight (code, index, padding = DEFAULT_PADDING) {
  const leftPadding = Math.max(0, index - padding)

  let lineFeedPadding = 0
  let part = code.slice(leftPadding, index + padding)

  part = part.replace(LINE_FEED_REGEX, () => {
    lineFeedPadding++
    return '\\n'
  })

  return part + '\n' + ' '.repeat(lineFeedPadding + index - leftPadding) + '^'
}
