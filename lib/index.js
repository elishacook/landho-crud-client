'use strict'

var watch = require('./watch'),
    landho_client = require('landho-client'),
    Collection = require('./Collection'),
    watch = require('./watch'),
    computation = require('./computation')

module.exports = function (ws)
{
    var client = landho_client(ws)
    
    return {
        
        collection: function (options)
        {
            options.client = client
            return new Collection(options)
        },
        
        watch: watch,
        
        computation: computation
    }
}
