# Quick Start

## Creating Your First POML File

Create a new file with `.poml` extension:

```xml
<prompt>
  <message role="system">
    You are a helpful assistant.
  </message>
  <message role="user">
    Hello, how can you help me today?
  </message>
</prompt>
```

## Running POML

### In VS Code

1. Open a `.poml` file
2. Click the Run button in the editor toolbar
3. View the output in the POML preview panel

### With Python

```python
import poml

prompt = poml.load("example.poml")
result = prompt.run()
print(result)
```