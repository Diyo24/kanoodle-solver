{-# LANGUAGE DataKinds #-}
{-# LANGUAGE TypeOperators #-}
{-# LANGUAGE OverloadedStrings #-}

module Kanoodle.WebServer
  ( app
  , runServer
  ) where

import Kanoodle.Types
import Kanoodle.Solver
import Servant
import Network.Wai
import Network.Wai.Handler.Warp
import Data.Maybe (fromMaybe)
import Data.String (fromString)
import Data.Time.Clock
import Control.Exception (evaluate)
import Control.Monad.IO.Class (liftIO)
import System.Environment (lookupEnv)
import System.Timeout (timeout)
import Text.Read (readMaybe)

-- ============================================================================
-- CONFIGURATION
-- ============================================================================

-- | Read an environment variable, falling back to a default on absence or
-- unparseable input.
envWithDefault :: Read a => String -> a -> IO a
envWithDefault name fallback = do
  raw <- lookupEnv name
  return $ fromMaybe fallback (raw >>= readMaybe)

-- ============================================================================
-- API DEFINITION
-- ============================================================================

-- | The solver endpoint, plus a static file server for the GUI. Serving both
-- from one origin means the browser makes same-origin requests, so no CORS
-- headers are needed.
type KanoodleAPI =
       "solve" :> ReqBody '[JSON] SolveRequest :> Post '[JSON] SolveResponse
  :<|> Raw

kanoodleAPI :: Proxy KanoodleAPI
kanoodleAPI = Proxy

-- ============================================================================
-- API HANDLERS
-- ============================================================================

-- | Handle solve requests, abandoning the search if it exceeds the budget.
solveHandler :: Int -> SolveRequest -> Handler SolveResponse
solveHandler timeoutSeconds req = liftIO $ do
  startTime <- getCurrentTime

  let board = reqBoard req
      pieces = reqPieces req

  -- The search is unbounded backtracking, so bound it here. Forcing the list
  -- length inside the timeout keeps the work from escaping as a lazy thunk
  -- that would otherwise be evaluated later during JSON encoding.
  outcome <- timeout (timeoutSeconds * 1000000) $ do
    let result = solvePuzzle board pieces
    _ <- evaluate (fmap length result)
    return result

  endTime <- getCurrentTime
  let timeDiff = diffUTCTime endTime startTime
      solvingTimeMs = round (timeDiff * 1000)

  return $ case outcome of
    Just (Just sol) -> SolveResponse
      { respSuccess = True
      , respSolution = sol
      , respMessage = "Solution found!"
      , respSolvingTime = solvingTimeMs
      }
    Just Nothing -> SolveResponse
      { respSuccess = False
      , respSolution = []
      , respMessage = "No solution found"
      , respSolvingTime = solvingTimeMs
      }
    Nothing -> SolveResponse
      { respSuccess = False
      , respSolution = []
      , respMessage = "Search timed out after "
                      ++ show timeoutSeconds ++ "s"
      , respSolvingTime = solvingTimeMs
      }

-- ============================================================================
-- APPLICATION SETUP
-- ============================================================================

-- | Create the Servant application, serving the GUI from the given directory.
app :: FilePath -> Int -> Application
app staticDir timeoutSeconds =
  serve kanoodleAPI (solveHandler timeoutSeconds :<|> serveDirectoryFileServer staticDir)

-- | Run the web server
runServer :: IO ()
runServer = do
  port <- envWithDefault "KANOODLE_PORT" (8080 :: Int)
  timeoutSeconds <- envWithDefault "KANOODLE_TIMEOUT_SECONDS" (10 :: Int)
  staticDir <- fromMaybe "../gui" <$> lookupEnv "KANOODLE_STATIC_DIR"
  host <- fromMaybe "127.0.0.1" <$> lookupEnv "KANOODLE_HOST"

  putStrLn $ "Starting Kanoodle Solver on http://" ++ host ++ ":" ++ show port
  putStrLn $ "  serving GUI from: " ++ staticDir
  putStrLn $ "  solve timeout:    " ++ show timeoutSeconds ++ "s"
  putStrLn ""

  let settings = setPort port $ setHost (fromString host) defaultSettings
  runSettings settings (app staticDir timeoutSeconds)
