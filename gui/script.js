class KanoodleSolver {
  constructor() {
    this.board = this.createEmptyBoard();
    this.pieces = this.createDefaultPieces();
    this.selectedPiece = null;
    this.solution = null;
    this.hoveredCell = null;

    this.initializeEventListeners();
    this.renderPieces();
    this.renderBoard();
  }

  createEmptyBoard() {
    return Array(5)
      .fill()
      .map(() => Array(11).fill(null));
  }

  createDefaultPieces() {
    return [
      {
        id: 0,
        shape: [
          [1, 1],
          [1, 0],
          [1, 0],
          [1, 0]
        ],
        color: "#1b38b5",
      },
      {
        id: 1,
        shape: [[1, 1, 1, 1]],
        color: "#523287",
      },
      {
        id: 2,
        shape: [
          [1, 1],
          [1, 1],
        ],
        color: "#5de03f",
      },
      {
        id: 3,
        shape: [
          [1, 0],
          [1, 1],
          [1, 1],
        ],
        color: "#ce0e0b",
      },
      {
        id: 4,
        shape: [
          [1, 1],
          [0, 1],
          [0, 1],
        ],
        color: "#ff8844",
      },
      {
        id: 5,
        shape: [
          [1, 1, 0],
          [1, 0, 0],
          [1, 1, 0],
        ],
        color: "#d4bb06",
      },
      {
        id: 6,
        shape: [
          [1, 1, 1],
          [0, 0, 1],
          [0, 0, 1],
        ],
        color: "#7cc2c4",
      },
      {
        id: 7,
        shape: [
          [1, 0],
          [1, 1]
        ],
        color: "#ccd0bc",
      },
      {
        id: 8,
        shape: [
          [0, 1, 0],
          [1, 1, 1],
          [0, 1, 0],
        ],
        color: "#96938b",
      },
      {
        id: 9,
        shape: [
          [0, 1, 1, 1],
          [1, 1, 0, 0]
        ],
        color: "#007f38",
      },
      {
        id: 10,
        shape: [
          [1, 0, 1, 0, 1],
          [0, 1, 0, 1, 0]
        ],
        color: "#d73966",
      },
      {
        id: 11,
        shape: [
          [0, 1, 0, 0],
          [1, 1, 1, 1]
        ],
        color: "#eab9b1",
      },
    ];
  }

  initializeEventListeners() {
    document
      .getElementById("solve-btn")
      .addEventListener("click", () => this.solvePuzzle());
    document
      .getElementById("clear-btn")
      .addEventListener("click", () => this.clearBoard());
    document
      .getElementById("new-puzzle-btn")
      .addEventListener("click", () => this.newPuzzle());
    document
      .getElementById("apply-solution-btn")
      .addEventListener("click", () => this.applySolution());
    document
      .getElementById("close-solution-btn")
      .addEventListener("click", () => this.closeSolution());
  }

  renderPieces() {
    const container = document.getElementById("pieces-container");
    container.innerHTML = "";

    // Get list of pieces already placed on the board
    const placedPieceIds = this.getPlacedPieceIds();

    this.pieces.forEach((piece) => {
      // Skip rendering pieces that are already placed
      if (placedPieceIds.includes(piece.id)) {
        return;
      }

      const pieceWrapper = document.createElement("div");
      pieceWrapper.className = "piece-wrapper";
      pieceWrapper.dataset.pieceId = piece.id;

      // Create the piece grid with proper 2D layout
      const pieceGrid = document.createElement("div");
      pieceGrid.className = "puzzle-piece";
      pieceGrid.style.gridTemplateColumns = `repeat(${piece.shape[0].length}, 1fr)`;
      pieceGrid.style.gridTemplateRows = `repeat(${piece.shape.length}, 1fr)`;

      // Render each row and column properly
      for (let row = 0; row < piece.shape.length; row++) {
        for (let col = 0; col < piece.shape[row].length; col++) {
          const cellDiv = document.createElement("div");
          cellDiv.className = "piece-cell";
          const isOccupied = piece.shape[row][col];
          cellDiv.style.backgroundColor = isOccupied
            ? piece.color
            : "transparent";
          if (!isOccupied) {
            cellDiv.style.border = "none"; // Hide empty cells
          }
          pieceGrid.appendChild(cellDiv);
        }
      }

      pieceWrapper.appendChild(pieceGrid);
      pieceWrapper.addEventListener("click", () => this.selectPiece(piece.id));
      container.appendChild(pieceWrapper);
    });
  }

  renderBoard() {
    const boardGrid = document.getElementById("board-grid");
    boardGrid.innerHTML = "";

    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 11; x++) {
        const cell = document.createElement("div");
        cell.className = "board-cell";
        cell.dataset.x = x;
        cell.dataset.y = y;

        if (this.board[y][x]) {
          cell.classList.add("occupied");
          cell.style.backgroundColor = this.board[y][x].color;
        }

        // Add hover and click event listeners
        cell.addEventListener("mouseenter", () => this.handleCellHover(x, y));
        cell.addEventListener("mouseleave", () => this.handleCellLeave());
        cell.addEventListener("click", () => this.placePiece(x, y));

        boardGrid.appendChild(cell);
      }
    }
  }

  handleCellHover(x, y) {
    if (!this.selectedPiece) return;

    this.hoveredCell = { x, y };
    this.updatePreview();
  }

  handleCellLeave() {
    this.hoveredCell = null;
    this.clearPreview();
  }

  updatePreview() {
    if (!this.selectedPiece || !this.hoveredCell) return;

    this.clearPreview();

    const { x: startX, y: startY } = this.hoveredCell;
    const canPlace = this.canPlacePiece(this.selectedPiece, startX, startY);

    // Highlight cells that will be occupied
    for (let y = 0; y < this.selectedPiece.shape.length; y++) {
      for (let x = 0; x < this.selectedPiece.shape[y].length; x++) {
        if (this.selectedPiece.shape[y][x]) {
          const boardX = startX + x;
          const boardY = startY + y;

          const cell = document.querySelector(
            `[data-x="${boardX}"][data-y="${boardY}"]`
          );
          if (cell) {
            if (canPlace) {
              cell.classList.add("preview-valid");
              cell.style.backgroundColor = this.selectedPiece.color;
              cell.style.opacity = "0.6";
            } else {
              cell.classList.add("preview-invalid");
            }
          }
        }
      }
    }
  }

  clearPreview() {
    document.querySelectorAll(".board-cell").forEach((cell) => {
      cell.classList.remove("preview-valid", "preview-invalid");

      // Restore original appearance
      const x = parseInt(cell.dataset.x);
      const y = parseInt(cell.dataset.y);

      if (this.board[y][x]) {
        cell.style.backgroundColor = this.board[y][x].color;
        cell.style.opacity = "1";
      } else {
        cell.style.backgroundColor = "white";
        cell.style.opacity = "1";
      }
    });
  }

  selectPiece(pieceId) {
    this.selectedPiece = this.pieces.find((p) => p.id === pieceId);

    // Clear any existing preview
    this.clearPreview();

    // Update visual selection - should target piece-wrapper, not puzzle-piece
    document.querySelectorAll(".piece-wrapper").forEach((el) => {
      el.classList.remove("selected");
    });
    document
      .querySelector(`[data-piece-id="${pieceId}"]`)
      .classList.add("selected");
  }

  placePiece(x, y) {
    if (!this.selectedPiece) {
      alert("Please select a piece first!");
      return;
    }

    if (this.canPlacePiece(this.selectedPiece, x, y)) {
      this.setPieceOnBoard(this.selectedPiece, x, y);
      this.selectedPiece = null;
      this.clearPreview();
      this.renderBoard();
      this.renderPieces();

      // Clear piece selection visual - target piece-wrapper
      document.querySelectorAll(".piece-wrapper").forEach((el) => {
        el.classList.remove("selected");
      });
    } else {
      alert("Cannot place piece here!");
    }
  }

  canPlacePiece(piece, startX, startY) {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const boardX = startX + x;
          const boardY = startY + y;

          if (boardX >= 11 || boardY >= 5 || boardX < 0 || boardY < 0) {
            return false;
          }

          if (this.board[boardY][boardX]) {
            return false;
          }
        }
      }
    }
    return true;
  }

  setPieceOnBoard(piece, startX, startY) {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          this.board[startY + y][startX + x] = {
            pieceId: piece.id,
            color: piece.color,
          };
        }
      }
    }
  }

  async solvePuzzle() {
    this.showLoading();

    try {
      const response = await fetch("http://localhost:8080/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          board: this.board,
          pieces: this.pieces,
        }),
      });

      const result = await response.json();
      this.solution = result.solution;
      this.showSolution();
    } catch (error) {
      console.log("Using mock solution (backend not available)");
      this.solution = this.generateMockSolution();
      this.showSolution();
    } finally {
      this.hideLoading();
    }
  }

  generateMockSolution() {
    return this.pieces.map((piece, index) => ({
      ...piece,
      position: { x: index * 2, y: index },
    }));
  }

  showLoading() {
    document.getElementById("loading").classList.remove("hidden");
  }

  hideLoading() {
    document.getElementById("loading").classList.add("hidden");
  }

  showSolution() {
    const solutionDiv = document.getElementById("solution-display");
    const stepsDiv = document.getElementById("solution-steps");

    stepsDiv.innerHTML = "<p>Solution steps:</p>";
    this.solution.forEach((piece, index) => {
      const step = document.createElement("p");
      step.textContent = `${index + 1}. Place ${piece.name} at (${
        piece.position.x
      }, ${piece.position.y})`;
      stepsDiv.appendChild(step);
    });

    solutionDiv.classList.remove("hidden");
  }

  closeSolution() {
    document.getElementById("solution-display").classList.add("hidden");
  }

  applySolution() {
    if (this.solution) {
      this.clearBoard();
      this.solution.forEach((piece) => {
        this.setPieceOnBoard(piece, piece.position.x, piece.position.y);
      });
      this.renderBoard();
      this.renderPieces();
    }
    this.closeSolution();
  }

  clearBoard() {
    this.board = this.createEmptyBoard();
    this.selectedPiece = null;
    this.clearPreview();
    this.renderBoard();
    this.renderPieces(); 

    // Clear piece selection - target piece-wrapper instead of puzzle-piece
    document.querySelectorAll(".piece-wrapper").forEach((el) => {
      el.classList.remove("selected");
    });
  }

  newPuzzle() {
    this.clearBoard();
    this.pieces = this.createDefaultPieces();
    this.selectedPiece = null;
    this.solution = null;
    this.renderPieces();
  }

  getPlacedPieceIds() {
    const placedIds = [];
    for (let y = 0; y < this.board.length; y++) {
      for (let x = 0; x < this.board[y].length; x++) {
        const cell = this.board[y][x];
        if (cell && cell.pieceId !== undefined && !placedIds.includes(cell.pieceId)) {
          placedIds.push(cell.pieceId);
        }
      }
    }
    return placedIds;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new KanoodleSolver();
});
