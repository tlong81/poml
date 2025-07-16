import { describe, expect, test } from '@jest/globals';
import {
  extendedPomlLexer,
  Comment,
  TemplateOpen,
  TemplateClose,
  TagOpen,
  TagClose,
  TagClosingOpen,
  TagSelfClose,
  Equals,
  DoubleQuote,
  SingleQuote,
  Backslash,
  Identifier,
  Whitespace,
  TextContent
} from 'poml/reader/lexer';

// Helper function to extract token images
function tokenImages(input: string): string[] {
  const result = extendedPomlLexer.tokenize(input);
  return result.tokens.map(t => t.image);
}

// Helper function to extract token types
function tokenTypes(input: string): any[] {
  const result = extendedPomlLexer.tokenize(input);
  return result.tokens.map(t => t.tokenType);
}

// Helper function to get full tokenization result
function tokenize(input: string) {
  return extendedPomlLexer.tokenize(input);
}

describe('Basic Token Images', () => {
  test('should tokenize HTML comments', () => {
    expect(tokenImages('<!-- comment -->')).toEqual(['<!-- comment -->']);
  });

  test('should tokenize template variables', () => {
    expect(tokenImages('{{variable}}')).toEqual(['{{', 'variable', '}}']);
  });

  test('should tokenize XML tags', () => {
    expect(tokenImages('<task>')).toEqual(['<', 'task', '>']);
    expect(tokenImages('</task>')).toEqual(['</', 'task', '>']);
    expect(tokenImages('<meta />')).toEqual(['<', 'meta', ' ', '/>']);
  });

  test('should tokenize quotes and backslashes individually', () => {
    expect(tokenImages('"hello"')).toEqual(['"', 'hello', '"']);
    expect(tokenImages("'world'")).toEqual(["'", 'world', "'"]);
    expect(tokenImages('text\\escape')).toEqual(['text', '\\', 'escape']);
  });

  test('should tokenize attributes', () => {
    expect(tokenImages('id="value"')).toEqual(['id', '=', '"', 'value', '"']);
  });

  test('should tokenize whitespace', () => {
    expect(tokenImages('  \t\n  ')).toEqual(['  \t\n  ']);
  });

  test('should tokenize identifiers', () => {
    expect(tokenImages('simple-name_123')).toEqual(['simple-name_123']);
  });

  test('should tokenize text content', () => {
    expect(tokenImages('plain text here')).toEqual(['plain', ' ', 'text', ' ', 'here']);
  });
});

describe('Edge Cases', () => {
  test('should handle "abc<poml>def</poml>ghi"', () => {
    expect(tokenImages('"abc<poml>def</poml>ghi"')).toEqual([
      '"',
      'abc',
      '<',
      'poml',
      '>',
      'def',
      '</',
      'poml',
      '>',
      'ghi',
      '"'
    ]);
  });

  test('should handle <poml abc="def">ghi</poml>', () => {
    expect(tokenImages('<poml abc="def">ghi</poml>')).toEqual([
      '<',
      'poml',
      ' ',
      'abc',
      '=',
      '"',
      'def',
      '"',
      '>',
      'ghi',
      '</',
      'poml',
      '>'
    ]);
  });

  test('should handle mixed content', () => {
    expect(tokenImages('text {{var}} more')).toEqual([
      'text',
      ' ',
      '{{',
      'var',
      '}}',
      ' ',
      'more'
    ]);
  });

  test('chinese characters', () => {
    expect(tokenImages('中文 {{ 文本 }}内容< 标签>')).toEqual([
      '中文 ',
      '{{',
      ' ',
      '文本 ',
      '}}',
      '内容',
      '<',
      ' ',
      '标签>'
    ]);
  });

  test('should handle complex attributes', () => {
    expect(tokenImages('<task id="{{value}}" class="test">')).toEqual([
      '<',
      'task',
      ' ',
      'id',
      '=',
      '"',
      '{{',
      'value',
      '}}',
      '"',
      ' ',
      'class',
      '=',
      '"',
      'test',
      '"',
      '>'
    ]);
  });

  test('should handle escaped quotes', () => {
    expect(tokenImages('text "with \\"escaped\\" quotes"')).toEqual([
      'text',
      ' ',
      '"',
      'with',
      ' ',
      '\\',
      '"',
      'escaped',
      '\\',
      '"',
      ' ',
      'quotes',
      '"'
    ]);
  });
});

describe('Token Types', () => {
  test('should identify correct token types for basic elements', () => {
    expect(tokenTypes('<task>')).toEqual([TagOpen, Identifier, TagClose]);
    expect(tokenTypes('</task>')).toEqual([TagClosingOpen, Identifier, TagClose]);
    expect(tokenTypes('<meta />')).toEqual([TagOpen, Identifier, Whitespace, TagSelfClose]);
  });

  test('should identify quotes and backslashes', () => {
    expect(tokenTypes('"text"')).toEqual([DoubleQuote, Identifier, DoubleQuote]);
    expect(tokenTypes("'text'")).toEqual([SingleQuote, Identifier, SingleQuote]);
    expect(tokenTypes('text\\escape')).toEqual([Identifier, Backslash, Identifier]);
  });

  test('should identify template variables', () => {
    expect(tokenTypes('{{variable}}')).toEqual([TemplateOpen, Identifier, TemplateClose]);
  });

  test('should identify comments', () => {
    expect(tokenTypes('<!-- comment -->')).toEqual([Comment]);
  });

  test('should identify whitespace', () => {
    expect(tokenTypes('  \t\n  ')).toEqual([Whitespace]);
  });
});

