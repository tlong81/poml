[**POML TypeScript API**](../README.md)

***

[POML TypeScript API](../README.md) / presentation

# presentation

## Namespaces

- [Free](namespaces/Free.md)
- [Markup](namespaces/Markup.md)
- [MultiMedia](namespaces/MultiMedia.md)
- [Serialize](namespaces/Serialize.md)

## Interfaces

### InlineProps

Defined in: [packages/poml/presentation.tsx:54](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L54)

#### Properties

##### inline?

> `optional` **inline**: `boolean`

Defined in: [packages/poml/presentation.tsx:55](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L55)

***

### PropsFreeBase

Defined in: [packages/poml/presentation.tsx:46](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L46)

Props base serves the following props subclass, as far as I can now think of:
1. Props for markup basic components
2. Props for serialization basic components
3. Props for essential general components
  3.1. Props for other high-level components

#### Extends

- [`PropsPresentationBase`](#propspresentationbase)

#### Properties

##### charLimit?

> `optional` **charLimit**: `number`

Defined in: [packages/poml/base.tsx:109](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L109)

Soft character limit before truncation is applied.

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`charLimit`](#charlimit-3)

##### className?

> `optional` **className**: `string`

Defined in: [packages/poml/base.tsx:94](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L94)

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`className`](#classname-3)

##### originalEndIndex?

> `optional` **originalEndIndex**: `number`

Defined in: [packages/poml/base.tsx:99](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L99)

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`originalEndIndex`](#originalendindex-3)

##### originalStartIndex?

> `optional` **originalStartIndex**: `number`

Defined in: [packages/poml/base.tsx:98](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L98)

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`originalStartIndex`](#originalstartindex-3)

##### presentation?

> `optional` **presentation**: `"free"`

Defined in: [packages/poml/presentation.tsx:47](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L47)

###### Overrides

[`PropsPresentationBase`](#propspresentationbase).[`presentation`](#presentation-3)

##### priority?

> `optional` **priority**: `number`

Defined in: [packages/poml/base.tsx:113](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L113)

Priority used when truncating globally. Lower numbers are dropped first.

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`priority`](#priority-3)

##### sourcePath?

> `optional` **sourcePath**: `string`

Defined in: [packages/poml/base.tsx:102](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L102)

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`sourcePath`](#sourcepath-3)

##### speaker?

> `optional` **speaker**: [`Speaker`](../base.md#speaker-3)

Defined in: [packages/poml/base.tsx:93](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L93)

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`speaker`](#speaker-3)

##### tokenLimit?

> `optional` **tokenLimit**: `number`

Defined in: [packages/poml/base.tsx:111](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L111)

Soft token limit before truncation is applied.

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`tokenLimit`](#tokenlimit-3)

##### whiteSpace?

> `optional` **whiteSpace**: `"trim"` \| `"filter"` \| `"pre"`

Defined in: [packages/poml/base.tsx:106](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L106)

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`whiteSpace`](#whitespace-3)

##### writerOptions?

> `optional` **writerOptions**: `object`

Defined in: [packages/poml/base.tsx:105](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L105)

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`writerOptions`](#writeroptions-3)

***

### PropsMarkupBase

Defined in: [packages/poml/presentation.tsx:36](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L36)

Props base serves the following props subclass, as far as I can now think of:
1. Props for markup basic components
2. Props for serialization basic components
3. Props for essential general components
  3.1. Props for other high-level components

#### Extends

- [`PropsPresentationBase`](#propspresentationbase)

#### Properties

##### charLimit?

> `optional` **charLimit**: `number`

Defined in: [packages/poml/base.tsx:109](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L109)

Soft character limit before truncation is applied.

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`charLimit`](#charlimit-3)

##### className?

> `optional` **className**: `string`

Defined in: [packages/poml/base.tsx:94](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L94)

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`className`](#classname-3)

##### markupLang?

> `optional` **markupLang**: `string`

Defined in: [packages/poml/presentation.tsx:38](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L38)

##### originalEndIndex?

> `optional` **originalEndIndex**: `number`

Defined in: [packages/poml/base.tsx:99](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L99)

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`originalEndIndex`](#originalendindex-3)

##### originalStartIndex?

> `optional` **originalStartIndex**: `number`

Defined in: [packages/poml/base.tsx:98](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L98)

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`originalStartIndex`](#originalstartindex-3)

##### presentation?

> `optional` **presentation**: `"markup"`

Defined in: [packages/poml/presentation.tsx:37](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L37)

###### Overrides

[`PropsPresentationBase`](#propspresentationbase).[`presentation`](#presentation-3)

##### priority?

> `optional` **priority**: `number`

Defined in: [packages/poml/base.tsx:113](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L113)

Priority used when truncating globally. Lower numbers are dropped first.

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`priority`](#priority-3)

##### sourcePath?

> `optional` **sourcePath**: `string`

Defined in: [packages/poml/base.tsx:102](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L102)

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`sourcePath`](#sourcepath-3)

##### speaker?

> `optional` **speaker**: [`Speaker`](../base.md#speaker-3)

Defined in: [packages/poml/base.tsx:93](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L93)

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`speaker`](#speaker-3)

##### tokenLimit?

> `optional` **tokenLimit**: `number`

Defined in: [packages/poml/base.tsx:111](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L111)

Soft token limit before truncation is applied.

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`tokenLimit`](#tokenlimit-3)

##### whiteSpace?

> `optional` **whiteSpace**: `"trim"` \| `"filter"` \| `"pre"`

Defined in: [packages/poml/base.tsx:106](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L106)

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`whiteSpace`](#whitespace-3)

##### writerOptions?

> `optional` **writerOptions**: `object`

Defined in: [packages/poml/base.tsx:105](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L105)

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`writerOptions`](#writeroptions-3)

***

### PropsMultiMediaBase

Defined in: [packages/poml/presentation.tsx:50](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L50)

Props base serves the following props subclass, as far as I can now think of:
1. Props for markup basic components
2. Props for serialization basic components
3. Props for essential general components
  3.1. Props for other high-level components

#### Extends

- [`PropsPresentationBase`](#propspresentationbase)

#### Properties

##### charLimit?

> `optional` **charLimit**: `number`

Defined in: [packages/poml/base.tsx:109](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L109)

Soft character limit before truncation is applied.

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`charLimit`](#charlimit-3)

##### className?

> `optional` **className**: `string`

Defined in: [packages/poml/base.tsx:94](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L94)

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`className`](#classname-3)

##### originalEndIndex?

> `optional` **originalEndIndex**: `number`

Defined in: [packages/poml/base.tsx:99](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L99)

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`originalEndIndex`](#originalendindex-3)

##### originalStartIndex?

> `optional` **originalStartIndex**: `number`

Defined in: [packages/poml/base.tsx:98](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L98)

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`originalStartIndex`](#originalstartindex-3)

##### presentation?

> `optional` **presentation**: `"multimedia"`

Defined in: [packages/poml/presentation.tsx:51](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L51)

###### Overrides

[`PropsPresentationBase`](#propspresentationbase).[`presentation`](#presentation-3)

##### priority?

> `optional` **priority**: `number`

Defined in: [packages/poml/base.tsx:113](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L113)

Priority used when truncating globally. Lower numbers are dropped first.

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`priority`](#priority-3)

##### sourcePath?

> `optional` **sourcePath**: `string`

Defined in: [packages/poml/base.tsx:102](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L102)

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`sourcePath`](#sourcepath-3)

##### speaker?

> `optional` **speaker**: [`Speaker`](../base.md#speaker-3)

Defined in: [packages/poml/base.tsx:93](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L93)

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`speaker`](#speaker-3)

##### tokenLimit?

> `optional` **tokenLimit**: `number`

Defined in: [packages/poml/base.tsx:111](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L111)

Soft token limit before truncation is applied.

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`tokenLimit`](#tokenlimit-3)

##### whiteSpace?

> `optional` **whiteSpace**: `"trim"` \| `"filter"` \| `"pre"`

Defined in: [packages/poml/base.tsx:106](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L106)

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`whiteSpace`](#whitespace-3)

##### writerOptions?

> `optional` **writerOptions**: `object`

Defined in: [packages/poml/base.tsx:105](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L105)

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`writerOptions`](#writeroptions-3)

***

### PropsPresentationBase

Defined in: [packages/poml/presentation.tsx:32](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L32)

Props base serves the following props subclass, as far as I can now think of:
1. Props for markup basic components
2. Props for serialization basic components
3. Props for essential general components
  3.1. Props for other high-level components

#### Extends

- [`PropsBase`](../base.md#propsbase)

#### Extended by

- [`PropsMarkupBase`](#propsmarkupbase)
- [`PropsSerializeBase`](#propsserializebase)
- [`PropsFreeBase`](#propsfreebase)
- [`PropsMultiMediaBase`](#propsmultimediabase)

#### Properties

##### charLimit?

> `optional` **charLimit**: `number`

Defined in: [packages/poml/base.tsx:109](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L109)

Soft character limit before truncation is applied.

###### Inherited from

[`PropsBase`](../base.md#propsbase).[`charLimit`](../base.md#charlimit)

##### className?

> `optional` **className**: `string`

Defined in: [packages/poml/base.tsx:94](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L94)

###### Inherited from

[`PropsBase`](../base.md#propsbase).[`className`](../base.md#classname)

##### originalEndIndex?

> `optional` **originalEndIndex**: `number`

Defined in: [packages/poml/base.tsx:99](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L99)

###### Inherited from

[`PropsBase`](../base.md#propsbase).[`originalEndIndex`](../base.md#originalendindex)

##### originalStartIndex?

> `optional` **originalStartIndex**: `number`

Defined in: [packages/poml/base.tsx:98](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L98)

###### Inherited from

[`PropsBase`](../base.md#propsbase).[`originalStartIndex`](../base.md#originalstartindex)

##### presentation?

> `optional` **presentation**: [`Presentation`](#presentation-5)

Defined in: [packages/poml/presentation.tsx:33](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L33)

##### priority?

> `optional` **priority**: `number`

Defined in: [packages/poml/base.tsx:113](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L113)

Priority used when truncating globally. Lower numbers are dropped first.

###### Inherited from

[`PropsBase`](../base.md#propsbase).[`priority`](../base.md#priority)

##### sourcePath?

> `optional` **sourcePath**: `string`

Defined in: [packages/poml/base.tsx:102](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L102)

###### Inherited from

[`PropsBase`](../base.md#propsbase).[`sourcePath`](../base.md#sourcepath-2)

##### speaker?

> `optional` **speaker**: [`Speaker`](../base.md#speaker-3)

Defined in: [packages/poml/base.tsx:93](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L93)

###### Inherited from

[`PropsBase`](../base.md#propsbase).[`speaker`](../base.md#speaker-1)

##### tokenLimit?

> `optional` **tokenLimit**: `number`

Defined in: [packages/poml/base.tsx:111](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L111)

Soft token limit before truncation is applied.

###### Inherited from

[`PropsBase`](../base.md#propsbase).[`tokenLimit`](../base.md#tokenlimit)

##### whiteSpace?

> `optional` **whiteSpace**: `"trim"` \| `"filter"` \| `"pre"`

Defined in: [packages/poml/base.tsx:106](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L106)

###### Inherited from

[`PropsBase`](../base.md#propsbase).[`whiteSpace`](../base.md#whitespace)

##### writerOptions?

> `optional` **writerOptions**: `object`

Defined in: [packages/poml/base.tsx:105](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L105)

###### Inherited from

[`PropsBase`](../base.md#propsbase).[`writerOptions`](../base.md#writeroptions)

***

### PropsSerializeBase

Defined in: [packages/poml/presentation.tsx:41](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L41)

Props base serves the following props subclass, as far as I can now think of:
1. Props for markup basic components
2. Props for serialization basic components
3. Props for essential general components
  3.1. Props for other high-level components

#### Extends

- [`PropsPresentationBase`](#propspresentationbase)

#### Properties

##### charLimit?

> `optional` **charLimit**: `number`

Defined in: [packages/poml/base.tsx:109](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L109)

Soft character limit before truncation is applied.

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`charLimit`](#charlimit-3)

##### className?

> `optional` **className**: `string`

Defined in: [packages/poml/base.tsx:94](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L94)

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`className`](#classname-3)

##### originalEndIndex?

> `optional` **originalEndIndex**: `number`

Defined in: [packages/poml/base.tsx:99](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L99)

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`originalEndIndex`](#originalendindex-3)

##### originalStartIndex?

> `optional` **originalStartIndex**: `number`

Defined in: [packages/poml/base.tsx:98](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L98)

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`originalStartIndex`](#originalstartindex-3)

##### presentation?

> `optional` **presentation**: `"serialize"`

Defined in: [packages/poml/presentation.tsx:42](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L42)

###### Overrides

[`PropsPresentationBase`](#propspresentationbase).[`presentation`](#presentation-3)

##### priority?

> `optional` **priority**: `number`

Defined in: [packages/poml/base.tsx:113](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L113)

Priority used when truncating globally. Lower numbers are dropped first.

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`priority`](#priority-3)

##### serializer?

> `optional` **serializer**: `string`

Defined in: [packages/poml/presentation.tsx:43](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L43)

##### sourcePath?

> `optional` **sourcePath**: `string`

Defined in: [packages/poml/base.tsx:102](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L102)

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`sourcePath`](#sourcepath-3)

##### speaker?

> `optional` **speaker**: [`Speaker`](../base.md#speaker-3)

Defined in: [packages/poml/base.tsx:93](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L93)

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`speaker`](#speaker-3)

##### tokenLimit?

> `optional` **tokenLimit**: `number`

Defined in: [packages/poml/base.tsx:111](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L111)

Soft token limit before truncation is applied.

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`tokenLimit`](#tokenlimit-3)

##### whiteSpace?

> `optional` **whiteSpace**: `"trim"` \| `"filter"` \| `"pre"`

Defined in: [packages/poml/base.tsx:106](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L106)

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`whiteSpace`](#whitespace-3)

##### writerOptions?

> `optional` **writerOptions**: `object`

Defined in: [packages/poml/base.tsx:105](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/base.tsx#L105)

###### Inherited from

[`PropsPresentationBase`](#propspresentationbase).[`writerOptions`](#writeroptions-3)

## Type Aliases

### Position

> **Position** = `"top"` \| `"bottom"` \| `"here"`

Defined in: [packages/poml/presentation.tsx:30](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L30)

***

### Presentation

> **Presentation** = `"markup"` \| `"serialize"` \| `"free"` \| `"multimedia"`

Defined in: [packages/poml/presentation.tsx:27](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L27)

## Variables

### DefaultMarkupLang

> `const` **DefaultMarkupLang**: `"markdown"` = `'markdown'`

Defined in: [packages/poml/presentation.tsx:28](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L28)

***

### DefaultSerializer

> `const` **DefaultSerializer**: `"json"` = `'json'`

Defined in: [packages/poml/presentation.tsx:29](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L29)

## Functions

### computePresentation()

> **computePresentation**(`props`): [`Presentation`](#presentation-5)

Defined in: [packages/poml/presentation.tsx:69](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L69)

Get the current presentation approach.
Used by components to determine how to render themselves.

#### Parameters

##### props

[`PropsPresentationBase`](#propspresentationbase) | [`PropsMarkupBase`](#propsmarkupbase) | [`PropsSerializeBase`](#propsserializebase) | [`PropsFreeBase`](#propsfreebase) | [`PropsMultiMediaBase`](#propsmultimediabase)

#### Returns

[`Presentation`](#presentation-5)

***

### computePresentationOrUndefined()

> **computePresentationOrUndefined**(`props`): `undefined` \| [`Presentation`](#presentation-5)

Defined in: [packages/poml/presentation.tsx:87](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L87)

#### Parameters

##### props

[`PropsPresentationBase`](#propspresentationbase) | [`PropsMarkupBase`](#propsmarkupbase) | [`PropsSerializeBase`](#propsserializebase) | [`PropsFreeBase`](#propsfreebase) | [`PropsMultiMediaBase`](#propsmultimediabase)

#### Returns

`undefined` \| [`Presentation`](#presentation-5)
