import analyzer, { State } from 'expression-analyzer'

import { buildError } from '../GalaxyCompilerError.js'

import tokens from './tokens.js'
import { getFnDefinition } from './get-fn-definition.js'

// Skips `|` and `>` tokens
const SKIP_FILTER_TOKEN = 2

/**
 * Get filter expression
 *
 * @param {string} expression
 *
 * @return {string}
 */
export function getFilterExpression (expression, pragma) {
  let start = 0
  const parts = []

  analyzer.expression(expression, state => {
    if (state.is(tokens.GT) && state.is(tokens.PIPE, -1)) {
      parts.push({
        start, // Save start index just for error debugging
        expression: expression.slice(start, (start = state.cursor + 1) - SKIP_FILTER_TOKEN)
      })
    }
  })

  // Push last expression
  parts.push({ start, expression: expression.slice(start) })

  return parts.slice(1).reduce((filtered, { start, expression: _expression }) => {
    const filter = _expression.trim()

    if (!filter) {
      throw buildError('missing filter expression', expression, start)
    }

    let name, args

    try {
      ({ name, args } = getFnDefinition('filter', new State(filter)))
    } catch (error) {

      // TODO: Check for a galaxy compiler error
      // A little hacky code to catch correct error location and message
      throw buildError(error.message.split(':', 1)[0].trimStart(), expression,  error.location + start + 1)
    }

    return `${pragma}('${name || filter}', ${filtered}${args ? `, ${args}` : ''})`
  }, parts[0].expression.trim())
}
