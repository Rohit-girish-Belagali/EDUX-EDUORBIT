"""Message bus module for decoupled channel-agent communication."""

from edux.partners.bus.events import InboundMessage, OutboundMessage
from edux.partners.bus.queue import MessageBus

__all__ = ["MessageBus", "InboundMessage", "OutboundMessage"]
