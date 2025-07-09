# Extended POML File Format Design Specification

## Overview

This document describes the design for an extended POML file format that supports mixed content files - files that can contain both pure text (e.g., Markdown) and POML markup elements seamlessly integrated together.

## Current Limitations

The current POML implementation requires files to be fully enclosed within `<poml>...</poml>` tags. This creates friction when users want to:

1. Write primarily text-based documents (like Markdown) with occasional POML components
2. Gradually migrate existing text files to use POML features
3. Mix different content types within a single file

## Design Goals

1. **Backward Compatibility**: Existing POML files should continue to work without changes
2. **Flexibility**: Support pure text files with embedded POML elements
3. **Seamless Integration**: Allow switching between text and POML modes within a single file
4. **Component Discovery**: Automatically detect POML elements from `componentDocs.json`

## File Format Specification

### Extended POML Files

Extended POML files can contain:

1. **Pure Text Content**: Regular text content (Markdown, plain text, etc.)
2. **POML Element Pairs**: Any element pair defined in `componentDocs.json` (e.g., `<poml>...</poml>`, `<p>...</p>`, `<task>...</task>`)
3. **Mixed Content**: Combination of pure text and POML elements

### Element Detection

The system will automatically detect valid POML elements by:

1. Loading component definitions from `componentDocs.json`
2. Extracting all component names and their aliases
3. Scanning for opening tags that match these components
4. Processing content between matching opening and closing tags as POML

### Text Embedding in POML

Within POML segments, users can embed pure text using the `<text>` tag:

```xml
<poml>
  <task>Process the following data</task>
  <text>
    This is **markdown** content that will be processed as pure text.
    
    - Item 1
    - Item 2
    
    No POML processing happens here.
  </text>
  <hint>Remember to check the format</hint>
</poml>
```

## Architecture Design

### Reader Classes

#### 1. PureTextReader

**Purpose**: Reads and processes pure text content without any POML parsing.

**Responsibilities**:
- Read text content as-is
- Preserve formatting and whitespace
- Handle different text formats (Markdown, plain text, etc.)
- Return content wrapped in appropriate React elements

**Interface**:
```typescript
interface PureTextReader {
  read(content: string, startIndex: number, endIndex: number): React.ReactElement;
  canHandle(content: string, index: number): boolean;
}
```

#### 2. PomlReader

**Purpose**: Handles original POML parsing logic for XML-structured content.

**Responsibilities**:
- Parse XML/POML syntax
- Handle POML components and attributes
- Process templates and expressions
- Maintain existing POML functionality

**Interface**:
```typescript
interface PomlReader {
  read(content: string, startIndex: number, endIndex: number, context?: any): React.ReactElement;
  canHandle(content: string, index: number): boolean;
}
```

#### 3. ExtendedPomlReader

**Purpose**: Orchestrates between PureTextReader and PomlReader for mixed content files.

**Responsibilities**:
- Scan content for POML element pairs
- Delegate text sections to PureTextReader
- Delegate POML sections to PomlReader
- Combine results into cohesive output
- Handle transitions between different content types

**Interface**:
```typescript
interface ExtendedPomlReader {
  read(content: string, context?: any): React.ReactElement;
  detectPomlElements(content: string): Array<{element: string, start: number, end: number}>;
}
```

### Component Detection Strategy

1. **Load Component Registry**: Parse `componentDocs.json` to build a registry of valid components
2. **Tag Scanning**: Use regex patterns to find opening tags that match registered components
3. **Bracket Matching**: Find corresponding closing tags using proper XML parsing
4. **Boundary Detection**: Identify start/end positions for each content segment

### Processing Flow

```
Input File
    ↓
ExtendedPomlReader.read()
    ↓
Scan for POML elements
    ↓
Split content into segments:
├── Pure text segments → PureTextReader
├── POML segments → PomlReader  
└── <text> segments within POML → PureTextReader
    ↓
Combine results
    ↓
Return React.ReactElement
```

## Implementation Plan

### Phase 1: Core Readers
1. Extract existing POML parsing logic into `PomlReader` class
2. Implement `PureTextReader` for text content processing
3. Create basic `ExtendedPomlReader` structure

### Phase 2: Component Detection
1. Build component registry from `componentDocs.json`
2. Implement tag detection and matching algorithms
3. Create content segmentation logic

### Phase 3: Integration
1. Update main parsing entry point to use `ExtendedPomlReader`
2. Implement `<text>` tag support within POML sections
3. Add proper error handling and validation

### Phase 4: Testing & Documentation
1. Create comprehensive test suite
2. Update user documentation
3. Add examples and migration guides

## File Type Detection

The system will determine how to process files based on:

1. **File Extension**: `.poml` files get extended processing
2. **Content Analysis**: 
   - If file starts with `<poml>`, use original PomlReader
   - If file contains recognized POML elements, use ExtendedPomlReader
   - If file is pure text, use PureTextReader wrapped in default container

## Error Handling

1. **Malformed XML**: Isolate errors to specific POML segments
2. **Unmatched Tags**: Treat as plain text if closing tag not found
3. **Unknown Components**: Report warnings but continue processing
4. **Context Preservation**: Maintain parsing context across segments

## Examples

### Example 1: Markdown with POML Elements

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

### Example 2: POML with Embedded Text

```xml
<poml>
  <role>You are a helpful assistant</role>
  
  <text>
    ## Background
    
    This is some **markdown** content that needs to be preserved exactly.
    
    ```python
    def hello():
        print("Hello world")
    ```
  </text>
  
  <task>Answer the user's question based on the background above</task>
</poml>
```

## Migration Path

1. **Existing Files**: No changes required - full backward compatibility
2. **New Mixed Files**: Can be created using the extended format immediately  
3. **Gradual Migration**: Users can add POML elements to existing text files incrementally

## Benefits

1. **Lower Barrier to Entry**: Users can start with familiar text formats
2. **Incremental Adoption**: Add POML features as needed
3. **Content Flexibility**: Mix structured and unstructured content
4. **Preserved Formatting**: Text content maintains original formatting
5. **Tool Compatibility**: Works with existing text editing tools