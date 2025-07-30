import os
import poml
import weave
from openai import OpenAI

weave.init("intro-example")
poml.set_trace("weave", tempdir="logs")
messages = poml.poml("example_poml.poml", context={"code_path": "example_weave_original.py"})
messages = [{"role": "user" if m["speaker"] == "human" else "assistant", "content": m["content"]} for m in messages]

client = OpenAI(
    base_url=os.environ["OPENAI_API_BASE"],
    api_key=os.environ["OPENAI_API_KEY"],
)

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=messages,
)
