# Configuration

## Settings

Configure POML in VS Code settings:

### Language Model Provider

```json
{
  "poml.languageModel.provider": "openai"
}
```

Options: `openai`, `microsoft`, `anthropic`, `google`

### Model Name

```json
{
  "poml.languageModel.model": "gpt-4o"
}
```

### API Configuration

```json
{
  "poml.languageModel.apiKey": "your-api-key",
  "poml.languageModel.apiUrl": "https://api.openai.com/v1/",
  "poml.languageModel.temperature": 0.5,
  "poml.languageModel.maxTokens": 2000
}
```

## Environment Variables

Alternatively, set API keys via environment variables:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_API_KEY`