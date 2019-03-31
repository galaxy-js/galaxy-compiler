# Galaxy compiler

  Compiler for GalaxyJS expressions

## Usage

```js
class TestElement extends GalaxyElement {
  name = 'Camilo'
}

const compiler = new Compiler({
  scope: new TestElement(),
})

const templateFn = compiler.compileTemplate('Hello, {{ name }}')

templateFn() // -> Hello, Camilo

// Overwriting default vars
templateFn({ name: 'Andrés' }) // -> Hello, Andrés
```

## API Documentation

### Main methods

#### compiler.compileTemplate(template)

*TODO*

#### compiler.compileExpression(expression)

*TODO*

#### compiler.compileEvent(expression)

*TODO*

### Sub methods

#### compiler.compileSetter(expression, value)

*TODO*

#### compiler.compileGetter(expression)

*TODO*

#### compiler.compileEvaluator(expression)

*TODO*
