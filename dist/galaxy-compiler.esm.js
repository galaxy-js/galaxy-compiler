var tokens = {
  DOLLAR_SIGN: '$',
  OPEN_BRACE: '{',
  CLOSE_BRACE: '}',
  DOUBLE_QUOTE: '"',
  SINGLE_QUOTE: '\'',
  BACKTICK: '`',
  BACKSLASH: '\\',
  WHITESPACE: ' ',
  TAB: '\t',
  LINE_FEED: '\n',
  CAR_RETURN: '\r'
};

const modes = {

  /**
   * @type {number}
   */
  EXPRESSION_MODE: 0,

  /**
   * @type {number}
   */
  TEMPLATE_MODE: 1,

  /**
   * @type {number}
   */
  STRING_MODE: 2
};

class State {

  /**
   * Current input index
   *
   * @type {number}
   */
  cursor = 0

  /**
   * Current state mode
   *
   * @type {string}
   */
  mode = modes.EXPRESSION_MODE

  /**
   * Check for escaping chars
   *
   * @type {boolean}
   */
  escaping = false

  constructor (input) {

    /**
     * Input code
     *
     * @type {string}
     */
    this.input = input;
  }

  /**
   * True if
   *
   * @type {boolean}
   */
  get end () {
    return this.cursor >= this.input.length
  }

  /**
   * Previous char
   *
   * @type {string}
   */
  get previous () {
    return this.get(this.cursor - 1)
  }

  /**
   * Current char
   *
   * @type {string}
   */
  get current () {
    return this.get(this.cursor)
  }

  /**
   * Next char
   *
   * @type {string}
   */
  get next () {
    return this.get(this.cursor + 1)
  }

  /**
   * True if current state mode is `template`
   *
   * @type {boolean}
   */
  get inTemplate () {
    return this.mode === modes.TEMPLATE_MODE
  }

  /**
   * True if current state mode is `string`
   *
   * @type {boolean}
   */
  get inString () {
    return this.mode === modes.STRING_MODE
  }

  /**
   * True if current state mode is `expression`
   *
   * @type {boolean}
   */
  get inExpression () {
    return this.mode === modes.EXPRESSION_MODE
  }

  /**
   * Check if a given `char` is the current char state
   *
   * @param {string} char
   * @param {number} offset
   *
   * @return {boolean}
   */
  is (char, offset = 0) {
    return this.get(this.cursor + offset) === char
  }

  /**
   * Get a `char` at specific `index`
   *
   * @param {number} index
   *
   * @return {number}
   */
  get (index) {
    return this.input[index]
  }

  /**
   * Back `cursor` by given `steps`
   *
   * @param {number} steps
   *
   * @return {State}
   */
  back (steps = 1) {
    this.cursor -= steps;

    return this
  }

  /**
   * Advance `cursor` by given `steps`
   *
   * @param {number} steps
   *
   * @return {State}
   */
  advance (steps = 1) {
    this.cursor += steps;

    return this
  }
}

const privateState = new WeakMap();

/**
 * Especial tokens to ignore
 *
 * @type {Array<string>}
 */
const IGNORED_TOKENS = [
  tokens.LINE_FEED,
  tokens.CAR_RETURN,
  tokens.WHITESPACE,
  tokens.TAB
];

const defaultHandlers = {

  /**
   * Intercept expression chars
   *
   * @param {State}
   *
   * @return {analyze.STOP=}
   */
  expression (state) {},

  /**
   * Intercept string chars
   *
   * @param {State}
   *
   * @return {analyze.STOP=}
   */
  string (state) {}
};

/**
 * Intercept expression chars to rewrite/process a given input
 *
 * @param {string|State} inputOrState
 * @param {Object|Function} handlerOrHandlers
 *
 * @return {State}
 */
