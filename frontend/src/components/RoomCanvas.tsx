import { Stage, Layer, Rect, Text } from 'react-konva';

interface Room {
  id: number;
  name: string;
  width: number;
  height: number;
}

interface Props {
  rooms: Room[];
}

function RoomCanvas({ rooms }: Props) {
  return (
    <Stage width={900} height={600}>
      <Layer>

        {rooms.map((room, index) => (
          <>

            {/* Room rectangle */}
            <Rect
              key={room.id}
              x={50 + index * 250}
              y={80}
              width={room.width / 2}
              height={room.height / 2}
              stroke="black"
              strokeWidth={2}
              fill="#f3f4f6"
            />

            {/* Room name */}
            <Text
              x={60 + index * 250}
              y={90}
              text={room.name}
              fontSize={20}
            />

          </>
        ))}

      </Layer>
    </Stage>
  );
}

export default RoomCanvas;