describe('Source Position and Error Tests', () => {
  test('should provide correct source positions', () => {
    const result = tokenize('<task>content</task>');
    expect(result.errors).toHaveLength(0);

    const tokens = result.tokens;
    expect(tokens[0].startOffset).toBe(0);
    expect(tokens[0].endOffset).toBe(0);
    expect(tokens[0].image).toBe('<');

    expect(tokens[1].startOffset).toBe(1);
    expect(tokens[1].endOffset).toBe(4);
    expect(tokens[1].image).toBe('task');

    expect(tokens[2].startOffset).toBe(5);
    expect(tokens[2].endOffset).toBe(5);
    expect(tokens[2].image).toBe('>');
  });

  test('should handle line and column tracking', () => {
    const input = `line1
line2 <tag>
line3`;
    const result = tokenize(input);

    const tagToken = result.tokens.find(t => t.tokenType === TagOpen);
    expect(tagToken).toBeDefined();
    expect(tagToken!.startLine).toBe(2);
    expect(tagToken!.startColumn).toBe(7); // After "line2 "
  });

  test('should handle malformed input gracefully', () => {
    const result = tokenize('<task id="unclosed');
    expect(result.errors).toHaveLength(0); // Should not error, just tokenize what it can
    expect(result.tokens.length).toBeGreaterThan(0);

    // Verify token positions are valid
    for (const token of result.tokens) {
      expect(token.startOffset).toBeLessThanOrEqual(token.endOffset!);
      expect(token.startOffset).toBeGreaterThanOrEqual(0);
      expect(token.endOffset).toBeLessThanOrEqual(18);
    }
  });

  test('should verify token boundaries do not overlap', () => {
    const result = tokenize('<task id="value">content</task>');
    const sortedTokens = [...result.tokens].sort((a, b) => a.startOffset - b.startOffset);

    for (let i = 0; i < sortedTokens.length - 1; i++) {
      const current = sortedTokens[i];
      const next = sortedTokens[i + 1];
      expect(current.endOffset).toBeLessThanOrEqual(next.startOffset);
    }
  });

  test('should handle empty input', () => {
    const result = tokenize('');
    expect(result.errors).toHaveLength(0);
    expect(result.tokens).toHaveLength(0);
  });

  test('should handle whitespace only input', () => {
    const result = tokenize('   \t\n   ');
    expect(result.errors).toHaveLength(0);
    expect(result.tokens).toHaveLength(1);
    expect(result.tokens[0].tokenType).toBe(Whitespace);
  });
});

describe('Complex Mixed Content', () => {
  test('should handle extended POML specification example', () => {
    const input = `# My Analysis

<task>
Analyze data
</task>

{{variable}}`;

    const images = tokenImages(input);
    expect(images).toContain('# My Analysis\n\n');
    expect(images).toContain('<');
    expect(images).toContain('task');
    expect(images).toContain('>');
    expect(images).toContain('{{');
    expect(images).toContain('variable');
    expect(images).toContain('}}');
  });

  test('should handle comments with mixed content', () => {
    expect(tokenImages('<!-- comment --><task>content</task>')).toEqual([
      '<!-- comment -->',
      '<',
      'task',
      '>',
      'content',
      '</',
      'task',
      '>'
    ]);
  });

  test('should handle nested quotes and templates', () => {
    expect(tokenImages('<meta value="{{path}}/file.txt">')).toEqual([
      '<',
      'meta',
      ' ',
      'value',
      '=',
      '"',
      '{{',
      'path',
      '}}',
      '/file.txt',
      '"',
      '>'
    ]);
  });
});

describe('Error Recovery', () => {
  test('should handle incomplete template variables', () => {
    const result = tokenize('text {{incomplete');
    expect(result.errors).toHaveLength(0);
    expect(result.tokens.length).toBeGreaterThan(0);

    const types = result.tokens.map(t => t.tokenType);
    expect(types).toContain(Identifier);
    expect(types).toContain(TemplateOpen);
  });

  test('should handle unclosed comments', () => {
    const result = tokenize('<!-- unclosed comment\nmore text');
    expect(result.errors).toHaveLength(0);
    expect(result.tokens.length).toBeGreaterThan(0);
  });

  test('should handle mixed valid and invalid content', () => {
    const result = tokenize('<valid>content</valid>@#$invalid');
    expect(result.tokens.length).toBeGreaterThan(0);

    // Should tokenize the valid parts
    const images = result.tokens.map(t => t.image);
    expect(images).toContain('<');
    expect(images).toContain('valid');
    expect(images).toContain('>');
    expect(images).toContain('content');
  });

  test('should handle special characters in text content', () => {
    const input = 'text with @#$%^&*()[]{}|;:,.<>?/~`';
    const result = tokenize(input);
    expect(result.errors).toHaveLength(0);
    const images = result.tokens.map(t => t.image);
    expect(images).toEqual(['text', ' ', 'with', ' ', '@#$%^&*()[]{}|;:,.', '<', '>', '?/~`']);
  });
});
