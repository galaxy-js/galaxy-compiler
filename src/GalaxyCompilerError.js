import { highlight } from './codeframe.js'

export default class GalaxyCompilerError extends Error {
  name = 'GalaxyCompilerError'

  constructor (message, location = null) {
    super(message)

    this.location = location
  }
}

/**
 * Build an error message with a codeframe in it
 *
 * @param {string} message
 * @param {string} code
 * @param {number} index
 *
 * @return {GalaxyCompilerError}
 */
export function buildError (message, code, index) {
  return new GalaxyCompilerError(`\n\n${message.replace(/^[a-z]/, l => l.toUpperCase())}:\n\n\t${highlight(code, index).replace(/\n/, '\n\t')}\n`, index)
}
