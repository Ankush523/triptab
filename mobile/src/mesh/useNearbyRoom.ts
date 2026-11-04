import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { NearbyRoom, type RoomCallbacks, type RoomOptions } from './room';

/**
 * One NearbyRoom for the lifetime of the component, as reactive state plus actions.
 * Options are read once; callbacks always see their latest version. Leaves on unmount.
 */
export function useNearbyRoom(options: RoomOptions & RoomCallbacks) {
  const latest = useRef(options);
  latest.current = options;
  const [room] = useState(() => new NearbyRoom(options, () => latest.current));

  useEffect(
    () => () => {
      void room.leave();
    },
    [room],
  );

  const snapshot = useSyncExternalStore(room.subscribe, room.getSnapshot);

  return useMemo(
    () => ({
      ...snapshot,
      host: room.host,
      discover: room.discover,
      join: room.join,
      send: room.send,
      broadcast: room.broadcast,
      sign: room.sign,
      verify: room.verify,
      leave: room.leave,
    }),
    [
      snapshot.status,
      snapshot.error,
      snapshot.role,
      snapshot.localId,
      snapshot.hostId,
      snapshot.hosts,
      snapshot.peers,
      snapshot.groupId,
      room,
    ],
  );
}
