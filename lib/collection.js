'use strict'

var SyncDocument = require('sync-document'),
    computation = require('./computation'),
    watch = require('./watch'),
    Record = require('./record'),
    List = require('./list'),
    uuid = require('./uuid'),
    matchfind = require('./matchfind'),
    tracking = require('./tracking')


module.exports = Collection


function Collection (service, options)
{
    this.service = service
    
    var options = options || {}
    this.default_fields = options.fields || {}
    
    this.lists = []
    
    if (options.methods)
    {
        this.record_cls = this.create_record_class(options.methods)
    }
    else
    {
        this.record_cls = Record
    }
}


Collection.prototype.get = function (id, sync)
{
    var record = this.record({ id: id }),
        options = {}
    
    options.id = id
    
    if (sync)
    {
        options.sync = true
    }
    else
    {
        options.watch = true
    }
    
    computation.start()
    this.service('get', options, function (err, channel)
    {
        if (err)
        {
            record.emit('error', err)
            computation.end()
        }
        else
        {
            var initialized = false
            
            channel.on('error', function (err)
            {
                record.emit('error', err)
                if (initialized)
                {
                    computation.async()
                }
                else
                {
                    computation.end()
                }
            })
            
            channel.on('initial', function (fields)
            {
                initialized = true
                record.update(fields, true)
                
                if (sync)
                {
                    record.syncdoc = new SyncDocument(record.fields)
                }
                
                record.emit('ready', record)
                record.emit('change', record)
                computation.end()
            })
            
            channel.on('update', function (fields)
            {
                record.update(fields, true)
                record.emit('change', record)
                computation.async()
            })
            
            if (sync)
            {
                channel.on('pull', function (edits)
                {
                    if (record.syncdoc)
                    {
                        edits.forEach(function (edit)
                        {
                            record.syncdoc.pull(edit)
                        })
                        
                        if (record.syncdoc.edits.length > 0)
                        {
                            channel.emit('pull', record.syncdoc.edits)
                        }
                        
                        record.emit('change', record)
                        computation.async()
                    }
                })
                
                record.on('local-change', function ()
                {
                    if (record.syncdoc)
                    {
                        record.syncdoc.push()
                        
                        if (record.syncdoc.edits.length > 0)
                        {
                            channel.emit('pull', record.syncdoc.edits)
                        }
                    }
                })
            }
            
            channel.on('delete', function ()
            {
                record.deleted = true
                record.emit('delete', record)
                computation.async()
            })
            
            record.on('close', function ()
            {
                channel.close()
            })
        }
    })
    
    if (watch.watcher)
    {
        watch.watcher.push(record)
    }
    
    return record
}


Collection.prototype.find = function (options)
{
    var options = options || {}
    
    if (!options.sync)
    {
        options.watch = true
    }
    
    var list = new List(options)
    this.lists.push(list)
    
    list.on('close', function ()
    {
        var index = this.lists.indexOf(list)
        
        if (-1 < index)
        {
            this.lists.splice(index, 1)
        }
    }.bind(this))
    
    computation.start()
    this.service('find', options, function (err, channel)
    {
        if (err)
        {
            list.emit('error', err)
            computation.end()
        }
        else
        {
            var initialized = false,
                setup_record = function (record)
                {
                    if (options.sync)
                    {
                        record.syncdoc = new SyncDocument(record.fields)
                        
                        record.on('local-change', function ()
                        {
                            if (record.syncdoc)
                            {
                                record.syncdoc.push()
                                
                                if (record.syncdoc.edits.length > 0)
                                {
                                    channel.emit('pull', { id: record.get('id'), edits: record.syncdoc.edits })
                                }
                            }
                        })
                    }
                }
            
            channel.on('error', function (err)
            {
                list.emit('error', err)
                if (initialized)
                {
                    computation.async()
                }
                else
                {
                    computation.end()
                }
            })
            
            channel.on('initial', function (results)
            {
                initialized = true
                
                list.length = results.length
                results.forEach(function (fields, i)
                {
                    var record = this.record(fields)
                    list.set(i, record)
                    setup_record(record)
                }.bind(this))
                
                list.emit('ready', list)
                list.emit('change', list)
                computation.end()
            }.bind(this))
            
            if (options.sync)
            {
                channel.on('pull', function (data)
                {
                    var record = list.get(data.id)
                    
                    if (record && record.syncdoc)
                    {
                        data.edits.forEach(function (edit)
                        {
                            record.syncdoc.pull(edit)
                        })
                        
                        if (record.syncdoc.edits.length > 0)
                        {
                            channel.emit('pull', { id: data.id, edits: record.syncdoc.edits })
                        }
                        
                        record.emit('change', record)
                        list.emit('change', list)
                        computation.async()
                    }
                })
            }
            
            channel.on('update', function (fields)
            {
                var record = list.get(fields.id)
                
                if (record)
                {
                    record.update(fields, true)
                    list.emit('change', list)
                    computation.async()
                }
            })
            
            channel.on('insert', function (fields)
            {
                var record = list.get(fields.id)
                if (record)
                {
                    record.update(fields, true)
                }
                else
                {
                    record = this.record(fields)
                    list.push(record)
                }
                setup_record(record)
                list.emit('change', list)
                computation.async()
            }.bind(this))
            
            channel.on('delete', function (id)
            {
                var record = list.get(id)
                
                if (record)
                {
                    record.deleted = true
                    list.remove(id)
                    list.emit('delete', list)
                    computation.async()
                }
            })
            
            list.on('close', function ()
            {
                channel.close()
            })
        }
    }.bind(this))
    
    if (watch.watcher)
    {
        watch.watcher.push(list)
    }
    
    return list
}


