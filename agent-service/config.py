from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    vault_path: str = "/vault"
    host_vault_path: str = "C:\\Users\\Jason\\Documents\\NovAI-Vault"  # Windows path for host-proxy
    db_path: str = "/data/novai.db"
    model: str = "claude-haiku-4-5-20251001"
    host_proxy_url: str = "http://host.docker.internal:4000"

    model_config = {"env_prefix": "", "case_sensitive": False}


settings = Settings()
