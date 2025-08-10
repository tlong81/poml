# POML Documentation

Welcome to the Prompt Orchestration Markup Language (POML) documentation.

## What is POML?

POML is a markup language designed for orchestrating prompts in AI applications. It provides a structured way to define and manage prompts for language models.

## Quick Links

- [Installation](language/installation.md) - Get started with POML
- [VS Code Extension](vscode/overview.md) - Use POML in Visual Studio Code
- [TypeScript API](typescript/api.md) - TypeScript reference documentation
- [Python API](python/api.md) - Python reference documentation

## Features

- **Structured Prompts**: Define prompts with clear structure and organization
- **VS Code Integration**: Full IDE support with syntax highlighting and IntelliSense
- **Multi-language Support**: Use POML with TypeScript and Python
- **Model Provider Support**: Works with OpenAI, Azure OpenAI, Anthropic, and Google GenAI

## Development

### Prerequisites
- Python 3.9+
- Node.js 18+

### Setup
```bash
# Install Python dependencies for documentation
pip install -e ".[dev]"

# Install Node dependencies
npm install
```

### Build Documentation
```bash
# Generate component specs and build site
npm run docs:build
```

### Serve Locally
```bash
npm run docs:serve
# Documentation available at http://localhost:8000
```

## Documentation Structure

- `language/` - POML language specification, syntax, and components
- `vscode/` - VS Code extension documentation
- `typescript/` - TypeScript API reference
- `python/` - Python API reference

## Contributing

The documentation is designed to be minimal and low-maintenance:
- API references are auto-generated from source code
- Deployment is fully automated via GitHub Actions
- Documentation versions correspond to package versions