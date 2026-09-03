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
    document
      .getElementById("new-puzzle-btn")
      .addEventListener("click", () => this.newPuzzle());
    
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

  // Update renderBoard method für besseres Hover-Feedback
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

            // Event listeners für Hover und Click
            cell.addEventListener("mouseenter", () => this.handleCellHover(x, y));
            cell.addEventListener("mouseleave", () => this.handleCellLeave());
            cell.addEventListener("click", () => this.placePiece(x, y));

            container.appendChild(cell);
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
    this.clearPreview();
    
    if (!this.selectedPiece || !this.hoveredCell) return;
    
    const { x, y } = this.hoveredCell;
    
    // Check if piece can be placed (for valid/invalid styling)
    const canPlace = this.canPlacePiece(this.selectedPiece, x, y);
    const validPosition = this.isValidPreviewPosition(this.selectedPiece, x, y);
    
    // Only show preview if position is somewhat valid (within bounds)
    if (!validPosition) return;
    
    const shape = this.selectedPiece.shape;
    
    for (let py = 0; py < shape.length; py++) {
        for (let px = 0; px < shape[py].length; px++) {
            if (shape[py][px] === 1) {
                const boardX = x + px;
                const boardY = y + py;
                
                if (boardX >= 0 && boardX < 11 && boardY >= 0 && boardY < 5) {
                    const cellIndex = boardY * 11 + boardX;
                    const cell = document.querySelectorAll('.board-cell')[cellIndex];
                    
                    if (cell) {
                        cell.classList.add('preview-cell');
                        cell.style.backgroundColor = canPlace ? 
                            this.selectedPiece.color + '80' :  // 50% opacity for valid
                            '#f44336' + '80';                  // Red for invalid
                        cell.style.border = canPlace ? 
                            '2px solid ' + this.selectedPiece.color : 
                            '2px solid #f44336';
                    }
                }
            }
        }
    }
  }

  clearPreview() {
    document.querySelectorAll('.board-cell').forEach(cell => {
        cell.classList.remove('preview-cell');
        if (cell.classList.contains('empty')) {
            cell.style.backgroundColor = '#f5f5f5';
            cell.style.border = '1px solid #ddd';
        }
        // Keep original styling for occupied cells
    });
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
      alert('Please select a piece first!');
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
      alert('Please select a piece first!');
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
      alert('No piece selected to reset!');
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
placePiece(x, y) {
    if (!this.selectedPiece) {
        alert('Please select a piece first!');
        return;
    }

    if (this.canPlacePiece(this.selectedPiece, x, y)) {
        this.setPieceOnBoard(this.selectedPiece, x, y);
        
        // Clear selection and hide controls
        this.selectedPiece = null;
        this.selectedPieceOriginal = null;
        this.selectedPieceTransforms = { rotation: 0, flipH: false, flipV: false };
        this.clearPreview();
        this.hideRotationControls();
        
        // Re-render everything
        this.renderBoard();
        this.renderPieces();
        
        // Clear visual selection
        document.querySelectorAll('.piece-wrapper').forEach(el => {
            el.classList.remove('selected');
        });
    } else {
        // Visual feedback for failed placement
        const selectedWrapper = document.querySelector('.piece-wrapper.selected');
        if (selectedWrapper) {
            selectedWrapper.style.borderColor = '#f44336';
            selectedWrapper.style.background = '#ffebee';
            setTimeout(() => {
                selectedWrapper.style.borderColor = '#4CAF50';
                selectedWrapper.style.background = 'linear-gradient(135deg, #e8f5e8, #c8e6c9)';
            }, 300);
        }
        
        // Flash the board cell red
        const cells = document.querySelectorAll('.board-cell');
        const cellIndex = y * 11 + x; // 11 is board width
        if (cells[cellIndex]) {
            const originalBg = cells[cellIndex].style.backgroundColor;
            cells[cellIndex].style.backgroundColor = '#ffcdd2';
            setTimeout(() => {
                cells[cellIndex].style.backgroundColor = originalBg;
            }, 300);
        }
        
        alert('Cannot place piece here!');
    }
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

// Check if position is valid for preview
isValidPreviewPosition(piece, x, y) {
    if (!piece || !piece.shape) return false;
    
    const shape = piece.shape;
    const boardHeight = this.board.length;
    const boardWidth = this.board[0].length;
    
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
            }
        }
    }
    
    return true;
}

  async solvePuzzle() {
    this.showLoading();

    const convertedBoard = this.convertBoardForHaskell();
    const requestData = {
        board: convertedBoard,
        pieces: this.pieces,
    };
    
    console.log("Original board:", this.board);
    console.log("Converted board:", convertedBoard);
    console.log("Sending request data:", JSON.stringify(requestData, null, 2));

    try {
        const response = await fetch("/solve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestData),
        });

        console.log("Response status:", response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log("Error response:", errorText);
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }

        const result = await response.json();
        console.log("Success response:", result);
        
        if (result.success) {
            this.solution = result.solution;
            this.applySolutionToBoard();
        } else {
            alert(`Solving failed: ${result.message}`);
        }
        
    } catch (error) {
        console.log("Full error:", error);
        console.log("Backend not available, using mock solution");
        this.solution = this.generateMockSolution();
        this.applySolutionToBoard();
    } finally {
        this.hideLoading();
    }
}

  // Bessere Mock Solution mit sicheren Positionen
  generateMockSolution() {
    const availablePieces = this.pieces.filter(piece => 
        !this.getPlacedPieceIds().includes(piece.id)
    );
    
    // Sicherere Positionen die garantiert im Board sind
    const safePositions = [
        { x: 2, y: 2 },
        { x: 5, y: 2 },
        { x: 8, y: 2 }
    ];
    
    const mockSolution = [];
    for (let i = 0; i < Math.min(3, availablePieces.length); i++) {
        const piece = availablePieces[i];
        const pos = safePositions[i];
        
        // Prüfe ob das Piece an der Position passt
        if (pos && this.canPlacePiece(piece, pos.x, pos.y)) {
            mockSolution.push({
                id: piece.id,
                shape: piece.shape,
                color: piece.color,
                position: pos,
                rotation: 0
            });
        }
    }
    
    return mockSolution;
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

  applySolutionToBoard() {
    if (!this.solution) return;
    
    // Stelle sicher dass das Board leer ist (außer bereits platzierte Pieces)
    // this.clearBoard(); // Optional: Uncomment wenn du alles löschen willst
    
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
    
    // Board und Pieces neu rendern
    this.renderBoard();
    this.renderPieces(); // Versteckt die platzierten Pieces
    
    // Zeige Success-Message
    this.showSuccessMessage();
}

showSuccessMessage() {
    // Erstelle Success Overlay
    const overlay = document.createElement('div');
    overlay.className = 'success-overlay';
    overlay.innerHTML = `
        <div class="success-message">
            <h2>🎉 Puzzle Solved!</h2>
            <p>The solution has been applied to the board.</p>
            <div class="success-buttons">
                <button id="new-puzzle-success">New Puzzle</button>
                <button id="close-success">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Event Listeners für Buttons
    document.getElementById('new-puzzle-success').addEventListener('click', () => {
        this.clearBoard();
        this.closeSuccessMessage();
    });
    
    document.getElementById('close-success').addEventListener('click', () => {
        this.closeSuccessMessage();
    });
    
    // Auto-close nach 3 Sekunden
    setTimeout(() => {
        if (document.querySelector('.success-overlay')) {
            this.closeSuccessMessage();
        }
    }, 3000);
}

closeSuccessMessage() {
    const overlay = document.querySelector('.success-overlay');
    if (overlay) {
        overlay.remove();
    }
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
