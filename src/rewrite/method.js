import analyzer from 'expression-analyzer'

import tokens from './tokens.js'
import { getFnDefinition } from './get-fn-definition.js'

export function rewriteMethods (expression, pragma) {
  let rewritten = ''
  let prevMethodEnd = 0

  analyzer.expression(expression, methodState => {
    if (methodState.is(tokens.STATEFUL_TOKEN)) {
      const methodStart = methodState.advance().cursor
      const { name, args } = getFnDefinition('stateful method', methodState)

      rewritten += expression.slice(prevMethodEnd, methodStart - 1) + `${pragma}('${name}'${args ? `, ${rewriteMethods(args)}` : ''})`
      prevMethodEnd = methodState.cursor + 1
    }
  })

  return rewritten + expression.slice(prevMethodEnd)
}
