'use strict'

var Collection = require('../lib/collection'),
    watch = require('../lib/watch'),
    Record = require('../lib/record'),
    feeds = require('../lib/feeds')

function simple_collection (options)
{
    options = options || {}
    return new Collection({
        service: options.service || 'some-service',
        fields: options.fields || {},
        methods: options.methods || {},
        relations: options.relations || {},
        client: sinon.spy()
    })
}

describe('Collection', function ()
{
    it('throws an error if initialized without a client', function ()
    {
        expect(function ()
        {
            new Collection()
        }).to.throw('You must provide a client')
    })
    
    it('throws an error if initialized without a service name', function ()
    {
        expect(function ()
        {
            new Collection({ client: function () {} })
        }).to.throw('You must provide the name of a service')
    })
    
    it('has a simple database mapping ids to records', function ()
    {
        var coll = new Collection({ client: function (){}, service: 'foo' })
        expect(coll.db).to.not.be.undefined
        expect(coll.db).to.deep.equal({})
    })
    
    it('has a get method that adds a feed to watch and returns a record', function ()
    {
        var coll = simple_collection(),
            record = null
        
        var watcher = watch(function ()
        {
            record = coll.get('123')
        })
        
        expect(record).to.not.be.null
        expect(record).to.be.instanceOf(Record)
        expect(record.serialize()).to.deep.equal({ id: '123' })
        
        expect(watcher.feeds.length).to.equal(1)
        expect(watcher.feeds[0]).to.be.instanceOf(feeds.RecordFeed)
        expect(watcher.feeds[0].record).to.equal(record)
    })
    
    it('has a find method that adds a feed to watch and returns an array of items', function ()
    {
        var coll = simple_collection(),
            items = null
        
        var watcher = watch(function ()
        {
            items = coll.find()
        })
        
        expect(items).to.not.be.null
        expect(items).to.deep.equal([])
        
        expect(watcher.feeds.length).to.equal(1)
        expect(watcher.feeds[0]).to.be.instanceOf(feeds.ListFeed)
        expect(watcher.feeds[0].items).to.equal(items)
    })
    
    describe('create()', function ()
    {
        it('creates a new Record and returns it', function ()
        {
            var coll = simple_collection(),
                record = coll.create({ foo: 'bar', skidoo: 23 })
            
            expect(record.id).to.not.be.undefined
            expect(record.foo).to.equal('bar')
            expect(record.skidoo).to.equal(23)
            expect(record).to.be.instanceOf(Record)
            expect(coll.db[record.id]).to.equal(record)
        })
        
        it('calls the client service', function ()
        {
            var coll = simple_collection(),
                record = coll.create({ foo: 'bar', skidoo: 23 })
            
            expect(coll.client).to.have.been.calledOnce
            expect(coll.client.args[0][0]).to.equal('some-service create')
            expect(coll.client.args[0][1]).to.deep.equal(record.serialize())
            expect(coll.client.args[0][2]).to.be.instanceOf(Function)
        })
        
        it('sets the record\'s error property if there is an error response from the service call', function ()
        {
            var coll = simple_collection(),
                record = coll.create({ foo: 'bar', skidoo: 23 })
            
            coll.client.args[0][2]({ code: 'red' })
            expect(record.error).to.deep.equal({ code: 'red' })
        })
        
        it('calls the done callback with an error if there is an error response from the service call', function ()
        {
            var coll = simple_collection(),
                done = sinon.spy(),
                record = coll.create({ foo: 'bar', skidoo: 23 }, done)
            
            coll.client.args[0][2]({ code: 'red' })
            expect(done).to.have.been.calledOnce
            expect(done.args[0].length).to.equal(1)
            expect(done.args[0][0]).to.deep.equal({ code: 'red' })
        })
        
        it('calls the done callback with the record if the call is successful', function ()
        {
            var coll = simple_collection(),
                done = sinon.spy(),
                record = null
            
            watch(function ()
            {
                record = coll.create({ foo: 'bar', skidoo: 23 }, done)
                coll.client.args[0][2](null, record.serialize())
            })
            
            expect(done).to.have.been.calledOnce
            expect(done.args[0].length).to.equal(2)
            expect(done.args[0][0]).to.be.null
            expect(done.args[0][1]).to.equal(record)
        })
        
        it('creates a record feed and watches it', function ()
        {
            var coll = simple_collection(),
                record = null
            
            var watcher = watch(function ()
            {
                record = coll.create({ foo: 'bar', skidoo: 23 })
                coll.client.args[0][2](null, record.serialize())
            })
            
            expect(watcher.feeds.length).to.equal(1)
            expect(watcher.feeds[0]).to.be.instanceOf(feeds.RecordFeed)
            expect(watcher.feeds[0].record).to.equal(record)
        })
    })

    describe('update()', function ()
    {
        it('calls the client service', function ()
        {
            var coll = simple_collection(),
                record = coll.create({ foo: 'bar', skidoo: 23 })
            
            expect(coll.client).to.have.been.calledOnce
            expect(coll.client.args[0][0]).to.equal('some-service create')
            expect(coll.client.args[0][1]).to.deep.equal(record.serialize())
            expect(coll.client.args[0][2]).to.be.instanceOf(Function)
        })
        
        it('updates the record with the service response', function ()
        {
            var coll = simple_collection(),
                record = new Record({ id: '123', foo: 'bar' })
                
            coll.update(record)
            
            expect(coll.client).to.have.been.calledOnce
            expect(coll.client.args[0][0]).to.equal('some-service update')
            expect(coll.client.args[0][1]).to.deep.equal(record.serialize())
            
            var update = record.serialize()
            update.skidoo = 23
            
            coll.client.args[0][2](null, update)
            
            expect(record.serialize()).to.deep.equal({ id: '123', foo: 'bar', skidoo: 23 })
        })
        
        it('sets the record\'s error property if there is an error response from the service call', function ()
        {
            var coll = simple_collection(),
                record = new Record({ id: '123', foo: 'bar' })
            
            coll.update(record)
            coll.client.args[0][2]({ code: 'red' })
            expect(record.error).to.deep.equal({ code: 'red' })
        })
        
        it('calls the done callback with an error if there is an error response from the service call', function ()
        {
            var coll = simple_collection(),
                done = sinon.spy(),
                record = new Record({ id: '123', foo: 'bar' })
            
            coll.update(record, done)
            coll.client.args[0][2]({ code: 'red' })
            expect(done).to.have.been.calledOnce
            expect(done.args[0].length).to.equal(1)
            expect(done.args[0][0]).to.deep.equal({ code: 'red' })
        })
        
        it('calls the done callback with no arguments if the update is successful', function ()
        {
            var coll = simple_collection(),
                done = sinon.spy(),
                record = new Record({ id: '123', foo: 'bar' })
            
            coll.update(record, done)
            coll.client.args[0][2](null, {})
            expect(done).to.have.been.calledOnce
            expect(done.args[0].length).to.equal(0)
        })
    })

    describe('remove', function ()
    {
        it('calls the client service', function ()
        {
            var coll = simple_collection(),
                record = new Record({ id: '123' })
            
            coll.remove(record)
            
            expect(coll.client).to.have.been.calledOnce
            expect(coll.client.args[0][0]).to.equal('some-service remove')
            expect(coll.client.args[0][1]).to.deep.equal({ id: '123' })
            expect(coll.client.args[0][2]).to.be.instanceOf(Function)
        })
        
        it('sets the records deleted property', function ()
        {
            var coll = simple_collection(),
                record = new Record({ id: '123' })
            
            expect(record.deleted).to.be.false
            coll.remove(record)
            expect(record.deleted).to.be.true
        })
        
        it('sets the record\'s error property if there is an error response from the service call', function ()
        {
            var coll = simple_collection(),
                record = new Record({ id: '123' })
            
            coll.remove(record)
            coll.client.args[0][2]({ code: 'red' })
            expect(record.error).to.deep.equal({ code: 'red' })
        })
        
        it('calls the done callback with an error if there is an error response from the service call', function ()
        {
            var coll = simple_collection(),
                done = sinon.spy(),
                record = new Record({ id: '123' })
            
            coll.remove(record, done)
            coll.client.args[0][2]({ code: 'red' })
            expect(done).to.have.been.calledOnce
            expect(done.args[0].length).to.equal(1)
            expect(done.args[0][0]).to.deep.equal({ code: 'red' })
        })
        
        it('calls the done callback with no arguments if the update is successful', function ()
        {
            var coll = simple_collection(),
                done = sinon.spy(),
                record = new Record({ id: '123' })
            
            coll.remove(record, done)
            coll.client.args[0][2](null, {})
            expect(done).to.have.been.calledOnce
            expect(done.args[0].length).to.equal(0)
        })
    })
})