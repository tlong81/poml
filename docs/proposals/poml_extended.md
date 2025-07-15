# Extended POML File Format Design Specification

## Overview

This document describes the design for an extended POML file format that supports mixed content files - files that can contain both pure text (e.g., Markdown) and POML markup elements seamlessly integrated together.

## Current Limitations

The current POML implementation requires files to be fully enclosed within `<poml>...</poml>` tags. Even though the outer level `<poml>...</poml>` can be optional, the markup file is always parsed with one single pass of XML parser. This creates friction when users want to:

1. Write primarily text-based documents (like Markdown or Jinja) with occasional POML components
2. Usually need to escape characters like `<` and `>` in text content
3. Gradually migrate existing text files to use POML features

## Design Goals

1. **Backward Compatibility**: Most of existing POML files should continue to work without changes
2. **Flexibility**: Support pure text files with embedded POML elements
3. **Seamless Integration**: Allow switching between text and POML modes within a single file
4. **Controlled Evolution of Tags**: behaviour of new/experimental tags is opt‑in via `<meta enable="...">`, preventing accidental breakage when upgrading the tool‑chain.

## File Format Specification

### Extended POML Files

Extended POML files can contain:

1. **Pure Text Content**: Regular text content (Markdown, plain text, etc.)
2. **POML Element Pairs**: Any element pair defined in `componentDocs.json` (e.g., `<poml>...</poml>`, `<p>...</p>`, `<task>...</task>`)
3. **Mixed Content**: Combination of pure text and POML elements

### Element Detection

The system will assume the whole file is a pure text file and detects certain parts as POML elements based on the following:

1. Loading component definitions from `componentDocs.json` and extracting valid POML component names and their aliases.
2. Scanning for opening tags that match these components, and scanning until the corresponding closing tag is found.
3. If a special tag `<text>...</text>` is found within a POML segment, it will be treated as pure text content and processed following the rules above (step 1 and 2).
4. Unknown or disabled tags are treated as literal text and, by default, raise a diagnostic warning.

An example is shown below:

#### Example 1

```markdown
# My Analysis Document

This is a regular markdown document that explains the task.

<task>
  Analyze the following data and provide insights.
</task>

Here are some key points to consider:

- Data quality
- Statistical significance  
- Business impact

<examples>
  <example>
    <input>Sample data point 1</input>
    <output>Analysis result 1</output>
  </example>
</examples>

## Conclusion

The analysis shows...
```

#### Example 2

```xml
<poml>
  <task>Process the following data</task>
  <text>
    This is **markdown** content that will be processed as pure text.
    
    - Item 1
    - Item 2

    {{ VARIABLES_WILL_ALSO_SHOWN_AS_IS }}
    <cp caption="Nested POML">This is a nested POML component that will be processed as POML.</cp>

    No POML processing happens here.
  </text>
  <hint>Remember to check the format</hint>
</poml>

There can be some intervening text here as well.

<poml>
  <p>You can add another POML segment here: {{variable_will_be_substituted}}</p>
</poml>

<p>POML elements do not necessarily reside in a <text><poml> (the <poml> here is processed as is.)</text> element.</p>
```

**Escaping Note**: To directly show a POML tag in the text, users can use a `<text>` tag to wrap the content, as shown in the example above. If they want to escape a pair such as `<poml>...</poml>`, they can escape the opening tag and closing tag respectively, such as `<text><poml></text>...<text></poml></text>`.

### File-level Metadata

Metadatas are information that is useful when parsing and rendering the file, such as context variables, stylesheets, version information, file paths, etc.
File-level metadata can be included at any place of the file in a special `<meta>` tag. This metadata will be processed before any content parsing.

**Example:**

```xml
<meta minimalPomlVersion="0.3" />
<meta stylesheet="/path/to/stylesheet.json />
<meta enableTags="reference,table" unknownTags="warning" />
```

## Architecture Design

### High-level Processing Pipeline

The core of the new architecture is a three-pass process: Tokenization and AST Parsing, Metadata Extraction, and Recursive Rendering.

#### I. Tokenization and AST Parsing

This phase processes the raw file content through a standard compiling workflow: tokenization followed by parsing to an Abstract Syntax Tree (AST).

* **Tokenization**: Standard XML tokenization logic is used to break the input into tokens (tags, text content, attributes, etc.). Additionally, template variables in `{{}}` format are identified and tokenized as special tokens to enable proper parsing and variable substitution.

* **AST Parsing Algorithm**:
  1. Scan until `<` and tag name is found.
  2. If the tag name is `text`, create a text node and scan until the corresponding `</text>` is found (handling nested POML if present; template variables are not considered here).
  3. If the tag name matches any POML tag from `componentDocs.json`, create a node with the tag name and attributes (template variables `{{}}` in attribute values are parsed as child template nodes).
  4. Within POML tags, if another `text` tag is found, follow the same logic as step 2.
  5. Template variables `{{}}` found within text content or attribute values create TEMPLATE nodes as children.
  6. Close the node when the corresponding closing tag `</tagname>` is found.

* **Error Tolerance**: The parser is designed to be error-tolerant, gracefully handling malformed markup while preserving as much structure as possible.

* **Source Mapping**: The parser retains source mapping information for each AST node, enabling code intelligence features like hover, go to definition, find references, and auto completion.

* **Output**: An AST representing the hierarchical structure of the document, where each node contains source position information and type metadata.

**`ASTNode` Interface**: The AST nodes represent the parsed structure with source mapping.

