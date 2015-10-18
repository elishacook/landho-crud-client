'use strict'

var SyncDocument = require('sync-document'),
    computation = require('./computation'),
    watch = require('./watch'),
    Record = require('./record'),
    List = require('./list'),
    uuid = require('./uuid'),
    matchfind = require('./matchfind')


module.exports = Collection


function Collection (service)
{
    this.service = service
    this.lists = []
}


Collection.prototype.get = function (id, sync)
{
    var record = new Record({ id: id }),
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
                    var record = new Record(fields)
                    list.set(i, record)
                    setup_record(record)
                }.bind(this))
                
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
                    record = new Record(fields)
                    list.push(record)
                }
                setup_record(record)
                list.emit('change', list)
                computation.async()
            })
            
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
    })
    
    if (watch.watcher)
    {
        watch.watcher.push(list)
    }
    
    return list
}


Collection.prototype.create = function (fields, done)
{
    if (!fields.id)
    {
        fields.id = uuid()
    }
    
    var record = new Record(fields)
    
    this.lists.forEach(function (list)
    {
        if (matchfind(fields, list.options))
        {
            list.push(record)
        }
    })
    
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
    
    return new Record(fields)
}


Collection.prototype.delete = function (id, done)
{
    this.lists.forEach(function (list)
    {
        list.remove(id)
    })
    
    this.service('delete', { id: id }, function (err, result)
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
            done(null, result.id)
        }
    })
}