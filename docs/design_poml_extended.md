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
<!-- 4. **Component Discovery**: Automatically detect POML elements from `componentDocs.json` -->

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

## Architecture Design

### High-level Processing Pipeline

1. **Segmentation Pass**:
  - One linear scan that classifies the content into meta / text / POML segments. Use component names and aliases from `componentDocs.json` to identify the POML segments.
  - The result is a tree of segments, where two segments can either have a non-overlapping range or be nested within each other.
  - Within the range of a POML segment, there could be multiple `<text>` segments that should be treated as pure text.
  - The bottom of the tree is always a `<text>` segment, which means the outermost content is always treated as pure text, unless the file starts with a `<poml>` tag and ends with a `</poml>` tag.

  ```typescript
  interface Segment {
    id: string;              // UUID for React key + caches
    kind: 'META' | 'TEXT' | 'POML';
    start: number; end: number;  // Original file offsets
    content: string;
    children?: Segment[];    // Nested segments
  }
  ```

2. **Metadata Processing**:
  - Extract metadata from `<meta>` tags and store in a context object.
  - This context will be passed to POML readers for variable substitution and other processing.

  ```typescript
  interface PomlContext {
    variables: { [key: string]: any }; // Key-value pairs for variables (RW)
    stylesheet: { [key: string]: string }; // Stylesheets to apply
    minimalPomlVersion: string; // Minimum POML version required
    sourcePath: string; // Original file path
  }
  ```

3. **Text/POML Dispatching**:
  - For the rest of the segments, start with the outermost `<text>` segment and process it with `PureTextReader`.
  - For its children segments, if they are POML segments, process them with `PomlReader`.
  - Always remove the `<meta>` segments before processing, as they have already been processed.

  ```typescript
  interface Reader {
    read(segment: Segment, context: PomlContext?): React.ReactElement;
    getHoverToken(segment: Segment, offset: number): PomlToken | undefined;
    getCompletions(offset: number): PomlToken[];
  }
  ```

4. **IntelliSense Layer**:
  - Routes hover / completion queries to the correct underlying parser (`PomlReader` for POML, `PureTextReader` for text).

### PomlReader vs. Original PomlFile

To ensure the smooth migration, we will maintain the original `PomlFile` structure but extend it with new functionality, with minimal changes to the existing codebase. The new `PomlReader` will handle the parsing of POML segments, while the `PureTextReader` will handle pure text segments. The `PomlReader` will delegate the core logic of processing POML elements to the existing `PomlFile`.

When processing a POML segment in the original `PomlFile`, before parsing the XML, remember to replace any `<text>` segments with `<text ref="TEXT_ID" />`, as the `<text>` could contain unparsable content that should be part of the pure text. The source map offset will be adjusted accordingly. The real text content will be parsed from the `PomlReader` as a map from TEXT_ID to contents, who will call `PureTextReader` to handle the pure text segments.

`PomlFile` will also be instructed to ignore `<meta>` tags, as they have already been processed in the segmentation pass.

`PomlFile` will be stateful across the file level. When setting a varaible via `<let>` in a previous POML segment, it will be stored in the context object and can be accessible in subsequent segments.

Another change is for `<include>`, which will now be processed by the new processing pipeline, instead of the original `PomlFile` class.
