const mongoose = require('mongoose')
const bluebird = require('bluebird')
mongoose.Promise = bluebird
let isConnected

module.exports = connectToDatabase = () => {
    require('dotenv').config()
    if (isConnected) {
        console.log('=> using existing database connection')
        return Promise.resolve()
    }

    console.log('=> using new database connection')
    return mongoose.connect(process.env.DB)
    .then(db => {
        isConnected = db.connections[0].readyState
    })
}
