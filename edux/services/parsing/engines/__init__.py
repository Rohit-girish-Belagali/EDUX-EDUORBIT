"""Pluggable document-parsing engines.

Each engine implements the :class:`~edux.services.parsing.base.Parser`
contract and is selected by name through :mod:`edux.services.parsing.engines.factory`.
Third-party imports are lazy so an engine whose dependency is absent simply
reports ``is_available() is False`` instead of breaking import.
"""
