-- Fix carryover jackpot values based on previous games' contributions
-- Game 2 should get Game 1's contribution (0.1)
UPDATE games 
SET carryover_jackpot = 0.1 
WHERE game_number = 2;

-- Game 3 should get Game 2's contribution (278.36)
UPDATE games 
SET carryover_jackpot = 278.36 
WHERE game_number = 3;