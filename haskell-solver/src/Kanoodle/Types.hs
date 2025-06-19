{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE OverloadedStrings #-}

module Kanoodle.Types
  ( -- * Core Types
    Position(..)
  , Piece(..)
  , Cell(..)
  , Board
  , SolutionPiece(..)
    -- * API Types
  , SolveRequest(..)
  , SolveResponse(..)
  ) where

import Data.Aeson
import GHC.Generics

-- ============================================================================
-- CORE PUZZLE TYPES
-- ============================================================================

-- | Position on the game board (x, y coordinates)
data Position = Position
  { x :: !Int  -- ^ Column index (0-based from left)
  , y :: !Int  -- ^ Row index (0-based from top)
  } deriving (Show, Eq, Generic)

instance ToJSON Position where
  toJSON (Position posX posY) = object
    [ "x" .= posX
    , "y" .= posY
    ]

instance FromJSON Position where
  parseJSON = withObject "Position" $ \o -> Position
    <$> o .: "x"
    <*> o .: "y"

-- | Puzzle piece with shape and visual properties
data Piece = Piece
  { pieceId :: !String   -- ^ Unique identifier (e.g., "A", "B", "C")
  , shape   :: [[Int]]   -- ^ 2D shape matrix (1 = filled, 0 = empty)
  , color   :: !String   -- ^ Display color (hex format)
  } deriving (Show, Eq, Generic)

instance ToJSON Piece where
  toJSON (Piece pid shp clr) = object
    [ "id"    .= pid
    , "shape" .= shp
    , "color" .= clr
    ]

instance FromJSON Piece where
  parseJSON = withObject "Piece" $ \o -> Piece
    <$> o .: "id"
    <*> o .: "shape"
    <*> o .: "color"

-- | Single cell on the game board
data Cell = Cell
  { cellPieceId :: !String  -- ^ ID of piece occupying this cell (empty = "")
  , cellColor   :: !String  -- ^ Display color of this cell
  } deriving (Show, Eq, Generic)

instance ToJSON Cell where
  toJSON (Cell pid clr) = object
    [ "pieceId" .= pid
    , "color"   .= clr
    ]

instance FromJSON Cell where
  parseJSON = withObject "Cell" $ \o -> Cell
    <$> o .: "pieceId"
    <*> o .: "color"

-- | Game board represented as a 2D grid of cells
type Board = [[Cell]]

-- | Complete solution for one piece placement
data SolutionPiece = SolutionPiece
  { sPiece   :: !Piece    -- ^ The piece being placed
  , position :: !Position -- ^ Top-left position on board
  , rotation :: !Int      -- ^ Rotation index (0-7)
  } deriving (Show, Eq, Generic)

instance ToJSON SolutionPiece where
  toJSON (SolutionPiece piece pos rot) = object
    [ "id"       .= pieceId piece
    , "shape"    .= shape piece
    , "color"    .= color piece
    , "position" .= pos
    , "rotation" .= rot
    ]

-- ============================================================================
-- API REQUEST/RESPONSE TYPES
-- ============================================================================

-- | Request to solve a Kanoodle puzzle
data SolveRequest = SolveRequest
  { reqBoard  :: !Board   -- ^ Current board state
  , reqPieces :: ![Piece] -- ^ Available pieces to place
  } deriving (Show, Generic)

instance FromJSON SolveRequest where
  parseJSON = withObject "SolveRequest" $ \o -> SolveRequest
    <$> o .: "board"
    <*> o .: "pieces"

-- | Response from puzzle solver
data SolveResponse = SolveResponse
  { respSuccess     :: !Bool            -- ^ Whether a solution was found
  , respSolution    :: ![SolutionPiece] -- ^ List of piece placements
  , respMessage     :: !String          -- ^ Human-readable status message
  , respSolvingTime :: !Int             -- ^ Time taken in milliseconds
  } deriving (Show, Generic)

instance ToJSON SolveResponse where
  toJSON (SolveResponse success sol msg time) = object
    [ "success"     .= success
    , "solution"    .= sol
    , "message"     .= msg
    , "solvingTime" .= time
    ]