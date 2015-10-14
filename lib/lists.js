'use strict'

var Watched = require('./watch').Watched,
    computation = require('./computation'),
    SyncDocument = require('sync-document'),
    records = require('./records')


module.exports = {
    DumbList: DumbList,
    WatchList: WatchList,
    SyncList: SyncList
}

function List(service, options)
{
    Watched.call(this)
    this.service = service
    this.options = options
    this.records = []
    this.error = null
}
List.prototype = Object.create(Watched.prototype)
List.prototype.constructor = List

List.prototype.add = function (fields)
{
    
}



function DumbList (service, fields)
{
    List.call(this, service, fields)
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
        }
        else
        {
            this.records.length = records.length
            for (var i=0; i<records.length; i++)
            {
                this.records[i] = new records.Record(records[i])
            }
        }
        computation.async()
    }.bind(this))
}

DumbList.prototype.add = function (fields)
{
    var record = new records.Record(fields)
    this.records.push(record)
    return record
}



function WatchList (service, fields)
{
    List.call(this, service, fields)
    this.channel = null
    this.started = false
    this.options.watch = true
    this.records_by_id = {}
}
WatchList.prototype = Object.create(List.prototype)
WatchList.prototype.constructor = WatchList

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

DumbList.prototype.add = function (fields)
{
    var record = new records.Record(fields)
    this.records.push(record)
    this.records_by_id[fields.id] = record
    return record
}

WatchList.prototype.load_channel = function ()
{
    this.service('find', this.options, function (err, channel)
    {
        if (err)
        {
            this.error = err
        }
        else
        {
            this.channel = channel
            
            channel.on('initial', function (records)
            {
                this.records.length = records.length
                for (var i=0; i<records.length; i++)
                {
                    var record = new records.Record(records[i])
                    this.records[i] = record
                    this.records_by_id[record.fields.id] = record
                }
                computation.async()
            }.bind(this))
            
            channel.on('update', function (fields)
            {
                var record = this.records_by_id[fields.id]
                
                if (record)
                {
                    record.onupdate(fields)
                    computation.async()
                }
            })
            
            channel.on('insert', function (fields)
            {
                var record = this.records_by_id[fields.id]
                
                if (record)
                {
                    record.onupdate(fields)
                }
                else
                {
                    record = new records.Record(fields)
                    this.records.push(record)
                    this.records_by_id[fields.id] = record
                }
                
                computation.async()
            })
            
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
                    var index = this.records.indexOf(record)
                    this.records.splice(index, 1)
                    computation.async()
                }
            }.bind(this))
        }
    }.bind(this))
}


function SyncListRecord (list, fields)
{
    records.WritableRecord.call(this, fields)
    this.list = list
    this.syncdoc = null
}
SyncListRecord.prototype = Object.create(records.WritableRecord.prototype)
SyncListRecord.constructor = SyncListRecord

SyncListRecord.prototype.push = function ()
{
    if (this.syncdoc && !this.deleted)
    {
        this.list.push(this)
    }
}


function SyncList (service, fields)
{
    WatchList.call(this, service, fields)
    delete this.options.watch
    this.options.sync = true
}
SyncList.prototype = Object.create(WatchList.prototype)
SyncList.prototype.constructor = SyncList


SyncList.prototype.add = function (fields)
{
    var record = new SyncListRecord(this, records[i])
    this.records.push(record)
    this.records_by_id[record.fields.id] = record
}


SyncList.prototype.load_channel = function ()
{
    this.service('find', this.options, function (err, channel)
    {
        if (err)
        {
            this.error = err
        }
        else
        {
            this.channel = channel
            
            channel.on('initial', function (records)
            {
                this.records.length = records.length
                for (var i=0; i<records.length; i++)
                {
                    var record = new SyncListRecord(this, records[i])
                    record.syncdoc = new SyncDocument(record.fields)
                    this.records[i] = record
                    this.records_by_id[record.fields.id] = record
                }
                computation.async()
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
                    computation.async()
                }
            })
            
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
                    record = new SyncListRecord(this, fields)
                    record.syncdoc = new SyncDocument(fields)
                    this.records_by_id[record.fields.id] = record
                    this.records.push(record)
                }
                
                computation.async()
            })
            
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
                    delete this.records_by_id[fields.id]
                    var index = this.records.indexOf(record)
                    this.records.splice(index, 1)
                    computation.async()
                }
            }.bind(this))
        }
    }.bind(this))
}

SyncList.prototype.push = function (record)
{
    record.syncdoc.push()
    
    if (record.edits.length > 0)
    {
        this.channel.emit('pull', record.fields.id, edits)
    }
}