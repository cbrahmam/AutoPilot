import asyncio
from config import settings


async def run_sandboxed(
    command: list[str],
    cwd: str,
    timeout: int | None = None,
    env: dict | None = None,
) -> tuple[str, str, int]:
    timeout = timeout or settings.max_code_execution_time

    safe_env = {
        "PATH": "/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin",
        "HOME": cwd,
        "TMPDIR": cwd,
        "LANG": "en_US.UTF-8",
    }
    if env:
        safe_env.update(env)

    proc = await asyncio.create_subprocess_exec(
        *command,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=cwd,
        env=safe_env,
    )

    try:
        stdout_bytes, stderr_bytes = await asyncio.wait_for(
            proc.communicate(), timeout=timeout
        )
        return (
            stdout_bytes.decode(errors="replace"),
            stderr_bytes.decode(errors="replace"),
            proc.returncode,
        )
    except asyncio.TimeoutError:
        proc.kill()
        await proc.wait()
        return "", f"Execution timed out after {timeout} seconds", -1
