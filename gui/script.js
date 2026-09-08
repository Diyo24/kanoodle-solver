class KanoodleSolver {
  constructor() {
    this.board = this.createEmptyBoard();
    this.pieces = this.createDefaultPieces();
    this.selectedPiece = null;
    this.selectedPieceOriginal = null; // Store original shape
    this.selectedPieceTransforms = { rotation: 0, flipH: false, flipV: false }; // Track transformations
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

  // Update createDefaultPieces() - verwende String IDs
  createDefaultPieces() {
    return [
        { 
            id: "A",  // String statt Number!
            shape: [
                [1, 1],
                [1, 0],
                [1, 0],
                [1, 0]
            ], 
            color: "#1b38b5" 
        },
        { 
            id: "B", 
            shape: [
                [1, 1, 1, 1]
            ], 
            color: "#523287" 
        },
        { 
            id: "C", 
            shape: [
                [1, 1],
                [1, 1]
            ], 
            color: "#5de03f" 
        },
        { 
            id: "D", 
            shape: [
                [1, 0],
                [1, 1],
                [1, 1]
            ], 
            color: "#ce0e0b" 
        },
        { 
            id: "E", 
            shape: [
                [1, 1],
                [0, 1],
                [0, 1]
            ], 
            color: "#ff8844" 
        },
        { 
            id: "F", 
            shape: [
                [1, 1, 0],
                [1, 0, 0],
                [1, 1, 0]
            ], 
            color: "#d4bb06" 
        },
        { 
            id: "G", 
            shape: [
                [1, 1, 1],
                [0, 0, 1],
                [0, 0, 1]
            ], 
            color: "#7cc2c4" 
        },
        { 
            id: "H", 
            shape: [
                [1, 0],
                [1, 1]
            ], 
            color: "#ccd0bc" 
        },
        { 
            id: "I", 
            shape: [
                [0, 1, 0],
                [1, 1, 1],
                [0, 1, 0]
            ], 
            color: "#96938b" 
        },
        { 
            id: "J", 
            shape: [
                [0, 1, 1, 1],
                [1, 1, 0, 0]
            ], 
            color: "#007f38" 
        },
        { 
            id: "K", 
            shape: [
                [0, 0, 1],
                [0, 1, 1],
                [1, 1, 0]
            ], 
            color: "#d73966" 
        },
        { 
            id: "L", 
            shape: [
                [0, 1, 0, 0],
                [1, 1, 1, 1]
            ], 
            color: "#eab9b1" 
        }
    ];
}

  initializeEventListeners() {
    document
      .getElementById("solve-btn")
      .addEventListener("click", () => this.solvePuzzle());
    document
      .getElementById("clear-btn")
      .addEventListener("click", () => this.clearBoard());
    
    // Rotation event listeners
    document.getElementById('rotate-left-btn').addEventListener('click', () => this.rotateSelectedPiece(-90));
    document.getElementById('rotate-right-btn').addEventListener('click', () => this.rotateSelectedPiece(90));
    document.getElementById('flip-horizontal-btn').addEventListener('click', () => this.flipSelectedPiece('horizontal'));
    document.getElementById('flip-vertical-btn').addEventListener('click', () => this.flipSelectedPiece('vertical'));
    document.getElementById('reset-piece-btn').addEventListener('click', () => this.resetSelectedPiece());
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

  // Rebuilds the grid and caches the cell elements for the hover path.
  renderBoard() {
    const container = document.getElementById("board-grid");
    container.innerHTML = "";
    container.style.gridTemplateColumns = "repeat(11, 1fr)";

    for (let y = 0; y < this.board.length; y++) {
        for (let x = 0; x < this.board[y].length; x++) {
            const cell = document.createElement("div");
            cell.className = "board-cell";
            cell.dataset.x = x;
            cell.dataset.y = y;

            if (this.board[y][x] === null) {
                cell.classList.add("empty");
                cell.style.backgroundColor = "#f5f5f5";
            } else {
                cell.classList.add("occupied");
                cell.style.backgroundColor = this.board[y][x].color;
                cell.title = `Piece: ${this.board[y][x].pieceId}`;
            }

            // mouseenter only. The grid owns mouseleave, so sliding
            // between cells no longer tears the ghost down and back up.
            cell.addEventListener("mouseenter", () => this.handleCellHover(x, y));
            cell.addEventListener("click", () => this.handleCellClick(x, y));

            container.appendChild(cell);
        }
    }

    container.onmouseleave = () => this.handleCellLeave();
    // Cached once per render; the hover path must never call querySelectorAll.
    this.cellEls = Array.from(container.children);
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

  // The cell you point at should be *under* the piece, not at the corner of
  // its bounding box. For an L or S shape, shape[0][0] is empty, so anchoring
  // there made the piece appear offset down-right of the cursor. Anchor on the
  // filled cell nearest the shape's centre of mass instead.
  getShapeAnchor(shape) {
    let sumX = 0, sumY = 0, n = 0;
    for (let py = 0; py < shape.length; py++) {
      for (let px = 0; px < shape[py].length; px++) {
        if (shape[py][px]) { sumX += px; sumY += py; n++; }
      }
    }
    if (!n) return { ax: 0, ay: 0 };
    const cx = sumX / n, cy = sumY / n;

    let best = null, bestDist = Infinity;
    for (let py = 0; py < shape.length; py++) {
      for (let px = 0; px < shape[py].length; px++) {
        if (!shape[py][px]) continue;
        const d = (px - cx) ** 2 + (py - cy) ** 2;
        if (d < bestDist) { bestDist = d; best = { ax: px, ay: py }; }
      }
    }
    return best;
  }

  // Cursor cell -> top-left origin, which is what canPlacePiece and
  // setPieceOnBoard speak (and what the solver returns).
  anchorToOrigin(piece, x, y) {
    const { ax, ay } = this.getShapeAnchor(piece.shape);
    return { ox: x - ax, oy: y - ay };
  }

  cellAt(x, y) {
    if (!this.cellEls) return null;
    const w = this.board[0].length;
    if (x < 0 || x >= w || y < 0 || y >= this.board.length) return null;
    return this.cellEls[y * w + x];
  }

  updatePreview() {
    this.clearPreview();

    if (!this.selectedPiece || !this.hoveredCell) return;

    const { x, y } = this.hoveredCell;
    const { ox, oy } = this.anchorToOrigin(this.selectedPiece, x, y);
    const canPlace = this.canPlacePiece(this.selectedPiece, ox, oy);
    const shape = this.selectedPiece.shape;

    // No early return on an invalid position. Showing a red ghost at the edge
    // is the whole point; the old code drew nothing exactly where you were
    // most likely to be making a mistake.
    this.previewCells = [];
    for (let py = 0; py < shape.length; py++) {
      for (let px = 0; px < shape[py].length; px++) {
        if (!shape[py][px]) continue;
        const cell = this.cellAt(ox + px, oy + py);
        if (!cell) continue;               // off-board part simply isn't drawn
        cell.classList.add('ghost', canPlace ? 'ghost-valid' : 'ghost-invalid');
        if (canPlace) {
          cell.style.backgroundColor = this.selectedPiece.color + 'aa';
          cell.style.borderColor = this.selectedPiece.color;
        }
        this.previewCells.push(cell);
      }
    }
  }

  clearPreview() {
    // Only the cells we actually touched, instead of walking all 55 and
    // rewriting their inline styles on every mouseenter.
    (this.previewCells || []).forEach(cell => {
      cell.classList.remove('ghost', 'ghost-valid', 'ghost-invalid');
      cell.style.backgroundColor = '';
      cell.style.borderColor = '';
      if (cell.classList.contains('occupied')) {
        const x = Number(cell.dataset.x), y = Number(cell.dataset.y);
        const occupant = this.board[y] && this.board[y][x];
        if (occupant) cell.style.backgroundColor = occupant.color;
      }
    });
    this.previewCells = [];
  }

  // === TRANSFORMATION METHODS ===

  // Rotate a piece shape by degrees (90, -90, 180)
  rotatePieceShape(shape, degrees) {
    if (degrees === 0) return shape;
    
    let result = shape.map(row => [...row]); // Deep copy
    const times = Math.abs(degrees / 90) % 4;
    const clockwise = degrees > 0;
    
    for (let i = 0; i < times; i++) {
      if (clockwise) {
        // Rotate 90 degrees clockwise
        const rows = result.length;
        const cols = result[0].length;
        const newShape = Array(cols).fill().map(() => Array(rows).fill(0));
        
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            newShape[c][rows - 1 - r] = result[r][c];
          }
        }
        result = newShape;
      } else {
        // Rotate 90 degrees counter-clockwise
        const rows = result.length;
        const cols = result[0].length;
        const newShape = Array(cols).fill().map(() => Array(rows).fill(0));
        
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            newShape[cols - 1 - c][r] = result[r][c];
          }
        }
        result = newShape;
      }
    }
    
    return result;
  }

  // Flip a piece shape horizontally or vertically
  flipPieceShape(shape, direction) {
    if (direction === 'horizontal') {
      return shape.map(row => [...row].reverse());
    } else if (direction === 'vertical') {
      return [...shape].reverse();
    }
    return shape.map(row => [...row]); // Deep copy if no flip
  }

  // Apply all transformations to get current piece shape
  getCurrentPieceShape() {
    if (!this.selectedPieceOriginal) return null;
    
    let shape = this.selectedPieceOriginal.shape.map(row => [...row]); // Deep copy
    
    // Apply rotation
    if (this.selectedPieceTransforms.rotation !== 0) {
      shape = this.rotatePieceShape(shape, this.selectedPieceTransforms.rotation);
    }
    
    // Apply horizontal flip
    if (this.selectedPieceTransforms.flipH) {
      shape = this.flipPieceShape(shape, 'horizontal');
    }
    
    // Apply vertical flip
    if (this.selectedPieceTransforms.flipV) {
      shape = this.flipPieceShape(shape, 'vertical');
    }
    
    return shape;
  }

  // === USER INTERACTION METHODS ===

  // Rotate the selected piece
  rotateSelectedPiece(degrees) {
    if (!this.selectedPiece) {
      return;
    }
    
    this.selectedPieceTransforms.rotation = (this.selectedPieceTransforms.rotation + degrees) % 360;
    if (this.selectedPieceTransforms.rotation < 0) {
      this.selectedPieceTransforms.rotation += 360;
    }
    
    const newShape = this.getCurrentPieceShape();
    this.selectedPiece.shape = newShape;
    
    this.updateSelectedPiecePreview();
    this.clearPreview();
    this.showTransformInfo();
  }

  // Flip the selected piece
  flipSelectedPiece(direction) {
    if (!this.selectedPiece) {
      return;
    }
    
    if (direction === 'horizontal') {
      this.selectedPieceTransforms.flipH = !this.selectedPieceTransforms.flipH;
    } else if (direction === 'vertical') {
      this.selectedPieceTransforms.flipV = !this.selectedPieceTransforms.flipV;
    }
    
    const newShape = this.getCurrentPieceShape();
    this.selectedPiece.shape = newShape;
    
    this.updateSelectedPiecePreview();
    this.clearPreview();
    this.showTransformInfo();
  }

  // Reset the selected piece to original state
  resetSelectedPiece() {
    if (!this.selectedPiece || !this.selectedPieceOriginal) {
      return;
    }
    
    this.selectedPieceTransforms = { rotation: 0, flipH: false, flipV: false };
    this.selectedPiece.shape = this.selectedPieceOriginal.shape.map(row => [...row]); // Deep copy
    
    this.updateSelectedPiecePreview();
    this.clearPreview();
    this.showTransformInfo();
  }

  // Show current transformation info
  showTransformInfo() {
    const info = [];
    if (this.selectedPieceTransforms.rotation !== 0) {
      info.push(`Rotated ${this.selectedPieceTransforms.rotation}°`);
    }
    if (this.selectedPieceTransforms.flipH) {
      info.push('Flipped H');
    }
    if (this.selectedPieceTransforms.flipV) {
      info.push('Flipped V');
    }
    
    const transformInfo = info.length > 0 ? ` (${info.join(', ')})` : '';
    
    // Update preview title
    const previewContainer = document.getElementById('selected-piece-preview');
    const existingTitle = previewContainer.querySelector('.transform-info');
    if (existingTitle) {
      existingTitle.remove();
    }
    
    if (transformInfo) {
      const titleDiv = document.createElement('div');
      titleDiv.className = 'transform-info';
      titleDiv.style.cssText = 'font-size: 12px; color: #666; margin-bottom: 5px; font-weight: bold;';
      titleDiv.textContent = `Piece ${this.selectedPiece.id}${transformInfo}`;
      previewContainer.insertBefore(titleDiv, previewContainer.firstChild);
    }
  }

  // Update the preview of the selected piece
  updateSelectedPiecePreview() {
    const previewContainer = document.getElementById('selected-piece-preview');
    previewContainer.innerHTML = '';
    
    if (!this.selectedPiece) {
      previewContainer.innerHTML = '<p>Select a piece to see preview</p>';
      previewContainer.classList.remove('has-piece');
      return;
    }
    
    previewContainer.classList.add('has-piece');
    
    const previewPiece = document.createElement('div');
    previewPiece.className = 'preview-piece';
    previewPiece.style.gridTemplateColumns = `repeat(${this.selectedPiece.shape[0].length}, 1fr)`;
    
    for (let row = 0; row < this.selectedPiece.shape.length; row++) {
      for (let col = 0; col < this.selectedPiece.shape[row].length; col++) {
        const cell = document.createElement('div');
        cell.className = 'preview-cell';
        const isOccupied = this.selectedPiece.shape[row][col];
        
        if (isOccupied) {
          cell.classList.add('filled');
          cell.style.backgroundColor = this.selectedPiece.color;
        } else {
          cell.style.backgroundColor = 'transparent';
          cell.style.border = 'none';
        }
        
        previewPiece.appendChild(cell);
      }
    }
    
    previewContainer.appendChild(previewPiece);
    this.showTransformInfo();
  }

  // Update selectPiece method
  selectPiece(pieceId) {
    // If clicking the same piece, deselect it
    if (this.selectedPiece && this.selectedPiece.id === pieceId) {
      this.selectedPiece = null;
      this.selectedPieceOriginal = null;
      this.selectedPieceTransforms = { rotation: 0, flipH: false, flipV: false };
      this.clearPreview();
      this.hideRotationControls();
      document.querySelectorAll('.piece-wrapper').forEach(el => {
        el.classList.remove('selected');
      });
      return;
    }
    
    // Deep copy of the original piece
    const originalPiece = this.pieces.find(p => p.id === pieceId);
    this.selectedPieceOriginal = {
      ...originalPiece,
      shape: originalPiece.shape.map(row => [...row])
    };
    
    this.selectedPiece = {
      ...originalPiece,
      shape: originalPiece.shape.map(row => [...row])
    };
    
    this.selectedPieceTransforms = { rotation: 0, flipH: false, flipV: false };
    
    // Clear any existing preview
    this.clearPreview();
    
    // Show rotation controls and update preview
    this.showRotationControls();
    this.updateSelectedPiecePreview();
    
    // Update visual selection
    document.querySelectorAll('.piece-wrapper').forEach(el => {
      el.classList.remove('selected');
    });
    document.querySelector(`[data-piece-id="${pieceId}"]`).classList.add('selected');
  }

  // Show rotation controls
  showRotationControls() {
    document.getElementById('rotation-controls').classList.remove('hidden');
  }

  // Hide rotation controls
  hideRotationControls() {
    document.getElementById('rotation-controls').classList.add('hidden');
    document.getElementById('selected-piece-preview').classList.remove('has-piece');
    document.getElementById('selected-piece-preview').innerHTML = '<p>Select a piece to see preview</p>';
  }

  // === PIECE PLACEMENT METHODS ===

  // Check if a piece can be placed at a specific position
  canPlacePiece(piece, x, y) {
    if (!piece || !piece.shape) return false;
    
    const shape = piece.shape;
    const boardHeight = this.board.length;
    const boardWidth = this.board[0].length;
    
    // Check if piece fits within board boundaries
    for (let py = 0; py < shape.length; py++) {
        for (let px = 0; px < shape[py].length; px++) {
            if (shape[py][px] === 1) {
                const boardX = x + px;
                const boardY = y + py;
                
                // Check boundaries
                if (boardX < 0 || boardX >= boardWidth || 
                    boardY < 0 || boardY >= boardHeight) {
                    return false;
                }
                
                // Check if cell is already occupied
                if (this.board[boardY][boardX] !== null) {
                    return false;
                }
            }
        }
    }
    
    return true;
}

