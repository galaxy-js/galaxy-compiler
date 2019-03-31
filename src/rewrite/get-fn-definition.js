import analyzer from 'expression-analyzer'

import tokens from './tokens.js'

import { buildError } from '../GalaxyCompilerError.js'

/**
 * Matches correct identifier name
 *
 * @type {RegExp}
 */
const METHOD_NAME_REGEX = /[$\w]/

/**
 * @type {RegExp}
 */
const INVALID_START_METHOD_NAME = /\$|\d/

/**
 * Get function definition from a given `parentState`
 *
 * @param {string} type
 * @param {State} parentState
 *
 * @return {Object}
 */
export function getFnDefinition (type, parentState) {
  const definition = {}
  const expression = parentState.input
  const methodStart = parentState.cursor

  if (INVALID_START_METHOD_NAME.test(parentState.current)) {
    throw buildError(`invalid ${type} start char name`, expression, methodStart)
  }

  analyzer.expression(parentState, nameState => {
    if (nameState.is(tokens.START_ARGS)) {
      let depth = 1

      const argsStart = nameState.advance().cursor
      const methodName = definition.name = expression.slice(methodStart, argsStart - 1)

      if (!methodName.length) {
        throw buildError(`${type} should have a name`, expression, methodStart)
      }

      analyzer.expression(nameState, argsState => {
        if (argsState.is(tokens.START_ARGS)) {
          depth++
        } else if (argsState.is(tokens.END_ARGS) && !--depth) {
          definition.args = expression.slice(argsStart, argsState.cursor)
          return analyzer.STOP
        }
      })

      return analyzer.STOP
    } else if (!METHOD_NAME_REGEX.test(nameState.current)) {
      throw buildError(`invalid char in ${type} name`, expression, nameState.cursor)
    }
  })

  return definition
}
