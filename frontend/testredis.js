const redis = require('redis');
redis.debug_mode = true;

const redisClient = redis.createClient({
  host: '127.0.0.1',
  port: 6379,
});

console.log('Starting Redis client...');

redisClient.on('connect', () => {
  console.log('Connected to Redis!');
});

redisClient.on('error', (err) => {
  console.error('Redis Error: ' + err);
});

redisClient.on('ready', () => {
  console.log('Redis client is ready!');
});

redisClient.on('end', () => {
  console.log('Redis client connection closed!');
});

(async () => {
  console.log('Before waiting for connection...');
  try {
    await new Promise((resolve, reject) => {
      redisClient.on('ready', resolve);
      redisClient.on('error', reject);
    });
    console.log('After waiting for connection...');
  } catch (error) {
    console.error('Error connecting to Redis:', error);
  }
  console.log('End of async function');
})();

setTimeout(() => {
  console.log('Keeping Node.js process running...');
}, 1000);