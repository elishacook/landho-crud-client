'use strict'

var SimpleEvents = require('@elishacook/simple-events'),
    tracking = require('./tracking')


module.exports = Record


function Record (fields)
{
    SimpleEvents.call(this)
    this.fields = fields || {}
    this.syncdoc = null
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


Record.prototype.set = function (k, v, quiet)
{
    if (tracking.active && !quiet)
    {
        var update = {}
        update[k] = { old_val: this.fields[k], new_val: v }
        tracking.push(this, update)
        this.fields[k] = v
    }
    else
    {
        this.fields[k] = v
        
        if (!quiet)
        {
            this.emit('local-change', this)
        }
    }
}


Record.prototype.update = function (fields, quiet)
{
    if (tracking.active && !quiet)
    {
        var change = {}
        Object.keys(fields).forEach(function (k)
        {
            change[k] = {
                old_val: this.fields[k],
                new_val: fields[k]
            }
            this.fields[k] = fields[k]
        }.bind(this))
        
        tracking.push(this, change)
    }
    else
    {
        Object.keys(fields).forEach(function (k)
        {
            this.fields[k] = fields[k]
        }.bind(this))
    }
    
    if (!quiet)
    {
        this.emit('local-change', this)
    }
}


Record.prototype.abort = function (change)
{
    Object.keys(change).forEach(function (k)
    {
        this.fields[k] = change[k].old_val
    }.bind(this))
}


Record.prototype.commit = function (change)
{
    this.emit('local-change', this)
}


Record.prototype.undo = function (change)
{
    this.abort(change)
    this.emit('local-change', this)
}


Record.prototype.redo = function (change)
{
    Object.keys(change).forEach(function (k)
    {
        this.fields[k] = change[k].new_val
    }.bind(this))
    
    this.emit('local-change', this)
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
