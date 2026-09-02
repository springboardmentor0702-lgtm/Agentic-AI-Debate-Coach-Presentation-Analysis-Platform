from abc import ABC, abstractmethod


class BaseAgent(ABC):
    name: str = "BaseAgent"
    role: str = "An unspecified AI agent."

    @abstractmethod
    def run(self, *args, **kwargs) -> dict:
        """Every agent must implement run()."""
        raise NotImplementedError

    def __repr__(self):
        return f"<{self.name}: {self.role}>"
