import { describe, expect, test } from '@jest/globals';
import { createSegments, Segment } from '../reader/segment';

describe('createSegments', () => {
  test('pure text content', () => {
    const content = 'This is pure text content with no POML tags.';
    const segment = createSegments(content);
    
    expect(segment.kind).toBe('TEXT');
    expect(segment.content).toBe(content);
    expect(segment.start).toBe(0);
    expect(segment.end).toBe(content.length);
    expect(segment.children).toHaveLength(0);
  });

  test('single POML tag', () => {
    const content = '<task>Analyze the data</task>';
    const segment = createSegments(content);
    
    expect(segment.kind).toBe('POML');
    expect(segment.tagName).toBe('task');
    expect(segment.content).toBe(content);
    expect(segment.start).toBe(0);
    expect(segment.end).toBe(content.length);
  });

  test('mixed content with text and POML', () => {
    const content = `# My Analysis Document

This is a regular markdown document that explains the task.

<task>
  Analyze the following data and provide insights.
</task>

Here are some key points to consider:

- Data quality
- Statistical significance  
- Business impact`;

    const segment = createSegments(content);
    
    expect(segment.kind).toBe('TEXT');
    expect(segment.children).toHaveLength(4);
    
    const children = segment.children;
    expect(children[0].kind).toBe('TEXT');
    expect(children[0].content).toContain('# My Analysis Document');
    
    expect(children[1].kind).toBe('POML');
    expect(children[1].tagName).toBe('task');
    expect(children[1].content).toBe(`<task>
  Analyze the following data and provide insights.
</task>`);
    
    expect(children[2].kind).toBe('TEXT');
    expect(children[2].content).toContain('Here are some key points');
    
    expect(children[3].kind).toBe('TEXT');
    expect(children[3].content).toContain('- Data quality');
  });

  test('nested POML segments', () => {
    const content = `<examples syntax="json">
  <example>
    <input>Sample data point 1</input>
    <output>Analysis result 1</output>
  </example>
</examples>`;

    const segment = createSegments(content);
    
    expect(segment.kind).toBe('POML');
    expect(segment.tagName).toBe('examples');
    expect(segment.children).toHaveLength(0);
    expect(segment.content).toBe(content);
  });

  test('text in text', () => {
    const content = `<text>This is a text<text> with nested text content.</text></text>`;
    const segment = createSegments(content);
    expect(segment.kind).toBe('TEXT');
    expect(segment.content).toBe(content);
    expect(segment.children).toHaveLength(0);
  });

  test('text in text in POML', () => {
    const content = `<poml><text>This is a text<text> with nested text content.</text></text></poml>`;
    const segment = createSegments(content);
    expect(segment.kind).toBe('POML');  
    expect(segment.tagName).toBe('poml');
    expect(segment.children).toHaveLength(1);
    const textSegment = segment.children[0];
    expect(textSegment.kind).toBe('TEXT');
    expect(textSegment.content).toBe('This is a text<text> with nested text content.</text>');
  });

  test('nested same tag in POML', () => {
    const content = `<task>Process data<task> with nested task content.</task></task>`;
    const segment = createSegments(content);
    expect(segment.kind).toBe('POML');
    expect(segment.tagName).toBe('poml');
    expect(segment.children).toHaveLength(0);
    expect(segment.content).toBe('<task>Process data<task> with nested task content.</task></task>');
  });

  test('text tag with nested content', () => {
    const content = `<poml>
  <task>Process the following data</task>
  <text>
    This is **markdown** content that will be processed as pure text.
    
    - Item 1
    - Item 2

    <cp caption="Nested POML">This is a nested POML component that will be processed as POML.</cp>

    No POML processing happens here.
  </text>
  <hint>Remember to check the format</hint>
</poml>`;

    const segment = createSegments(content);
    
    expect(segment.kind).toBe('POML');
    expect(segment.tagName).toBe('poml');
    expect(segment.children).toHaveLength(4);
    
    const textSegment = segment.children.find(c => c.kind === 'POML' && c.tagName === 'text');
    expect(textSegment).toBeDefined();
    expect(textSegment!.children).toHaveLength(3);
    
    const nestedCpSegment = textSegment!.children.find(c => c.kind === 'POML' && c.tagName === 'cp');
    expect(nestedCpSegment).toBeDefined();
    expect(nestedCpSegment!.content).toBe('<cp caption="Nested POML">This is a nested POML component that will be processed as POML.</cp>');
  });

  test('meta tags', () => {
    const content = `<meta name="author">John Doe</variable>
  <stylesheet>
    { "task": { "captionStyle": "bold" } }
  </stylesheet>
</meta>

<task>Complete the analysis</task>`;

    const segment = createSegments(content);
    
    expect(segment.kind).toBe('TEXT');
    expect(segment.children).toHaveLength(3);
    
    const metaSegment = segment.children.find(c => c.kind === 'META');
    expect(metaSegment).toBeDefined();
    expect(metaSegment!.tagName).toBe('meta');
    expect(metaSegment!.children).toHaveLength(0);
    
    const taskSegment = segment.children.find(c => c.kind === 'POML' && c.tagName === 'task');
    expect(taskSegment).toBeDefined();
  });

  test('invalid tags are ignored', () => {
    const content = `<invalid-tag>This should be ignored</invalid-tag>
<task>This should be processed</task>
<random>This should also be ignored</random>`;

    const segment = createSegments(content);
    
    expect(segment.kind).toBe('TEXT');
    expect(segment.children).toHaveLength(3);
    
    const taskSegment = segment.children.find(c => c.kind === 'POML');
    expect(taskSegment).toBeDefined();
    expect(taskSegment!.tagName).toBe('task');
    
    const textSegments = segment.children.filter(c => c.kind === 'TEXT');
    expect(textSegments).toHaveLength(2);
    expect(textSegments[0].content).toContain('<invalid-tag>This should be ignored</invalid-tag>');
    expect(textSegments[1].content).toContain('<random>This should also be ignored</random>');
  });

  test('self-closing tags are ignored', () => {
    const content = `<task>Valid task</task>
<br />
<img src="test.jpg" />
<hint>Valid hint</hint>`;

    const segment = createSegments(content);
    
    expect(segment.kind).toBe('TEXT');
    expect(segment.children).toHaveLength(4);
    
    const pomlSegments = segment.children.filter(c => c.kind === 'POML');
    expect(pomlSegments).toHaveLength(3);
    expect(pomlSegments[0].tagName).toBe('task');
    expect(pomlSegments[2].tagName).toBe('hint');
  });

  test('malformed tags are handled gracefully', () => {
    const content = `<task>Incomplete tag
<hint>Complete hint</hint>
<unclosed>This has no closing tag`;

    const segment = createSegments(content);
    
    expect(segment.kind).toBe('TEXT');
    expect(segment.children).toHaveLength(3);
    
    const hintSegment = segment.children.find(c => c.kind === 'POML' && c.tagName === 'hint');
    expect(hintSegment).toBeDefined();
    expect(hintSegment!.content).toBe('<hint>Complete hint</hint>');
    
    const textSegments = segment.children.filter(c => c.kind === 'TEXT');
    expect(textSegments).toHaveLength(2);
    expect(textSegments[0].content).toBe('<task>Incomplete tag\n');
    expect(textSegments[1].content).toBe('\n<unclosed>This has no closing tag');
  });

  test('malformed POML tags are ignored', () => {
    const content = `<task>Valid task`;
    const segment = createSegments(content);
    
    expect(segment.kind).toBe('TEXT');
    expect(segment.children).toHaveLength(0);
  });

  test('empty content', () => {
    const content = '';
    const segment = createSegments(content);
    
  });

  test('whitespace-only content', () => {
    const content = '   \n\n\t  \n  ';
    const segment = createSegments(content);
    
    expect(segment.kind).toBe('TEXT');
    expect(segment.content).toBe(content);
    expect(segment.children).toHaveLength(0);
  });

  test('hyphenated tag names', () => {
    const content = `<output-format>JSON format</output-format>
<system-msg>System message</system-msg>
<user-msg>User message</user-msg>`;

    const segment = createSegments(content);
    
    expect(segment.kind).toBe('TEXT');
    expect(segment.children).toHaveLength(4);
    
    const pomlSegments = segment.children.filter(c => c.kind === 'POML');
    expect(pomlSegments).toHaveLength(3);
    expect(pomlSegments[0].tagName).toBe('output-format');
    expect(pomlSegments[1].tagName).toBe('system-msg');
    expect(pomlSegments[2].tagName).toBe('user-msg');
  });

  test('parent-child relationships', () => {
    const content = `<task>
  <hint>This is a hint</hint>
  Some text
  <examples>
    <example>Example 1</example>
  </examples>
</task>`;

    const segment = createSegments(content);
    
    const taskSegment = segment;
    expect(taskSegment.kind).toBe('POML');
    expect(taskSegment.tagName).toBe('task');
    expect(taskSegment.parent).toBeUndefined();
    
    const hintSegment = taskSegment.children.find(c => c.kind === 'POML' && c.tagName === 'hint');
    expect(hintSegment).toBeDefined();
    expect(hintSegment!.parent).toBe(taskSegment);
    
    const examplesSegment = taskSegment.children.find(c => c.kind === 'POML' && c.tagName === 'examples');
    expect(examplesSegment).toBeDefined();
    expect(examplesSegment!.parent).toBe(taskSegment);
    
    const exampleSegment = examplesSegment!.children.find(c => c.kind === 'POML' && c.tagName === 'example');
    expect(exampleSegment).toBeDefined();
    expect(exampleSegment!.parent).toBe(examplesSegment);
  });

  test('segment IDs are unique', () => {
    const content = `<task>First task</task>
<task>Second task</task>
<hint>A hint</hint>`;

    const segment = createSegments(content);
    expect(segment.kind).toBe('TEXT');
    expect(segment.children).toHaveLength(5);
    
    function collectAllSegments(segment: Segment): Segment[] {
      const all = [segment];
      segment.children.forEach(child => {
        all.push(...collectAllSegments(child));
      });
      return all;
    }
    
    const allSegments = collectAllSegments(segment);
    const ids = allSegments.map(s => s.id);
    const uniqueIds = new Set(ids);
    
    expect(uniqueIds.size).toBe(ids.length);
  });

  test('path parameter is preserved', () => {
    const content = '<task>Test task</task>';
    const path = '/test/path/file.poml';
    const segment = createSegments(content, path);
    
    expect(segment.path).toBe(path);
    expect(segment.children[0].path).toBe(path);
  });

  test('complex example from specification', () => {
    const content = `<poml>
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

<p>POML elements do not necessarily reside in a poml element.</p>`;

    const segment = createSegments(content);
    
    expect(segment.kind).toBe('TEXT');
    expect(segment.children).toHaveLength(5);
    
    const firstPomlSegment = segment.children.find(c => c.kind === 'POML' && c.tagName === 'poml');
    expect(firstPomlSegment).toBeDefined();
    expect(firstPomlSegment!.children).toHaveLength(4);
    
    const textSegment = firstPomlSegment!.children.find(c => c.kind === 'POML' && c.tagName === 'text');
    expect(textSegment).toBeDefined();
    expect(textSegment!.children).toHaveLength(3);
    
    const cpSegment = textSegment!.children.find(c => c.kind === 'POML' && c.tagName === 'cp');
    expect(cpSegment).toBeDefined();
    
    const secondPomlSegment = segment.children.filter(c => c.kind === 'POML' && c.tagName === 'poml')[1];
    expect(secondPomlSegment).toBeDefined();

    const lineBreakSegment = segment.children[3];
    expect(lineBreakSegment.kind).toBe('TEXT');
    expect(lineBreakSegment.content).toBe('\n\n');

    const pSegment = segment.children.find(c => c.kind === 'POML' && c.tagName === 'p');
    expect(pSegment).toBeDefined();
  });
});