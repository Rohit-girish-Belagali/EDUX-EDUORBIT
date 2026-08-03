"""Configuration module for Partners channels."""

from edux.partners.config.paths import (
    get_data_dir,
    get_media_dir,
    get_partner_dir,
    get_partner_media_dir,
    get_partner_sessions_dir,
    get_partner_workspace,
    get_runtime_subdir,
)
from edux.partners.config.schema import Base, ChannelsConfig

__all__ = [
    "Base",
    "ChannelsConfig",
    "get_data_dir",
    "get_media_dir",
    "get_partner_dir",
    "get_partner_media_dir",
    "get_partner_sessions_dir",
    "get_partner_workspace",
    "get_runtime_subdir",
]
