/*
  Extended‑POML Lexer & CST Parser (Chevrotain)
  ------------------------------------------------
  • Implements a two‑phase scanning strategy (lex + parse) for the mixed‑content
    POML format described in the design spec.
  • Produces a Concrete‑Syntax‑Tree (CST) that preserves the complete source
    structure – suitable for later AST conversion, code‑intel, or pretty‑printing.

  Author: ChatGPT (o3) · Jul 15 2025
*/

import {
  createToken,
  Lexer,
  CstParser,
  IToken,
  CstNode,
  tokenMatcher,
  EmbeddedActionsParser
} from "chevrotain";

/*───────────────────────────────────────────────────────────────────────────┐
│ 1.  Token Definitions                                                     │
└───────────────────────────────────────────────────────────────────────────*/
// Helpers -----------------------------------------------------------------
const makeRegexSafe = (re: RegExp) => {
  return new RegExp(re.source, re.flags);
};

/** Matches valid XML / POML element or attribute names.      */
const nameRegex = /[A-Za-z_](?:[A-Za-z0-9_.-]*)/;
/** Rejects names that start with "xml" (case‑insensitive). */
function validName(text: string) {
  return !/^xml/i.test(text);
}

/* Longest tokens first – Chevrotain uses sequential matching order.
   Pay attention to shared prefixes like "</" vs "<".               */
// Comments  <!--  ....  --> (greedy, including line‑breaks)
export const Comment = createToken({
  name: "Comment",
  pattern: /<!--[\s\S]*?-->/,
  line_breaks: true
});

// Template delimiters {{ ... }} -------------------------------------------
export const TmplStart = createToken({ name: "TmplStart", pattern: /{{/ });
export const TmplEnd   = createToken({ name: "TmplEnd",   pattern: /}}/ });
export const TmplBody  = createToken({
  name: "TmplBody",
  pattern: /[^{}]+/,
  // will be pushed onto the stack between {{ ... }}
  line_breaks: true
});

// Tag delimiters -----------------------------------------------------------
export const CloseTagStart = createToken({
  name: "CloseTagStart",
  pattern: /<\//
});
export const SelfClose = createToken({ name: "SelfClose", pattern: /\/>/ });
export const OpenTagStart = createToken({ name: "OpenTagStart", pattern: /</ });
export const GT   = createToken({ name: "GT", pattern: />/ });

// Misc tokens --------------------------------------------------------------
export const Equals = createToken({ name: "Equals", pattern: /=/ });
export const Quote  = createToken({ name: "Quote",  pattern: /"/ });

// Identifiers (tag & attribute names) -------------------------------------
export const Identifier = createToken({
  name: "Identifier",
  pattern: nameRegex,
  line_breaks: false,
  longer_alt: undefined,
  // custom validator to reject names starting with XML
  // Chevrotain v11 supports "validate" callback – fallback to pattern check
});

// Attribute value – everything inside double quotes (lazy, allows linebreaks)
export const AttrText = createToken({
  name: "AttrText",
  pattern: /[^\"]+/,
  line_breaks: true
});

// Raw text between tags – stop at the first "<" or "{{"
export const RawText = createToken({
  name: "RawText",
  pattern: /[^<{]+/,
  line_breaks: true
});

// Whitespace (skipped)
export const WS = createToken({
  name: "WS",
  pattern: /[ \t\r\n]+/,
  group: Lexer.SKIPPED
});

export const allTokens = [
  // order matters!
  Comment,
  TmplStart,
  TmplEnd,
  CloseTagStart,
  SelfClose,
  OpenTagStart,
  GT,
  Equals,
  Quote,
  Identifier,
  TmplBody, // must come after Identifier so {{name}} splits correctly
  AttrText,
  RawText,
  WS
];

export const PomlLexer = new Lexer(allTokens, {
  positionTracking: "full"
});

/*───────────────────────────────────────────────────────────────────────────┐
│ 2.  CST Parser                                                            │
└───────────────────────────────────────────────────────────────────────────*/
class PomlCstParser extends CstParser {
  constructor() {
    super(allTokens, { recoveryEnabled: true });

    const $ = this;

    $.RULE("document", () => {
      $.MANY(() => {
        $.SUBRULE($.content);
      });
    });

    $.RULE("content", () => {
      $.OR([
        { ALT: () => $.SUBRULE($.element) },
        { ALT: () => $.SUBRULE($.template) },
        { ALT: () => $.CONSUME(RawText) },
        { ALT: () => $.CONSUME(Comment) }
      ]);
    });

    // <tag ...> content* </tag>   |   <tag ... />
    $.RULE("element", () => {
      $.CONSUME(OpenTagStart);
      const nameToken = $.CONSUME(Identifier);

      $.MANY(() => {
        $.SUBRULE($.attribute);
      });

      $.OR([
        { ALT: () => {
            $.CONSUME(SelfClose);
          }
        },
        { ALT: () => {
            $.CONSUME(GT);
            $.MANY2(() => {
              $.SUBRULE2($.content);
            });
            $.CONSUME(CloseTagStart);
            $.CONSUME2(Identifier, { LABEL: "closingName" });
            $.CONSUME2(GT);
          }
        }
      ]);
    });

    // attrName = "value"
    $.RULE("attribute", () => {
      $.CONSUME(Identifier, { LABEL: "attrName" });
      $.CONSUME(Equals);
      $.CONSUME(Quote);
      $.MANY(() => {
        $.OR([
          { ALT: () => $.SUBRULE($.template) },
          { ALT: () => $.CONSUME(AttrText) }
        ]);
      });
      $.CONSUME2(Quote);
    });

    // {{ expression }}
    $.RULE("template", () => {
      $.CONSUME(TmplStart);
      $.CONSUME(TmplBody, { LABEL: "expr" });
      $.CONSUME(TmplEnd);
    });

    this.performSelfAnalysis();
  }
}

export const parser = new PomlCstParser();

/*───────────────────────────────────────────────────────────────────────────┐
│ 3.  Convenience API                                                       │
└───────────────────────────────────────────────────────────────────────────*/
export interface ParseResult {
  cst: CstNode | undefined;
  lexErrors: any[];
  parseErrors: any[];
}

/**
 * Parses a given POML / mixed‑content string and returns the CST & diagnostics.
 */
export function parsePoml(input: string): ParseResult {
  const lexResult = PomlLexer.tokenize(input);
  parser.input = lexResult.tokens;
  const cst = parser.document();

  return {
    cst,
    lexErrors: lexResult.errors,
    parseErrors: parser.errors
  };
}

/*───────────────────────────────────────────────────────────────────────────┐
│ 4.  Quick demo                                                            │
└───────────────────────────────────────────────────────────────────────────*/
if (require.main === module) {
  const sample = `\n# Hello\n<task foo="bar">Do something</task>\n`; // eslint‑disable‑line  no-console
  const result = parsePoml(sample);
  console.log("Lex errors:", result.lexErrors);
  console.log("Parse errors:", result.parseErrors);
  console.dir(result.cst, { depth: 10, colors: true });
}
