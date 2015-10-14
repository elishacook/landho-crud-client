'use strict'

var landho_client = require('landho-client'),
    Collection = require('./collection')

module.exports = LandhoCrudClient


function LandhoCrudClient (ws)
{
    this.client = landho_client(ws)
}

LandhoCrudClient.prototype.collection = function (options)
{
    return new Collection(this.client.service(options.name), options)
}