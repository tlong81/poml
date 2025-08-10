[**POML TypeScript API**](../../README.md)

***

[POML TypeScript API](../../README.md) / [presentation](../README.md) / Markup

# Markup

## Interfaces

### CodeProps

Defined in: [packages/poml/presentation.tsx:314](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L314)

#### Properties

##### lang?

> `optional` **lang**: `string`

Defined in: [packages/poml/presentation.tsx:315](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L315)

***

### ListProps

Defined in: [packages/poml/presentation.tsx:329](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L329)

#### Properties

##### listStyle?

> `optional` **listStyle**: `"decimal"` \| `"star"` \| `"dash"` \| `"plus"` \| `"latin"`

Defined in: [packages/poml/presentation.tsx:330](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L330)

***

### NewlineProps

Defined in: [packages/poml/presentation.tsx:217](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L217)

#### Properties

##### newlineCount?

> `optional` **newlineCount**: `number`

Defined in: [packages/poml/presentation.tsx:218](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L218)

***

### ParagraphProps

Defined in: [packages/poml/presentation.tsx:186](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L186)

#### Properties

##### blankLine?

> `optional` **blankLine**: `boolean`

Defined in: [packages/poml/presentation.tsx:187](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L187)

## Variables

### Bold()

> `const` **Bold**: (`props`) => `Element`

Defined in: [packages/poml/presentation.tsx:266](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L266)

#### Parameters

##### props

