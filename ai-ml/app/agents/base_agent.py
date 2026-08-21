"""
BaseAgent: the shared template every agent in the AI/ML group follows.
This is what makes 7 different modules feel like ONE consistent system instead
of 7 unrelated scripts, and it's what your mentor means by "different AI agents."

Every agent has:
- a name (for logging/debugging - "which agent said this?")
- a role (its job description, used inside its own prompts)
- a run() method (every agent's main entry point, same method name for all of them)

Teammates building the Opponent Agent, Speech Agent, Scoring Agent, etc. should
subclass this too, so the whole group's code has one shared shape.
"""
from abc import ABC, abstractmethod


class BaseAgent(ABC):
    name: str = "BaseAgent"
    role: str = "An unspecified AI agent."

    @abstractmethod
    def run(self, *args, **kwargs) -> dict:
        """Every agent must implement run() - this is its main entry point."""
        raise NotImplementedError

    def __repr__(self):
        return f"<{self.name}: {self.role}>"
