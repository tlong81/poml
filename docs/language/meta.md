# Meta

The `<meta>` element provides metadata and configuration for POML documents. It allows you to specify version requirements and disable/enable components.

## Basic Usage

Meta elements are typically placed at the beginning of a POML document and don't produce any visible output. One POML file can have multiple `<meta>` elements at any position, but they should be used carefully to avoid conflicts.

```xml
<poml>
  <meta minVersion="1.0.0" />
  <p>Your content here</p>
</poml>
```

### Meta Element Usage

Meta elements are used for general document configuration:
- Version control (`minVersion`, `maxVersion`)
- Component management (`components`)

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
