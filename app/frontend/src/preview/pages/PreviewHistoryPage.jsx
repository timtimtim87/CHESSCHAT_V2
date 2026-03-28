import { useState } from "react";
import PreviewLayout from "../PreviewLayout";

const MATCHES = [
  {
    id: "M-1001",
    opponent: "KnightRider_04",
    result: "Win",
    moves: ["1. e4", "e5", "2. Nf3", "Nc6", "3. Bb5", "a6", "4. Ba4", "Nf6"]
  },
  {
    id: "M-1002",
    opponent: "QueenGambit_X",
    result: "Loss",
    moves: ["1. d4", "Nf6", "2. c4", "e6", "3. Nc3", "Bb4", "4. e3", "O-O"]
  },
  {
    id: "M-1003",
    opponent: "BishopBlunder",
    result: "Draw",
    moves: ["1. d4", "d5", "2. Nf3", "Nf6", "3. Bf4", "e6", "4. e3", "c5"]
  }
];

export default function PreviewHistoryPage() {
  const [selectedMatch, setSelectedMatch] = useState(MATCHES[0]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);

  const totalMoves = selectedMatch.moves.length;
  const currentMove = selectedMatch.moves[currentMoveIndex] || "-";

  function selectMatch(match) {
    setSelectedMatch(match);
    setCurrentMoveIndex(0);
  }

  function stepBackward() {
    setCurrentMoveIndex((current) => Math.max(0, current - 1));
  }

  function stepForward() {
    setCurrentMoveIndex((current) => Math.min(totalMoves - 1, current + 1));
  }

  return (
    <PreviewLayout>
      <header className="page-header">
        <div>
          <h1 className="page-title">History</h1>
          <p className="page-subtitle">Match review preview with move list and stockfish-eval placeholder.</p>
        </div>
        <span className="page-chip">UI Preview</span>
      </header>

      <section className="history-layout">
        <article className="history-table-wrap panel surface-glass">
          <table className="history-table">
            <thead>
              <tr>
                <th>Match</th>
                <th>Opponent</th>
                <th>Result</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              {MATCHES.map((match) => (
                <tr key={match.id}>
                  <td>{match.id}</td>
                  <td>{match.opponent}</td>
                  <td>{match.result}</td>
                  <td>
                    <button className="button-secondary" type="button" onClick={() => selectMatch(match)}>
                      View Board + Moves
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <aside className="panel surface-glass">
          <h3>Review: {selectedMatch.id}</h3>
          <div className="preview-board preview-board-history">
            {Array.from({ length: 64 }).map((_, index) => (
              <div key={index} />
            ))}
          </div>
          <div className="preview-row-actions history-review-controls">
            <button className="button-secondary" type="button" onClick={stepBackward} disabled={currentMoveIndex === 0}>
              Back
            </button>
            <button
              className="button-secondary"
              type="button"
              onClick={stepForward}
              disabled={currentMoveIndex >= totalMoves - 1}
            >
              Forward
            </button>
          </div>
          <p className="landing-note" style={{ marginTop: 10 }}>
            Move {currentMoveIndex + 1} / {totalMoves}: {currentMove}
          </p>
          <p className="landing-note">
            Sequence so far: {selectedMatch.moves.slice(0, currentMoveIndex + 1).join(" ")}
          </p>
          <div className="stat-card" style={{ marginTop: 12 }}>
            <p className="label">Stockfish Eval (Future)</p>
            <p className="value">
              +0.6 {"->"} +1.2 {"->"} +0.4
            </p>
          </div>
        </aside>
      </section>
    </PreviewLayout>
  );
}
