# TypeScript API Reference

This documentation is auto-generated from the TypeScript source code using TypeDoc.

## Modules

- **[index](index.md)** - Main entry point and exports
- **[base](base.md)** - Base components, interfaces, and utilities
- **[cli](cli.md)** - Command-line interface
- **[essentials](essentials.md)** - Essential POML components (Text, Image, List, etc.)
- **[file](file.md)** - File handling and inclusion components
- **[writer](writer.md)** - POML writer and serialization utilities
- **[components](components.md)** - Complete component index

## Quick Start

```typescript
import { load, render } from 'poml';

// Load a POML file
const prompt = await load('example.poml');

// Render it to different formats
const markdown = render(prompt, { format: 'markdown' });
```

## Component Specifications

For detailed component specifications with examples and parameters, see [Components Documentation](../language/components.md).