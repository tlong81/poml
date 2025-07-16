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
  TemplateContent, 
  TextContent 
} from '../../reader/lexer';

describe('ExtendedPomlLexer', () => {
  
  describe('Comments', () => {
    test('should tokenize HTML comments', () => {
      const input = '<!-- This is a comment -->';
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].tokenType).toBe(Comment);
      expect(result.tokens[0].image).toBe('<!-- This is a comment -->');
    });

    test('should tokenize multiline comments', () => {
      const input = `<!-- 
        This is a 
        multiline comment 
      -->`;
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].tokenType).toBe(Comment);
    });

    test('should tokenize comments with content after', () => {
      const input = '<!-- comment -->Some text';
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(2);
      expect(result.tokens[0].tokenType).toBe(Comment);
      expect(result.tokens[1].tokenType).toBe(TextContent);
      expect(result.tokens[1].image).toBe('Some text');
    });
  });

  describe('Template Variables', () => {
    test('should tokenize template variable delimiters', () => {
      const input = '{{variable}}';
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(3);
      expect(result.tokens[0].tokenType).toBe(TemplateOpen);
      expect(result.tokens[0].image).toBe('{{');
      expect(result.tokens[1].tokenType).toBe(TemplateContent);
      expect(result.tokens[1].image).toBe('variable');
      expect(result.tokens[2].tokenType).toBe(TemplateClose);
      expect(result.tokens[2].image).toBe('}}');
    });

    test('should tokenize template variables with complex expressions', () => {
      const input = '{{user.name || "Anonymous"}}';
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(3);
      expect(result.tokens[0].tokenType).toBe(TemplateOpen);
      expect(result.tokens[1].tokenType).toBe(TemplateContent);
      expect(result.tokens[1].image).toBe('user.name || "Anonymous"');
      expect(result.tokens[2].tokenType).toBe(TemplateClose);
    });

    test('should tokenize multiple template variables', () => {
      const input = '{{first}} and {{second}}';
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(6);
      expect(result.tokens[0].tokenType).toBe(TemplateOpen);
      expect(result.tokens[1].tokenType).toBe(TemplateContent);
      expect(result.tokens[1].image).toBe('first');
      expect(result.tokens[2].tokenType).toBe(TemplateClose);
      expect(result.tokens[3].tokenType).toBe(TextContent);
      expect(result.tokens[3].image).toBe(' and ');
      expect(result.tokens[4].tokenType).toBe(TemplateOpen);
      expect(result.tokens[5].tokenType).toBe(TemplateContent);
    });
  });

  describe('XML Tags', () => {
    test('should tokenize opening tags', () => {
      const input = '<task>';
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(3);
      expect(result.tokens[0].tokenType).toBe(TagOpen);
      expect(result.tokens[0].image).toBe('<');
      expect(result.tokens[1].tokenType).toBe(Identifier);
      expect(result.tokens[1].image).toBe('task');
      expect(result.tokens[2].tokenType).toBe(TagClose);
      expect(result.tokens[2].image).toBe('>');
    });

    test('should tokenize closing tags', () => {
      const input = '</task>';
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(3);
      expect(result.tokens[0].tokenType).toBe(TagClosingOpen);
      expect(result.tokens[0].image).toBe('</');
      expect(result.tokens[1].tokenType).toBe(Identifier);
      expect(result.tokens[1].image).toBe('task');
      expect(result.tokens[2].tokenType).toBe(TagClose);
      expect(result.tokens[2].image).toBe('>');
    });

    test('should tokenize self-closing tags', () => {
      const input = '<meta />';
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(3);
      expect(result.tokens[0].tokenType).toBe(TagOpen);
      expect(result.tokens[0].image).toBe('<');
      expect(result.tokens[1].tokenType).toBe(Identifier);
      expect(result.tokens[1].image).toBe('meta');
      expect(result.tokens[2].tokenType).toBe(TagSelfClose);
      expect(result.tokens[2].image).toBe('/>');
    });

    test('should tokenize tags with attributes', () => {
      const input = '<task id="123" class="important">';
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens.length).toBeGreaterThan(0);
      
      const tokenTypes = result.tokens.map(t => t.tokenType);
      expect(tokenTypes).toContain(TagOpen);
      expect(tokenTypes).toContain(Identifier);
      expect(tokenTypes).toContain(Equals);
      expect(tokenTypes).toContain(DoubleQuote);
      expect(tokenTypes).toContain(TagClose);
      
      // Verify specific tokens exist
      expect(result.tokens[0].tokenType).toBe(TagOpen);
      expect(result.tokens[0].image).toBe('<');
      
      const identifierTokens = result.tokens.filter(t => t.tokenType === Identifier);
      expect(identifierTokens.length).toBeGreaterThanOrEqual(3); // task, id, class
      expect(identifierTokens[0].image).toBe('task');
      expect(identifierTokens[1].image).toBe('id');
    });
  });

  describe('Quote and Escape Characters', () => {
    test('should tokenize double quotes as individual tokens', () => {
      const input = '"Hello world"';
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens.length).toBeGreaterThan(0);
      
      const tokenTypes = result.tokens.map(t => t.tokenType);
      expect(tokenTypes).toContain(DoubleQuote);
      expect(tokenTypes).toContain(TextContent);
      
      // First and last tokens should be quotes
      expect(result.tokens[0].tokenType).toBe(DoubleQuote);
      expect(result.tokens[0].image).toBe('"');
      expect(result.tokens[result.tokens.length - 1].tokenType).toBe(DoubleQuote);
      expect(result.tokens[result.tokens.length - 1].image).toBe('"');
    });

    test('should tokenize single quotes as individual tokens', () => {
      const input = "'Hello world'";
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens.length).toBeGreaterThan(0);
      
      const tokenTypes = result.tokens.map(t => t.tokenType);
      expect(tokenTypes).toContain(SingleQuote);
      expect(tokenTypes).toContain(TextContent);
      
      // First and last tokens should be quotes
      expect(result.tokens[0].tokenType).toBe(SingleQuote);
      expect(result.tokens[0].image).toBe("'");
      expect(result.tokens[result.tokens.length - 1].tokenType).toBe(SingleQuote);
      expect(result.tokens[result.tokens.length - 1].image).toBe("'");
    });

    test('should tokenize backslashes as individual tokens', () => {
      const input = 'text\\with\\backslashes';
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens.length).toBeGreaterThan(0);
      
      const tokenTypes = result.tokens.map(t => t.tokenType);
      expect(tokenTypes).toContain(Backslash);
      expect(tokenTypes).toContain(TextContent);
      
      // Should have backslash tokens
      const backslashTokens = result.tokens.filter(t => t.tokenType === Backslash);
      expect(backslashTokens.length).toBe(2);
      expect(backslashTokens[0].image).toBe('\\');
      expect(backslashTokens[1].image).toBe('\\');
    });

    test('should handle mixed quotes and backslashes', () => {
      const input = 'text "with \\"escaped\\" quotes"';
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens.length).toBeGreaterThan(0);
      
      const tokenTypes = result.tokens.map(t => t.tokenType);
      expect(tokenTypes).toContain(DoubleQuote);
      expect(tokenTypes).toContain(Backslash);
      expect(tokenTypes).toContain(TextContent);
    });
  });

  describe('Identifiers', () => {
    test('should tokenize simple identifiers', () => {
      const input = 'task';
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].tokenType).toBe(Identifier);
      expect(result.tokens[0].image).toBe('task');
    });

    test('should tokenize identifiers with hyphens', () => {
      const input = 'my-component';
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].tokenType).toBe(Identifier);
      expect(result.tokens[0].image).toBe('my-component');
    });

    test('should tokenize identifiers with underscores', () => {
      const input = 'my_component';
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].tokenType).toBe(Identifier);
      expect(result.tokens[0].image).toBe('my_component');
    });

    test('should tokenize identifiers with numbers', () => {
      const input = 'component123';
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].tokenType).toBe(Identifier);
      expect(result.tokens[0].image).toBe('component123');
    });
  });

  describe('Text Content', () => {
    test('should tokenize plain text', () => {
      const input = 'This is some plain text';
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].tokenType).toBe(TextContent);
      expect(result.tokens[0].image).toBe('This is some plain text');
    });

    test('should tokenize text with newlines', () => {
      const input = `Line 1
Line 2
Line 3`;
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].tokenType).toBe(TextContent);
      expect(result.tokens[0].image).toBe(`Line 1
Line 2
Line 3`);
    });

    test('should stop text content at tags', () => {
      const input = 'Some text <tag>';
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(4);
      expect(result.tokens[0].tokenType).toBe(TextContent);
      expect(result.tokens[0].image).toBe('Some text ');
      expect(result.tokens[1].tokenType).toBe(TagOpen);
      expect(result.tokens[2].tokenType).toBe(Identifier);
      expect(result.tokens[3].tokenType).toBe(TagClose);
    });

    test('should stop text content at template variables', () => {
      const input = 'Some text {{variable}}';
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(4);
      expect(result.tokens[0].tokenType).toBe(TextContent);
      expect(result.tokens[0].image).toBe('Some text ');
      expect(result.tokens[1].tokenType).toBe(TemplateOpen);
      expect(result.tokens[2].tokenType).toBe(TemplateContent);
      expect(result.tokens[3].tokenType).toBe(TemplateClose);
    });
  });

  describe('Complex Mixed Content', () => {
    test('should tokenize extended POML example from specification', () => {
      const input = `# My Analysis Document

This is a regular markdown document.

<task>
  Analyze the following data and provide insights.
</task>

Here are some key points:
- Data quality
- Statistical significance

{{variable_will_be_substituted}}`;

      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens.length).toBeGreaterThan(0);
      
      // Check for presence of different token types
      const tokenTypes = result.tokens.map(t => t.tokenType);
      expect(tokenTypes).toContain(TextContent);
      expect(tokenTypes).toContain(TagOpen);
      expect(tokenTypes).toContain(TagClose);
      expect(tokenTypes).toContain(Identifier);
      expect(tokenTypes).toContain(TemplateOpen);
      expect(tokenTypes).toContain(TemplateClose);
      expect(tokenTypes).toContain(TemplateContent);
    });

    test('should tokenize comments with tags and templates', () => {
      const input = '<!-- comment --><task id="{{id}}">{{content}}</task>';
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens.length).toBeGreaterThan(0);
      
      // First token should be comment
      expect(result.tokens[0].tokenType).toBe(Comment);
    });

    test('should handle self-closing tags with attributes', () => {
      const input = '<meta stylesheet="{{stylePath}}" />';
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens.length).toBeGreaterThan(0);
      
      const tokenTypes = result.tokens.map(t => t.tokenType);
      expect(tokenTypes).toContain(TagOpen);
      expect(tokenTypes).toContain(Identifier);
      expect(tokenTypes).toContain(Equals);
      expect(tokenTypes).toContain(DoubleQuote);
      expect(tokenTypes).toContain(TemplateOpen);
      expect(tokenTypes).toContain(TemplateClose);
      expect(tokenTypes).toContain(TagSelfClose);
    });

    test('should handle the specific case: "abc<poml>def</poml>ghi"', () => {
      const input = '"abc<poml>def</poml>ghi"';
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens.length).toBeGreaterThan(0);
      
      // Should tokenize as: " abc < poml > def </ poml > ghi "
      const tokenTypes = result.tokens.map(t => t.tokenType);
      expect(tokenTypes).toContain(DoubleQuote);
      expect(tokenTypes).toContain(TextContent);
      expect(tokenTypes).toContain(TagOpen);
      expect(tokenTypes).toContain(Identifier);
      expect(tokenTypes).toContain(TagClose);
      expect(tokenTypes).toContain(TagClosingOpen);
      
      // First and last tokens should be quotes
      expect(result.tokens[0].tokenType).toBe(DoubleQuote);
      expect(result.tokens[0].image).toBe('"');
      expect(result.tokens[result.tokens.length - 1].tokenType).toBe(DoubleQuote);
      expect(result.tokens[result.tokens.length - 1].image).toBe('"');
    });

    test('should handle the attribute case: <poml abc="def">ghi</poml>', () => {
      const input = '<poml abc="def">ghi</poml>';
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens.length).toBeGreaterThan(0);
      
      // Should tokenize as: < poml abc = " def " > ghi </ poml >
      const tokenTypes = result.tokens.map(t => t.tokenType);
      expect(tokenTypes).toContain(TagOpen);
      expect(tokenTypes).toContain(Identifier);
      expect(tokenTypes).toContain(Equals);
      expect(tokenTypes).toContain(DoubleQuote);
      expect(tokenTypes).toContain(TextContent);
      expect(tokenTypes).toContain(TagClose);
      expect(tokenTypes).toContain(TagClosingOpen);
      
      // Verify the structure
      expect(result.tokens[0].tokenType).toBe(TagOpen);
      expect(result.tokens[0].image).toBe('<');
      
      const identifierTokens = result.tokens.filter(t => t.tokenType === Identifier);
      expect(identifierTokens.length).toBeGreaterThanOrEqual(3); // poml, abc, def, poml
      expect(identifierTokens[0].image).toBe('poml');
      expect(identifierTokens[1].image).toBe('abc');
    });
  });

  describe('Whitespace Handling', () => {
    test('should preserve whitespace tokens', () => {
      const input = '  \t\n  <task>  \t\n  </task>  \t\n  ';
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      
      // Whitespace should be preserved
      const tokenTypes = result.tokens.map(t => t.tokenType);
      expect(tokenTypes).toContain(Whitespace);
      expect(tokenTypes).toContain(TagOpen);
      expect(tokenTypes).toContain(TagClose);
      expect(tokenTypes).toContain(TagClosingOpen);
      expect(tokenTypes).toContain(Identifier);
      
      // Should start with whitespace
      expect(result.tokens[0].tokenType).toBe(Whitespace);
      expect(result.tokens[0].image).toBe('  \t\n  ');
    });
  });

  describe('Error Handling and Source Index Verification', () => {
    test('should handle malformed input gracefully with correct source positions', () => {
      const input = '<task id="unclosed string';
      const result = extendedPomlLexer.tokenize(input);
      
      // Should not crash, should tokenize what it can
      expect(result.tokens.length).toBeGreaterThan(0);
      
      // Verify source positions are correct
      let expectedOffset = 0;
      for (const token of result.tokens) {
        expect(token.startOffset).toBeGreaterThanOrEqual(expectedOffset);
        expect(token.endOffset).toBeGreaterThan(token.startOffset);
        expect(token.startOffset).toBeLessThan(input.length);
        expect(token.endOffset).toBeLessThanOrEqual(input.length);
        expectedOffset = token.startOffset;
      }
    });

    test('should handle empty input', () => {
      const input = '';
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(0);
    });

    test('should handle input with only whitespace and preserve it', () => {
      const input = '   \t\n   ';
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens).toHaveLength(1); // Whitespace is preserved
      expect(result.tokens[0].tokenType).toBe(Whitespace);
      expect(result.tokens[0].startOffset).toBe(0);
      expect(result.tokens[0].endOffset).toBe(input.length);
    });

    test('should handle unclosed comments gracefully', () => {
      const input = '<!-- This comment is not closed\nSome text after';
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      // Should tokenize as text content since comment pattern requires -->
      expect(result.tokens.length).toBeGreaterThan(0);
      
      // Verify source positions
      for (const token of result.tokens) {
        expect(token.startOffset).toBeLessThan(input.length);
        expect(token.endOffset).toBeLessThanOrEqual(input.length);
      }
    });

    test('should handle mixed valid and invalid tokens with correct positions', () => {
      const input = '<valid>{{template}}</valid>invalid@#$%^content';
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens.length).toBeGreaterThan(0);
      
      // Verify all tokens have valid source positions
      for (let i = 0; i < result.tokens.length; i++) {
        const token = result.tokens[i];
        if (token.startOffset !== undefined && token.endOffset !== undefined) {
          expect(token.startOffset).toBeLessThan(input.length);
          expect(token.endOffset).toBeLessThanOrEqual(input.length);
          expect(token.startOffset).toBeLessThan(token.endOffset);
          
          // Verify token content matches input at specified positions
          const tokenContent = input.substring(token.startOffset, token.endOffset);
          expect(token.image).toBe(tokenContent);
        }
      }
    });

    test('should handle incomplete template variables', () => {
      const input = 'text {{incomplete_template';
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens.length).toBeGreaterThan(0);
      
      // Should tokenize text and template open, but template content extends to end
      const tokenTypes = result.tokens.map(t => t.tokenType);
      expect(tokenTypes).toContain(TextContent);
      expect(tokenTypes).toContain(TemplateOpen);
      expect(tokenTypes).toContain(TemplateContent);
    });

    test('should handle nested incomplete structures', () => {
      const input = '<task>{{variable<inner>content</inner>';
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens.length).toBeGreaterThan(0);
      
      // Verify continuous coverage of input
      let coveredLength = 0;
      for (const token of result.tokens) {
        if (token.tokenType !== Whitespace) {
          coveredLength += token.image.length;
        }
      }
      expect(coveredLength).toBeLessThanOrEqual(input.length);
    });

    test('should handle line and column tracking correctly', () => {
      const input = `line 1
line 2 <tag>
line 3 {{var}}`;
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens.length).toBeGreaterThan(0);
      
      // Find tag on line 2
      const tagToken = result.tokens.find(t => t.tokenType === TagOpen);
      expect(tagToken).toBeDefined();
      if (tagToken!.startLine !== undefined) {
        expect(tagToken!.startLine).toBe(2);
        expect(tagToken!.startColumn).toBe(8); // After "line 2 "
      }
      
      // Find template on line 3
      const templateToken = result.tokens.find(t => t.tokenType === TemplateOpen);
      expect(templateToken).toBeDefined();
      if (templateToken!.startLine !== undefined) {
        expect(templateToken!.startLine).toBe(3);
        expect(templateToken!.startColumn).toBe(8); // After "line 3 "
      }
    });

    test('should verify token boundaries do not overlap', () => {
      const input = '<task id="value">content</task>';
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens.length).toBeGreaterThan(0);
      
      // Sort tokens by start position
      const sortedTokens = [...result.tokens].sort((a, b) => a.startOffset - b.startOffset);
      
      // Verify no overlaps
      for (let i = 0; i < sortedTokens.length - 1; i++) {
        const current = sortedTokens[i];
        const next = sortedTokens[i + 1];
        expect(current.endOffset).toBeLessThanOrEqual(next.startOffset);
      }
    });

    test('should handle special characters in text content', () => {
      const input = 'text with @#$%^&*()[]{}|;:,.<>?/~`';
      const result = extendedPomlLexer.tokenize(input);
      
      expect(result.errors).toHaveLength(0);
      expect(result.tokens.length).toBeGreaterThan(0);
      
      // Should tokenize as text content
      const textTokens = result.tokens.filter(t => t.tokenType === TextContent);
      expect(textTokens.length).toBeGreaterThan(0);
      
      // Verify positions are correct
      for (const token of textTokens) {
        expect(token.startOffset).toBeLessThan(input.length);
        expect(token.endOffset).toBeLessThanOrEqual(input.length);
      }
    });
  });
});