// Place a piece on the board (called when clicking)
handleCellClick(x, y) {
    // A click on an occupied cell always takes that piece back, whether or not
    // something is selected. One rule, no modes to remember.
    if (this.board[y][x] !== null) {
        this.removePieceAt(x, y);
        return;
    }

    if (!this.selectedPiece) {
        return;
    }

    const { ox, oy } = this.anchorToOrigin(this.selectedPiece, x, y);

    if (!this.canPlacePiece(this.selectedPiece, ox, oy)) {
        // Feedback is the shake plus the red ghost, not a modal.
        const wrapper = document.querySelector('.piece-wrapper.selected');
        if (wrapper) {
            wrapper.classList.remove('shake');
            void wrapper.offsetWidth;          // restart the animation
            wrapper.classList.add('shake');
        }
        return;
    }

    this.setPieceOnBoard(this.selectedPiece, ox, oy);

    this.selectedPiece = null;
    this.selectedPieceOriginal = null;
    this.selectedPieceTransforms = { rotation: 0, flipH: false, flipV: false };
    this.clearPreview();
    this.hideRotationControls();
    this.renderBoard();
    this.renderPieces();
    document.querySelectorAll('.piece-wrapper').forEach(el => el.classList.remove('selected'));
}

// Take a placed piece back off the board. renderPieces() rebuilds the tray
// from what is on the board, so it reappears there on its own.
removePieceAt(x, y) {
    const occupant = this.board[y][x];
    if (!occupant) return;

    const id = occupant.pieceId;
    for (let by = 0; by < this.board.length; by++) {
        for (let bx = 0; bx < this.board[by].length; bx++) {
            if (this.board[by][bx] && this.board[by][bx].pieceId === id) {
                this.board[by][bx] = null;
            }
        }
    }

    this.clearPreview();
    this.renderBoard();
    this.renderPieces();
}

