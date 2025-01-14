import React, { useState, useEffect } from "react"; // Import React, useState, and useEffect hooks
import { Chessboard } from "react-chessboard"; // Import the Chessboard component
import { Chess } from "chess.js"; // Import the Chess library for game logic

// Function to parse Stockfish's output and extract the best move and evaluation
const getEvaluation = (message, turn) => {
  let result = { bestMove: "", evaluation: "" }; // Initialize result with default values

  // If the message starts with "bestmove", extract the best move from the message
  if (message.startsWith("bestmove")) {
    result.bestMove = message.split(" ")[1]; // The best move is the second word in the message
  }

  // Check for "info score" in the message to extract evaluation score
  if (message.includes("info") && message.includes("score")) {
    const scoreParts = message.split(" "); // Split message into words
    const scoreIndex = scoreParts.indexOf("score") + 2; // "cp" or "mate" is two words after "score"

    // If the score type is "cp" (centipawn), interpret it as a material advantage in pawns
    if (scoreParts[scoreIndex - 1] === "cp") {
      let score = parseInt(scoreParts[scoreIndex], 10); // Parse the score value
      if (turn !== "b") {
        score = -score; // Invert the score if it's White's turn
      }
      result.evaluation = score / 100; // Convert centipawns to pawns
    } else if (scoreParts[scoreIndex - 1] === "mate") {
      // If the score type is "mate", indicate moves until checkmate
      const mateIn = parseInt(scoreParts[scoreIndex], 10);
      result.evaluation = `Mate in ${Math.abs(mateIn)}`;
    }
  }

  return result; // Return the best move and evaluation
};

// Define custom pieces mapping for each piece to its corresponding image
const customPieces = {
  wP: ({ squareWidth }) => (
    <img
      src="/img/pieces/2200.png"
      style={{ width: squareWidth, height: squareWidth }}
      alt="Whiteee Pawn"
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

// Define custom square styles for the "White Stripe Theme"
const lightSquareStyle = {
  backgroundColor: "#FFFFFF", // Light square base color
  backgroundImage:
    "repeating-linear-gradient(-45deg, rgba(0, 0, 0, 0.1) 0, rgba(0, 0, 0, 0.1) 2px, transparent 2px, transparent 4px)", // Light square stripe pattern
};

const darkSquareStyle = {
  backgroundColor: "#CCCCCC", // Dark square base color
  backgroundImage:
    "repeating-linear-gradient(-45deg, rgba(0, 0, 0, 0.1) 0, rgba(0, 0, 0, 0.1) 2px, transparent 2px, transparent 4px)", // Dark square stripe pattern
};

const App = () => {
  // State variables for chess game logic, Stockfish worker, best move, and evaluation
  const [game, setGame] = useState(new Chess()); // Chess game instance
  const [stockfish, setStockfish] = useState(null); // Stockfish Web Worker instance
  const [bestMove, setBestMove] = useState(""); // Best move suggested by Stockfish
  const [evaluation, setEvaluation] = useState(""); // Evaluation of the position by Stockfish

  // useEffect hook to initialize the Stockfish Web Worker
  useEffect(() => {
    const stockfishWorker = new Worker(`${process.env.PUBLIC_URL}/js/stockfish-16.1-lite-single.js`);

    setStockfish(stockfishWorker);

    // Terminate the worker when the component unmounts
    return () => {
      stockfishWorker.terminate();
    };
  }, []);

  // Function to handle piece drop events on the chessboard
  const onDrop = (sourceSquare, targetSquare) => {
    const gameCopy = new Chess(game.fen()); // Clone the current game state

    try {
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q", // Always promote to a queen for simplicity
      });

      // If the move is invalid, return false to prevent it
      if (move === null) {
        return false;
      }

      setGame(gameCopy); // Update the game state with the new move

      // Send the updated position to Stockfish for analysis
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

      return true; // Return true if the move was valid
    } catch (error) {
      console.error("Invalid move:", error.message); // Log error if an invalid move
      return false;
    }
  };

  return (
    <div>
      <h1>Chess Game with Stockfish</h1>
      {/* Chessboard component with custom pieces and square styles */}
      <Chessboard
        position={game.fen()} // Current position from the game state
        onPieceDrop={onDrop} // Function to handle piece drops
        boardWidth={500} // Width of the chessboard in pixels
        //customPieces={customPieces} // Custom pieces mapping
        customLightSquareStyle={lightSquareStyle} // Apply custom light square style
        customDarkSquareStyle={darkSquareStyle}   // Apply custom dark square style
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