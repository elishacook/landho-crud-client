'use strict'

var hash = require('object-hash'),
    watch = require('./watch'),
    records = require('./records'),
    lists = require('./lists'),
    matchfind = require('./matchfind'),
    uuid = require('./uuid')

module.exports = Collection


function Collection (service, options)
{
    if (!service)
    {
        throw new Error('A service is required')
    }
    var options = options || {}
    this.service = service
    this.fields = options.fields
    this.methods = options.methods
    this.relations = options.relations
    this.get_one_cache = {}
    this.watch_one_cache = {}
    this.sync_one_cache = {}
    this.get_list_cache = {}
    this.watch_list_cache = {}
    this.sync_list_cache = {}
}

Collection.prototype.get = function (id, options)
{
    options = options || {}
    
    var cls = null,
        cache = null
    
    if (options.sync)
    {
        cls = records.SyncRecord
        cache = this.sync_one_cache
    }
    else if (options.watch)
    {
        cls = records.WatchRecord
        cache = this.watch_one_cache
    }
    else
    {
        cls = records.DumbRecord
        cache = this.get_one_cache
    }
    
    var record = cache[id]
    
    if (!record)
    {
        record = new cls(this.service, { id: id }, this.methods, this.relations)
        cache[id] = record
    }
    
    if (watch.watcher)
    {
        watch.watcher.push(record)
    }
    
    return record
}


Collection.prototype.create = function (fields)
{
    fields = fields || this.fields || {}
    
    if (!fields.id)
    {
        fields.id = uuid()
    }
    
    var cache_priority = [
            this.sync_list_cache, 
            this.watch_list_cache,
            this.get_list_cache
        ],
        record = null
    
    cache_priority.forEach(function (cache, i)
    {
        Object.keys(cache).forEach(function (k)
        {
            var list = cache[k]
            
            if (matchfind(fields, list.options))
            {
                var r = list.add(fields)
                
                if (!record)
                {
                    record = r
                    
                    if (watch.watcher)
                    {
                        watch.watcher.push(list)
                    }
                }
            }
        })
    })
    
    if (!record)
    {
        record = new records.SyncRecord(this.service, fields, this.methods, this.relations)
        if (watch.watcher)
        {
            watch.watcher.push(record)
        }
    }
    
    this.service('create', fields, function (err)
    {
        if (err)
        {
            record.error = err
        }
    })
    
    return record
}


Collection.prototype.delete = function (id)
{
    var record_caches = [
            this.get_one_cache,
            this.watch_one_cache,
            this.sync_one_cache
        ],
        list_caches = [
            this.get_list_cache,
            this.watch_list_cache,
            this.sync_list_cache
        ]
    
    record_caches.forEach(function (cache)
    {
        if (cache[id])
        {
            cache[id].deleted = true
        }
    })
    
    list_caches.forEach(function (cache)
    {
        Object.keys(cache).forEach(function (k)
        {
            var list = cache[k]
            list.delete(id)
        })
    })
    
    this.service('delete', { id: id })
}


Collection.prototype.find = function (options)
{
    options = options || {}
    
    var cls = null,
        cache = null,
        key = this.cache_key(options)
    
    if (options.sync)
    {
        cls = lists.SyncList
        cache = this.sync_list_cache
    }
    else if (options.watch)
    {
        cls = lists.WatchList
        cache = this.watch_list_cache
    }
    else
    {
        cls = lists.DumbList
        cache = this.get_list_cache
    }
    
    var list = cache[key]
    
    if (!list)
    {
        list = new cls(this.service, options, this.methods, this.relations)
    }
    
    if (watch.watcher)
    {
        watch.watcher.push(list)
    }
    
    return list
}

Collection.prototype.cache_key = function (object)
{
    return hash(object, 
    {
        respectFunctionProperties: false,
        respectTypes: false
    })
}