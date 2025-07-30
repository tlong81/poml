from pathlib import Path
from typing import Union, Any
from typing_extensions import override
from poml.api import poml
from langchain_core.prompts import PromptTemplate
from langchain_core.messages import messages_from_dict
from langchain_core.prompt_values import ChatPromptValue, StringPromptValue


def poml_formatter(markup: Union[str, Path], context: dict | None = None):
    messages = poml(markup, context=context, format="dict")
    converted_messages = [{"type": msg["speaker"], "data": {"content": msg["content"]}} for msg in messages]
    return messages_from_dict(converted_messages)


class LangchainPomlTemplate(PromptTemplate):

    template_file: Union[str, Path, None] = None
    speaker_mode: bool = False

    @property
    @override
    def lc_attributes(self) -> dict[str, Any]:
        return {
            "template_file": self.template_file,
            # Template format is not used
            # "template_format": self.template_format,
        }

    @classmethod
    @override
    def get_lc_namespace(cls) -> list[str]:
        return ["poml", "integration", "langchain"]

    @classmethod
    def from_examples(cls, *args, **kwargs):
        raise NotImplementedError(
            "LangchainPomlTemplate does not support from_examples. Use from_template or from_file instead."
        )

    @classmethod
    def from_file(
        cls, template_file: Union[str, Path], *args, speaker_mode: bool = False, **kwargs
    ) -> "LangchainPomlTemplate":
        instance: LangchainPomlTemplate = super().from_file(template_file, **kwargs)  # type: ignore
        instance.template_file = template_file
        return instance

    @classmethod
    def from_template(cls, *args, speaker_mode: bool = False, **kwargs) -> "LangchainPomlTemplate":
        instance: LangchainPomlTemplate = super().from_template(*args, **kwargs)  # type: ignore
        instance.speaker_mode = speaker_mode
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
        if self.speaker_mode:
            return StringPromptValue(value=formatted_messages)
        else:
            return ChatPromptValue(messages=formatted_messages)
