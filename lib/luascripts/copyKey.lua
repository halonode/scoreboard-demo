-- @desc:   The fastest, type-agnostic way to copy a Redis key
-- @usage:  redis-cli --eval copy_key.lua <source> <dest> , [NX]

local s = KEYS[1]
local d = ARGV[1]

if redis.call("EXISTS", d) == 1 then
  if type(ARGV[1]) == "string" and ARGV[1]:upper() == "NX" then
    return nil
  else
    redis.call("DEL", d)
  end
end

return redis.call("RESTORE", d, 0, redis.call("DUMP", s))