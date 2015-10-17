'use strict'


var SimpleEvents = require('@elishacook/simple-events')


module.exports = List


function List()
{
    Array.call(this)
    SimpleEvents.call(this)
    this.records_by_id = {}
}
List.prototype = Object.create(Array.prototype)
List.prototype.constructor = List

Object.keys(SimpleEvents.prototype).forEach(function (k)
{
    List.prototype[k] = SimpleEvents.prototype[k]
})


List.prototype.push = function (record)
{
    this.records_by_id[record.get('id')] = record
    Array.prototype.push.call(this, record)
}


List.prototype.get = function (id)
{
    return this.records_by_id[id]
}


List.prototype.set = function (i, record)
{
    this[i] = record
    this.records_by_id[record.get('id')] = record
}


List.prototype.remove = function (id)
{
    var record = this.records_by_id[id]
    
    if (record)
    {
        delete this.records_by_id[id]
        var index = this.indexOf(record)
        this.splice(index, 1)
    }
}