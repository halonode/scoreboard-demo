local sum=0
local z=redis.call("ZREVRANGE", KEYS[1], ARGV[1], ARGV[2], "withscores")

for i=2, #z, 2 do 
    sum=sum+z[i]
end

return sum