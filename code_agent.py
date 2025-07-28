#!/usr/bin/env python3
"""
Code Agent with OpenAI Python SDK

A code agent that can analyze repositories, understand queries, and perform code operations
while maintaining memory of what has been done to avoid redundant operations.
"""

import os
import json
import logging
import requests
import re
from typing import Dict, List, Optional, Set, Any
from pathlib import Path
from dataclasses import dataclass, field

from openai import AzureOpenAI
from pydantic import BaseModel, Field
from typing import Literal


class ThoughtProcess(BaseModel):
    """Chain of Thought reasoning for the agent's decision making"""

    observation: str = Field(description="What I observe from the current state and context")
    analysis: str = Field(description="Analysis of what needs to be done to accomplish the goal")
    plan: str = Field(description="My specific plan for the next action")


class ExploreAction(BaseModel):
    """Parameters for exploring directories and reading files"""

    directories: List[str] = Field(
        default_factory=list, description="Directories to walk and explore for relevant files"
    )
    files: List[str] = Field(
        default_factory=list,
        description="Specific files to read (can be discovered from directory walking or known paths)",
    )
    max_files: int = Field(default=20, description="Maximum number of files to read to avoid overwhelming context")


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

    complete: bool = Field(
        default=False, description="Set to true if the task is complete and no more actions are needed"
    )