```typescript
interface SourceRange {
  start: number;
  end: number;
}

interface AttributeInfo {
  key: string;
  value: (ASTNode & { kind: 'TEXT' | 'TEMPLATE' })[];  // Mixed content: array of text/template nodes
  keyRange: SourceRange;      // Position of attribute name
  valueRange: SourceRange;    // Position of attribute value (excluding quotes)
  fullRange: SourceRange;     // Full attribute including key="value"
}

interface ASTNode {
  id: string;                      // Unique ID for caching and React keys
  kind: 'META' | 'TEXT' | 'POML' | 'TEMPLATE';
  start: number;                   // Source position start of entire node
  end: number;                     // Source position end of entire node
  content: string;                 // The raw string content
  parent?: ASTNode;                // Reference to the parent node
  children: ASTNode[];             // Child nodes
  
  // For POML and META nodes
  tagName?: string;                // Tag name (e.g., 'task', 'meta')
  attributes?: AttributeInfo[];    // Detailed attribute information
  
  // Detailed source positions
  openingTag?: {
    start: number;                 // Position of '<'
    end: number;                   // Position after '>'
    nameRange: SourceRange;        // Position of tag name
  };
  
  closingTag?: {
    start: number;                 // Position of '</'
    end: number;                   // Position after '>'
    nameRange: SourceRange;        // Position of tag name in closing tag
  };
  
  contentRange?: SourceRange;      // Position of content between tags (excluding nested tags)
  
  // For TEXT nodes
  textSegments?: SourceRange[];    // Multiple ranges for text content (excluding nested POML)
  
  // For TEMPLATE nodes
  expression?: string;             // The full expression content between {{}}
}
```

#### II. Metadata Processing

Once the AST is built, all `META` nodes are processed.

  * **Extraction**: Traverse the AST to find all `META` nodes.
  * **Population**: Parse the content of each `<meta>` tag and populate the global `PomlContext` object.
  * **Removal**: After processing, `META` nodes are removed from the AST to prevent them from being rendered.

**`PomlContext` Interface**: This context object is the single source of truth for the entire file, passed through all readers. It's mutable, allowing stateful operations like `<let>` to have a file-wide effect.

```typescript
interface PomlContext {
  variables: { [key: string]: any }; // For {{ substitutions }} and <let> (Read/Write)
  stylesheet: { [key: string]: string }; // Merged styles from all <meta> tags (Read-Only during render)
  minimalPomlVersion?: string;      // From <meta> (Read-Only)
  sourcePath: string;                // File path for resolving includes (Read-Only)
}
```

#### III. Text/POML Dispatching (Recursive Rendering)

Rendering starts at the root of the AST and proceeds recursively. A controller dispatches AST nodes to the appropriate reader.

* **`PureTextReader`**: Handles `TEXT` nodes.

  * Currently we directly render the pure-text contents as a single React element. In future, we can:
    * Renders the text content, potentially using a Markdown processor.
    * Performs variable substitutions (`{{...}}`) using the `variables` from `PomlContext`. The logic from `handleText` in the original `PomlFile` should be extracted into a shared utility for this.
  * Iterates through its `children` nodes. For each child `POML` node, it calls the `PomlReader`.

* **`PomlReader`**: Handles `POML` nodes.

  * **Delegation**: Instantiates a modified `PomlFile` class with the processed node content and the shared `PomlContext`.
  * **Rendering**: Calls the `pomlFile.react(context)` method to render the node.

* **`IntelliSense Layer`**: The AST makes it easy to provide context-aware IntelliSense. By checking the `kind` of the node at the cursor's offset, the request can be routed to the correct provider—either the `PomlReader`'s XML-aware completion logic or a simpler text/variable completion provider for `TEXT` nodes.

**`Reader` Interface**: This interface defines the contract for both `PureTextReader` and `PomlReader`.

```typescript
interface Reader {
  read(segment: Segment, context: PomlContext?): React.ReactElement;
  getHoverToken(segment: Segment, offset: number): PomlToken | undefined;
  getCompletions(offset: number): PomlToken[];
}
```

### Implementation & `PomlFile` Refactoring

To achieve this design, the existing `PomlFile` class needs significant refactoring. Its role changes from a file-level controller to a specialized parser for `POML` segments.

#### **Key Modifications to `PomlFile`**

1. **Constructor (`new PomlFile`)**:

  * **Remove Auto-Wrapping**: The `autoAddPoml` logic must be **removed**. The `PomlReader` will only pass it well-formed XML content corresponding to a single `POML` segment. The constructor will now assume the input `text` is a valid XML string.
  * **Receive Context**: The constructor should accept the `PomlContext` object to access shared state.

2. **State Management (`handleLet`)**:

  * The `<let>` tag's implementation must be modified to read from and write to the **shared `PomlContext.variables` object**, not a local context. This ensures that a variable defined in one POML block is available to subsequent POML blocks in the same file.

3. **Handling `<include>`**:

  * The `handleInclude` method should be **removed** from `PomlFile`. Inclusion is now handled at a higher level by the main processing pipeline. When the `PomlReader` encounters an `<include>` tag, it will invoke the entire pipeline (Segmentation, Metadata, Rendering) on the included file and insert the resulting React elements.

4. **Parsing `TEXT` Placeholders**:

  * The core `parseXmlElement` method needs a new branch to handle the `<text ref="..." />` placeholder.
  * When it encounters this element:
    1. It extracts the `ref` attribute (e.g., `"TEXT_ID_123"`).
    2. It looks up the corresponding raw text from `context.texts`.
    3. It fetches from the `context.texts` map and returns a React element containing the pure text content.
