mongod --bind_ip="127.0.0.1" --dbpath=./data --logpath=./log/mongod.log &
redis-server --bind 127.0.0.1 --loglevel warning --daemonize yes &