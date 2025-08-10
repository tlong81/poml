[**POML TypeScript API**](../../README.md)

***

[POML TypeScript API](../../README.md) / [presentation](../README.md) / MultiMedia

# MultiMedia

## Interfaces

### AudioProps

Defined in: [packages/poml/presentation.tsx:625](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L625)

#### Properties

##### alt?

> `optional` **alt**: `string`

Defined in: [packages/poml/presentation.tsx:628](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L628)

##### base64?

> `optional` **base64**: `string`

Defined in: [packages/poml/presentation.tsx:627](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L627)

##### position?

> `optional` **position**: [`Position`](../README.md#position)

Defined in: [packages/poml/presentation.tsx:629](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L629)

##### type?

> `optional` **type**: `string`

Defined in: [packages/poml/presentation.tsx:626](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L626)

***

### ImageProps

Defined in: [packages/poml/presentation.tsx:618](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L618)

#### Properties

##### alt?

> `optional` **alt**: `string`

Defined in: [packages/poml/presentation.tsx:621](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L621)

##### base64?

> `optional` **base64**: `string`

Defined in: [packages/poml/presentation.tsx:620](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L620)

##### position?

> `optional` **position**: [`Position`](../README.md#position)

Defined in: [packages/poml/presentation.tsx:622](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L622)

##### type?

> `optional` **type**: `string`

Defined in: [packages/poml/presentation.tsx:619](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L619)

## Variables

### Audio()

> `const` **Audio**: (`props`) => `Element`

Defined in: [packages/poml/presentation.tsx:673](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L673)

#### Parameters

##### props

[`PropsMultiMediaBase`](../README.md#propsmultimediabase) & [`AudioProps`](#audioprops)

#### Returns

`Element`

***

### Environment()

> `const` **Environment**: (`props`) => `Element`

Defined in: [packages/poml/presentation.tsx:632](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L632)

#### Parameters

##### props

`PropsWithChildren`\<[`PropsMultiMediaBase`](../README.md#propsmultimediabase)\>

#### Returns

`Element`

***

### Image()

> `const` **Image**: (`props`) => `Element`

Defined in: [packages/poml/presentation.tsx:666](https://github.com/microsoft/poml/blob/70617ef8debc344683f4f4ab8fa892bc4b48fc47/packages/poml/presentation.tsx#L666)

#### Parameters

##### props

[`PropsMultiMediaBase`](../README.md#propsmultimediabase) & [`ImageProps`](#imageprops)

#### Returns

`Element`
