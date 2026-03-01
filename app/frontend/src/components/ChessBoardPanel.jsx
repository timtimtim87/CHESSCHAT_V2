import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";

export default function ChessBoardPanel({ fen, isMyTurn, myColor, onMove }) {
  const chess = new Chess(fen === "start" ? undefined : fen);

  function onDrop(sourceSquare, targetSquare) {
    if (!isMyTurn) return false;
    const move = chess.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q"
    });
    if (!move) return false;

    onMove(`${sourceSquare}${targetSquare}`);
    return true;
  }

  return (
    <div className="board-panel">
      <Chessboard
        position={fen === "start" ? "start" : fen}
        onPieceDrop={onDrop}
        boardOrientation={myColor}
        arePiecesDraggable={isMyTurn}
      />
    </div>
  );
}
