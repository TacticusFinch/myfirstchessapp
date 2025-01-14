import React, { useState, useEffect } from "react"; // Import necessary React functions
import { Chessboard } from "react-chessboard"; // Import the chessboard component from react-chessboard
import { Chess } from "chess.js"; // Import the chess.js library for game logic

// Function to extract the best move and evaluation from Stockfish's output message
const getEvaluation = (message, turn) => {
  let result = { bestMove: "", evaluation: "" }; // Initialize result with empty values

  // If the message contains "bestmove", extract the best move
  if (message.startsWith("bestmove")) {
    result.bestMove = message.split(" ")[1]; // The best move is the second word in the message
  }

  // Check for "info score" in the message to extract the evaluation score
  if (message.includes("info") && message.includes("score")) {
    const scoreParts = message.split(" "); // Split message into words
    const scoreIndex = scoreParts.indexOf("score") + 2; // "cp" or "mate" is two words after "score"

    // If the score type is "cp" (centipawn), convert it to a pawn value
    if (scoreParts[scoreIndex - 1] === "cp") {
      let score = parseInt(scoreParts[scoreIndex], 10); // Parse the score value
      if (turn !== "b") {
        score = -score; // Invert the score if it's White's turn to match convention
      }
      result.evaluation = score / 100; // Convert centipawns to pawns (100 centipawns = 1 pawn)
    } else if (scoreParts[scoreIndex - 1] === "mate") {
      // If the score type is "mate", indicate how many moves until mate
      const mateIn = parseInt(scoreParts[scoreIndex], 10);
      result.evaluation = `Mate in ${Math.abs(mateIn)}`; // Absolute value for positive mate distance
    }
  }

  return result; // Return the result containing bestMove and evaluation
};

// Define custom pieces with each piece pointing to its image
const customPieces = {
  wP: ({ squareWidth }) => (
    <img
      src="/img/pieces/wP.svg"
      style={{ width: squareWidth, height: squareWidth }}
      alt="Whitee Pawn"
    />
  ),
  wN: ({ squareWidth }) => (
    <img
      src="/img/pieces/wN.svg"
      style={{ width: squareWidth, height: squareWidth }}
      alt="White Knight"
    />
  ),
  wB: ({ squareWidth }) => (
    <img
      src="/img/pieces/wB.svg"
      style={{ width: squareWidth, height: squareWidth }}
      alt="White Bishop"
    />
  ),
  wR: ({ squareWidth }) => (
    <img
      src="/img/pieces/wR.svg"
      style={{ width: squareWidth, height: squareWidth }}
      alt="White Rook"
    />
  ),
  wQ: ({ squareWidth }) => (
    <img
      src="/img/pieces/wQ.svg"
      style={{ width: squareWidth, height: squareWidth }}
      alt="White Queen"
    />
  ),
  wK: ({ squareWidth }) => (
    <img
      src="/img/pieces/wK.svg"
      style={{ width: squareWidth, height: squareWidth }}
      alt="White King"
    />
  ),
  bP: ({ squareWidth }) => (
    <img
      src="/img/pieces/bP.svg"
      style={{ width: squareWidth, height: squareWidth }}
      alt="Black Pawn"
    />
  ),
  bN: ({ squareWidth }) => (
    <img
      src="/img/pieces/bN.svg"
      style={{ width: squareWidth, height: squareWidth }}
      alt="Black Knight"
    />
  ),
  bB: ({ squareWidth }) => (
    <img
      src="/img/pieces/bB.svg"
      style={{ width: squareWidth, height: squareWidth }}
      alt="Black Bishop"
    />
  ),
  bR: ({ squareWidth }) => (
    <img
      src="/img/pieces/bR.svg"
      style={{ width: squareWidth, height: squareWidth }}
      alt="Black Rook"
    />
  ),
  bQ: ({ squareWidth }) => (
    <img
      src="/img/pieces/bQ.svg"
      style={{ width: squareWidth, height: squareWidth }}
      alt="Black Queen"
    />
  ),
  bK: ({ squareWidth }) => (
    <img
      src="/img/pieces/bK.svg"
      style={{ width: squareWidth, height: squareWidth }}
      alt="Black King"
    />
  ),
};

const App = () => {
  // State for tracking game state, Stockfish worker, best move, and evaluation score
  const [game, setGame] = useState(new Chess());
  const [stockfish, setStockfish] = useState(null);
  const [bestMove, setBestMove] = useState("");
  const [evaluation, setEvaluation] = useState("");

  useEffect(() => {
    // Initialize Stockfish as a Web Worker when the component mounts
    const stockfishWorker = new Worker(`${process.env.PUBLIC_URL}/js/stockfish-16.1-lite-single.js`);

    setStockfish(stockfishWorker);

    // Clean up the worker when the component unmounts
    return () => {
      stockfishWorker.terminate();
    };
  }, []);

  // Handle piece drop (move) on the chessboard
  const onDrop = (sourceSquare, targetSquare) => {
    const gameCopy = new Chess(game.fen()); // Clone the current game state

    try {
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q", // Auto-promote to a queen
      });

      // If the move is invalid, return false to prevent it
      if (move === null) {
        return false;
      }

      setGame(gameCopy); // Update the game state with the new move

      // Send the updated position to Stockfish to get the best move and evaluation
      if (stockfish) {
        stockfish.postMessage(`position fen ${gameCopy.fen()}`); // Set the position in Stockfish
        stockfish.postMessage("go depth 15"); // Ask Stockfish to analyze to depth 15

        // Listen for messages from Stockfish and update best move and evaluation
        stockfish.onmessage = (event) => {
          const { bestMove, evaluation } = getEvaluation(event.data, game.turn());
          if (bestMove) setBestMove(bestMove); // Update the best move
          if (evaluation) setEvaluation(evaluation); // Update the evaluation score
        };
      }

      return true; // Return true if the move was successful
    } catch (error) {
      console.error(error.message); // Log error if an invalid move
      return false;
    }
  };

  return (
    <div>
      <h1>Chess Game with Stockfish</h1>
      {/* Chessboard component with custom pieces and onDrop handler */}
      <Chessboard
        position={game.fen()} // Current position from the game state
        onPieceDrop={onDrop} // Function to handle piece drops
        boardWidth={500} // Width of the chessboard in pixels
        customPieces={customPieces} // Pass custom pieces variable
      />
      {/* Display the best move and evaluation score */}
      <div>
        <h3>Best Move: {bestMove || "Calculating..."}</h3>
        <h3>Evaluation: {evaluation || "Evaluating..."}</h3>
      </div>
    </div>
  );
};

export default App; // Export the App component as the default export