class CodeAgent:
    """Main code agent class for analyzing and modifying repositories"""

    def __init__(
        self,
        repo_path: str,
        query: str,
        github_issue: Optional[str] = None,
        api_key: Optional[str] = None,
        azure_endpoint: Optional[str] = None,
        api_version: str = "2024-08-01-preview",
        model: str = "o3",
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
        self.memory = AgentMemory()

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
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)

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

    def walk_directory(self, subdirectory: str = "") -> List[str]:
        """
        Walk through a subdirectory and return list of files

        Args:
            subdirectory: Subdirectory path relative to repo root

        Returns:
            List of file paths relative to repo root
        """
        target_path = self.repo_path / subdirectory if subdirectory else self.repo_path

        if not target_path.exists():
            self.logger.warning(f"Directory does not exist: {target_path}")
            return []

        # Check if we've already walked this directory
        if str(target_path) in self.memory.walked_directories:
            self.logger.info(f"Directory already walked: {target_path}")
            return []

        files = []
        try:
            for root, dirs, filenames in os.walk(target_path):
                # Skip common ignored directories
                dirs[:] = [
                    d
                    for d in dirs
                    if not d.startswith(".") and d not in ["__pycache__", "node_modules", "venv", "env", ".git"]
                ]

                for filename in filenames:
                    if not filename.startswith("."):
                        full_path = Path(root) / filename
                        rel_path = full_path.relative_to(self.repo_path)
                        files.append(str(rel_path))

            self.memory.walked_directories.add(str(target_path))
            self.logger.info(f"Walked directory {target_path}, found {len(files)} files")

        except Exception as e:
            self.logger.error(f"Error walking directory {target_path}: {e}")

        return files

    def read_files(self, file_paths: List[str]) -> Dict[str, str]:
        """
        Read multiple files and return their contents

        Args:
            file_paths: List of file paths relative to repo root

        Returns:
            Dictionary mapping file paths to their contents
        """
        contents = {}

        for file_path in file_paths:
            # Skip if already read and cached
            if file_path in self.memory.read_files and file_path in self.memory.file_contents_cache:
                contents[file_path] = self.memory.file_contents_cache[file_path]
                continue

            full_path = self.repo_path / file_path

            if not full_path.exists():
                self.logger.warning(f"File does not exist: {full_path}")
                continue

            if not full_path.is_file():
                self.logger.warning(f"Path is not a file: {full_path}")
                continue

            try:
                with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    contents[file_path] = content
                    self.memory.file_contents_cache[file_path] = content
                    self.memory.read_files.add(file_path)

            except Exception as e:
                self.logger.error(f"Error reading file {full_path}: {e}")

        self.logger.info(f"Read {len(contents)} files")
        return contents

    def explore_repository(self, directories: List[str], files: List[str], max_files: int = 20) -> Dict[str, Any]:
        """
        Combined action to walk directories and read files

        Args:
            directories: List of directories to explore
            files: List of specific files to read
            max_files: Maximum number of files to read

        Returns:
            Dictionary with discovered files and their contents
        """
        result = {"discovered_files": [], "file_contents": {}, "directories_explored": [], "files_read": 0}

        # First, walk through directories to discover files
        all_discovered_files = []
        for directory in directories:
            if directory and directory not in self.memory.walked_directories:
                discovered = self.walk_directory(directory)
                all_discovered_files.extend(discovered)
                result["directories_explored"].append(directory)
                self.logger.info(f"Explored directory: {directory}, found {len(discovered)} files")

        # Combine specific files with discovered files
        files_to_read = list(set(files + all_discovered_files))
        result["discovered_files"] = files_to_read[:max_files]  # Limit to max_files

        # Read the files
        if files_to_read:
            contents = self.read_files(result["discovered_files"])
            result["file_contents"] = contents
            result["files_read"] = len(contents)

            # Update memory with important findings
            self.memory.important_findings.append(
                f"Explored {len(result['directories_explored'])} directories, "
                f"discovered {len(all_discovered_files)} files, "
                f"read {result['files_read']} files"
            )

        return result

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

    def _fetch_github_issue(self, issue_ref: str) -> str:
        """
        Fetch GitHub issue details from issue reference

        Args:
            issue_ref: GitHub issue reference (URL or owner/repo#number format)

        Returns:
            Formatted issue details or error message
        """
        try:
            # Fetch issue details from GitHub API
            response = requests.get(issue_ref, timeout=10)
            if response.status_code == 200:
                issue_data = response.text

                return f"GitHub Issue #{issue_ref}:\n{issue_data}"
            else:
                return f"GitHub Issue: {issue_ref}\n(Error fetching: HTTP {response.status_code})"

        except requests.RequestException as e:
            return f"GitHub Issue: {issue_ref}\n(Network error: {e})"
        except Exception as e:
            return f"GitHub Issue: {issue_ref}\n(Error fetching details: {e})"

    def _format_context(self) -> str:
        """
        Format context as structured text instead of JSON dump

        Returns:
            Formatted context string
        """
        context_parts = []

        # Task information
        context_parts.append(f"TASK: {self.query}")
        context_parts.append(f"REPOSITORY: {self.repo_path}")

        # GitHub issue if provided
        if self.github_issue:
            issue_details = self._fetch_github_issue(self.github_issue)
            context_parts.append(f"\n{issue_details}")

        # Memory state
        context_parts.append(f"\nCURRENT STATE:")
        context_parts.append(f"- Files read: {len(self.memory.read_files)} files")
        if self.memory.read_files:
            for file in sorted(self.memory.read_files):
                context_parts.append(f"  • {file}")

        context_parts.append(f"- Files edited: {len(self.memory.edited_files)} files")
        if self.memory.edited_files:
            for file in sorted(self.memory.edited_files):
                context_parts.append(f"  • {file}")

        context_parts.append(f"- Directories explored: {len(self.memory.walked_directories)} directories")
        if self.memory.walked_directories:
            for dir_path in sorted(self.memory.walked_directories):
                context_parts.append(f"  • {dir_path}")

        # Important findings
        if self.memory.important_findings:
            context_parts.append(f"\nKEY FINDINGS:")
            for finding in self.memory.important_findings:
                context_parts.append(f"- {finding}")

        return "\n".join(context_parts)

    def decide_next_action(self) -> Optional[AgentAction]:
        """
        Use Azure OpenAI to decide the next action based on current state

        Returns:
            Next action to take, or None if task is complete
        """

        system_prompt = """
You are a senior software engineer with expertise in production-grade code analysis and modification. Your approach must be methodical, precise, and focused on production safety.

## Engineering Principles

**SCOPE CLARITY**: Understand exactly what needs to be accomplished before taking action.
**PRECISION**: Target only specific files and locations that require attention.
**MINIMALISM**: Make only changes directly required to satisfy the objective.
**SAFETY**: Preserve existing functionality and avoid regressions.

## Decision Process

Structure your reasoning using these guidelines:

**observation**:
- Clearly state your interpretation of the current task requirement
- Identify what specific information or modifications are needed
- Explain why this particular action advances the objective

**analysis**:
- Specify exactly which files, directories, or components need attention
- Justify why each target is relevant and necessary
- Avoid broad, unfocused exploration when targeted investigation suffices

**plan**:
- Define the specific, contained action you will execute
- Ensure the approach is surgical and won't impact unrelated functionality
- Focus strictly on what is directly required

## Available Actions

- **explore**: Investigate specific files or directories to understand code structure, locate implementations, or gather targeted information
- **edit_file**: Make precise modifications to existing files that directly address task requirements
- **add_file**: Create new files only when explicitly required by the task objective
- **remove_file**: Delete files only when explicitly required by the task objective

## Execution Standards

- Make targeted changes rather than broad modifications
- Understand the codebase context before implementing changes
- Maintain existing code patterns and conventions
- Use the minimum number of actions necessary to complete the objective
- Set "complete" to true only when the stated goal is fully achieved

Respond with valid JSON that matches the AgentAction schema.
"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": self._format_context()},
        ]

        # Use structured output with Pydantic model
        response = self._call_azure_openai(messages, response_format=AgentAction)

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

        try:
            if action.action_type == "explore":
                if not action.explore:
                    self.logger.error("Explore action missing parameters")
                    return False

                result = self.explore_repository(
                    directories=action.explore.directories,
                    files=action.explore.files,
                    max_files=action.explore.max_files,
                )

                self.logger.info(
                    f"Exploration completed: {result['files_read']} files read from {len(result['directories_explored'])} directories"
                )
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
    parser.add_argument("--max-iterations", type=int, default=20, help="Maximum iterations")

    args = parser.parse_args()

    agent = CodeAgent(
        repo_path=args.repo_path,
        query=args.query,
        github_issue=args.github_issue,
        api_key=args.api_key,
        azure_endpoint=args.azure_endpoint,
        api_version=args.api_version,
        model=args.model,
    )

    summary = agent.run(max_iterations=args.max_iterations)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
