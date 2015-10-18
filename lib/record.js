'use strict'

var SimpleEvents = require('@elishacook/simple-events')


module.exports = Record


function Record (fields)
{
    SimpleEvents.call(this)
    this.fields = fields || {}
    this.syncdoc = null
    this.dirty = false
    this.deleted = false
}


Object.keys(SimpleEvents.prototype).forEach(function (k)
{
    Record.prototype[k] = SimpleEvents.prototype[k]
})


Record.prototype.get = function (k)
{
    return this.fields[k]
}


Record.prototype.set = function (k, v)
{
    this.fields[k] = v
    this.dirty = true
    this.emit('local-change', this)
}


Record.prototype.update = function (fields, quiet)
{
    Object.keys(fields).forEach(function (k)
    {
        this.fields[k] = fields[k]
    }.bind(this))
    
    if (!quiet)
    {
        this.dirty = true
        this.emit('local-change', this)
    }
}


Record.prototype.property = function (k)
{
    return function (v)
    {
        if (v === undefined)
        {
            return this.fields[k]
        }
        else
        {
            this.set(k, v)
        }
    }.bind(this)
}


Record.prototype.close = function ()
{
    this.emit('close')
}
