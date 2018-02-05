import test from 'ava'
import { handler, getAllUsers } from './handler'

const executeLambda = (event, context) => (
    new Promise((resolve, reject) => {
        getAllUsers(event, context, (err, response) => {
            if (err !== null) {
                return reject(err)
            }
            resolve(response)
        })
    })
)

test('Get all users is returning a 200', async t => {
    const event = {}
    const context = {}
    const response = await executeLambda(event, context)
    t.is(response.statusCode, 200)
})
