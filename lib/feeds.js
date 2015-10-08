'use strict'


var computation = require('./computation'),
    Record = require('./record')


module.exports = 
{
    RecordFeed: RecordFeed,
    ListFeed: ListFeed,
    FeedMixin: FeedMixin
}


var FeedMixinProto = 
{
    increment: function ()
    {
        this.references++
        
        if (this.references == 1)
        {
            this.start()
        }
    },
    
    decrement: function ()
    {
        if (this.references > 0)
        {
            this.references--
            
            if (this.references == 0)
            {
                this.stop()
            }
        }
    },
    
    start: function ()
    {
        if (this.feed)
        {
            return
        }
        
        computation.start()
        
        this.refresh(function ()
        {
            computation.end()
        })
    },
    
    stop: function ()
    {
        if (this.feed)
        {
            this.feed.close()
            this.feed = null
        }
    }
}

function FeedMixin(obj)
{
    Object.keys(FeedMixinProto).forEach(function (k)
    {
        obj[k] = FeedMixinProto[k]
    })
}


function RecordFeed (collection, id)
{
    this.id = id,
    this.collection = collection
    this.references = 0
    this.feed = null
    this.record = this.collection.db[id]
    
    if (!this.record)
    {
        this.record = new Record({ id: id }, this.collection.fields, this.collection.methods, this.collection.relations)
        this.collection.db[id] = this.record
    }
}
FeedMixin(RecordFeed.prototype)

RecordFeed.prototype.refresh = function (done)
{
    this.collection.client(this.collection.service+' get', { id: this.id }, function (err, result, feed)
    {
        if (err)
        {
            this.record.error = err
        }
        else
        {
            this.record.update(result)
            this.feed = feed
            
            feed.on('update', function (result)
            {
                this.record.update(result)
                computation.async()
            }.bind(this))
            
            feed.on('remove', function ()
            {
                this.record.deleted = true
                computation.async()
            }.bind(this))
        }
        
        if (done) { done() }
        
    }.bind(this))
}


function ListFeed (collection, options)
{
    this.options = options
    this.items = []
    this.collection = collection
    this.references = 0
    this.feed = null
}
FeedMixin(ListFeed.prototype)


ListFeed.prototype.refresh = function (done)
{
    this.collection.client(this.collection.service+' find', this.options, function (err, result, feed)
    {
        if (err)
        {
            this.items.error = err
        }
        else
        {
            this.items.length = result.length
            result.forEach(function (x, i)
            {
                var record = this.collection.db[x.id]
                
                if (!record)
                {
                    record = new Record(x, this.collection.fields, this.collection.methods, this.collection.relations)
                    this.collection.db[record.id] = record
                }
                
                this.items[i] = record
            }.bind(this))
            
            this.feed = feed
            
            feed.on('append', function (x)
            {
                var record = this.collection.db[x.id]
                if (!record)
                {
                    record = new Record(x, this.collection.fields, this.collection.methods, this.collection.relations)
                    this.collection.db[record.id] = record
                }
                this.items.push(record)
                computation.async()
            }.bind(this))
            
            feed.on('update', function (x)
            {
                this.collection.db[x.id].update(x)
                computation.async()
            }.bind(this))
            
            feed.on('remove', function (x)
            {
                var record = this.collection.db[x.id]
                if (record)
                {
                    record.deleted = true
                    var i = this.items.indexOf(record)
                    if (-1 < i)
                    {
                        this.items.splice(i, 1)
                    }
                }
                
                computation.async()
            }.bind(this))
        }
        
        if (done) { done() }
    }.bind(this))
}