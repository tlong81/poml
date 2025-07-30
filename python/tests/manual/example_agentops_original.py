import os
from openai import OpenAI
import agentops

agentops.init()
client = OpenAI(
    base_url=os.environ["OPENAI_API_BASE"],
    api_key=os.environ["OPENAI_API_KEY"],
)


response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{
        "role": "user",
        "content": "Write a haiku about AI and humans working together"
    }]
)

print(response.choices[0].message.content)
agentops.end_session('Success')