`PropsWithChildren`\<[`PropsMarkupBase`](../README.md#propsmarkupbase)\>

#### Returns

`Element`

***

### Code()

> `const` **Code**: (`props`) => `Element`

Defined in: [packages/poml/presentation.tsx:318](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L318)

#### Parameters

##### props

`PropsWithChildren`\<[`PropsMarkupBase`](../README.md#propsmarkupbase) & [`InlineProps`](../README.md#inlineprops) & [`CodeProps`](#codeprops)\>

#### Returns

`Element`

***

### EncloseSerialize()

> `const` **EncloseSerialize**: (`props`) => `Element`

Defined in: [packages/poml/presentation.tsx:160](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L160)

#### Parameters

##### props

`PropsWithChildren`\<[`InlineProps`](../README.md#inlineprops) & [`CodeProps`](#codeprops)\>

#### Returns

`Element`

***

### Environment()

> `const` **Environment**: (`props`) => `Element`

Defined in: [packages/poml/presentation.tsx:114](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L114)

Encloses a markup component.
It could produce nothing if it's not necessary to wrap the component.

#### Parameters

##### props

`PropsWithChildren`\<[`PropsMarkupBase`](../README.md#propsmarkupbase)\>

#### Returns

`Element`

***

### Header()

> `const` **Header**: (`props`) => `Element`

Defined in: [packages/poml/presentation.tsx:231](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L231)

#### Parameters

##### props

`PropsWithChildren`\<[`PropsMarkupBase`](../README.md#propsmarkupbase) & [`ParagraphProps`](#paragraphprops)\>

#### Returns

`Element`

***

### Inline()

> `const` **Inline**: (`props`) => `Element`

Defined in: [packages/poml/presentation.tsx:205](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L205)

#### Parameters

##### props

`PropsWithChildren`\<[`PropsMarkupBase`](../README.md#propsmarkupbase)\>

#### Returns

`Element`

***

### Italic()

> `const` **Italic**: (`props`) => `Element`

Defined in: [packages/poml/presentation.tsx:278](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L278)

#### Parameters

##### props

`PropsWithChildren`\<[`PropsMarkupBase`](../README.md#propsmarkupbase)\>

#### Returns

`Element`

***

### List()

> `const` **List**: (`props`) => `Element`

Defined in: [packages/poml/presentation.tsx:336](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L336)

#### Parameters

##### props

`PropsWithChildren`\<[`PropsMarkupBase`](../README.md#propsmarkupbase) & [`ListProps`](#listprops) & [`ParagraphProps`](#paragraphprops)\>

#### Returns

`Element`

***

### ListContext

> `const` **ListContext**: `Context`\<`undefined` \| [`ListProps`](#listprops)\>

Defined in: [packages/poml/presentation.tsx:333](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L333)

***

### ListItem()

> `const` **ListItem**: (`props`) => `DOMElement`\<\{\[`k`: `string`\]: `undefined` \| \{ \}; \}, `Element`\>

Defined in: [packages/poml/presentation.tsx:350](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L350)

#### Parameters

##### props

`PropsWithChildren`\<[`PropsMarkupBase`](../README.md#propsmarkupbase) & [`ParagraphProps`](#paragraphprops)\>

#### Returns

`DOMElement`\<\{\[`k`: `string`\]: `undefined` \| \{ \}; \}, `Element`\>

***

### ListItemIndexContext

> `const` **ListItemIndexContext**: `Context`\<`number`\>

Defined in: [packages/poml/presentation.tsx:334](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L334)

***

### Newline()

> `const` **Newline**: (`props`) => `Element`

Defined in: [packages/poml/presentation.tsx:221](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L221)

#### Parameters

##### props

[`PropsMarkupBase`](../README.md#propsmarkupbase) & [`NewlineProps`](#newlineprops)

#### Returns

`Element`

***

### Paragraph()

> `const` **Paragraph**: (`props`) => `Element`

Defined in: [packages/poml/presentation.tsx:193](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L193)

#### Parameters

##### props

`PropsWithChildren`\<[`PropsMarkupBase`](../README.md#propsmarkupbase) & [`ParagraphProps`](#paragraphprops)\>

#### Returns

`Element`

***

### Strikethrough()

> `const` **Strikethrough**: (`props`) => `Element`

Defined in: [packages/poml/presentation.tsx:290](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L290)

#### Parameters

##### props

`PropsWithChildren`\<[`PropsMarkupBase`](../README.md#propsmarkupbase)\>

#### Returns

`Element`

***

### SubContent()

> `const` **SubContent**: (`props`) => `Element`

Defined in: [packages/poml/presentation.tsx:252](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L252)

#### Parameters

##### props

`PropsWithChildren`\<[`PropsMarkupBase`](../README.md#propsmarkupbase) & [`ParagraphProps`](#paragraphprops)\>

#### Returns

`Element`

***

### TableBody()

> `const` **TableBody**: (`props`) => `Element`

Defined in: [packages/poml/presentation.tsx:379](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L379)

#### Parameters

##### props

`PropsWithChildren`\<[`PropsMarkupBase`](../README.md#propsmarkupbase)\>

#### Returns

`Element`

***

### TableCell()

> `const` **TableCell**: (`props`) => `Element`

Defined in: [packages/poml/presentation.tsx:401](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L401)

#### Parameters

##### props

`PropsWithChildren`\<[`PropsMarkupBase`](../README.md#propsmarkupbase)\>

#### Returns

`Element`

***

### TableContainer()

> `const` **TableContainer**: (`props`) => `Element`

Defined in: [packages/poml/presentation.tsx:357](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L357)

#### Parameters

##### props

`PropsWithChildren`\<[`PropsMarkupBase`](../README.md#propsmarkupbase) & [`ParagraphProps`](#paragraphprops)\>

#### Returns

`Element`

***

### TableHead()

> `const` **TableHead**: (`props`) => `Element`

Defined in: [packages/poml/presentation.tsx:368](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L368)

#### Parameters

##### props

`PropsWithChildren`\<[`PropsMarkupBase`](../README.md#propsmarkupbase)\>

#### Returns

`Element`

***

### TableRow()

> `const` **TableRow**: (`props`) => `Element`

Defined in: [packages/poml/presentation.tsx:390](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L390)

#### Parameters

##### props

`PropsWithChildren`\<[`PropsMarkupBase`](../README.md#propsmarkupbase)\>

#### Returns

`Element`

***

### Underline()

> `const` **Underline**: (`props`) => `Element`

Defined in: [packages/poml/presentation.tsx:302](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L302)

#### Parameters

##### props

`PropsWithChildren`\<[`PropsMarkupBase`](../README.md#propsmarkupbase)\>

#### Returns

`Element`
