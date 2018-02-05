const connectToDatabase = require('./db')
const UserModel = require('./model/User.js')
const jwt = require('jsonwebtoken')

// Error callback helper
const createErrorResponse = (statusCode, message) => ({
    statusCode: statusCode || 500,
    headers: { 'Content-Type': 'text/plain' },
    body: message || 'Unexpected error'
})

// Auth - Policy helper
const buildIAMPolicy = (userId, effect, resource, context) => {
    console.log(`buildIAMPolicy ${userId} ${effect} ${resource}`)
    const policy = {
        principalId: userId,
        policyDocument: {
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect: effect,
                    Resource: resource,
                },
            ],
        },
        context,
    }
    console.log(JSON.stringify(policy))
    return policy
}

// Auth
module.exports.auth = (event, context, callback) => {
    require('dotenv').config()
    if (!event.authorizationToken) { return callback('Unauthorized') }

    try {
        // Verify JWT
        const token = event.authorizationToken.split('Bearer ')[1]
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        // Return an IAM policy document for the current endpoint
        const authorizerContext = { user: JSON.stringify(decoded.user) }
        const policyDocument = buildIAMPolicy('Ando', 'Allow', event.methodArn, authorizerContext)
        // TODO: User user _id as identifier
        // TODO: Use the Allow/Deny props to secure endpoints for admins

        callback(null, policyDocument)
    } catch (e) {
        callback('Unauthorized') // Return a 401 Unauthorized response
    }
}

// Login
module.exports.login = (event, context, callback) => {
    require('dotenv').config()
    context.callbackWaitsForEmptyEventLoop = false // Means we dont have to call db.close() at the end

    // Get request body
    const { name } = JSON.parse(event.body)

    try {
        connectToDatabase()
        .then(() => {
            UserModel.findOne({ name })
            .then((user) => {
                if (!user) { return callback(null, createErrorResponse(404, 'User not found')) }
                // Issue JWT
                const token = jwt.sign({ user }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRATION_TIME })
                callback(null, { statusCode: 200, body: JSON.stringify({ token }) })
            })
            .catch((err) => {
                callback(null, createErrorResponse(err.statusCode, err.message))
            })
        })
    } catch (err) {
        console.log(`Error logging in: ${err.message}`)
        callback(null, createErrorResponse(err.statusCode, err.message))
    }
}

// GET a user
module.exports.getUser = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false // Means we dont have to call db.close() at the end

    connectToDatabase()
    .then(() => {
        UserModel.find({ _id: event.pathParameters.id })
        .then((user) => {
            callback(null, { statusCode: 200, body: JSON.stringify(user) })
        })
        .catch((err) => {
            callback(null, createErrorResponse(err.statusCode, err.message))
        })
    })
}

// GET all users
module.exports.getAllUsers = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false

    const user = JSON.parse(event.requestContext.authorizer.user)

    connectToDatabase()
    .then(() => {
        UserModel.find()
        .then((users) => {
            callback(null, { statusCode: 200, body: JSON.stringify(users) })
        })
        .catch((err) => {
            callback(null, createErrorResponse(err.statusCode, err.message))
        })
    })
}

// CREATE a user
module.exports.createUser = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false

    // Mutate request body before save
    const data = JSON.parse(event.body)
    data.ip = event.requestContext.identity.sourceIp

    connectToDatabase()
    .then(() => {
        UserModel.create(data)
        .then(user => callback(null, {
            statusCode: 200,
            body: JSON.stringify(user)
        }))
        .catch(err => callback(null,
            createErrorResponse(err.statusCode, err.message))
        )
    })
}

// DELETE user
module.exports.deleteUser = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false

    connectToDatabase()
    .then(() => {
        UserModel.findByIdAndRemove(event.pathParameters.id)
        .then(user => {
            callback(null, {
                statusCode: 200,
                body: JSON.stringify({ message: 'Removed user with id: ' + user._id, note: user })
            })
        })
        .catch((err) => {
            callback(null, createErrorResponse(err.statusCode, err.message))
        })
    })
}

// UPDATE a user
module.exports.updateUser = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false

    // Mutate request body before save
    const data = JSON.parse(event.body)
    data.ip = event.requestContext.identity.sourceIp

    connectToDatabase()
    .then(() => {
        UserModel.findByIdAndUpdate(event.pathParameters.id, data, { new: true })
        .then(user => callback(null, {
            statusCode: 200,
            body: JSON.stringify(user)
        }))
        .catch((err) => {
            callback(err, createErrorResponse(err.statusCode, err.message))
        })
    })
}
