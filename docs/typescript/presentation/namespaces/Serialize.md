[**POML TypeScript API**](../../README.md)

***

[POML TypeScript API](../../README.md) / [presentation](../README.md) / Serialize

# Serialize

## Interfaces

### AnyProps

Defined in: [packages/poml/presentation.tsx:488](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L488)

#### Properties

##### name?

> `optional` **name**: `string`

Defined in: [packages/poml/presentation.tsx:489](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L489)

##### type?

> `optional` **type**: `AnyValue`

Defined in: [packages/poml/presentation.tsx:490](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L490)

***

### ObjectProps

Defined in: [packages/poml/presentation.tsx:531](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L531)

#### Properties

##### data

> **data**: `any`

Defined in: [packages/poml/presentation.tsx:532](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L532)

## Variables

### Any()

> `const` **Any**: (`props`) => `Element`

Defined in: [packages/poml/presentation.tsx:503](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L503)

Value is a single value or (usually) a pair of key and value. The behavior is as follows:
1. If the inner children are one single text element, it renders as a single value with the specified type.
2. Otherwise, it can be either a list or an object depending on its children.

Detailed implementation might differ between different writers, but generally:
1. When the children contain all named values and type is not array, it presents as an object.
2. When the children contain unnamed values, it presents as a list.
3. When the children contain multiple elements including text elements, they are concatenated into a list.

#### Parameters

##### props

`PropsWithChildren`\<[`AnyProps`](#anyprops) & [`PropsSerializeBase`](../README.md#propsserializebase)\>

#### Returns

`Element`

***

### Environment()

> `const` **Environment**: (`props`) => `Element`

Defined in: [packages/poml/presentation.tsx:423](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L423)

Encloses a serialize component.
It becomes transparent when already in a serialized environment.

When environment exists, the writer does things to render the environment.
How environment handles its child elements is very similar to the Any component,
except when the environment only contains a single element, in which case it will be directly returned
if it's unnamed.

#### Parameters

##### props

`PropsWithChildren`\<[`PropsSerializeBase`](../README.md#propsserializebase)\>

#### Returns

`Element`

***

### Object()

> `const` **Object**: (`props`) => `Element`

Defined in: [packages/poml/presentation.tsx:536](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L536)

#### Parameters

##### props

`PropsWithChildren`\<[`ObjectProps`](#objectprops) & [`PropsSerializeBase`](../README.md#propsserializebase)\>

#### Returns

`Element`
