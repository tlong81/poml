"""Minimal POML Python sanity check.

Parses a simple <p> tag and verifies the output.
"""
from poml import poml

output = poml('<p>hello world</p>')
if 'hello world' not in str(output):
    raise RuntimeError(f'Unexpected output: {output}')
print(output)
