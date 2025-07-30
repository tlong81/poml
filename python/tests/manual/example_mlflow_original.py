import mlflow
import mlflow.openai
import openai
from openai import OpenAI
import os

# Set up MLflow experiment
mlflow.set_experiment("openai-tracing-quickstart")

# Enable automatic tracing for all OpenAI API calls
mlflow.openai.autolog()

client = OpenAI(
    base_url=os.environ["OPENAI_API_BASE"],
    api_key=os.environ["OPENAI_API_KEY"],
)


def get_weather_response(location):
    """Get a weather-related response for a given location."""
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a helpful weather assistant."},
            {"role": "user", "content": f"What's the weather like in {location}?"},
        ],
        max_tokens=100,
        temperature=0.7,
    )
    return response.choices[0].message.content


# Execute the traced function
location = "San Francisco"
response = get_weather_response(location)

print(f"Query: What's the weather like in {location}?")
print(f"Response: {response}")
print("\nTraces have been captured!")
print("View them in the MLflow UI at: http://127.0.0.1:5000 (or your MLflow server URL)")
