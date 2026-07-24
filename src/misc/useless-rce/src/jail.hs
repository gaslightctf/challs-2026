{-# LANGUAGE LambdaCase #-}

module Main where

import Language.Haskell.Interpreter

printBanner :: IO ()
printBanner = do
    putStrLn "      ▜               "
    putStrLn "▌▌▛▘█▌▐ █▌▛▘▛▘▄▖▛▘▛▘█▌"
    putStrLn "▙▌▄▌▙▖▐▖▙▖▄▌▄▌  ▌ ▙▖▙▖"
    putStrLn ""

stripIO :: String -> String
stripIO [] = []
stripIO ('I' : 'O' : xs) = stripIO xs
stripIO (x : xs) = x : stripIO xs

getInput :: IO String
getInput = go ""
    where
        go xs = getLine >>= \case { "EOF" -> return xs; x -> go (xs ++ x ++ "\n") }

main :: IO ()
main = do
    printBanner

    putStrLn "=== example:"
    putStrLn "module Payload where"
    putStrLn "runMe :: () -> ()"
    putStrLn "runMe _ = (1+1) `seq` ()"
    putStrLn ""
    putStrLn "=== input your module code here (end with a line containing only `EOF`):"

    getInput >>= writeFile "Payload.hs" . stripIO

    r <- runInterpreter interp
    case r of
        Left err -> print err
        Right runMe -> print $ runMe ()

interp :: Interpreter (() -> ())
interp = do
    loadModules ["Payload.hs"]
    setTopLevelModules ["Payload"]
    interpret "runMe" as
