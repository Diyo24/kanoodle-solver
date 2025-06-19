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
import Network.Wai.Middleware.Cors
import Data.Time.Clock
import Control.Monad.IO.Class (liftIO)

-- ============================================================================
-- API DEFINITION
-- ============================================================================

type KanoodleAPI = "solve" :> ReqBody '[JSON] SolveRequest :> Post '[JSON] SolveResponse

kanoodleAPI :: Proxy KanoodleAPI
kanoodleAPI = Proxy

-- ============================================================================
-- API HANDLERS
-- ============================================================================

-- | Handle solve requests
solveHandler :: SolveRequest -> Handler SolveResponse
solveHandler req = liftIO $ do
  startTime <- getCurrentTime
  
  let board = reqBoard req
      pieces = reqPieces req
      result = solvePuzzle board pieces
  
  endTime <- getCurrentTime
  let timeDiff = diffUTCTime endTime startTime
      solvingTimeMs = round (timeDiff * 1000)
  
  return $ case result of
    Just sol -> SolveResponse
      { respSuccess = True
      , respSolution = sol
      , respMessage = "Solution found!"
      , respSolvingTime = solvingTimeMs
      }
    Nothing -> SolveResponse
      { respSuccess = False
      , respSolution = []
      , respMessage = "No solution found"
      , respSolvingTime = solvingTimeMs
      }

-- ============================================================================
-- APPLICATION SETUP
-- ============================================================================

-- | Create the Servant application
app :: Application
app = cors (const $ Just corsPolicy) $ serve kanoodleAPI solveHandler
  where
    corsPolicy = CorsResourcePolicy
      { corsOrigins = Nothing
      , corsMethods = ["GET", "POST", "OPTIONS"]
      , corsRequestHeaders = ["Content-Type"]
      , corsExposedHeaders = Nothing
      , corsMaxAge = Nothing
      , corsVaryOrigin = False
      , corsRequireOrigin = False
      , corsIgnoreFailures = False
      }

-- | Run the web server
runServer :: IO ()
runServer = do
  putStrLn "Starting Kanoodle Solver server on http://localhost:8080"
  putStrLn "API endpoints:"
  putStrLn "  POST /solve - Solve a Kanoodle puzzle"
  putStrLn ""
  run 8080 app