Collection.prototype.create = function (fields, done)
{
    var record = this.local_create(fields)
    
    if (tracking.active)
    {
        tracking.push(this, { action: 'create', record: record, done: done })
    }
    else
    {
        this.remote_create(fields, done)
    }
    
    return record
}


Collection.prototype.local_create = function (fields)
{
    var fields = fields || {}
    
    if (!fields.id)
    {
        fields.id = uuid()
    }
    
    if (this.default_fields)
    {
        Object.keys(this.default_fields).forEach(function (k)
        {
            if (fields[k] === undefined)
            {
                fields[k] = this.default_fields[k]
            }
        }.bind(this))
    }
    
    var record = this.record(fields)
    
    this.lists.forEach(function (list)
    {
        if (matchfind(fields, list.options))
        {
            list.push(record)
        }
    })
    
    return record
}


Collection.prototype.remote_create = function (fields, done)
{
    this.service('create', fields, function (err, result)
    {
        if (err)
        {
            if (done)
            {
                done(err)
            }
            else
            {
                console.error(err)
            }
        }
        else if (done)
        {
            done(null, result)
        }
    })
}


Collection.prototype.delete = function (record, done)
{
    this.local_delete(record)
    
    if (tracking.active)
    {
        tracking.push(this, { action: 'delete', record: record, done: done })
    }
    else
    {
        this.remote_delete(record, done)
    }
}


Collection.prototype.local_delete = function (record)
{
    this.lists.forEach(function (list)
    {
        list.remove(record.get('id'))
    })
}


Collection.prototype.remote_delete = function (record, done)
{
    this.service('delete', { id: record.get('id') }, function (err, result)
    {
        if (err)
        {
            if (done)
            {
                done(err)
            }
            else
            {
                console.error(err)
            }
        }
        else if (done)
        {
            done(null, record)
        }
    })
}


Collection.prototype.abort = function (change)
{
    if (change.action == 'create')
    {
        this.local_delete(change.record)
    }
    else if (change.action == 'delete')
    {
        this.local_create(change.record.fields)
    }
}


Collection.prototype.commit = function (change)
{
    if (change.action == 'create')
    {
        this.remote_create(change.record.fields, change.done)
    }
    else if (change.action == 'delete')
    {
        this.remote_delete(change.record, change.done)
    }
}


Collection.prototype.undo = function (change)
{
    if (change.action == 'create')
    {
        this.local_delete(change.record)
        this.remote_delete(change.record)
    }
    else if (change.action == 'delete')
    {
        this.local_create(change.record.fields)
        this.remote_create(change.record.fields)
    }
}


Collection.prototype.redo = function (change)
{
    if (change.action == 'create')
    {
        this.local_create(change.record.fields)
        this.remote_create(change.record.fields)
    }
    else if (change.action == 'delete')
    {
        this.local_delete(change.record)
        this.remote_delete(change.record)
    }
}


Collection.prototype.record = function (fields)
{
    return new this.record_cls(fields)
}


Collection.prototype.create_record_class = function (proto)
{
    var record_cls = function () { Record.apply(this, arguments) }
    record_cls.prototype = Object.create(Record.prototype)
    
    Object.keys(proto).forEach(function (k)
    {
        if (!record_cls.prototype[k])
        {
            record_cls.prototype[k] = proto[k]
        }
    })
    
    return record_cls
}