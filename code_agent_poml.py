"""
Code Agent with OpenAI Python SDK

A code agent that can analyze repositories, understand queries, and perform code operations
while maintaining memory of what has been done to avoid redundant operations.
"""

import os
import json
import logging
import requests
from typing import Dict, List, Optional, Set, Any
from pathlib import Path
from dataclasses import dataclass, field

from openai import AzureOpenAI
from pydantic import BaseModel, Field
from typing import Literal, TypedDict

import poml


class ThoughtProcess(BaseModel):
    """Chain of Thought reasoning for the agent's decision making"""

    observation: str = Field(description="What I observe from the current state and context")
    analysis: str = Field(description="Analysis of what needs to be done to accomplish the goal")
    plan: str = Field(description="My specific plan for the next action")


class ExploreAction(BaseModel):
    """Parameters for exploring directories and reading files"""

    directories: List[str] = Field(
        default_factory=list, description="Directories to walk and explore for relevant files, relative to repository root"
    )
    files: List[str] = Field(
        default_factory=list,
        description="Specific files to read (can be discovered from directory walking or known paths), relative to repository root",
    )


class FileEditAction(BaseModel):
    """Parameters for editing an existing file"""

    file_path: str = Field(description="Path to the file to edit relative to repository root")
    content: str = Field(description="Complete new content for the file")


class FileAddAction(BaseModel):
    """Parameters for adding a new file"""

    file_path: str = Field(description="Path for the new file relative to repository root")
    content: str = Field(description="Content for the new file")


class FileRemoveAction(BaseModel):
    """Parameters for removing a file"""

    file_path: str = Field(description="Path to the file to remove relative to repository root")


@dataclass
class AgentMemory:
    """Memory system to track agent operations and avoid redundancy"""

    read_files: Set[str] = field(default_factory=set)
    edited_files: Set[str] = field(default_factory=set)
    walked_directories: Set[str] = field(default_factory=set)
    file_contents_cache: Dict[str, str] = field(default_factory=dict)
    conversation_history: List[Dict[str, Any]] = field(default_factory=list)
    important_findings: List[str] = field(default_factory=list)


class AgentAction(BaseModel):
    """Unified action model with Chain of Thought reasoning"""

    thought_process: ThoughtProcess = Field(description="Chain of thought reasoning for this decision")

    action_type: Literal["explore", "edit_file", "add_file", "remove_file"] = Field(
        description="Type of action to perform"
    )

    # Action-specific parameters (only one should be populated based on action_type)
    explore: Optional[ExploreAction] = Field(
        default=None, description="Parameters for explore action (walk directories + read files)"
    )
    edit_file: Optional[FileEditAction] = Field(default=None, description="Parameters for editing a file")
    add_file: Optional[FileAddAction] = Field(default=None, description="Parameters for adding a new file")
    remove_file: Optional[FileRemoveAction] = Field(default=None, description="Parameters for removing a file")

    findings: List[str] = Field(
        default_factory=list, description="List of important findings or observations made during this action. "
                                          "Make it empty if there are no findings."
    )

    complete: bool = Field(
        default=False, description="Set to true if the task is complete and no more actions are needed"
    )


class FileRequest(TypedDict):
    """Request for a file from the agent"""

    relative_path: str
    absolute_path: str


