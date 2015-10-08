"use strict"

var watch = require('./watch'),
    feeds = require('./feeds'),
    uuid = require('./uuid'),
    Record = require('./record')

module.exports = Collection

function Collection (options)
{
    options = options || {}
    
    if (!options.client)
    {
        throw new Error('You must provide a client')
    }
    
    if (!options.service)
    {
        throw new Error('You must provide the name of a service')
    }
    
    this.client = options.client
    this.service = options.service
    this.fields = options.fields
    this.methods = options.methods
    this.relations = options.relations
    this.db = {}
    this.record_feeds = {}
    this.list_feeds = {}
}

Collection.prototype.get = function (id)
{
    var feed = this.record_feeds[id]
    
    if (!feed)
    {
        feed = new feeds.RecordFeed(this, id)
        this.record_feeds[id] = feed
    }
    
    watch.watcher.push(feed)
    
    return feed.record
}

Collection.prototype.find = function (options)
{
    var options = options || {},
        key = JSON.stringify(
            Object.keys(options).sort().map(function (k)
            {
                return [k, options[k]]
            })
        ),
        feed = this.list_feeds[key]
        
    if (!feed)
    {
        feed = new feeds.ListFeed(this, options)
        this.list_feeds[key] = feed
    }
    
    watch.watcher.push(feed)
    
    return feed.items
}

Collection.prototype.create = function (data, done)
{
    var record = new Record(data, this.fields, this.methods, this.relations)
    record.id = uuid()
    this.db[record.id] = record
    
    this.client(this.service+' create', record.serialize(), function (err, result, feed)
    {
        if (err)
        {
            record.error = err
            if (done)
            {
                done(err)
            }
        }
        else
        {
            record.update(result)
            this.get(record.id)
            
            if (done)
            {
                done(null, record)
            }
        }
    }.bind(this))
    
    return record
}

Collection.prototype.update = function (record, done)
{
    this.client(this.service+' update', record.serialize(), function (err, result)
    {
        if (err)
        {
            record.error = err
            if (done)
            {
                done(err)
            }
        }
        else
        {
            record.update(result)
            if (done)
            {
                done()
            }
        }
    })
}

Collection.prototype.remove = function (record, done)
{
    record.deleted = true
    
    this.client(this.service+' remove', { id: record.id }, function (err)
    {
        if (err)
        {
            record.deleted = false
            record.error = err
            if (done)
            {
                done(err)
            }
        }
        else
        {
            if (this.db[record.id])
            {
                delete this.db[record.id]
            }
            
            if (done)
            {
                done()
            }
        }
    }.bind(this))
}