function analyze (inputOrState, handlerOrHandlers) {
  const handlers = {};

  if (typeof handlerOrHandlers === 'function') {
    handlers.expression = handlers.string = handlerOrHandlers;
  } else {
    Object.assign(handlers, defaultHandlers, handlerOrHandlers);
  }

  const state = typeof inputOrState === 'string' ? new State(inputOrState) : inputOrState;
  const _state = getPrivateState(state);

  while (!state.end) {
    switch (state.current) {
      case tokens.DOLLAR_SIGN:
        if (state.is(tokens.OPEN_BRACE, 1) && state.inTemplate && !state.escaping) {
          state.mode = modes.EXPRESSION_MODE;
          _state.templateStack.push(_state.braceDepth++);

          // Skip `${`
          state.advance(2);
        }
        break

      case tokens.OPEN_BRACE:
        state.inExpression && _state.braceDepth++;
        break

      case tokens.CLOSE_BRACE:
        if (state.inExpression && --_state.braceDepth === _state.templateStack[_state.templateStack.length - 1]) {
          state.mode = modes.TEMPLATE_MODE;
          _state.templateStack.pop();

          // Skip `}`
          state.advance();
        }
        break

      case tokens.BACKTICK: case tokens.SINGLE_QUOTE: case tokens.DOUBLE_QUOTE:
        if (state.inExpression) {
          state.mode = state.is(tokens.BACKTICK) ? modes.TEMPLATE_MODE : modes.STRING_MODE;
          _state.stringOpen = state.current;

          // Skip opening string quote
          state.advance();
        } else if (state.is(_state.stringOpen) && !state.escaping) {
          state.mode = modes.EXPRESSION_MODE;
          _state.stringOpen = null;

          // Skip current closing string quote
          state.advance();
        }
        break
    }

    // Avoid call handlers if finished
    if (state.end) break

    let result;

    if (state.inExpression) {

      // Ignore some special chars on expression
      if (IGNORED_TOKENS.some(token => state.is(token))) {
        state.advance();
        continue
      }

      result = handlers.expression(state);

    // Skip escape char
    } else if (!state.is(tokens.BACKSLASH) || state.escaping) {
      result = handlers.string(state);
    }

    // Current analyzing can be stopped from handlers
    if (result === analyze.STOP) break

    // Detect correct escaping
    state.escaping = state.mode !== modes.EXPRESSION_MODE && state.is(tokens.BACKSLASH) && !state.escaping;

    state.advance();
  }

  return state
}

/**
 * Signal to stop analyze
 *
 * @type {number}
 */
analyze.STOP = 5709; // S(5) T(7) O(0) P(9)

/**
 * Analyze string chars from a given `inputOrState`
 *
 * @param {string|State} inputOrState
 * @param {Function} handler
 *
 * @return {State}
 */
analyze.expression = function analyzeExpression (inputOrState, handler) {
  return analyze(inputOrState, { expression: handler })
};

/**
 * Analyze expression chars from a given `inputOrState`
 *
 * @param {string|State} inputOrState
 * @param {Function} handler
 *
 * @return {State}
 */
analyze.string = function analyzeString (inputOrState, handler) {
  return analyze(inputOrState, { string: handler })
};

/**
 * Get private state from a given `state`
 *
 * @param {State} state
 *
 * @return {Object}
 * @private
 */
function getPrivateState (state) {
  let _state = privateState.get(state);

  if (!_state) {
    privateState.set(state, _state = {

      /**
       * @type {number}
       */
      braceDepth: 0,

      /**
       * @type {Array<number>}
       */
      templateStack: [],

      /**
       * @type {string}
       */
      stringOpen: null
    });
  }

  return _state
}

var tokens$1 = {

  /**
   * Tokens for filters
   */
  GT: '>',
  PIPE: '|',

  /**
   * Token for stateful methods
   */
  STATEFUL_TOKEN: '#',

  /**
   * Tokens for templates
   */
  OPEN_TEMPLATE: '{',
  CLOSE_TEMPLATE: '}',

  /**
   * Shared tokens
   */
  START_ARGS: '(',
  END_ARGS: ')'
};

