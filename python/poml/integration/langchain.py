from pathlib import Path
from typing import Union, Any
from typing_extensions import override
from poml.api import poml
from langchain_core.prompts import PromptTemplate
from langchain_core.messages import messages_from_dict
from langchain_core.prompt_values import ChatPromptValue, StringPromptValue


def poml_formatter(markup: Union[str, Path], speaker_mode: bool, context: dict | None = None):
    messages = poml(markup, chat=speaker_mode, context=context, format="langchain")
    return messages_from_dict(messages)


class LangchainPomlTemplate(PromptTemplate):

    template_file: Union[str, Path, None] = None
    speaker_mode: bool = True

    @property
    @override
    def lc_attributes(self) -> dict[str, Any]:
        return {
            "template_file": self.template_file,
            "speaker_mode": self.speaker_mode,
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
        cls, template_file: Union[str, Path], *args, speaker_mode: bool = True, **kwargs
    ) -> "LangchainPomlTemplate":
        instance: LangchainPomlTemplate = super().from_file(template_file, **kwargs)  # type: ignore
        instance.template_file = template_file
        instance.speaker_mode = speaker_mode
        return instance

    @classmethod
    def from_template(cls, *args, speaker_mode: bool = True, **kwargs) -> "LangchainPomlTemplate":
        instance: LangchainPomlTemplate = super().from_template(*args, **kwargs)  # type: ignore
        instance.speaker_mode = speaker_mode
        return instance

    def format(self, **kwargs) -> Union[ChatPromptValue, StringPromptValue]:  # type: ignore
        kwargs = self._merge_partial_and_user_variables(**kwargs)
        if self.template_file:
            formatted_messages = poml_formatter(self.template_file, self.speaker_mode, kwargs)
        else:
            formatted_messages = poml_formatter(self.template, self.speaker_mode, kwargs)
        if self.speaker_mode:
            return ChatPromptValue(messages=formatted_messages)
        else:
            if len(formatted_messages) == 1:
                if isinstance(formatted_messages[0].content, str):
                    return StringPromptValue(text=formatted_messages[0].content)
                elif isinstance(formatted_messages[0].content, list):
                    # If the content is a list, we assume it's a single message with multiple parts.
                    if len(formatted_messages[0].content) == 1:
                        # If there's only one part, return it as a StringPromptValue
                        if isinstance(formatted_messages[0].content[0], str):
                            return StringPromptValue(text=formatted_messages[0].content[0])
                        else:
                            raise ValueError(
                                f"Unsupported content type for non-speaker mode: {formatted_messages[0].content[0]}"
                            )
                    else:
                        raise ValueError(
                            f"Multi-part contents is not supported for non-speaker mode: {formatted_messages[0].content}"
                        )
                else:
                    raise ValueError(f"Unsupported content type for non-speaker mode: {formatted_messages[0].content}")
            else:
                raise ValueError(
                    f"Multiple messages returned, but non-speaker mode requires a single message: {formatted_messages}"
                )

    def format_prompt(self, **kwargs):
        return self.format(**kwargs)
