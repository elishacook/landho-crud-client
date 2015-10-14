'use strict'

var Watched = require('./watch').Watched,
    computation = require('./computation'),
    SyncDocument = require('sync-document')

module.exports = {
    Record: Record,
    WritableRecord: WritableRecord,
    WritableMixin: WritableMixin,
    DumbRecord: DumbRecord,
    WatchRecord: WatchRecord,
    SyncRecord: SyncRecord
}


function Record(fields, methods)
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
                this[k] = methods[k].bind(this)
            }
        }.bind(this))
    }
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
    }.bind(this))
}

var Writable = 
{
    set: function (k, v)
    {
        this.fields[k] = v
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
    }
}

function WritableMixin(record_cls)
{
    Object.keys(Writable).forEach(function (k)
    {
        record_cls.prototype[k] = Writable[k]
    })
}
WritableMixin.Writable = Writable

function WritableRecord (fields, methods)
{
    Record.call(this, fields, methods)
}
WritableRecord.prototype = Object.create(Record.prototype)
WritableRecord.constructor = WritableRecord
WritableMixin(WritableRecord)


function DumbRecord (service, fields, methods)
{
    Record.call(this, fields, methods)
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



function WatchRecord (service, fields, methods)
{
    Record.call(this, fields, methods)
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


function SyncRecord (service, fields, methods)
{
    WatchRecord.call(this, service, fields, methods)
    this.syncdoc = null
}
SyncRecord.prototype = Object.create(WatchRecord.prototype)
SyncRecord.prototype.constructor = SyncRecord
WritableMixin(SyncRecord)

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