export interface Segment {
  // Unique ID for caching and React keys
  id: string;
  kind: 'META' | 'TEXT' | 'POML';
  start: number;
  end: number;
  // The raw string content of the segment
  content: string;
  // The path to the file or resource this segment belongs to
  path?: string;
  // Reference to the parent segment
  parent?: Segment;
  // Nested segments (e.g., a POML block within text)
  children: Segment[];
  // For POML segments, the name of the root tag (e.g., 'task')
  tagName?: string;
}

export function createSegments(content: string, path?: string): Segment[] {
  throw new Error('createSegments is not implemented yet');
}
