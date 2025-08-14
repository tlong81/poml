# Meta

The `<meta>` element provides metadata and configuration for POML documents. It allows you to specify version requirements, disable/enable components, define response schemas, register tools, and set runtime parameters.

## Basic Usage

Meta elements are typically placed at the beginning of a POML document and don't produce any visible output. One POML file can have multiple `<meta>` elements at any position, but they should be used carefully to avoid conflicts.

```xml
<poml>
  <meta minVersion="1.0.0" />
  <p>Your content here</p>
</poml>
```

### Meta Element Types

Meta elements fall into two categories based on whether they include a `type` attribute:

**Without type attribute** - Used for general document configuration:
- Version control (`minVersion`, `maxVersion`)
- Component management (`components`)

**With type attribute** - Used for specific functionalities:
- `type="responseSchema"` - Defines structured output format for AI responses
- `type="tool"` - Registers callable functions for AI models
- `type="runtime"` - Sets language model execution parameters

## Response Schema

Response schemas define the expected structure of AI-generated responses, ensuring that language models return data in a predictable, parsable format. This transforms free-form text generation into structured data generation.

### JSON Schema Format

Use the `lang="json"` attribute to specify JSON Schema format:

```xml
<meta type="responseSchema" lang="json">
  {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "age": { "type": "number" }
    },
    "required": ["name"]
  }
</meta>
```

### Zod Schema Format

When the `lang` attribute is omitted, POML assumes Zod format:

```xml
<meta type="responseSchema">
  z.object({
    name: z.string(),
    age: z.number().optional()
  })
</meta>
```

**Important limitations:**
- Only one `responseSchema` meta element is allowed per document. Multiple response schemas will result in an error.
- Response schemas cannot be used together with tool definitions in the same document. You must choose between structured responses or tool calling capabilities.

## Tool Registration

Tool registration enables AI models to interact with external functions during conversation. Tools are function definitions that tell the AI model what functions are available, what parameters they expect, and what they do.

**Important:** Tools and response schemas are mutually exclusive. You cannot use both `responseSchema` and `tool` meta elements in the same POML document.

### JSON Schema Format

```xml
<meta type="tool" name="getWeather" description="Get weather information">
  {
    "type": "object",
    "properties": {
      "location": { "type": "string" },
      "unit": { 
        "type": "string", 
        "enum": ["celsius", "fahrenheit"] 
      }
    },
    "required": ["location"]
  }
</meta>
```

### Zod Schema Format

```xml
<meta type="tool" name="calculate" description="Perform calculation">
  z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number(),
    b: z.number()
  })
</meta>
```

**Required attributes for tools:**
- **name**: Tool identifier (required)
- **description**: Tool description (optional but recommended)

You can define multiple tools in a single document.

## Runtime Parameters

Runtime parameters configure the language model's behavior during execution. These parameters are automatically used in [VSCode's test command](../vscode/features.md) functionality, which is based on the [Vercel AI SDK](https://ai-sdk.dev/).

```xml
<meta type="runtime" 
      temperature="0.7" 
      maxOutputTokens="1000" 
      model="gpt-4"
      topP="0.9" />
```

All attributes except `type` are passed as runtime parameters. Common parameters include:

- **temperature**: Controls randomness (0-2, typically 0.3-0.7 for balanced output)
- **maxOutputTokens**: Maximum response length in tokens
- **model**: Model identifier (e.g., "gpt-4", "claude-3-sonnet")
- **topP**: Nucleus sampling threshold (0-1, typically 0.9-0.95)
- **frequencyPenalty**: Reduces token repetition based on frequency (-2 to 2)
- **presencePenalty**: Reduces repetition based on presence (-2 to 2)
- **seed**: For deterministic outputs (integer value)

The full parameter list depends on whether you're using standard text generation or structured data generation:
- [Text generation parameters](https://ai-sdk.dev/docs/ai-sdk-core/generating-text) - Standard text generation
- [Structured data parameters](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) - When using response schemas

The [Vercel AI SDK](https://ai-sdk.dev/) automatically handles parameter validation and conversion for different model providers.

## Version Control

Version requirements ensure compatibility between documents and the POML runtime. This prevents runtime errors when documents require specific POML features.

```xml
<meta minVersion="0.5.0" maxVersion="2.0.0" />
```

- **minVersion**: Minimum required POML version. If the current version is lower, an error is thrown.
- **maxVersion**: Maximum supported POML version. Documents may not work correctly with newer versions.

Version checking uses semantic versioning (MAJOR.MINOR.PATCH) and occurs during document parsing.

## Component Control

The `components` attribute dynamically enables or disables POML components within a document. This is useful for conditional content, feature flags, or restricting elements in specific contexts.

### Disabling Components

Prefix component names with `-` to disable them:

```xml
<meta components="-table" />
<!-- Now <table> elements will throw an error -->
```

You can disable multiple components:

```xml
<meta components="-table,-image" />
```

### Re-enabling Components

Use `+` prefix to re-enable previously disabled components:

```xml
<meta components="-table" />
<!-- table is disabled -->
<meta components="+table" />
<!-- table is re-enabled -->
```

Component aliases can be disabled independently of the main component name. For example, if a component has both a main name and aliases, you can disable just the alias while keeping the main component available.
