lab*9_redis
Start-Service -Name Memurai запустити редіс
npm run dev
npm run external
GET http://localhost:3000/api/v1/books/11/details
redis-cli
keys genre:*
ttl genre:Poetry
5 В redis-cli після запиту:
keys fastify-rate-limit
7 flushall
http://localhost:3000/api/v2/books?page=1&limit=10 після запиту
keys books:*
ttl books:page:1:limit:10

POST http://localhost:3000/api/v1/books
{"title":"Test","author":"Author","year":2024,"genre":"Fiction","pagecount":100}
keys books:* // кеш інвалідовано

lab_9_session
після логіну
keys sess:*

lab_10
npm test
npm run test:coverage
npm test -- tests/unit
npm test -- tests/integration

docker compose up // dev
docker compose -f docker-compose.yml up // prod
