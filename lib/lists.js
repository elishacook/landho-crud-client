'use strict'

var mixin = require('./mixin'),
    Watched = require('./watch').Watched,
    computation = require('./computation'),
    SyncDocument = require('sync-document'),
    records = require('./records'),
    Record = records.Record,
    Writable = records.Writable

module.exports = {
    List: List,
    DumbList: DumbList,
    WatchList: WatchList,
    SyncList: SyncList,
    SyncListRecord: SyncListRecord
}

function List(service, options, methods, relations)
{
    Watched.call(this)
    
    var options = options || {}
    
    this.compare = options.compare
    
    if (options.compare)
    {
        delete options.compare
    }
    
    this.service = service
    this.options = options
    this.methods = methods
    
    this.error = null
}
List.prototype = Object.create(Array.prototype)
List.prototype.constructor = List
mixin(List, Watched.prototype)

List.prototype.add = function (fields) {}

List.prototype.delete = function (id)
{
    var index = -1
    this.every(function (record, i)
    {
        if (record.id == id)
        {
            record.deleted = true
            index = i
            return false
        }
        else
        {
            return true
        }
    })
    
    if (-1 < index)
    {
        this.splice(index, 1)
    }
}

List.prototype.onchange = function ()
{
    if (this.compare)
    {
        this.sort(this.compare)
    }
    
    computation.async()
}



function DumbList (service, options, methods, relations)
{
    List.call(this, service, options, methods, relations)
}
DumbList.prototype = Object.create(List.prototype)
DumbList.prototype.constructor = DumbList

DumbList.prototype.start = function ()
{
    this.service('find', this.options, function (err, records)
    {
        if (err)
        {
            this.error = err
            computation.async()
        }
        else
        {
            this.length = records.length
            for (var i=0; i<records.length; i++)
            {
                this[i] = new Record(records[i], this.methods, this.relations)
            }
            this.onchange()
        }
    }.bind(this))
}

DumbList.prototype.add = function (fields)
{
    var record = new Record(fields, this.methods, this.relations)
    this.push(record)
    return record
}



function WatchList (service, options, methods, relations)
{
    List.call(this, service, options, methods, relations)
    this.channel = null
    this.started = false
    this.options.watch = true
    this.records_by_id = {}
}
WatchList.prototype = Object.create(List.prototype)
WatchList.prototype.constructor = WatchList

WatchList.prototype.add = function (fields)
{
    var record = new Record(fields, this.methods, this.relations)
    this.push(record)
    this.records_by_id[fields.id] = record
    return record
}

WatchList.prototype.delete = function (id)
{
    if (this.records_by_id[id])
    {
        this.records_by_id[id].deleted = true
        delete this.records_by_id[id]
        List.prototype.delete.call(this, id)
    }
}

WatchList.prototype.start = function ()
{
    if (this.started)
    {
        return
    }
    
    this.started = true
    this.load_channel()
}


WatchList.prototype.stop = function ()
{
    if (this.channel)
    {
        this.channel.close()
        this.channel = null
    }
}

WatchList.prototype.load_channel = function ()
{
    this.service('find', this.options, function (err, channel)
    {
        if (err)
        {
            this.error = err
            computation.async()
        }
        else
        {
            this.channel = channel
            
            channel.on('initial', function (records)
            {
                this.length = records.length
                for (var i=0; i<records.length; i++)
                {
                    var record = new Record(records[i], this.methods, this.relations)
                    this[i] = record
                    this.records_by_id[record.id] = record
                }
                this.onchange()
            }.bind(this))
            
            channel.on('update', function (fields)
            {
                var record = this.records_by_id[fields.id]
                if (record)
                {
                    record.onupdate(fields)
                    this.onchange()
                }
            }.bind(this))
            
            channel.on('insert', function (fields)
            {
                var record = this.records_by_id[fields.id]
                
                if (record)
                {
                    record.onupdate(fields)
                }
                else
                {
                    record = new Record(fields, this.methods, this.relations)
                    this.push(record)
                    this.records_by_id[fields.id] = record
                }
                
                this.onchange()
            }.bind(this))
            
            channel.on('error', function (err)
            {
                this.error = err
                computation.async()
            }.bind(this))
            
            channel.on('delete', function (fields)
            {
                var record = this.records_by_id[fields.id]
                
                if (record)
                {
                    record.deleted = true
                    delete this.records_by_id[fields.id]
                    var index = this.indexOf(record)
                    this.splice(index, 1)
                    computation.async()
                }
            }.bind(this))
        }
    }.bind(this))
}


function SyncListRecord (list, fields, methods, relations)
{
    Record.call(this, fields, methods, relations)
    this.list = list
    this.syncdoc = null
}
SyncListRecord.prototype = Object.create(Record.prototype)
SyncListRecord.constructor = SyncListRecord
mixin(SyncListRecord, Writable)

SyncListRecord.prototype.push = function ()
{
    if (this.syncdoc && !this.deleted)
    {
        this.list.push_changes(this)
    }
}


function SyncList (service, fields, methods, relations)
{
    WatchList.call(this, service, fields, methods, relations)
    delete this.options.watch
    this.options.sync = true
}
SyncList.prototype = Object.create(WatchList.prototype)
SyncList.prototype.constructor = SyncList


SyncList.prototype.add = function (fields)
{
    var record = new SyncListRecord(this, fields, this.methods, this.relations)
    this.push(record)
    this.records_by_id[record.id] = record
    return record
}


SyncList.prototype.load_channel = function ()
{
    this.service('find', this.options, function (err, channel)
    {
        if (err)
        {
            this.error = err
            computation.async()
        }
        else
        {
            this.channel = channel
            
            channel.on('initial', function (records)
            {
                this.length = records.length
                for (var i=0; i<records.length; i++)
                {
                    var record = new SyncListRecord(this, records[i], this.methods, this.relations)
                    record.syncdoc = new SyncDocument(record.fields)
                    this[i] = record
                    this.records_by_id[record.id] = record
                }
                this.onchange()
            }.bind(this))
            
            channel.on('pull', function (id, edits)
            {
                var record = this.records_by_id[id]
                
                if (record)
                {
                    edits.forEach(function (edit)
                    {
                        record.syncdoc.pull(edit)
                    })
                    
                    if (record.syncdoc.edits.length > 0)
                    {
                        channel.emit('pull', id, record.syncdoc.edits)
                    }
                    this.onchange()
                }
            }.bind(this))
            
            channel.on('insert', function (fields)
            {
                var record = this.records_by_id[fields.id]
                
                if (record)
                {
                    record.syncdoc = new SyncDocument(fields)
                    record.syncdoc.object = record.fields
                    this.push(record)
                }
                else
                {
                    record = new SyncListRecord(this, fields, this.methods, this.relations)
                    record.syncdoc = new SyncDocument(fields)
                    this.records_by_id[record.id] = record
                    this.push(record)
                }
                
                this.onchange()
            }.bind(this))
            
            channel.on('error', function (err)
            {
                this.error = err
                computation.async()
            }.bind(this))
            
            channel.on('delete', function (id)
            {
                var record = this.records_by_id[id]
                if (record)
                {
                    record.deleted = true
                    delete this.records_by_id[id]
                    var index = this.indexOf(record)
                    this.splice(index, 1)
                    computation.async()
                }
            }.bind(this))
        }
    }.bind(this))
}

SyncList.prototype.push_changes = function (record)
{
    record.syncdoc.push()
    
    if (record.syncdoc.edits.length > 0)
    {
        this.channel.emit('pull', record.id, record.syncdoc.edits)
    }
}