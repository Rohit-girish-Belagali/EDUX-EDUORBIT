"""Chat channels module with plugin architecture."""

from edux.partners.channels.base import BaseChannel
from edux.partners.channels.manager import ChannelManager

__all__ = ["BaseChannel", "ChannelManager"]
