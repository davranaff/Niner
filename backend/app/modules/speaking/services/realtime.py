from __future__ import annotations

import asyncio
from collections import defaultdict
from dataclasses import dataclass

from fastapi import WebSocket

from app.modules.speaking.schemas import LiveClientEvent, LiveServerEvent


@dataclass(slots=True)
class SpeakingConnectionContext:
    user_id: int
    client_id: str


class SpeakingRealtimeHub:
    def __init__(self) -> None:
        self.connections: dict[int, dict[WebSocket, SpeakingConnectionContext]] = defaultdict(dict)

    async def connect(
        self,
        exam_id: int,
        websocket: WebSocket,
        *,
        user_id: int,
        client_id: str,
    ) -> None:
        await websocket.accept()
        self.connections[exam_id][websocket] = SpeakingConnectionContext(
            user_id=user_id,
            client_id=client_id,
        )

    def disconnect(self, exam_id: int, websocket: WebSocket) -> None:
        if exam_id in self.connections:
            self.connections[exam_id].pop(websocket, None)
            if not self.connections[exam_id]:
                self.connections.pop(exam_id, None)

    def get_context(self, exam_id: int, websocket: WebSocket) -> SpeakingConnectionContext | None:
        return self.connections.get(exam_id, {}).get(websocket)

    async def emit(self, exam_id: int, event: LiveServerEvent) -> None:
        stale: list[WebSocket] = []
        for socket in self.connections.get(exam_id, {}).keys():
            try:
                await socket.send_json(event.model_dump(mode="json"))
            except Exception:  # noqa: BLE001
                stale.append(socket)
        for socket in stale:
            self.disconnect(exam_id, socket)

    async def acknowledge(self, exam_id: int, incoming: LiveClientEvent) -> None:
        await self.emit(
            exam_id,
            LiveServerEvent(
                type="server.ack",
                exam_id=exam_id,
                message=f"Accepted event {incoming.type}.",
                payload=incoming.payload,
            ),
        )

    async def heartbeat(self, exam_id: int, stop_event: asyncio.Event) -> None:
        while not stop_event.is_set():
            await asyncio.sleep(15)
            await self.emit(
                exam_id,
                LiveServerEvent(
                    type="server.keepalive",
                    exam_id=exam_id,
                    message="Realtime speaking channel alive.",
                ),
            )


speaking_realtime_hub = SpeakingRealtimeHub()
