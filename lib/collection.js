'use strict'

var SyncDocument = require('sync-document'),
    computation = require('./computation'),
    Record = require('./record'),
    List = require('./list'),
    uuid = require('./uuid')


module.exports = Collection


function Collection (service)
{
    this.service = service
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
    
    return record
}


Collection.prototype.find = function (options)
{
    var list = new List(),
        options = options || {}
    
    if (!options.sync)
    {
        options.watch = true
    }
    
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
                                    channel.emit('pull', record.get('id'), record.syncdoc.edits)
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
                channel.on('pull', function (id, edits)
                {
                    var record = list.get(id)
                    
                    if (record && record.syncdoc)
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
                var record = new Record(fields)
                list.push(record)
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
    
    return list
}


Collection.prototype.create = function (fields, done)
{
    if (!fields.id)
    {
        fields.id = uuid()
    }
    
    this.service('create', fields, function (err, result)
    {
        if (err)
        {
            done(err)
        }
        else
        {
            done(null, result)
        }
    })
}


Collection.prototype.delete = function (id, done)
{
    this.service('delete', { id: id }, function (err, result)
    {
        if (err)
        {
            done(err)
        }
        else
        {
            done(null, result.id)
        }
    })
}