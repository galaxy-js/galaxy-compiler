import analyzer, { State } from 'expression-analyzer'

import tokens from './tokens.js'
import { getFilterExpression } from './filter.js'

import GalaxyCompilerError, { buildError } from '../GalaxyCompilerError.js'

const SKIP_OPEN_TEMPLATE = 2

/**
 * Get an inlined JavaScript expression
 *
 * @param {string} template - String with interpolation tags
 * @param {string} pragma
 *
 * @return {string}
 */
export function getTemplateExpression (template, pragma) {
  let expressions = []
  let prevTemplateEnd = 0

  function tryPushContext (context) {
    if (context) {
      expressions.push(`\`${context}\``)
    }
  }

  analyzer.expression(template, state => {
    if (state.is(tokens.OPEN_TEMPLATE) && state.is(tokens.OPEN_TEMPLATE, -1)) {
      let depth = 1

      const templateStart = state.advance().cursor

      analyzer.expression(state, templateState => {
        if (templateState.is(tokens.OPEN_TEMPLATE)) {
          depth++
        } else if (templateState.is(tokens.CLOSE_TEMPLATE) && !--depth) {
          if (!templateState.is(tokens.CLOSE_TEMPLATE, 1)) {
            throw buildError('expecting closing template tag', template, templateState.cursor + 1)
          }

          tryPushContext(template.slice(prevTemplateEnd, templateStart - SKIP_OPEN_TEMPLATE))

          const expression = template.slice(templateStart, templateState.cursor).trim()

          if (!expression) {
            throw buildError('missing template expression', template, templateState.cursor - 1)
          }

          try {
            expressions.push(`${pragma}(${getFilterExpression(expression)})`)
          } catch (error) {
            throw new GalaxyCompilerError(`\n\nError in template expression...\n${error.message.trimStart()}`, error.location)
          }

          templateState.advance(2)

          prevTemplateEnd = templateState.cursor
          return analyzer.STOP
        }
      })
    }
  })

  tryPushContext(template.slice(prevTemplateEnd))

  return expressions.join(' + ')
}
