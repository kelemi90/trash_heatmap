const request = require('supertest')
const app = require('../server/server')

describe('basic server tests', () => {
  test('GET /api/admin/check responds with logged:false by default', async () => {
    const res = await request(app).get('/api/admin/check')
    expect(res.statusCode).toBe(200)
    expect(res.body).toHaveProperty('logged')
    expect(res.body.logged).toBe(false)
  })
})
