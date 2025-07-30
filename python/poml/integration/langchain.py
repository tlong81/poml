from pathlib import Path
from typing import Union
from poml.api import poml
from langchain.prompts import PromptTemplate
from langchain_core.messages import messages_from_dict
from langchain_core.prompt_values import ChatPromptValue


def poml_formatter(markup: Union[str, Path], context: dict | None = None):
    messages = poml(markup, context=context, format="dict")
    converted_messages = [{"type": msg["speaker"], "data": {"content": msg["content"]}} for msg in messages]
    return messages_from_dict(converted_messages)


class LangchainPomlTemplate(PromptTemplate):

    template_file: Union[str, Path, None] = None

    @classmethod
    def from_file(cls, template_file: Union[str, Path], **kwargs) -> "LangchainPomlTemplate":
        instance = super().from_file(template_file, **kwargs)
        instance.template_file = template_file
        return instance

    def format(self, **kwargs):
        kwargs = self._merge_partial_and_user_variables(**kwargs)
        if self.template_file:
            return poml_formatter(self.template_file, kwargs)
        else:
            return poml_formatter(self.template, kwargs)

    def format_prompt(self, **kwargs):
        """Format the prompt with the given kwargs."""
        formatted_messages = self.format(**kwargs)
        return ChatPromptValue(messages=formatted_messages)