class CodeAgent:
    """Main code agent class for analyzing and modifying repositories"""

    def __init__(
        self,
        repo_path: str,
        query: str,
        github_issue: Optional[str] = None,
        api_key: Optional[str] = None,
        azure_endpoint: Optional[str] = None,
        api_version: str = "2025-04-01-preview",
        model: str = "gpt-4o",
        debug: bool = False,
    ):
        """
        Initialize the code agent

        Args:
            repo_path: Path to the repository to analyze
            query: The user's query/task to accomplish
            github_issue: Optional GitHub issue context
            api_key: Azure OpenAI API key (if not set in environment)
            azure_endpoint: Azure OpenAI endpoint (if not set in environment)
            api_version: Azure OpenAI API version
            model: Azure OpenAI model deployment name to use
        """
        self.repo_path = Path(repo_path).resolve()
        self.query = query
        self.github_issue = github_issue
        self.model = model
        self.debug = debug
        self.memory = AgentMemory()
        self.requested_files: List[dict] = []
        self.requested_dirs: List[dict] = []

        # Initialize Azure OpenAI client
        endpoint = azure_endpoint or os.getenv("AZURE_OPENAI_ENDPOINT")
        if not endpoint:
            raise ValueError(
                "Azure OpenAI endpoint must be provided via parameter or AZURE_OPENAI_ENDPOINT environment variable"
            )

        self.client = AzureOpenAI(
            api_key=api_key or os.getenv("AZURE_OPENAI_API_KEY"), azure_endpoint=endpoint, api_version=api_version
        )

        # Setup logging
        logging.basicConfig(level=logging.DEBUG if debug else logging.INFO,
                            format="%(asctime)s - %(levelname)s - %(name)s - %(message)s")
        self.logger = logging.getLogger(__name__)

        # Enable debug logging for this module only when debug=True
        if debug:
            self.logger.setLevel(logging.DEBUG)
            # Suppress debug logging from third-party packages
            logging.getLogger("openai").setLevel(logging.WARNING)
            logging.getLogger("requests").setLevel(logging.WARNING)
            logging.getLogger("urllib3").setLevel(logging.WARNING)
            logging.getLogger("httpcore").setLevel(logging.WARNING)
            logging.getLogger("httpx").setLevel(logging.WARNING)

            poml.set_trace(tempdir="logs")

        # Validate repository path
        if not self.repo_path.exists():
            raise ValueError(f"Repository path does not exist: {repo_path}")

        self.logger.info(f"Initialized CodeAgent for repo: {self.repo_path}")
        self.logger.info(f"Query: {self.query}")
        if self.github_issue:
            self.logger.info(f"GitHub Issue: {self.github_issue}")

    def _validate_path_in_repo(self, file_path: str) -> bool:
        """
        Validate that a file path is within the repository boundaries for safety

        Args:
            file_path: Path to validate (relative to repo root)

        Returns:
            True if path is safe and within repo, False otherwise
        """
        try:
            full_path = self.repo_path / file_path
            resolved_path = full_path.resolve()
            repo_resolved = self.repo_path.resolve()

            # Check if the resolved path is within the repository
            return str(resolved_path).startswith(str(repo_resolved))
        except Exception:
            return False

    def edit_file(self, file_path: str, new_content: str) -> bool:
        """
        Edit a file by regenerating it

        Args:
            file_path: Path to file relative to repo root
            new_content: New content for the file

        Returns:
            True if edit was successful, False otherwise
        """
        # Validate path is within repository for safety
        if not self._validate_path_in_repo(file_path):
            self.logger.error(f"Path outside repository boundaries: {file_path}")
            return False

        full_path = self.repo_path / file_path

        if not full_path.exists():
            self.logger.error(f"Cannot edit non-existent file: {full_path}")
            return False

        try:
            # Write new content
            with open(full_path, "w", encoding="utf-8") as f:
                f.write(new_content)

            self.memory.edited_files.add(file_path)
            self.memory.file_contents_cache[file_path] = new_content

            self.logger.info(f"Successfully edited file: {file_path}")
            return True

        except Exception as e:
            self.logger.error(f"Error editing file {full_path}: {e}")
            return False

    def add_file(self, file_path: str, content: str) -> bool:
        """
        Add a new file to the repository

        Args:
            file_path: Path for new file relative to repo root
            content: Content of the new file

        Returns:
            True if file was created successfully, False otherwise
        """
        # Validate path is within repository for safety
        if not self._validate_path_in_repo(file_path):
            self.logger.error(f"Path outside repository boundaries: {file_path}")
            return False

        full_path = self.repo_path / file_path

        if full_path.exists():
            self.logger.error(f"File already exists: {full_path}")
            return False

        try:
            # Create parent directories if needed
            full_path.parent.mkdir(parents=True, exist_ok=True)

            with open(full_path, "w", encoding="utf-8") as f:
                f.write(content)

            self.memory.file_contents_cache[file_path] = content
            self.logger.info(f"Successfully added file: {file_path}")
            return True

        except Exception as e:
            self.logger.error(f"Error adding file {full_path}: {e}")
            return False

    def remove_file(self, file_path: str) -> bool:
        """
        Remove a file from the repository

        Args:
            file_path: Path to file to remove, relative to repo root

        Returns:
            True if file was removed successfully, False otherwise
        """
        # Validate path is within repository for safety
        if not self._validate_path_in_repo(file_path):
            self.logger.error(f"Path outside repository boundaries: {file_path}")
            return False

        full_path = self.repo_path / file_path

        if not full_path.exists():
            self.logger.error(f"Cannot remove non-existent file: {full_path}")
            return False

        try:
            full_path.unlink()

            # Clean up memory
            if file_path in self.memory.file_contents_cache:
                del self.memory.file_contents_cache[file_path]
            self.memory.read_files.discard(file_path)
            self.memory.edited_files.discard(file_path)

            self.logger.info(f"Successfully removed file: {file_path}")
            return True

        except Exception as e:
            self.logger.error(f"Error removing file {full_path}: {e}")
            return False

    def _call_azure_openai(self, messages: List[Dict[str, str]], response_format: Optional[type] = None) -> Any:
        """
        Call Azure OpenAI API with messages and optional structured output

        Args:
            messages: List of message dictionaries
            response_format: Optional Pydantic model for structured output

        Returns:
            Response content or parsed structured output
        """
        try:
            if response_format:
                # Use JSON mode and manual parsing for Azure OpenAI
                response = self.client.chat.completions.parse(  # type: ignore
                    model=self.model,
                    messages=messages,
                    response_format=response_format,
                )
                content = response.choices[0].message.parsed
                if content:
                    return content
                return None
            else:
                # Regular completion
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,  # type: ignore
                )
                content = response.choices[0].message.content
                return content if content is not None else ""

        except Exception as e:
            self.logger.error(f"Error calling Azure OpenAI API: {e}")
            return "" if not response_format else None

    def decide_next_action(self) -> Optional[AgentAction]:
        """
        Use Azure OpenAI to decide the next action based on current state

        Returns:
            Next action to take, or None if task is complete
        """

        context = {
            "task": self.query,
            "repo_path": str(self.repo_path),
            "github_issue": self.github_issue or "",
            "memory": {
                "read_files": list(self.memory.read_files),
                "edited_files": list(self.memory.edited_files),
                "walked_directories": list(self.memory.walked_directories),
                "important_findings": list(self.memory.important_findings),
            },
            "requested_files": self.requested_files,
            "requested_dirs": self.requested_dirs,
        }
        messages = poml.poml("prompts/code_agent.poml", context=context)
        self.logger.debug("=== Deciding next action with messages: ===\n" + messages[-1]["content"])

        messages = [{
            "role": "user" if msg["speaker"] == "human" else "system",
            "content": msg["content"]
        } for msg in messages]

        # Use structured output with Pydantic model
        response = self._call_azure_openai(messages, response_format=AgentAction)

        self.logger.debug(f"=== Received response: ===\n{response}")

        if not response:
            return None

        # If task is complete, return None
        if response.complete:
            return None

        return response

    def execute_action(self, action: AgentAction) -> bool:
        """
        Execute an agent action with Chain of Thought logging

        Args:
            action: The action to execute

        Returns:
            True if action was successful, False otherwise
        """
        # Log the Chain of Thought reasoning
        self.logger.info(f"=== Executing {action.action_type} action ===")
        self.logger.info(f"Observation: {action.thought_process.observation}")
        self.logger.info(f"Analysis: {action.thought_process.analysis}")
        self.logger.info(f"Plan: {action.thought_process.plan}")
        self.logger.info(f"Findings: {action.findings}")
        self.memory.important_findings.extend(action.findings)
        self.requested_dirs = []
        self.requested_files = []

        try:
            if action.action_type == "explore":
                if not action.explore:
                    self.logger.error("Explore action missing parameters")
                    return False

                for dir_path in action.explore.directories:
                    if not self._validate_path_in_repo(dir_path):
                        self.logger.error(f"Directory outside repository boundaries: {dir_path}")
                        continue
                    full_dir_path = self.repo_path / dir_path
                    if full_dir_path.exists() and full_dir_path.is_dir():
                        self.memory.walked_directories.add(dir_path)
                        self.requested_dirs.append({
                            "relative_path": dir_path,
                            "absolute_path": str(full_dir_path.resolve())
                        })
                        self.logger.info(f"Exploring directory: {dir_path}")
                    else:
                        self.logger.warning(f"Directory not found or inaccessible: {dir_path}")

                for file_path in action.explore.files:
                    if not self._validate_path_in_repo(file_path):
                        self.logger.error(f"File outside repository boundaries: {file_path}")
                        continue
                    full_file_path = self.repo_path / file_path
                    if full_file_path.exists() and full_file_path.is_file():
                        self.memory.read_files.add(file_path)
                        self.requested_files.append({
                            "relative_path": file_path,
                            "absolute_path": str(full_file_path.resolve())
                        })
                        self.logger.info(f"Reading file: {file_path}")
                    else:
                        self.logger.warning(f"File not found or inaccessible: {file_path}")

                return True

            elif action.action_type == "edit_file":
                if not action.edit_file:
                    self.logger.error("Edit file action missing parameters")
                    return False

                return self.edit_file(action.edit_file.file_path, action.edit_file.content)

            elif action.action_type == "add_file":
                if not action.add_file:
                    self.logger.error("Add file action missing parameters")
                    return False

                return self.add_file(action.add_file.file_path, action.add_file.content)

            elif action.action_type == "remove_file":
                if not action.remove_file:
                    self.logger.error("Remove file action missing parameters")
                    return False

                return self.remove_file(action.remove_file.file_path)

            else:
                self.logger.error(f"Unknown action type: {action.action_type}")
                return False

        except Exception as e:
            self.logger.error(f"Error executing action: {e}")
            return False

    def run(self, max_iterations: int = 20) -> Dict[str, Any]:
        """
        Main execution loop for the agent

        Args:
            max_iterations: Maximum number of actions to take

        Returns:
            Summary of what the agent accomplished
        """
        self.logger.info("Starting code agent execution")

        iterations = 0
        actions_taken = []

        while iterations < max_iterations:
            iterations += 1
            self.logger.info(f"Iteration {iterations}/{max_iterations}")

            # Decide next action
            action = self.decide_next_action()

            if action is None:
                self.logger.info("Agent determined task is complete or no more actions needed")
                break

            # Execute action
            success = self.execute_action(action)
            # Extract target information based on action type
            target_info = "N/A"
            if action.action_type == "explore" and action.explore:
                dirs = ", ".join(action.explore.directories) if action.explore.directories else "none"
                files = f"{len(action.explore.files)} files" if action.explore.files else "none"
                target_info = f"dirs: {dirs}, files: {files}"
            elif action.action_type == "edit_file" and action.edit_file:
                target_info = action.edit_file.file_path
            elif action.action_type == "add_file" and action.add_file:
                target_info = action.add_file.file_path
            elif action.action_type == "remove_file" and action.remove_file:
                target_info = action.remove_file.file_path

            actions_taken.append(
                {
                    "iteration": iterations,
                    "action": action.action_type,
                    "target": target_info,
                    "success": success,
                    "observation": action.thought_process.observation,
                    "analysis": action.thought_process.analysis,
                    "plan": action.thought_process.plan,
                }
            )

            if not success:
                self.logger.warning(f"Action failed: {action.action_type}")

        # Generate summary
        summary = {
            "iterations": iterations,
            "actions_taken": actions_taken,
            "files_read": len(self.memory.read_files),
            "files_edited": len(self.memory.edited_files),
            "directories_walked": len(self.memory.walked_directories),
            "important_findings": self.memory.important_findings,
        }

        self.logger.info(f"Agent execution complete. Summary: {json.dumps(summary, indent=2)}")
        return summary


def main():
    """Example usage of the CodeAgent"""
    import argparse

    parser = argparse.ArgumentParser(description="Code Agent with Azure OpenAI")
    parser.add_argument("repo_path", help="Path to the repository")
    parser.add_argument("query", help="Query or task for the agent")
    parser.add_argument("--github-issue", help="Optional GitHub issue context")
    parser.add_argument("--api-key", help="Azure OpenAI API key")
    parser.add_argument("--azure-endpoint", help="Azure OpenAI endpoint")
    parser.add_argument("--api-version", default="2024-08-01-preview", help="Azure OpenAI API version")
    parser.add_argument("--model", default="gpt-4o", help="Azure OpenAI model deployment name")
    parser.add_argument("--max-iterations", type=int, default=10, help="Maximum iterations")
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")

    args = parser.parse_args()

    agent = CodeAgent(
        repo_path=args.repo_path,
        query=args.query,
        github_issue=args.github_issue,
        api_key=args.api_key,
        azure_endpoint=args.azure_endpoint,
        api_version=args.api_version,
        model=args.model,
        debug=args.debug,
    )

    summary = agent.run(max_iterations=args.max_iterations)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
