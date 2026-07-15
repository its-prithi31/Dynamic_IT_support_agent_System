import time
import asyncio
import json
import os
from typing import Dict, Any, List
try:
    import redis.asyncio as aioredis
except Exception:
    aioredis = None


class Monitor:
    def __init__(self):
        self.events: List[Dict[str, Any]] = []
        self._clients = set()
        self._redis = None
        self._redis_channel = os.getenv("REDIS_MONITOR_CHANNEL", "ai_monitor")
        self._redis_url = os.getenv("REDIS_URL")
        if aioredis and self._redis_url:
            try:
                self._redis = aioredis.from_url(self._redis_url)
            except Exception:
                self._redis = None

    def log_event(self, name: str, details: Dict[str, Any]):
        e = {"ts": int(time.time()), "name": name, "details": details}
        self.events.append(e)
        # broadcast asynchronously to connected websockets
        try:
            asyncio.get_running_loop().create_task(self._broadcast(json.dumps({"type": "event", "event": e})))
            # publish to redis channel if available
            if self._redis:
                try:
                    asyncio.get_running_loop().create_task(self._redis.publish(self._redis_channel, json.dumps(e)))
                except Exception:
                    pass
        except Exception:
            pass

    def recent(self, limit: int = 50):
        return list(reversed(self.events[-limit:]))

    async def register(self, ws):
        self._clients.add(ws)

    async def unregister(self, ws):
        try:
            self._clients.remove(ws)
        except KeyError:
            pass

    async def _broadcast(self, message: str):
        to_remove = []
        for ws in list(self._clients):
            try:
                await ws.send_text(message)
            except Exception:
                to_remove.append(ws)
        for ws in to_remove:
            try:
                self._clients.remove(ws)
            except Exception:
                pass

    async def redis_subscribe_to_ws(self, ws):
        """If Redis is configured, subscribe to the monitor channel and forward messages to ws."""
        if not self._redis:
            return
        try:
            pubsub = self._redis.pubsub()
            await pubsub.subscribe(self._redis_channel)
            async for msg in pubsub.listen():
                if msg is None:
                    continue
                # message types: message, subscribe, etc.
                if msg.get("type") == "message":
                    data = msg.get("data")
                    try:
                        text = data.decode() if isinstance(data, (bytes, bytearray)) else str(data)
                        await ws.send_text(json.dumps({"type": "event", "event": json.loads(text)}))
                    except Exception:
                        try:
                            await ws.send_text(json.dumps({"type": "event", "event": {"raw": str(data)}}))
                        except Exception:
                            pass
        except Exception:
            return
