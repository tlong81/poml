import base64
from pathlib import Path

import poml
from poml.api import (
    PomlMessage, 
    ContentMultiMedia, 
    ContentMultiMediaToolRequest, 
    ContentMultiMediaToolResponse,
    _poml_response_to_openai_chat,
    _poml_response_to_langchain
)


PNG_DATA = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
)
BASE64_PREFIX = PNG_DATA[:28]


def _create_image(tmp_path: Path) -> Path:
    img_path = tmp_path / "tiny.png"
    img_path.write_bytes(base64.b64decode(PNG_DATA))
    return img_path


def test_poml_format_dict(tmp_path: Path):
    img_path = _create_image(tmp_path)
    markup = f'<p>Image <img src="{img_path}" alt="tiny" syntax="multimedia"/></p>'
    result = poml.poml(markup, format="dict")
    assert result[0]["speaker"] == "human"
    assert result[0]["content"][0] == "Image "
    img = result[0]["content"][1]
    assert img["type"] == "image/png"
    assert img["alt"] == "tiny"
    assert img["base64"].startswith(BASE64_PREFIX)


def test_poml_format_pydantic(tmp_path: Path):
    img_path = _create_image(tmp_path)
    markup = f'<p>Image <img src="{img_path}" alt="tiny" syntax="multimedia"/></p>'
    result = poml.poml(markup, format="pydantic")
    msg = result[0]
    assert isinstance(msg, PomlMessage)
    assert msg.speaker == "human"
    assert msg.content[0] == "Image "
    image = msg.content[1]
    assert isinstance(image, ContentMultiMedia)
    assert image.type == "image/png"
    assert image.alt == "tiny"
    assert image.base64.startswith(BASE64_PREFIX)


def test_poml_format_openai_chat(tmp_path: Path):
    img_path = _create_image(tmp_path)
    markup = f'<p>Image <img src="{img_path}" alt="tiny" syntax="multimedia"/></p>'
    result = poml.poml(markup, format="openai_chat")
    msg = result[0]
    assert msg["role"] == "user"
    assert msg["content"][0] == {"type": "text", "text": "Image "}
    image = msg["content"][1]
    assert image["type"] == "image_url"
    url = image["image_url"]["url"]
    assert url.startswith("data:image/png;base64," + BASE64_PREFIX)


def test_poml_format_langchain(tmp_path: Path):
    img_path = _create_image(tmp_path)
    markup = f'<p>Image <img src="{img_path}" alt="tiny" syntax="multimedia"/></p>'
    result = poml.poml(markup, format="langchain")
    msg = result[0]
    assert msg["type"] == "human"
    first = msg["data"]["content"][0]
    assert first == {"type": "text", "text": "Image "}
    image = msg["data"]["content"][1]
    assert image["type"] == "image"
    assert image["source_type"] == "base64"
    assert image["mime_type"] == "image/png"
    assert image["data"].startswith(BASE64_PREFIX)


def test_tool_call_openai_conversion():
    """Test tool call conversion to OpenAI format"""
    markup = '''<poml>
    <human-msg>Search for Python</human-msg>
    <tool-request id="call_123" name="search" parameters="{{ { query: 'Python' } }}" />
    <tool-response id="call_123" name="search">Python is a language.</tool-response>
    </poml>'''
    
    result = poml.poml(markup, format="openai_chat")
    expected = [
        {"role": "user", "content": "Search for Python"},
        {
            "role": "assistant", 
            "tool_calls": [{
                "id": "call_123",
                "type": "function", 
                "function": {"name": "search", "arguments": '{"query": "Python"}'}
            }]
        },
        {"role": "tool", "content": "Python is a language.", "tool_call_id": "call_123"}
    ]
    assert result == expected


def test_tool_call_langchain_conversion():
    """Test tool call conversion to Langchain format"""
    markup = '''<poml>
    <tool-request id="call_456" name="calculate" parameters="{{ { expression: '2 + 2' } }}" />
    <tool-response id="call_456" name="calculate">4</tool-response>
    </poml>'''
    
    result = poml.poml(markup, format="langchain")
    expected = [
        {
            "type": "ai",
            "data": {
                "tool_calls": [{
                    "id": "call_456",
                    "name": "calculate", 
                    "args": {"expression": "2 + 2"}
                }]
            }
        },
        {
            "type": "tool",
            "data": {
                "content": "4",
                "tool_call_id": "call_456",
                "name": "calculate"
            }
        }
    ]
    assert result == expected