/**
 * Matches line feed
 *
 * @type {RegExp}
 */
const LINE_FEED_REGEX = /\r?\n/g;

/**
 * Default highlight padding
 *
 * @type {number}
 */
const DEFAULT_PADDING = 25;

/**
 * Simple codeframe implementation
 *
 * @param {string} code
 * @param {number} index
 * @param {number=} padding
 *
 * @return {string}
 */
function highlight (code, index, padding = DEFAULT_PADDING) {
  const leftPadding = Math.max(0, index - padding);

  let lineFeedPadding = 0;
  let part = code.slice(leftPadding, index + padding);

  part = part.replace(LINE_FEED_REGEX, () => {
    lineFeedPadding++;
    return '\\n'
  });

  return part + '\n' + ' '.repeat(lineFeedPadding + index - leftPadding) + '^'
}

class GalaxyCompilerError extends Error {
  name = 'GalaxyCompilerError'

  constructor (message, location = null) {
    super(message);

    this.location = location;
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
function buildError (message, code, index) {
  return new GalaxyCompilerError(`\n\n${message.replace(/^[a-z]/, l => l.toUpperCase())}:\n\n\t${highlight(code, index).replace(/\n/, '\n\t')}\n`, index)
}

/**
 * Matches correct identifier name
 *
 * @type {RegExp}
 */
const METHOD_NAME_REGEX = /[$\w]/;

/**
 * @type {RegExp}
 */
const INVALID_START_METHOD_NAME = /\$|\d/;

/**
 * Get function definition from a given `parentState`
 *
 * @param {string} type
 * @param {State} parentState
 *
 * @return {Object}
 */
function getFnDefinition (type, parentState) {
  const definition = {};
  const expression = parentState.input;
  const methodStart = parentState.cursor;

  if (INVALID_START_METHOD_NAME.test(parentState.current)) {
    throw buildError(`invalid ${type} start char name`, expression, methodStart)
  }

  analyze.expression(parentState, nameState => {
    if (nameState.is(tokens$1.START_ARGS)) {
      let depth = 1;

      const argsStart = nameState.advance().cursor;
      const methodName = definition.name = expression.slice(methodStart, argsStart - 1);

      if (!methodName.length) {
        throw buildError(`${type} should have a name`, expression, methodStart)
      }

      analyze.expression(nameState, argsState => {
        if (argsState.is(tokens$1.START_ARGS)) {
          depth++;
        } else if (argsState.is(tokens$1.END_ARGS) && !--depth) {
          definition.args = expression.slice(argsStart, argsState.cursor);
          return analyze.STOP
        }
      });

      return analyze.STOP
    } else if (!METHOD_NAME_REGEX.test(nameState.current)) {
      throw buildError(`invalid char in ${type} name`, expression, nameState.cursor)
    }
  });

  return definition
}

function rewriteMethods (expression, pragma) {
  let rewritten = '';
  let prevMethodEnd = 0;

  analyze.expression(expression, methodState => {
    if (methodState.is(tokens$1.STATEFUL_TOKEN)) {
      const methodStart = methodState.advance().cursor;
      const { name, args } = getFnDefinition('stateful method', methodState);

      rewritten += expression.slice(prevMethodEnd, methodStart - 1) + `${pragma}('${name}'${args ? `, ${rewriteMethods(args)}` : ''})`;
      prevMethodEnd = methodState.cursor + 1;
    }
  });

  return rewritten + expression.slice(prevMethodEnd)
}

// Skips `|` and `>` tokens
const SKIP_FILTER_TOKEN = 2;

/**
 * Get filter expression
 *
 * @param {string} expression
 *
 * @return {string}
 */
function getFilterExpression (expression, pragma) {
  let start = 0;
  const parts = [];

  analyze.expression(expression, state => {
    if (state.is(tokens$1.GT) && state.is(tokens$1.PIPE, -1)) {
      parts.push({
        start, // Save start index just for error debugging
        expression: expression.slice(start, (start = state.cursor + 1) - SKIP_FILTER_TOKEN)
      });
    }
  });

  // Push last expression
  parts.push({ start, expression: expression.slice(start) });

  return parts.slice(1).reduce((filtered, { start, expression: _expression }) => {
    const filter = _expression.trim();

    if (!filter) {
      throw buildError('missing filter expression', expression, start)
    }

    let name, args;

    try {
      ({ name, args } = getFnDefinition('filter', new State(filter)));
    } catch (error) {

      // TODO: Check for a galaxy compiler error
      // A little hacky code to catch correct error location and message
      throw buildError(error.message.split(':', 1)[0].trimStart(), expression,  error.location + start + 1)
    }

    return `${pragma}('${name || filter}', ${filtered}${args ? `, ${args}` : ''})`
  }, parts[0].expression.trim())
}

const SKIP_OPEN_TEMPLATE = 2;

/**
 * Get an inlined JavaScript expression
 *
 * @param {string} template - String with interpolation tags
 * @param {string} pragma
 * @param {string} filterPragma
 *
 * @return {string}
 */
function getTemplateExpression (template, pragma, filterPragma) {
  let expressions = [];
  let prevTemplateEnd = 0;

  function tryPushContext (context) {
    if (context) {
      expressions.push(`\`${context}\``);
    }
  }

  analyze.expression(template, state => {
    if (state.is(tokens$1.OPEN_TEMPLATE) && state.is(tokens$1.OPEN_TEMPLATE, -1)) {
      let depth = 1;

      const templateStart = state.advance().cursor;

      analyze.expression(state, templateState => {
        if (templateState.is(tokens$1.OPEN_TEMPLATE)) {
          depth++;
        } else if (templateState.is(tokens$1.CLOSE_TEMPLATE) && !--depth) {
          if (!templateState.is(tokens$1.CLOSE_TEMPLATE, 1)) {
            throw buildError('expecting closing template tag', template, templateState.cursor + 1)
          }

          tryPushContext(template.slice(prevTemplateEnd, templateStart - SKIP_OPEN_TEMPLATE));

          const expression = template.slice(templateStart, templateState.cursor).trim();

          if (!expression) {
            throw buildError('missing template expression', template, templateState.cursor - 1)
          }

          try {
            expressions.push(`${pragma}(${getFilterExpression(expression, filterPragma)})`);
          } catch (error) {
            throw new GalaxyCompilerError(`\n\nError in template expression...\n${error.message.trimStart()}`, error.location)
          }

          templateState.advance(2);

          prevTemplateEnd = templateState.cursor;
          return analyze.STOP
        }
      });
    }
  });

  tryPushContext(template.slice(prevTemplateEnd));

  return expressions.join(' + ')
}

const defaultPragma = {
  template: '__$n',
  filter: '$filter',
  method: '$commit'
};

const genUUID = (() => {
  let uuid = 0;

  return () => Math.random().toString(16).slice(2) + uuid++
})();

class Compiler {
  constructor ({ scope, pragma }) {

    /**
     * @type {string}
     * @private
     */
    this._id = genUUID();

    /**
     * Cache for evaluators
     *
     * @type {Map<string, Function>}
     * @private
     */
    this._evaluators = new Map();

    /**
     * @type {GalaxyElement}
     */
    this.scope = scope;

    /**
     * @type {Object.<string>}
     */
    this.pragma = Object.assign({}, defaultPragma, pragma);
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
    let evaluator = this._evaluators.get(body);

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
      );

      // Cache evaluator with body as key
      this._evaluators.set(body, evaluator);
    }

    return (locals = {}, ...args) => evaluator.call(this.scope, locals, ...args)
  }
}

export default Compiler;
