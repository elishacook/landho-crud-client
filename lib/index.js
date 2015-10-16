'use strict'

var LandhoClient = require('landho-client'),
    Collection = require('./collection')

module.exports = LandhoCrudClient


function LandhoCrudClient (ws, options)
{
    this.client = new LandhoClient(ws, options)
}

LandhoCrudClient.prototype.collection = function (options)
{
    return new Collection(this.client.service(options.name), options)
}