'use strict'

var landho_client = require('landho-client'),
    Collection = require('./collection')

module.exports = LandhoCrudClient


function LandhoCrudClient (ws, options)
{
    this.client = landho_client(ws, options)
}

LandhoCrudClient.prototype.collection = function (options)
{
    return new Collection(this.client.service(options.name), options)
}