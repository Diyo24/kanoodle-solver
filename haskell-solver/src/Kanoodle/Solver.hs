{-# LANGUAGE BangPatterns #-}
module Kanoodle.Solver
  ( solvePuzzle
  , countEmptyCells
  , filterUnusedPieces
  , getPieceSize
  , canPlacePieceQuick
  , placePiece
  , rotatePiece
  , getUniqueTransformations
  ) where

import           Kanoodle.Types
import qualified Data.Vector          as V
import qualified Data.IntMap.Strict   as IM
import qualified Data.IntSet          as IS
import qualified Data.Set             as Set
import qualified Data.Map.Strict      as Map
import           Data.List            (minimumBy, transpose)

-- ============================================================================
-- TYPES
-- ============================================================================

-- | Information about one placement of a piece
data PlacementInfo = PlacementInfo
  { piIndex :: !Int        -- ^ Piece index in the unused pieces list
  , piRot   :: !Int        -- ^ Rotation number (0-7)
  , piPos   :: !Position   -- ^ Top-left position on board
  , piShape :: [[Int]]     -- ^ Rotated shape
  , piCells :: [Int]       -- ^ Empty cell column indices covered
  } deriving (Show)

-- ============================================================================
-- EXACT COVER MATRIX CONSTRUCTION
-- ============================================================================

-- | Build exact cover matrix for empty cells only
mkExactCoverMatrix
  :: Board
  -> [Piece]                -- ^ Unused pieces only
  -> ( Int                   -- ^ Total columns = #pieces + #emptyCells
     , V.Vector [Int]        -- ^ Each row = [pieceCol, emptyCellCols...]
     , V.Vector PlacementInfo -- ^ Placement info for each row
     )
mkExactCoverMatrix board pieces =
  let
    -- Find all empty cell coordinates
    boardHeight = length board
    boardWidth  = length (head board)
    emptyCoords = findEmptyCoordinates board boardHeight boardWidth
    emptyCount  = length emptyCoords

    -- Map each empty (row,col) to column index pieces + idx
    pieceCount    = length pieces
    positionToCol = buildPositionMapping emptyCoords pieceCount

    -- Generate all valid placements on empty cells only
    placementsList = generateValidPlacements 
                       board pieces positionToCol boardWidth boardHeight
    placementsVec  = V.fromList placementsList

    -- Build DLX rows: [pieceColumn, emptyCellColumns...]
    rowsVec = V.map buildDLXRow placementsVec

    totalColumns = pieceCount + emptyCount
  in
    (totalColumns, rowsVec, placementsVec)

-- | Find all empty cell coordinates on the board
findEmptyCoordinates :: Board -> Int -> Int -> [(Int, Int)]
findEmptyCoordinates board boardHeight boardWidth =
  [ (row, col)
  | row <- [0..boardHeight-1]
  , col <- [0..boardWidth-1]
  , cellPieceId ((board !! row) !! col) == ""
  ]

-- | Build mapping from position to column index
buildPositionMapping :: [(Int, Int)] -> Int -> Map.Map (Int, Int) Int
buildPositionMapping emptyCoords pieceCount = Map.fromList
  [ ((row, col), pieceCount + idx)
  | (idx, (row, col)) <- zip [0..] emptyCoords
  ]

-- | Generate all valid piece placements
generateValidPlacements 
  :: Board 
  -> [Piece] 
  -> Map.Map (Int, Int) Int 
  -> Int 
  -> Int 
  -> [PlacementInfo]
generateValidPlacements board pieces positionToCol boardWidth boardHeight =
  [ PlacementInfo
      pieceIndex
      rotation
      (Position x y)
      rotatedShape
      coveredColumns
  | (piece, pieceIndex) <- zip pieces [0..]
  , (rotation, rotatedShape) <- getUniqueTransformations piece
  , (x, y) <- getValidTopLeftPositions rotatedShape boardWidth boardHeight
  , isValidPlacementOnEmpty board rotatedShape x y
  , let coveredColumns = getCoveredColumns rotatedShape x y positionToCol
  ]

-- | Get all valid top-left positions for a shape
getValidTopLeftPositions :: [[Int]] -> Int -> Int -> [(Int, Int)]
getValidTopLeftPositions shape boardWidth boardHeight =
  let shapeHeight = length shape
      shapeWidth  = if null shape then 0 else length (head shape)
  in [ (x, y)
     | x <- [0..boardWidth - shapeWidth]
     , y <- [0..boardHeight - shapeHeight]
     ]

-- | Check if shape can be placed at position (only on empty cells)
isValidPlacementOnEmpty :: Board -> [[Int]] -> Int -> Int -> Bool
isValidPlacementOnEmpty board shape x y =
  all (\(deltaRow, deltaCol) ->
         let boardRow = y + deltaRow
             boardCol = x + deltaCol
             boardHeight = length board
             boardWidth = length (head board)
         in inBounds boardRow boardCol boardHeight boardWidth
         && cellPieceId ((board !! boardRow) !! boardCol) == ""
      ) (getShapeOnes shape)

-- | Get column indices covered by this placement
getCoveredColumns :: [[Int]] -> Int -> Int -> Map.Map (Int, Int) Int -> [Int]
getCoveredColumns shape x y positionToCol =
  [ positionToCol Map.! (y + deltaRow, x + deltaCol)
  | (deltaRow, deltaCol) <- getShapeOnes shape
  ]

-- | Get offsets of all '1' cells in a shape
getShapeOnes :: [[Int]] -> [(Int, Int)]
getShapeOnes shape =
  [ (row, col)
  | row <- [0..length shape - 1]
  , col <- [0..length (head shape) - 1]
  , (shape !! row) !! col == 1
  ]

-- | Build DLX row from placement info
buildDLXRow :: PlacementInfo -> [Int]
buildDLXRow (PlacementInfo pieceIndex _ _ _ cellColumns) = 
  pieceIndex : cellColumns

-- | Check if coordinates are within board bounds
inBounds :: Int -> Int -> Int -> Int -> Bool
inBounds row col height width = 
  row >= 0 && col >= 0 && row < height && col < width

-- ============================================================================
-- DANCING LINKS ALGORITHM (Algorithm X)
-- ============================================================================

-- | Run Dancing Links Algorithm to solve exact cover
runDLX :: Int -> V.Vector [Int] -> Maybe [Int]
runDLX _columnCount rowsVector =
  let
    rowsList = V.toList rowsVector
    rowsMap  = buildRowsMapping rowsList
    colsMap  = buildColumnsMapping rowsList
  in
    searchDLX [] rowsMap colsMap

-- | Build mapping from row index to covered columns
buildRowsMapping :: [[Int]] -> IM.IntMap IS.IntSet
buildRowsMapping rowsList = IM.fromList
  [ (rowIndex, IS.fromList columns)
  | (rowIndex, columns) <- zip [0..] rowsList
  ]

-- | Build mapping from column to covering rows
buildColumnsMapping :: [[Int]] -> IM.IntMap IS.IntSet
buildColumnsMapping rowsList = IM.fromListWith IS.union
  [ (column, IS.singleton rowIndex)
  | (rowIndex, columns) <- zip [0..] rowsList
  , column <- columns
  ]

-- | Recursive search using constraint propagation
searchDLX :: [Int] -> IM.IntMap IS.IntSet -> IM.IntMap IS.IntSet -> Maybe [Int]
searchDLX partialSolution rowsMapping columnsMapping
  | IM.null columnsMapping = Just (reverse partialSolution)
  | otherwise = 
      case chooseConstrainedColumn columnsMapping of
        Nothing -> Nothing
        Just (column, coveringRows) ->
          tryAllRows coveringRows
  where
    tryAllRows rows = IS.foldr tryRow Nothing rows
    
    tryRow rowIndex accumulator = case accumulator of
      Just result -> Just result
      Nothing -> 
        let coveredColumns = rowsMapping IM.! rowIndex
            conflictingRows = IS.unions 
              [columnsMapping IM.! col | col <- IS.toList coveredColumns]
            newRowsMapping = IM.withoutKeys rowsMapping conflictingRows
            newColumnsMapping = IM.map (`IS.difference` conflictingRows)
                               (IM.withoutKeys columnsMapping coveredColumns)
        in searchDLX (rowIndex : partialSolution) newRowsMapping newColumnsMapping

-- | Choose column with minimum covering rows (most constrained variable)
chooseConstrainedColumn :: IM.IntMap IS.IntSet -> Maybe (Int, IS.IntSet)
chooseConstrainedColumn columnsMapping
  | IM.null columnsMapping = Nothing
  | otherwise = 
      let (column, rows) = minimumBy compareRowCount (IM.toList columnsMapping)
      in if IS.null rows then Nothing else Just (column, rows)
  where
    compareRowCount (_, rows1) (_, rows2) = compare (IS.size rows1) (IS.size rows2)

-- ============================================================================
-- MAIN SOLVER INTERFACE
-- ============================================================================

-- | Main puzzle solver using exact cover algorithm
solvePuzzle :: Board -> [Piece] -> Maybe [SolutionPiece]
solvePuzzle board pieces =
  let unusedPieces  = filterUnusedPieces board pieces
      emptyCells    = countEmptyCells board
      requiredCells = sum (map getPieceSize unusedPieces)
  in if emptyCells /= requiredCells
        then Nothing  -- Impossible: cell count mismatch
        else
          let (columnCount, rowsVector, placementsVector) =
                mkExactCoverMatrix board unusedPieces
          in case runDLX columnCount rowsVector of
               Nothing -> Nothing
               Just solutionIndices -> 
                 Just (buildSolutionFromIndices unusedPieces placementsVector solutionIndices)

-- | Convert solution indices to SolutionPiece list
buildSolutionFromIndices
  :: [Piece]
  -> V.Vector PlacementInfo
  -> [Int]
  -> [SolutionPiece]
buildSolutionFromIndices allPieces placementsVector solutionIndices =
  [ let PlacementInfo pieceIndex rotation position rotatedShape _ = 
          placementsVector V.! rowIndex
        basePiece = allPieces !! pieceIndex
        pieceWithRotatedShape = basePiece { shape = rotatedShape }
    in SolutionPiece pieceWithRotatedShape position rotation
  | rowIndex <- solutionIndices
  ]

-- ============================================================================
-- PIECE TRANSFORMATIONS
-- ============================================================================

-- | Rotate piece shape 90 degrees clockwise
rotatePiece :: [[Int]] -> [[Int]]
rotatePiece [] = []
rotatePiece shape =
  let rows = length shape
      cols = if null shape then 0 else length (head shape)
  in [ [ (shape !! (rows - 1 - j)) !! i | j <- [0..rows-1] ] 
     | i <- [0..cols-1] 
     ]

-- | Flip piece horizontally
flipPieceHorizontal :: [[Int]] -> [[Int]]
flipPieceHorizontal = map reverse

-- | Remove empty borders from shape
normalizeShape :: [[Int]] -> [[Int]]
normalizeShape shape =
  let nonEmptyRows = filter (any (== 1)) shape
      transposedCols = transpose nonEmptyRows
      nonEmptyCols = filter (any (== 1)) transposedCols
  in transpose nonEmptyCols

-- | Get all unique transformations of a piece (8 orientations, deduplicated)
getUniqueTransformations :: Piece -> [(Int, [[Int]])]
getUniqueTransformations piece =
  let baseShape = normalizeShape (shape piece)
      rotations = take 4 $ iterate rotatePiece baseShape
      flippedRotations = take 4 $ iterate rotatePiece (flipPieceHorizontal baseShape)
      allOrientations = rotations ++ flippedRotations
      normalizedOrientations = map normalizeShape allOrientations
      uniqueShapesMap = Map.fromList 
        [ (shapeToKey s, s) | s <- normalizedOrientations ]
  in zip [0..] (Map.elems uniqueShapesMap)

-- | Convert shape to string key for deduplication
shapeToKey :: [[Int]] -> String
shapeToKey = concatMap (concatMap show)

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- | Count empty cells on the board
countEmptyCells :: Board -> Int
countEmptyCells board =
  length [ () | row <- board, cell <- row, cellPieceId cell == "" ]

-- | Filter out pieces already placed on the board
filterUnusedPieces :: Board -> [Piece] -> [Piece]
filterUnusedPieces board pieces =
  let usedPieceIds = Set.fromList
        [ cellPieceId cell
        | row <- board, cell <- row, cellPieceId cell /= ""
        ]
  in [ piece | piece <- pieces, pieceId piece `Set.notMember` usedPieceIds ]

-- | Get number of cells occupied by a piece
getPieceSize :: Piece -> Int
getPieceSize piece =
  sum [ 1 | row <- shape piece, value <- row, value == 1 ]

-- | Quick check if piece can be placed at position
canPlacePieceQuick :: Board -> Piece -> Position -> Bool
canPlacePieceQuick board piece position = 
  fastCanPlace board (shape piece) position

-- | Fast placement check
fastCanPlace :: Board -> [[Int]] -> Position -> Bool
fastCanPlace board shape (Position px py) =
  let boardHeight = length board
      boardWidth  = length (head board)
      shapeHeight = length shape
      shapeWidth  = if null shape then 0 else length (head shape)
  in  px >= 0 && py >= 0 && px + shapeWidth <= boardWidth && py + shapeHeight <= boardHeight
   && all (\(row, col) ->
             let shapeValue = (shape !! row) !! col
                 boardY = py + row
                 boardX = px + col
             in shapeValue == 0 || cellPieceId ((board !! boardY) !! boardX) == ""
          )
          [ (row, col) | row <- [0..shapeHeight-1], col <- [0..shapeWidth-1] ]

-- | Place piece on board
placePiece :: Board -> Piece -> Position -> Board
placePiece board piece position =
  placePieceShape board (shape piece) position (pieceId piece) (color piece)

-- | Place piece shape on board with given ID and color
placePieceShape
  :: Board -> [[Int]] -> Position -> String -> String -> Board
placePieceShape board shape (Position px py) pieceId pieceColor =
  let boardHeight = length board
      boardWidth  = length (head board)
      shapeHeight = length shape
      shapeWidth  = if null shape then 0 else length (head shape)
  in [ [ if    row >= py && row < py + shapeHeight
            && col >= px && col < px + shapeWidth
            && (shape !! (row - py)) !! (col - px) == 1
         then Cell pieceId pieceColor
         else (board !! row) !! col
       | col <- [0..boardWidth-1] ]
     | row <- [0..boardHeight-1] ]