// Actually set the piece on the board
setPieceOnBoard(piece, startX, startY) {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
                const boardY = startY + y;
                const boardX = startX + x;
                
                // Double-check bounds (should be guaranteed by canPlacePiece)
                if (boardY >= 0 && boardY < this.board.length && 
                    boardX >= 0 && boardX < this.board[boardY].length) {
                    this.board[boardY][boardX] = {
                        pieceId: piece.id,
                        color: piece.color
                    };
                }
            }
        }
    }
}

  async solvePuzzle() {
    this.showLoading();

    const convertedBoard = this.convertBoardForHaskell();
    const requestData = {
        board: convertedBoard,
        pieces: this.pieces,
    };
    

    try {
        const response = await fetch("/solve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestData),
        });

        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }

        const result = await response.json();
        
        if (result.success) {
            this.solution = result.solution;
            this.applySolutionToBoard();
        } else {
            alert(`Solving failed: ${result.message}`);
        }
        
    } catch (error) {
        // This used to fabricate a solution and apply it, so an unreachable
        // backend looked exactly like a successful solve. Fail visibly.
        console.error("Solve request failed:", error);
        alert("Could not reach the solver. Please try again.");
    } finally {
        this.hideLoading();
    }
}

  showLoading() {
    document.getElementById("loading").classList.remove("hidden");
  }

  hideLoading() {
    document.getElementById("loading").classList.add("hidden");
  }

  applySolutionToBoard() {
    if (!this.solution) return;
    
    // Stelle sicher dass das Board leer ist (außer bereits platzierte Pieces)

    
    // Platziere alle Pieces aus der Lösung
    this.solution.forEach((solutionPiece) => {
        // Finde das entsprechende Piece aus der pieces Liste
        const piece = this.pieces.find(p => p.id === solutionPiece.id);
        if (piece) {
            // Kopiere das Piece und setze die gelöste Form
            const solvedPiece = {
                ...piece,
                shape: solutionPiece.shape // Verwende die rotierte/gespiegelte Form
            };
            
            this.setPieceOnBoard(
                solvedPiece, 
                solutionPiece.position.x, 
                solutionPiece.position.y
            );
        }
    });
    
    // Re-render the board and the tray
    this.renderBoard();
    this.renderPieces(); // placed pieces drop out of the tray
}

  clearBoard() {
    this.board = this.createEmptyBoard();
    this.selectedPiece = null;
    this.selectedPieceOriginal = null;
    this.selectedPieceTransforms = { rotation: 0, flipH: false, flipV: false };
    this.clearPreview();
    this.hideRotationControls();
    this.renderBoard();
    this.renderPieces(); 

    // Clear piece selection - target piece-wrapper instead of puzzle-piece
    document.querySelectorAll(".piece-wrapper").forEach((el) => {
      el.classList.remove("selected");
    });
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

  convertBoardForHaskell() {
    return this.board.map(row => 
        row.map(cell => {
            if (cell === null || cell === undefined) {
                return { pieceId: "", color: "" }; // Empty cell als Objekt
            } else {
                return {
                    pieceId: String(cell.pieceId), // Convert to String
                    color: cell.color || ""
                };
            }
        })
    );
}
}

document.addEventListener("DOMContentLoaded", () => {
  new KanoodleSolver();
});
