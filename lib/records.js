'use strict'

var mixin = require('./mixin'),
    Watched = require('./watch').Watched,
    computation = require('./computation'),
    SyncDocument = require('sync-document')
    

function Record(fields, methods, relations)
{
    Watched.call(this)
    this.fields = fields || {}
    this.error = null
    this.deleted = false
    
    if (methods)
    {
        Object.keys(methods).forEach(function (k)
        {
            if (this[k] === undefined)
            {
                Object.defineProperty(this, k,
                {
                    enumerable: true,
                    value: methods[k]
                })
            }
        }.bind(this))
    }
    
    if (relations)
    {
        Object.keys(relations).forEach(function (k)
        {
            if (this[k] === undefined)
            {
                Object.defineProperty(this, k,
                {
                    enumerable: true,
                    get: relations[k]
                })
            }
        }.bind(this))
    }
    
    this.onupdate(this.fields)
}
Record.prototype = Object.create(Watched.prototype)
Record.prototype.constructor = Record

Record.prototype.get = function (k)
{
    return this.fields[k]
}

Record.prototype.onupdate = function (fields)
{
    Object.keys(fields).forEach(function (k)
    {
        this.fields[k] = fields[k]
        if (!this.hasOwnProperty(k))
        {
            Object.defineProperty(this, k,
            {
                enumerable: true,
                get: this.get.bind(this, k)
            })
        }
    }.bind(this))
}

var Writable = 
{
    set: function (k, v)
    {
        this.fields[k] = v
        if (!this.hasOwnProperty(k))
        {
            Object.defineProperty(this, k,
            {
                enumerable: true,
                get: this.get.bind(this, k),
                set: this.set.bind(this, k)
            })
        }
        this.push()
    },

    property: function (k)
    {
        return function (value)
        {
            if (value === undefined)
            {
                return this.get(k)
            }
            else
            {
                this.set(k, value)
            }
        }.bind(this)
    },

    update: function (fields)
    {
        this.onupdate(fields)
        this.push()
    },
    
    onupdate: function (fields)
    {
        Object.keys(fields).forEach(function (k)
        {
            this.fields[k] = fields[k]
            if (!this.hasOwnProperty(k))
            {
                Object.defineProperty(this, k,
                {
                    enumerable: true,
                    get: this.get.bind(this, k),
                    set: this.set.bind(this, k)
                })
            }
        }.bind(this))
    },
    
    push: function () {}
}


function DumbRecord (service, fields, methods, relations)
{
    Record.call(this, fields, methods, relations)
    this.service = service
}
DumbRecord.prototype = Object.create(Record.prototype)
DumbRecord.prototype.constructor = DumbRecord


DumbRecord.prototype.start = function ()
{
    this.service('get', { id: this.fields.id }, function (err, fields)
    {
        if (err)
        {
            this.error = err
        }
        else
        {
            if (fields)
            {
                this.onupdate(fields)
            }
        }
        
        computation.async()
    }.bind(this))
}



function WatchRecord (service, fields, methods, relations)
{
    Record.call(this, fields, methods, relations)
    this.service = service
    this.channel = null
    this.started = false
}
WatchRecord.prototype = Object.create(Record.prototype)
WatchRecord.prototype.constructor = WatchRecord

WatchRecord.prototype.start = function ()
{
    if (this.started)
    {
        return
    }
    
    this.started = true
    this.load_channel()
}


WatchRecord.prototype.stop = function ()
{
    if (this.channel)
    {
        this.channel.close()
        this.channel = null
    }
}

WatchRecord.prototype.load_channel = function ()
{
    this.service('get', { id: this.fields.id, watch: true }, function (err, channel)
    {
        if (err)
        {
            this.error = err
            computation.async()
        }
        else
        {
            this.channel = channel
            
            var onupdate = function (fields)
            {
                this.onupdate(fields)
                computation.async()
            }.bind(this)
            
            channel.on('initial', onupdate)
            channel.on('update', onupdate)
            
            channel.on('error', function (err)
            {
                this.error = err
                computation.async()
            }.bind(this))
            
            channel.on('delete', function ()
            {
                this.deleted = true
                computation.async()
            }.bind(this))
        }
    }.bind(this))
}


function SyncRecord (service, fields, methods, relations)
{
    WatchRecord.call(this, service, fields, methods, relations)
    this.syncdoc = null
}
SyncRecord.prototype = Object.create(WatchRecord.prototype)
SyncRecord.prototype.constructor = SyncRecord
mixin(SyncRecord, Writable)

SyncRecord.prototype.load_channel = function ()
{
    this.service('get', { id: this.fields.id, sync: true }, function (err, channel)
    {
        if (err)
        {
            this.error = err
            computation.async()
        }
        else
        {
            this.channel = channel
            
            channel.on('error', function (err)
            {
                this.error = err
                computation.async()
            }.bind(this))
            
            channel.on('initial', function (doc)
            {
                this.syncdoc = new SyncDocument(doc)
                this.syncdoc.object = this.fields
                this.push()
                computation.async()
            }.bind(this))
            
            channel.on('pull', function (edits)
            {
                edits.forEach(function (edit)
                {
                    this.syncdoc.pull(edit)
                }.bind(this))
                
                if (this.syncdoc.edits.length > 0)
                {
                    channel.emit('pull', this.syncdoc.edits)
                }
                
                computation.async()
            }.bind(this))
            
            channel.on('delete', function ()
            {
                this.deleted = true
                computation.async()
            }.bind(this))
        }
    }.bind(this))
}

SyncRecord.prototype.push = function ()
{
    if (this.channel && !this.deleted)
    {
        this.syncdoc.push()
        
        if (this.syncdoc.edits.length > 0)
        {
            this.channel.emit('pull', this.syncdoc.edits)
        }
    }
}

module.exports = {
    Record: Record,
    DumbRecord: DumbRecord,
    WatchRecord: WatchRecord,
    SyncRecord: SyncRecord,
    Writable: Writable
}