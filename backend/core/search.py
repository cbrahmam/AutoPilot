from database import get_db


async def global_search(query: str, limit: int = 20) -> dict:
    if not query or len(query.strip()) < 2:
        return {"results": [], "total": 0}

    q = f"%{query.strip()}%"
    results = []

    async with get_db() as db:
        cursor = await db.execute(
            "SELECT id, goal, status, created_at FROM tasks WHERE goal LIKE ? ORDER BY created_at DESC LIMIT ?",
            (q, limit),
        )
        for row in await cursor.fetchall():
            r = dict(row)
            results.append({
                "type": "task",
                "id": r["id"],
                "title": r["goal"],
                "subtitle": r["status"],
                "link": f"/task/{r['id']}",
                "created_at": r["created_at"],
            })

        cursor = await db.execute(
            "SELECT id, name, description, created_at FROM pipelines WHERE name LIKE ? OR description LIKE ? LIMIT ?",
            (q, q, limit),
        )
        for row in await cursor.fetchall():
            r = dict(row)
            results.append({
                "type": "pipeline",
                "id": r["id"],
                "title": r["name"],
                "subtitle": r.get("description", ""),
                "link": "/pipelines",
                "created_at": r["created_at"],
            })

        cursor = await db.execute(
            "SELECT id, filename, created_at FROM kb_documents WHERE filename LIKE ? LIMIT ?",
            (q, limit),
        )
        for row in await cursor.fetchall():
            r = dict(row)
            results.append({
                "type": "knowledge",
                "id": r["id"],
                "title": r["filename"],
                "subtitle": "Knowledge document",
                "link": "/knowledge",
                "created_at": r["created_at"],
            })

        cursor = await db.execute(
            "SELECT id, name, description FROM agent_profiles WHERE name LIKE ? OR description LIKE ? LIMIT ?",
            (q, q, limit),
        )
        for row in await cursor.fetchall():
            r = dict(row)
            results.append({
                "type": "profile",
                "id": r["id"],
                "title": r["name"],
                "subtitle": r.get("description", ""),
                "link": "/profiles",
            })

        cursor = await db.execute(
            "SELECT id, name, source FROM webhooks WHERE name LIKE ? LIMIT ?",
            (q, limit),
        )
        for row in await cursor.fetchall():
            r = dict(row)
            results.append({
                "type": "webhook",
                "id": r["id"],
                "title": r["name"],
                "subtitle": f"Source: {r['source']}",
                "link": "/webhooks",
            })

        cursor = await db.execute(
            "SELECT id, name FROM teams WHERE name LIKE ? LIMIT ?",
            (q, limit),
        )
        for row in await cursor.fetchall():
            r = dict(row)
            results.append({
                "type": "team",
                "id": r["id"],
                "title": r["name"],
                "subtitle": "Team",
                "link": "/teams",
            })

    results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    results = results[:limit]

    return {"results": results, "total": len(results), "query": query}
