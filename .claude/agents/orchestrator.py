#!/usr/bin/env python3
"""
Agent Orchestrator for Share Deck Manager

This script orchestrates the MVP development workflow:
1. Design Agent - Creates technical specifications
2. Implementation Agent - Implements features
3. Testing Agent - Writes and runs tests
4. Review Agent - Reviews code quality
5. Debug Agent - Fixes issues if any

Usage:
    python .claude/agents/orchestrator.py --task "Add deck search functionality"
    python .claude/agents/orchestrator.py --workflow full --task "User authentication"
    python .claude/agents/orchestrator.py --agent design --task "Plan API endpoints"
"""

import argparse
import subprocess
import sys
from pathlib import Path
from typing import List, Optional
import yaml


class AgentOrchestrator:
    """Manages the execution of specialized agents in the development workflow"""

    AGENTS_DIR = Path(".claude/agents")
    AGENT_ORDER = ["design", "implementation", "testing", "review"]

    def __init__(self):
        self.agents_dir = Path(__file__).parent
        self.load_agent_configs()

    def load_agent_configs(self):
        """Load all agent configuration files"""
        self.agents = {}
        for agent_file in self.agents_dir.glob("*-agent.yaml"):
            with open(agent_file) as f:
                config = yaml.safe_load(f)
                agent_name = config["name"].replace("-agent", "")
                self.agents[agent_name] = config

        print(f"Loaded {len(self.agents)} agents: {', '.join(self.agents.keys())}")

    def run_agent(self, agent_name: str, task: str, context: Optional[str] = None) -> dict:
        """
        Run a specific agent with a task

        Args:
            agent_name: Name of the agent (design, implementation, testing, review, debug)
            task: Description of the task to perform
            context: Additional context from previous agents

        Returns:
            Dictionary with agent output and status
        """
        if agent_name not in self.agents:
            print(f"Error: Agent '{agent_name}' not found")
            return {"success": False, "error": f"Agent '{agent_name}' not found"}

        agent_config = self.agents[agent_name]

        print(f"\n{'='*80}")
        print(f"Running {agent_config['name']}")
        print(f"Task: {task}")
        print(f"{'='*80}\n")

        # Build the prompt for the agent
        prompt = self._build_agent_prompt(agent_config, task, context)

        # In a real implementation, this would call Claude Code's Task tool
        # For now, we'll output the agent configuration
        print(f"Agent: {agent_config['name']}")
        print(f"Model: {agent_config['model']}")
        print(f"Tools: {', '.join(agent_config['tools'])}")
        print(f"\nPrompt:\n{prompt}\n")

        # TODO: Integrate with Claude Code SDK to actually run the agent
        # result = claude_code.run_agent(agent_config, prompt)

        return {
            "success": True,
            "agent": agent_name,
            "task": task,
            "output": "Agent execution placeholder - integrate with Claude Code SDK"
        }

    def _build_agent_prompt(self, agent_config: dict, task: str, context: Optional[str]) -> str:
        """Build the full prompt for an agent"""
        prompt_parts = [
            agent_config["system_prompt"],
            f"\n\nTask: {task}",
        ]

        if context:
            prompt_parts.append(f"\n\nContext from previous agents:\n{context}")

        return "\n".join(prompt_parts)

    def run_workflow(self, task: str, agents: Optional[List[str]] = None) -> dict:
        """
        Run a full development workflow

        Args:
            task: The feature or bug to work on
            agents: List of agents to run (defaults to all in order)

        Returns:
            Dictionary with workflow results
        """
        if agents is None:
            agents = self.AGENT_ORDER

        print(f"\n{'#'*80}")
        print(f"# Starting Workflow: {task}")
        print(f"# Agents: {' → '.join(agents)}")
        print(f"{'#'*80}\n")

        results = []
        context = ""

        for agent_name in agents:
            result = self.run_agent(agent_name, task, context)
            results.append(result)

            if not result.get("success"):
                print(f"\n⚠️  Agent '{agent_name}' failed. Stopping workflow.")
                break

            # Accumulate context for next agent
            context += f"\n\n--- Output from {agent_name} agent ---\n{result.get('output', '')}"

        print(f"\n{'#'*80}")
        print(f"# Workflow Complete")
        print(f"{'#'*80}\n")

        return {
            "success": all(r.get("success") for r in results),
            "results": results
        }


def main():
    parser = argparse.ArgumentParser(
        description="Orchestrate development agents for Share Deck Manager"
    )
    parser.add_argument(
        "--task",
        required=True,
        help="Description of the task to perform"
    )
    parser.add_argument(
        "--workflow",
        choices=["full", "partial"],
        default="full",
        help="Run full workflow (design→impl→test→review) or partial"
    )
    parser.add_argument(
        "--agent",
        choices=["design", "implementation", "testing", "review", "debug"],
        help="Run a specific agent only"
    )
    parser.add_argument(
        "--context",
        help="Additional context for the agent"
    )

    args = parser.parse_args()

    orchestrator = AgentOrchestrator()

    if args.agent:
        # Run single agent
        result = orchestrator.run_agent(args.agent, args.task, args.context)
    else:
        # Run workflow
        agents = None if args.workflow == "full" else ["design", "implementation"]
        result = orchestrator.run_workflow(args.task, agents)

    # Exit with appropriate status code
    sys.exit(0 if result.get("success") else 1)


if __name__ == "__main__":
    main()
