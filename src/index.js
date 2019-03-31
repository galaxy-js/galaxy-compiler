import { rewriteMethods } from './rewrite/method.js'
import { getTemplateExpression } from './rewrite/template.js'
import { getFilterExpression } from './rewrite/filter.js'

const defaultPragma = {
  template: '__$n',
  filter: '$filter',
  method: '$commit'
}

const genUUID = (() => {
  let uuid = 0

  return () => Math.random().toString(16).slice(2) + uuid++
})()

export default class Compiler {
  constructor ({ scope, pragma }) {

    /**
     * @type {string}
     * @private
     */
    this._id = genUUID()

    /**
     * Cache for evaluators
     *
     * @type {Map<string, Function>}
     * @private
     */
    this._evaluators = new Map()

    /**
     * @type {GalaxyElement}
     */
    this.scope = scope

    /**
     * @type {Object.<string>}
     */
    this.pragma = Object.assign({}, defaultPragma, pragma)
  }

  /**
   * Compile a given template expression
   *
   * A template expression looks like this: 'Hello, {{ firstName }} {{ lastName }}'
   *
   * @param {string} template
   *
   * @return {Function}
   */
  compileTemplate (template) {
    return this.compileGetter(getTemplateExpression(template, this.pragma.template, this.pragma.filter))
  }

  /**
   * Compile a given expression
   *
   * @param {string} expression
   *
   * @return {Function}
   */
  compileExpression (expression) {
    return this.compileGetter(getFilterExpression(expression, this.pragma.filter))
  }

  /**
   * Compile a given event expression
   *
   * @param {string} expression
   *
   * @return {Function}
   */
  compileEvent (expression) {
    return this.compileEvaluator(rewriteMethods(expression, this.pragma.method))
  }

  /**
   * Compile an scoped setter with given `expression`
   *
   * @param {string} expression - JavaScript expression
   *
   * @return {Function}
   */
  compileSetter (expression) {
    return this.compileEvaluator(`(${expression} = __args_${this._id}__[0])`)
  }

  /**
   * Compile an scoped getter with given `expression`
   *
   * @param {string} expression - JavaScript expression
   *
   * @return {Function}
   */
  compileGetter (expression) {
    return this.compileEvaluator(`return ${expression}`)
  }

  /**
   * Compile a scoped evaluator function
   *
   * @param {string} body - Function body
   *
   * @return {Function}
   */
  compileEvaluator (body) {
    let evaluator = this._evaluators.get(body)

    if (!evaluator) {
      evaluator = new Function(
        `__locals_${this._id}__`, `...__args_${this._id}__`,
        'with (this) {' +
          'with (state) {' +
            `with (__locals_${this._id}__) {` +
              body +
            '}' +
          '}' +
        '}'
      )

      // Cache evaluator with body as key
      this._evaluators.set(body, evaluator)
    }

    return (locals = {}, ...args) => evaluator.call(this.scope, locals, ...args)
  }
}
