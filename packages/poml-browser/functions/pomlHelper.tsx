import React from 'react';
import { Paragraph } from 'poml/essentials';
import { Markup } from 'poml/presentation';
import { renderToReadableStream } from 'react-dom/server';
import { renderToString } from 'react-dom/server';

async function HiddenPomlIR() {
  // wait 1000ms
  await new Promise(resolve => setTimeout(resolve, 1000));

  return <Markup.Paragraph>
    This is a hidden Poml IR component. It is used to ensure that the Poml IR is correctly parsed
    and rendered in the browser.
  </Markup.Paragraph>
  // return irElement('env', {}, 'This is a hidden Poml IR component. It is used to ensure that the Poml IR is correctly parsed and rendered in the browser.');
  // return React.createElement(
    // Paragraph,
    // null,
    // 'This is a hidden Poml IR component. It is used to ensure that the Poml IR is correctly parsed and rendered in the browser.'
  // );
  // This is a hidden Poml IR component. It is used to ensure that the Poml IR is correctly parsed
  // and rendered in the browser.
  // </Paragraph>
}

function SimpleTest() {
  return <div>Simple test component</div>;
}

export default async function pomlHelper(): Promise<string> {
  // First try with simple component to debug
  try {
    const stream = await renderToReadableStream(<SimpleTest />, {
      onError: error => {
        console.error('Error during rendering:', error);
      }
    });
    await stream.allReady;
    const reader = stream.getReader();

    let result = '';
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value, { stream: true });
    }

    // Final decode with stream: false to flush any remaining bytes
    result += decoder.decode();

    console.log('Simple test result:', result);

    // console.log('Render to string:', renderToString(<HiddenPomlIR />));

    // If simple works, try POML component
    if (result.trim()) {
      const pomlStream = await renderToReadableStream(<HiddenPomlIR />, {
        onError: error => {
          console.error('Error during rendering:', error);
        }
      });
      await pomlStream.allReady;
      console.log('POML stream ready', pomlStream);
      const pomlReader = pomlStream.getReader();

      let pomlResult = '';
      const pomlDecoder = new TextDecoder();

      while (true) {
        const { done, value } = await pomlReader.read();
        if (done) break;
        pomlResult += pomlDecoder.decode(value, { stream: true });
      }

      pomlResult += pomlDecoder.decode();
      console.log('POML result:', pomlResult);

      return pomlResult || result; // fallback to simple test if POML fails
    }

    return result;
  } catch (error) {
    console.error('Rendering error:', error);
    return `<div>Error: ${error}</div>`;
  }
}
