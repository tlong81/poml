# POML Syntax

## Basic Structure

POML files use XML-like syntax to define prompts:

```xml
<prompt>
  <!-- Prompt content here -->
</prompt>
```

## Messages

Define conversation messages:

```xml
<message role="system">System prompt</message>
<message role="user">User message</message>
<message role="assistant">Assistant response</message>
```

## Including Files

Include external content:

```xml
<include src="./data.json" />
<include src="./context.txt" />
```

## Variables

Use variables in prompts:

```xml
<prompt>
  <var name="topic">AI</var>
  <message role="user">
    Tell me about {{topic}}
  </message>
</prompt>
```