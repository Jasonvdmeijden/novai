"""
Configures the @modelcontextprotocol/server-filesystem Node.js server to spawn
as a stdio child process inside the agent container. The Node binary is available
because the agent Dockerfile installs Node.js alongside Python.
"""
from dataclasses import dataclass

from config import settings


@dataclass
class StdioServerConfig:
    """Holds everything needed to spawn an MCP stdio server subprocess."""
    command: str
    args: list[str]
    env: dict[str, str] | None = None


def get_allowed_dirs() -> list[str]:
    """Return the list of directories the MCP filesystem server may access."""
    return [settings.vault_path]


# Ready-to-use config for the filesystem MCP server.
# Agents pass this to their MCP client when starting a task.
FILESYSTEM_SERVER_PARAMS = StdioServerConfig(
    command="npx",
    args=["-y", "@modelcontextprotocol/server-filesystem", settings.vault_path],
)
