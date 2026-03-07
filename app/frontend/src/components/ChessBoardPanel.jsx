import { useEffect, useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";

export default function ChessBoardPanel({ fen, isMyTurn, myColor, onMove }) {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const chess = useMemo(() => new Chess(fen === "start" ? undefined : fen), [fen]);

  useEffect(() => {
    setSelectedSquare(null);
  }, [fen]);

  const legalTargets = useMemo(() => {
    if (!selectedSquare) {
      return [];
    }
    return chess.moves({ square: selectedSquare, verbose: true }).map((move) => move.to);
  }, [chess, selectedSquare]);

  const customSquareStyles = useMemo(() => {
    const styles = {};
    if (selectedSquare) {
      styles[selectedSquare] = {
        boxShadow: "inset 0 0 0 3px #0f6a8b"
      };
    }

    legalTargets.forEach((square) => {
      styles[square] = {
        background:
          "radial-gradient(circle, rgba(15,106,139,0.45) 0%, rgba(15,106,139,0.22) 35%, transparent 36%)"
      };
    });
    return styles;
  }, [selectedSquare, legalTargets]);

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

  function onSquareClick(square) {
    if (!isMyTurn) {
      setSelectedSquare(null);
      return;
    }

    if (selectedSquare && legalTargets.includes(square)) {
      const moved = onDrop(selectedSquare, square);
      if (moved) {
        setSelectedSquare(null);
      }
      return;
    }

    const hasLegalMoves = chess.moves({ square, verbose: true }).length > 0;
    setSelectedSquare(hasLegalMoves ? square : null);
  }

  return (
    <div className="board-panel" data-testid="board-panel">
      <Chessboard
        position={fen === "start" ? "start" : fen}
        onPieceDrop={onDrop}
        onSquareClick={onSquareClick}
        customSquareStyles={customSquareStyles}
        boardOrientation={myColor}
        arePiecesDraggable={isMyTurn}
      />
    </div>
  );
}
