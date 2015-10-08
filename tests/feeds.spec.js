'use strict'

var feeds = require('../lib/feeds'),
    FeedMixin = feeds.FeedMixin,
    RecordFeed = feeds.RecordFeed,
    ListFeed = feeds.ListFeed,
    computation = require('../lib/computation'),
    SimpleEvents = require('@elishacook/simple-events')

function dummy_collection (options)
{
    options = options || {}
    return {
        service: options.service || 'some-service',
        fields: options.fields || {},
        methods: options.methods || {},
        relations: options.relations || {},
        db: {},
        client: sinon.spy()
    }
}

function dummy_feed ()
{
    return {
        references: 0,
        feed: { close: sinon.spy() },
        refresh: sinon.spy()
    }
}

describe('feeds', function ()
{
    beforeEach(function ()
    {
        computation.remove_all_listeners()
    })
    
    describe('FeedMixin', function ()
    {
        it('can be incremented', function ()
        {
            var obj = dummy_feed()
            FeedMixin(obj)
            obj.increment()
            expect(obj.references).to.equal(1)
            obj.increment()
            obj.increment()
            expect(obj.references).to.equal(3)
        })
        
        it('can be decremented', function ()
        {
            var obj = dummy_feed()
            FeedMixin(obj)
            obj.increment()
            obj.increment()
            obj.increment()
            expect(obj.references).to.equal(3)
            obj.decrement()
            expect(obj.references).to.equal(2)
            obj.decrement()
            expect(obj.references).to.equal(1)
        })
        
        it('calls its close() method when references reach zero', function ()
        {
            var obj = dummy_feed(),
                close = obj.feed.close
                
            FeedMixin(obj)
            obj.increment()
            obj.increment()
            obj.decrement()
            expect(obj.feed.close).to.not.have.been.called
            obj.decrement()
            expect(obj.feed).to.equal(null)
            expect(obj.references).to.equal(0)
            expect(close).to.have.been.calledOnce
        })
        
        it('calls refresh() when incrementing to 1', function ()
        {
            var obj = dummy_feed(),
                refresh = obj.refresh
            
            FeedMixin(obj)
            obj.feed = null
            
            expect(refresh).to.not.have.been.called
            obj.increment()
            expect(refresh).to.have.been.calledOnce
        })
        
        it('has a start method that calls refresh() and computation.start() if there is no feed', function ()
        {
            var obj = dummy_feed(),
                refresh = obj.refresh,
                comp_start = 0
            
            FeedMixin(obj)
            obj.feed = null
            
            computation.on('start', function () { comp_start++ })
            
            obj.start()
            
            expect(refresh).to.have.been.calledOnce
            expect(comp_start).to.equal(1)
            
            obj.feed = {}
            
            obj.start()
            
            expect(refresh).to.have.been.calledOnce
            expect(comp_start).to.equal(1)
        })
        
        it('calls computation.end() in the callback for refresh()', function ()
        {
            var obj = dummy_feed(),
                comp_end = 0
            
            FeedMixin(obj)
            obj.feed = null
            obj.refresh = function (done) { done() }
            
            computation.on('end', function () { comp_end++ })
            
            obj.start()
            
            expect(comp_end).to.equal(1)
        })
        
        it('closes its feed when stop() is called', function ()
        {
            var obj = dummy_feed(),
                close = obj.feed.close
          
            FeedMixin(obj)
            obj.stop()
            
            expect(obj.feed).to.be.null
            expect(close).to.have.been.calledOnce
        })
    })
    
    describe('RecordFeed', function ()
    {
        it('creates a new collection.db entry if one doesn\'t already exist', function ()
        {
            var coll = dummy_collection(),
                feed = new RecordFeed(coll, '123')
            
            expect(coll.db['123']).to.equal(feed.record)
        })
        
        it('makes a service.get call on refresh()', function ()
        {
            var coll = dummy_collection(),
                feed = new RecordFeed(coll, '123')
            
            feed.refresh()
            expect(coll.client).to.have.been.calledOnce
            expect(coll.client.args[0][0]).to.equal('some-service get')
            expect(coll.client.args[0][1]).to.deep.equal({ id: '123' })
            expect(coll.client.args[0][2]).to.be.instanceof(Function)
        })
        
        it('sets the error property of its record when there is an error in the initial get', function ()
        {
            var coll = dummy_collection(),
                feed = new RecordFeed(coll, '123')
            
            feed.refresh()
            coll.client.args[0][2]({ code: 'red' }, {}, new SimpleEvents())
            
            expect(feed.record.error).to.deep.equal({ code: 'red' })
        })
        
        it('updates its record with the results of the initial get call', function ()
        {
            var coll = dummy_collection(),
                feed = new RecordFeed(coll, '123')
            
            feed.refresh()
            coll.client.args[0][2](null, { things: 'stuff' }, new SimpleEvents())
            
            expect(feed.record.things).to.equal('stuff')
        })
        
        it('listens to the client feed\'s update event', function ()
        {
            var async_calls = 0,
                coll = dummy_collection(),
                feed = new RecordFeed(coll, '123'),
                client_feed = new SimpleEvents()
            
            feed.refresh()
            
            computation.on('async', function ()
            {
                async_calls++
            })
            
            coll.client.args[0][2](null, {}, client_feed)
            client_feed.emit('update', { foo: 'bar' })
            
            expect(feed.record.foo).to.equal('bar')
            expect(async_calls).to.equal(1)
        })
        
        it('listens to the client feed\'s remove event and sets its records deleted property', function ()
        {
            var async_calls = 0,
                coll = dummy_collection(),
                feed = new RecordFeed(coll, '123'),
                client_feed = new SimpleEvents()
            
            feed.refresh()
            
            computation.on('async', function ()
            {
                async_calls++
            })
            
            expect(feed.record.deleted).to.be.false
            
            coll.client.args[0][2](null, {}, client_feed)
            client_feed.emit('remove', {})
            
            expect(feed.record.deleted).to.be.true
            expect(async_calls).to.equal(1)
        })
        
        it('calls the refresh callback', function ()
        {
            var coll = dummy_collection(),
                feed = new RecordFeed(coll, '123'),
                done = sinon.spy()
            
            feed.refresh(done)
            coll.client.args[0][2](null, {}, new SimpleEvents())
            
            expect(done).to.have.been.calledOnce
        })
    })
    
    describe('ListFeed', function ()
    {
        it('has an empty items array by default', function ()
        {
            var feed = new ListFeed(dummy_collection())
            expect(feed.items).to.deep.equal([])
        })
        
        it('makes a service.find call on refresh()', function ()
        {
            var coll = dummy_collection(),
                feed = new ListFeed(coll, { foo: 'bar' })
            
            feed.refresh()
            expect(coll.client).to.have.been.calledOnce
            expect(coll.client.args[0][0]).to.equal('some-service find')
            expect(coll.client.args[0][1]).to.deep.equal({ foo: 'bar' })
            expect(coll.client.args[0][2]).to.be.instanceof(Function)
        })
        
        it('sets the error property of the items array when there is an error in the initial find()', function ()
        {
            var coll = dummy_collection(),
                feed = new ListFeed(coll)
            
            feed.refresh()
            coll.client.args[0][2]({ code: 'red' }, {}, new SimpleEvents())
            
            expect(feed.items.error).to.deep.equal({ code: 'red' })
        })
        
        it('updates its items with the results of the initial find call and adds them to the collection', function ()
        {
            var coll = dummy_collection(),
                feed = new ListFeed(coll)
            
            feed.refresh()
            coll.client.args[0][2](null, [{id:'1'}, {id:'2'}], new SimpleEvents())
            
            expect(feed.items).to.deep.equal([{id:'1'}, {id:'2'}])
            expect(coll.db['1']).to.not.be.undefined
            expect(coll.db['1'].serialize()).to.deep.equal({id:'1'})
            expect(coll.db['2']).to.not.be.undefined
            expect(coll.db['2'].serialize()).to.deep.equal({id:'2'})
        })
        
        it('listens to the client feed\'s update event', function ()
        {
            var async_calls = 0,
                coll = dummy_collection(),
                feed = new ListFeed(coll),
                client_feed = new SimpleEvents()
            
            feed.refresh()
            
            computation.on('async', function ()
            {
                async_calls++
            })
            
            coll.client.args[0][2](null, [{ id: '1' }, { id: '2' }], client_feed)
            client_feed.emit('update', { id: '1', foo: 'bar' })
            
            expect(feed.items[0].foo).to.equal('bar')
            expect(async_calls).to.equal(1)
        })
        
        it('listens to the client feed\'s remove event', function ()
        {
            var async_calls = 0,
                coll = dummy_collection(),
                feed = new ListFeed(coll),
                client_feed = new SimpleEvents()
            
            feed.refresh()
            
            computation.on('async', function ()
            {
                async_calls++
            })
            
            coll.client.args[0][2](null, [{id:'1'}, {id:'2'}], client_feed)
            
            expect(feed.items.length).to.equal(2)
            var record = feed.items[1]
            expect(record.deleted).to.be.false
            
            client_feed.emit('remove', {id:'2'})
            
            expect(feed.items.length).to.equal(1)
            expect(feed.items[0].id).to.equal('1')
            expect(record.deleted).to.be.true
            
            expect(async_calls).to.equal(1)
        })
        
        it('listens to the client feed\'s append event', function ()
        {
            var async_calls = 0,
                coll = dummy_collection(),
                feed = new ListFeed(coll),
                client_feed = new SimpleEvents()
            
            feed.refresh()
            
            computation.on('async', function ()
            {
                async_calls++
            })
            
            coll.client.args[0][2](null, [{ id: '1' }, { id: '2' }], client_feed)
            client_feed.emit('append', { id: '3' })
            
            expect(feed.items.length).to.equal(3)
            expect(feed.items[2]).to.deep.equal({ id: '3' })
            expect(coll.db['3']).to.deep.equal({ id: '3' })
            expect(async_calls).to.equal(1)
        })
        
        it('calls the refresh callback', function ()
        {
            var coll = dummy_collection(),
                feed = new ListFeed(coll),
                done = sinon.spy()
            
            feed.refresh(done)
            coll.client.args[0][2](null, [], new SimpleEvents())
            
            expect(done).to.have.been.calledOnce
        })
    })
})