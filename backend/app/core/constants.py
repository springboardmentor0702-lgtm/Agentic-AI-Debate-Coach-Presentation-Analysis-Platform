"""
Shared constants used across more than one router/service. Keeps a
single source of truth instead of duplicating the same set in
multiple files and risking them drifting apart.
"""

VALID_ROLES = {"learner", "debate_coach", "educator", "admin"}
